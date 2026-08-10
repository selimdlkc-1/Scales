export { prisma } from './prisma/client.js';

// calculations — reel/normalize edilmiş getiri için tek kaynak hesap
// fonksiyonları; packages/core dışında hiçbir katmanda yeniden implemente
// edilmez (docs/01_DOMAIN_MODEL.md §6).
export { calculateNominalReturn } from './calculations/nominal-return.js';
export type { DecimalInput } from './calculations/nominal-return.js';
export { calculateCpiChange, calculateRealReturn } from './calculations/real-return.js';
export type { RealReturnInput } from './calculations/real-return.js';
export { calculateNormalizedReturnSeries } from './calculations/normalized-return.js';
export type { NormalizedReturnPoint, PricePoint } from './calculations/normalized-return.js';

// schemas/api — Next.js route handler'larının query doğrulaması için.
export { comparisonQuerySchema } from './schemas/api/comparison-query.js';
export type { ComparisonQuery } from './schemas/api/comparison-query.js';
export { seriesQuerySchema } from './schemas/api/series-query.js';
export type { SeriesQuery } from './schemas/api/series-query.js';
export { assetsQuerySchema } from './schemas/api/assets-query.js';
export type { AssetsQuery } from './schemas/api/assets-query.js';
export { adminJobRunsQuerySchema } from './schemas/api/admin-job-runs-query.js';
export type { AdminJobRunsQuery } from './schemas/api/admin-job-runs-query.js';

// schemas/external — worker job'larının DB'ye yazmadan önce doğrulayacağı
// dış kaynak yanıt şemaları (SEC-007).
export {
  extractTcmbSeriesValue,
  tcmbEvdsResponseSchema,
  toIsoDate as toIsoDateFromTcmb,
} from './schemas/external/tcmb-response.js';
export type { TcmbEvdsItem, TcmbEvdsResponse } from './schemas/external/tcmb-response.js';
export {
  tefasFundRecordSchema,
  tefasResponseSchema,
  toDecimalPriceString as toDecimalPriceStringFromTefas,
  toIsoDate as toIsoDateFromTefas,
} from './schemas/external/tefas-response.js';
export type { TefasFundRecord, TefasResponse } from './schemas/external/tefas-response.js';
export {
  coingeckoMarketChartResponseSchema,
  toDecimalPriceString as toDecimalPriceStringFromCoingecko,
  toIsoDate as toIsoDateFromCoingecko,
} from './schemas/external/coingecko-response.js';
export type {
  CoingeckoMarketChartResponse,
  CoingeckoPricePoint,
} from './schemas/external/coingecko-response.js';
