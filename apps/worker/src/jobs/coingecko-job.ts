// CoinGecko job — 5 kripto varlığın (BTC, ETH, SOL, BNB, XRP) günlük fiyatları
// (docs/02_DATABASE_SCHEMA.md §9). Kaynak: docs/10_IMPLEMENTATION_ROADMAP.md §2.3,
// docs/04_BACKEND_SPEC.md §7-8, docs/01_DOMAIN_MODEL.md §5 (JobRun state machine),
// docs/07_SECURITY_IMPLEMENTATION.md §6 (SEC-007).
//
// Retry/backoff ve JobRun durum geçişleri ortak `lib/job-lifecycle.ts` + `lib/retry.ts`
// helper'larından kullanılır (Faz 2 §2.4 refactor, davranış İterasyon 3'tekiyle
// birebir aynıdır — inline kopya kaldırılmıştır, TCMB/TEFAS de aynı helper'ı kullanır).
//
// Fark (docs/10 §2.3): CoinGecko'nun ücretsiz katmanında birden fazla coin'in geçmiş
// fiyatını tek istekte dönen bir uç nokta yoktur — her coin ayrı ayrı, bağımsız
// retry'li çekilir. Bir coin'in çekimi/doğrulaması tamamen tükense dahi (retry
// tükenir veya şema doğrulanamaz) yalnızca o coin atlanır, diğer coin'lerin
// işlenmesi devam eder (graceful degradation, docs/04 §8).
import { Prisma } from '@prisma/client';
import {
  coingeckoMarketChartResponseSchema,
  prisma,
  toDecimalPriceStringFromCoingecko,
  toIsoDateFromCoingecko,
} from '@terazi/core';

import { fetchCoingeckoMarketChart } from '../clients/coingecko-client.js';
import { createPendingJobRun, finishJobRun, markRunning } from '../lib/job-lifecycle.js';
import { withRetry } from '../lib/retry.js';

const DATA_SOURCE = 'coingecko';

/** market_chart `days` parametresi — kaç gün geriye dönük fiyat noktası istenecek. */
const LOOKBACK_DAYS = 10;

export type CoingeckoJobStatus = 'success' | 'partial' | 'failed';

export interface CoingeckoJobResult {
  jobRunId: bigint;
  status: CoingeckoJobStatus;
  recordsUpserted: number;
}

/**
 * Bir string'in DB'ye yazılabilir pozitif bir ondalık (DECIMAL) değer olduğunu
 * `Prisma.Decimal` üzerinden doğrular — `float`/`Number` ile ayrıştırma yapılmaz
 * ([TS-006]). `coingeckoMarketChartResponseSchema` zaten her fiyat noktasının
 * pozitif sayısal olduğunu garanti eder; bu, tcmb-job.ts/tefas-job.ts ile aynı
 * desende korunan ek, job-seviyesi bir güvenlik kontrolüdür.
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
 * Bir coin'in `prices` dizisini gün başına tek noktaya indirger. CoinGecko
 * market_chart aynı gün için birden fazla (saatlik) nokta dönebilir, ancak
 * `asset_prices.as_of_date` günlük granülerdedir (`UNIQUE (asset_id, as_of_date)`,
 * docs/02_DATABASE_SCHEMA.md §2.3) — her gün için en son (en yeni timestamp'li)
 * nokta kanonik fiyat kabul edilir.
 */
function toLatestPricePerDay(
  points: ReadonlyArray<readonly [number, number]>,
): Map<string, number> {
  const latestByDay = new Map<string, { timestampMs: number; price: number }>();
  for (const [timestampMs, price] of points) {
    const isoDate = toIsoDateFromCoingecko(timestampMs);
    const existing = latestByDay.get(isoDate);
    if (!existing || timestampMs > existing.timestampMs) {
      latestByDay.set(isoDate, { timestampMs, price });
    }
  }
  return new Map([...latestByDay.entries()].map(([isoDate, point]) => [isoDate, point.price]));
}

/**
 * CoinGecko job — docs/04_BACKEND_SPEC.md §7'deki 3 adımlı akış: (1) `job_runs`'a
 * `pending` satırı ekle, (2) her coin için bağımsız retry'li client çağrısı +
 * `coingeckoMarketChartResponseSchema.safeParse` doğrulaması (bir coin'in
 * çekilememesi/bozuk olması diğerlerini etkilemez), (3) `Prisma.$transaction`
 * içinde geçerli coin'lerin toplu upsert'i + `job_runs`'ı terminal durumla güncelle.
 */
export async function runCoingeckoJob(): Promise<CoingeckoJobResult> {
  const jobRun = await createPendingJobRun(DATA_SOURCE);
  await markRunning(jobRun.id);

  try {
    const assets = await prisma.asset.findMany({
      where: { dataSource: DATA_SOURCE, isActive: true },
    });

    if (assets.length === 0) {
      const message = 'İzlenen coingecko varlığı bulunamadı';
      await finishJobRun(jobRun.id, {
        status: 'failed',
        recordsUpserted: 0,
        errorMessage: message,
      });
      return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
    }

    const upserts: Array<ReturnType<typeof prisma.assetPrice.upsert>> = [];
    let skippedCoinCount = 0;

    for (const asset of assets) {
      let rawResponse: unknown;
      try {
        rawResponse = await withRetry(() =>
          fetchCoingeckoMarketChart({ coinId: asset.externalRef, days: LOOKBACK_DAYS }),
        );
      } catch {
        // Bu coin için tüm denemeler tükendi — yalnızca bu coin atlanır, diğer
        // coin'lerin çekimi bağımsız olarak devam eder (docs/10 §2.3).
        skippedCoinCount++;
        continue;
      }

      const parsed = coingeckoMarketChartResponseSchema.safeParse(rawResponse);
      if (!parsed.success) {
        skippedCoinCount++;
        continue;
      }

      const latestByDay = toLatestPricePerDay(parsed.data.prices);
      for (const [isoDate, priceNumber] of latestByDay) {
        const price = parsePositiveDecimal(toDecimalPriceStringFromCoingecko(priceNumber));
        if (price === null) continue; // schema zaten pozitif sayısal garanti eder, ek güvenlik ağı

        const asOfDate = new Date(isoDate);
        upserts.push(
          prisma.assetPrice.upsert({
            where: { assetId_asOfDate: { assetId: asset.id, asOfDate } },
            create: { assetId: asset.id, asOfDate, price },
            update: { price },
          }),
        );
      }
    }

    if (upserts.length === 0) {
      const message =
        skippedCoinCount > 0
          ? `İşlenebilir kayıt bulunamadı, ${skippedCoinCount} coin çekilemedi/doğrulanamadı`
          : 'İşlenebilir hiçbir kayıt bulunamadı';
      await finishJobRun(jobRun.id, {
        status: 'failed',
        recordsUpserted: 0,
        errorMessage: message,
      });
      return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
    }

    await prisma.$transaction(upserts);

    const status: CoingeckoJobStatus = skippedCoinCount > 0 ? 'partial' : 'success';
    const errorMessage =
      skippedCoinCount > 0 ? `${skippedCoinCount} coin çekilemedi/doğrulanamadı, atlandı` : null;
    await finishJobRun(jobRun.id, { status, recordsUpserted: upserts.length, errorMessage });
    return { jobRunId: jobRun.id, status, recordsUpserted: upserts.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    await finishJobRun(jobRun.id, { status: 'failed', recordsUpserted: 0, errorMessage: message });
    return { jobRunId: jobRun.id, status: 'failed', recordsUpserted: 0 };
  }
}
