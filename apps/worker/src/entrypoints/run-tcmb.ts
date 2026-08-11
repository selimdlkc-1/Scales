// CLI giriş noktası — Railway'in zamanlanmış görev (cron) mekanizması tarafından
// tetiklenir, job'u bir kez çalıştırıp process'i sonlandırır; sürekli çalışan bir
// daemon değildir (docs/04_BACKEND_SPEC.md §8, [TS-004]).
import { prisma } from '@terazi/core';

import { runTcmbJob } from '../jobs/tcmb-job.js';

// Yapılandırılmış JSON log (docs/04_BACKEND_SPEC.md §9) — düz metin log yazılmaz.
// Not: `TCMB_EVDS_API_KEY` her zaman scope dışında tutulur, hiçbir log satırına
// eklenmez (.claude/rules/03-security-baseline.md madde 3).
function log(
  level: 'info' | 'error',
  message: string,
  context: Record<string, unknown> = {},
): void {
  console.log(JSON.stringify({ level, timestamp: new Date().toISOString(), message, ...context }));
}

async function main(): Promise<void> {
  const result = await runTcmbJob();
  log(result.status === 'failed' ? 'error' : 'info', 'tcmb job tamamlandı', {
    jobRunId: result.jobRunId.toString(),
    status: result.status,
    recordsUpserted: result.recordsUpserted,
  });
  process.exitCode = result.status === 'failed' ? 1 : 0;
}

main()
  .catch((error: unknown) => {
    log('error', 'tcmb job beklenmeyen hatayla sonlandı', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
