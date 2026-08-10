import { z } from 'zod';

/**
 * `GET /api/admin/job-runs` query şeması.
 *
 * `limit` query string'den geldiği için `z.coerce` ile sayıya çevrilir;
 * çevrim sonrası 1–200 aralığı ve varsayılan 50 uygulanır (docs/03_API_CONTRACTS.md §5.3).
 */
export const adminJobRunsQuerySchema = z.object({
  dataSource: z.enum(['tcmb', 'tefas', 'coingecko']).optional(),
  limit: z.coerce
    .number({ invalid_type_error: 'limit sayısal olmalıdır' })
    .int('limit tam sayı olmalıdır')
    .min(1, 'limit en az 1 olmalıdır')
    .max(200, 'limit en fazla 200 olabilir')
    .default(50),
});

export type AdminJobRunsQuery = z.infer<typeof adminJobRunsQuerySchema>;
