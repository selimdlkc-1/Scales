import { PrismaClient } from '@prisma/client';

// Tekil PrismaClient — apps/web ve apps/worker bunu import eder, istek/job
// başına yeni client oluşturmaz (bkz. .claude/rules/10-backend-architecture.md,
// .claude/rules/16-database-prisma.md).
//
// Next.js dev modunda hot-reload her modül yenilemesinde yeni bir bağlantı havuzu
// açmasın diye instance globalThis üzerinde saklanır; production'da tek seferlik
// modül yüklemesi olduğu için bu geçici global her zaman temiz başlar.
declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = globalThis.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
