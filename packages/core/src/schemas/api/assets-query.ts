import { z } from 'zod';

/**
 * `GET /api/assets` query şeması.
 *
 * Kaynak: docs/03_API_CONTRACTS.md §5.1.
 */
export const assetsQuerySchema = z.object({
  assetClass: z.enum(['fx', 'gold', 'crypto', 'fund']).optional(),
});

export type AssetsQuery = z.infer<typeof assetsQuerySchema>;
