// TCMB EVDS job — USD/TRY, EUR/TRY, gram altın fiyatları + TÜFE endeksi.
// Kaynak: docs/10_IMPLEMENTATION_ROADMAP.md §2.1, docs/04_BACKEND_SPEC.md §7-8,
// docs/01_DOMAIN_MODEL.md §5 (JobRun state machine), docs/07_SECURITY_IMPLEMENTATION.md §6 (SEC-007).
//
// Not (bu iterasyona özgü): retry/backoff ve JobRun durum geçişleri burada inline
// yazılmıştır — ortak bir helper'a çıkarma İterasyon 4'te (§2.4) yapılacak; TEFAS/CoinGecko
// job'ları bu iterasyonda dokunulmaz.
import { Prisma } from '@prisma/client';
import {
  extractTcmbSeriesValue,
  prisma,
  tcmbEvdsResponseSchema,
  toIsoDateFromTcmb,
} from '@terazi/core';

import { fetchTcmbSeries } from '../clients/tcmb-client.js';

const DATA_SOURCE = 'tcmb';

/** TÜFE genel endeksi (2003=100) — assets tablosunda karşılığı yok, sabit seri kodu. */
const CPI_SERIES_CODE = 'TP.FG.J0';

/** Kaynak veri günlük çekilir; tatil/hafta sonu boşluklarını telafi etmek için geriye dönük pencere. */
const LOOKBACK_DAYS = 10;

/**
 * docs/04_BACKEND_SPEC.md §8: dış API çağrısı başarısız olursa aynı çalıştırma
 * içinde exponansiyel backoff ile tekrar denenir (1s → 2s → 4s bekleme) — toplam
 * 1 ilk deneme + 3 tekrar deneme = 4 deneme.
 */
const RETRY_DELAYS_MS = [1000, 2000, 4000];

export type TcmbJobStatus = 'success' | 'partial' | 'failed';

export interface TcmbJobResult {
  jobRunId: bigint;
  status: TcmbJobStatus;
  recordsUpserted: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt] ?? 0);
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('TCMB EVDS isteği bilinmeyen nedenle başarısız oldu');
}

function getDefaultDateRange(referenceDate: Date = new Date()): { startDate: Date; endDate: Date } {
  const endDate = referenceDate;
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - LOOKBACK_DAYS);
  return { startDate, endDate };
}

/** EVDS yanıt zarfındaki dinamik kolon adları nokta yerine alt çizgi kullanır. */
function toEvdsColumnName(seriesCode: string): string {
  return seriesCode.replaceAll('.', '_');
}

/**
 * Bir string'in DB'ye yazılabilir pozitif bir ondalık (DECIMAL) değer olduğunu
 * `Prisma.Decimal` üzerinden doğrular — `float`/`Number` ile ayrıştırma yapılmaz
 * ([TS-006]). Zod şeması yalnızca "string veya null" tipini garanti eder
 * (schemas/external/tcmb-response.ts); bu, TCMB'nin gönderdiği string'in
 * gerçekten geçerli bir fiyat/endeks olduğunu doğrulayan ek, job-seviyesi kontroldür.
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

async function finalizeJobRun(
  jobRunId: bigint,
  status: TcmbJobStatus,
  recordsUpserted: number,
  errorMessage: string | null,
): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: { status, finishedAt: new Date(), recordsUpserted, errorMessage },
  });
}

/**
 * TCMB EVDS job — docs/04_BACKEND_SPEC.md §7'deki 3 adımlı akış:
 * (1) `job_runs`'a `pending` satırı ekle, (2) client çağrısı (retry'li) + SEC-007
 * doğrulaması + `Prisma.$transaction` içinde toplu upsert, (3) `job_runs`'ı terminal
 * durumla güncelle.
 */
export async function runTcmbJob(): Promise<TcmbJobResult> {
  const jobRun = await prisma.jobRun.create({
    data: { dataSource: DATA_SOURCE, status: 'pending' },
  });

  await prisma.jobRun.update({
    where: { id: jobRun.id },
    data: { status: 'running', startedAt: new Date() },
  });

  try {
    const assets = await prisma.asset.findMany({
      where: { dataSource: DATA_SOURCE, isActive: true },
    });

    const seriesCodes = [...assets.map((asset) => asset.externalRef), CPI_SERIES_CODE];
    const { startDate, endDate } = getDefaultDateRange();

    const rawResponse = await withRetry(() => fetchTcmbSeries({ seriesCodes, startDate, endDate }));

    const parsed = tcmbEvdsResponseSchema.safeParse(rawResponse);
    if (!parsed.success) {
      const message = `TCMB EVDS yanıt zarfı doğrulanamadı: ${parsed.error.message}`;
      await finalizeJobRun(jobRun.id, 'failed', 0, message);
      return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
    }

    const upserts: Array<
      ReturnType<typeof prisma.assetPrice.upsert> | ReturnType<typeof prisma.cpiIndex.upsert>
    > = [];
    let skippedCount = 0;

    for (const item of parsed.data.items) {
      const isoDate = toIsoDateFromTcmb(item.Tarih);
      const asOfDate = new Date(isoDate);

      for (const asset of assets) {
        const raw = extractTcmbSeriesValue(item, toEvdsColumnName(asset.externalRef));
        if (raw === null) continue; // tatil/veri yok — hata değil (docs/08 §4)

        const price = parsePositiveDecimal(raw);
        if (price === null) {
          skippedCount++;
          continue;
        }

        upserts.push(
          prisma.assetPrice.upsert({
            where: { assetId_asOfDate: { assetId: asset.id, asOfDate } },
            create: { assetId: asset.id, asOfDate, price },
            update: { price },
          }),
        );
      }

      const cpiRaw = extractTcmbSeriesValue(item, toEvdsColumnName(CPI_SERIES_CODE));
      if (cpiRaw !== null) {
        const indexValue = parsePositiveDecimal(cpiRaw);
        if (indexValue === null) {
          skippedCount++;
        } else {
          const periodMonth = isoDate.slice(0, 7);
          upserts.push(
            prisma.cpiIndex.upsert({
              where: { periodMonth },
              create: { periodMonth, indexValue, asOfDate },
              update: { indexValue, asOfDate },
            }),
          );
        }
      }
    }

    if (upserts.length === 0) {
      const message =
        skippedCount > 0
          ? `İşlenebilir kayıt bulunamadı, ${skippedCount} kayıt geçersiz değer nedeniyle atlandı`
          : 'İşlenebilir hiçbir kayıt bulunamadı';
      await finalizeJobRun(jobRun.id, 'failed', 0, message);
      return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
    }

    await prisma.$transaction(upserts);

    const status: TcmbJobStatus = skippedCount > 0 ? 'partial' : 'success';
    const errorMessage =
      skippedCount > 0 ? `${skippedCount} kayıt geçersiz değer nedeniyle atlandı` : null;
    await finalizeJobRun(jobRun.id, status, upserts.length, errorMessage);
    return { jobRunId: jobRun.id, status, recordsUpserted: upserts.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    await finalizeJobRun(jobRun.id, 'failed', 0, message);
    return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
  }
}
