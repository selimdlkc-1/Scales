import { z } from 'zod';

/**
 * `GET /api/comparison/series` query şeması.
 *
 * `assets` burada yalnızca format (virgülle ayrılmış, en az bir sembol)
 * doğrulanır. 2–5 adet sayı kısıtı Zod seviyesinde değil, Faz 3 servis
 * katmanında `INVALID_ASSET_SELECTION` hatası olarak ele alınır — bu,
 * `VALIDATION_ERROR`'dan ayrı bir error code'dur (docs/03_API_CONTRACTS.md §3, §5.2).
 */
export const seriesQuerySchema = z.object({
  assets: z.string().min(1, 'En az bir varlık sembolü gereklidir'),
  period: z.enum(['1m', '3m', '1y', '3y', '5y']),
});

export type SeriesQuery = z.infer<typeof seriesQuerySchema>;
