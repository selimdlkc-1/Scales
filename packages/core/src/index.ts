export { prisma } from './prisma/client.js';

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
