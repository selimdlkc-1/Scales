// TEFAS job — 4 şemsiye kategorisi × 15 fon = 60 fonun günlük fiyatları
// (docs/02_DATABASE_SCHEMA.md §9). Kaynak: docs/10_IMPLEMENTATION_ROADMAP.md §2.2,
// docs/04_BACKEND_SPEC.md §7-8, docs/01_DOMAIN_MODEL.md §5 (JobRun state machine),
// docs/07_SECURITY_IMPLEMENTATION.md §1, §6 (SEC-007 — TEFAS bu projenin en kritik
// dış kaynak doğrulama noktasıdır: resmî olmayan, kırılgan kaynak).
//
// Retry/backoff ve JobRun durum geçişleri ortak `lib/job-lifecycle.ts` + `lib/retry.ts`
// helper'larından kullanılır (Faz 2 §2.4 refactor, davranış İterasyon 2'dekiyle
// birebir aynıdır — inline kopya kaldırılmıştır, TCMB/CoinGecko de aynı helper'ı kullanır).
import { Prisma } from '@prisma/client';
import {
  prisma,
  tefasFundRecordSchema,
  tefasResponseSchema,
  toDecimalPriceStringFromTefas,
  toIsoDateFromTefas,
} from '@terazi/core';

import { fetchTefasHistory } from '../clients/tefas-client.js';
import { createPendingJobRun, finishJobRun, markRunning } from '../lib/job-lifecycle.js';
import { withRetry } from '../lib/retry.js';

const DATA_SOURCE = 'tefas';

/** Kaynak veri her iş günü çekilir; tatil/hafta sonu boşluklarını telafi etmek için geriye dönük pencere. */
const LOOKBACK_DAYS = 10;

export type TefasJobStatus = 'success' | 'partial' | 'failed';

export interface TefasJobResult {
  jobRunId: bigint;
  status: TefasJobStatus;
  recordsUpserted: number;
}

function getDefaultDateRange(referenceDate: Date = new Date()): { startDate: Date; endDate: Date } {
  const endDate = referenceDate;
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - LOOKBACK_DAYS);
  return { startDate, endDate };
}

/**
 * Bir string'in DB'ye yazılabilir pozitif bir ondalık (DECIMAL) değer olduğunu
 * `Prisma.Decimal` üzerinden doğrular — `float`/`Number` ile ayrıştırma yapılmaz
 * ([TS-006]). `tefasFundRecordSchema` yalnızca "number veya nokta ayraçlı ondalık
 * string" tipini garanti eder (schemas/external/tefas-response.ts); bu, TEFAS'ın
 * gönderdiği değerin gerçekten geçerli bir fiyat olduğunu doğrulayan ek,
 * job-seviyesi kontroldür (tcmb-job.ts ile aynı desen).
 */
function parsePositiveDecimal(value: string): Prisma.Decimal | null {
  try {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite() || decimal.lessThanOrEqualTo(0)) {
      return null;
    }
    return decimal;
  } catch {
    return null;
  }
}

/**
 * TEFAS job — docs/04_BACKEND_SPEC.md §7'deki 3 adımlı akış:
 * (1) `job_runs`'a `pending` satırı ekle, (2) client çağrısı (retry'li) + zarf
 * doğrulaması (`tefasResponseSchema`) + **her fon kaydının ayrı ayrı**
 * (`tefasFundRecordSchema.safeParse`) doğrulanması + `Prisma.$transaction` içinde
 * geçerli kayıtların toplu upsert'i, (3) `job_runs`'ı terminal durumla güncelle.
 *
 * Kayıt-bazlı doğrulama SEC-007'nin bu projedeki en kritik uygulama noktasıdır
 * (docs/07_SECURITY_IMPLEMENTATION.md §1) — tek bir bozuk fon kaydı tüm çalıştırmayı
 * durdurmaz, yalnızca o kayıt atlanır.
 */
export async function runTefasJob(): Promise<TefasJobResult> {
  const jobRun = await createPendingJobRun(DATA_SOURCE);
  await markRunning(jobRun.id);

  try {
    const assets = await prisma.asset.findMany({
      where: { dataSource: DATA_SOURCE, isActive: true },
    });
    const assetByFundCode = new Map(assets.map((asset) => [asset.externalRef, asset]));

    const { startDate, endDate } = getDefaultDateRange();
    const rawResponse = await withRetry(() => fetchTefasHistory({ startDate, endDate }));

    const envelope = tefasResponseSchema.safeParse(rawResponse);
    if (!envelope.success) {
      const message = `TEFAS yanıt zarfı doğrulanamadı: ${envelope.error.message}`;
      await finishJobRun(jobRun.id, {
        status: 'failed',
        recordsUpserted: 0,
        errorMessage: message,
      });
      return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
    }

    const records = envelope.data.data;
    if (records.length === 0) {
      // docs/08_TESTING_STRATEGY.md §5 — "boş dizi" senaryosu: zarf yapısal olarak
      // geçerli ama hiç kayıt yok. Bu, tek tek kayıt doğrulamasından farklıdır (aşağı)
      // ve işlenebilir hiçbir veri bulunamadığı anlamına gelir.
      const message = 'TEFAS yanıtında hiç kayıt yok (data boş dizi)';
      await finishJobRun(jobRun.id, {
        status: 'failed',
        recordsUpserted: 0,
        errorMessage: message,
      });
      return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
    }

    const upserts: Array<ReturnType<typeof prisma.assetPrice.upsert>> = [];
    let skippedCount = 0;

    for (const rawRecord of records) {
      // SEC-007 kritik nokta: her kayıt ayrı `safeParse` edilir, tek bir bozuk kayıt
      // (eksik alan, beklenmeyen tip, ondalık ayraç varyasyonu) diğerlerini etkilemez.
      const parsedRecord = tefasFundRecordSchema.safeParse(rawRecord);
      if (!parsedRecord.success) {
        skippedCount++;
        continue;
      }

      const asset = assetByFundCode.get(parsedRecord.data.FONKODU);
      if (!asset) continue; // izlenmeyen fon (docs/01_DOMAIN_MODEL.md §4 madde 7) — hata değil, kapsam dışı

      const price = parsePositiveDecimal(toDecimalPriceStringFromTefas(parsedRecord.data.FIYAT));
      if (price === null) {
        skippedCount++;
        continue;
      }

      const asOfDate = new Date(toIsoDateFromTefas(parsedRecord.data.TARIH));
      upserts.push(
        prisma.assetPrice.upsert({
          where: { assetId_asOfDate: { assetId: asset.id, asOfDate } },
          create: { assetId: asset.id, asOfDate, price },
          update: { price },
        }),
      );
    }

    if (upserts.length === 0 && skippedCount === 0) {
      // Zarf geçerli, hiçbir kayıt şema doğrulamasından da geçemez değildi, ama iz
      // sürülen 60 fondan hiçbiri yanıtta yoktu — muhtemelen bir entegrasyon sorunu
      // (yanlış tarih aralığı vb.), TCMB job'undaki "işlenebilir kayıt yok" durumuyla
      // aynı muamele görür.
      const message = 'İzlenen fonlardan hiçbiri TEFAS yanıtında bulunamadı';
      await finishJobRun(jobRun.id, {
        status: 'failed',
        recordsUpserted: 0,
        errorMessage: message,
      });
      return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
    }

    await prisma.$transaction(upserts);

    // docs/10_IMPLEMENTATION_ROADMAP.md §2.2: "TEFAS'ta kısmi veri normaldir" — en az
    // bir kayıt şema doğrulamasından geçmeyip atlandıysa (skippedCount>0) durum
    // `partial` olur, `failed` OLMAZ; yalnızca zarf bozukluğu veya izlenen fonların
    // tamamının yokluğu (yukarıdaki iki erken dönüş) `failed` sayılır.
    const status: TefasJobStatus = skippedCount > 0 ? 'partial' : 'success';
    const errorMessage =
      skippedCount > 0
        ? `${skippedCount} kayıt şema doğrulamasından geçemediği için atlandı`
        : null;
    await finishJobRun(jobRun.id, { status, recordsUpserted: upserts.length, errorMessage });
    return { jobRunId: jobRun.id, status, recordsUpserted: upserts.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    await finishJobRun(jobRun.id, { status: 'failed', recordsUpserted: 0, errorMessage: message });
    return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
  }
}
