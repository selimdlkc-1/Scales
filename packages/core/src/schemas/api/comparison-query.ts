import { z } from 'zod';

/**
 * `GET /api/comparison` query şeması.
 *
 * `sortBy`/`sortDir` varsayılanları burada sabitlenir; route handler bu
 * şemayı geçirmeden servis katmanına hiçbir parametre iletmez ([SEC-006]).
 *
 * Kaynak: docs/03_API_CONTRACTS.md §5.2.
 */
export const comparisonQuerySchema = z.object({
  // Virgülle ayrılmış symbol listesi (örn. "USDTRY,BTC"). Boşsa tüm aktif
  // varlıklar döner — sayı/format kısıtı burada değil, servis katmanında.
  assets: z.string().min(1, 'assets boş olamaz').optional(),
  period: z.enum(['1m', '3m', '1y', '3y', '5y']),
  sortBy: z.enum(['realReturn', 'nominalReturn', 'symbol']).default('realReturn'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type ComparisonQuery = z.infer<typeof comparisonQuerySchema>;
