import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PriceFixturePlan } from './price-fixture.js';

// `global-setup.ts` seed ettiği tam tarihleri (`plan.now` vb.) burada saklar —
// `global-teardown.ts` ve spec dosyaları AYNI tarihlerle çalışmak zorunda
// (yeniden `new Date()` çağırmak birkaç saniyelik kaymayla farklı bir
// `as_of_date`/`period_month` üretir, temizlik satırları kaçırır — bkz.
// price-fixture.ts dosya başı yorumu). CI'da her job kendi checkout'una sahip
// olduğundan bu geçici dosya çakışma riski taşımaz; `.gitignore`'da.
//
// `import.meta.url` KULLANILMAZ — Playwright bu dosyayı (apps/web/package.json
// `"type": "module"` içermediği için) CommonJS'e derliyor, `import.meta` orada
// SyntaxError verir. `playwright.config.ts`'in bulunduğu dizin (`apps/web`)
// Playwright'ın çalışma dizinidir — `process.cwd()` güvenle kullanılabilir.
const PLAN_PATH = path.join(process.cwd(), 'e2e', '.e2e-fixture-plan.json');

interface SerializedPlan {
  fund: { id: string; symbol: string };
  now: string;
  oneMonthAgo: string;
  threeMonthsAgo: string;
  oneYearAgo: string;
}

export async function savePlan(plan: PriceFixturePlan): Promise<void> {
  const serialized: SerializedPlan = {
    fund: { id: plan.fund.id.toString(), symbol: plan.fund.symbol },
    now: plan.now.toISOString(),
    oneMonthAgo: plan.oneMonthAgo.toISOString(),
    threeMonthsAgo: plan.threeMonthsAgo.toISOString(),
    oneYearAgo: plan.oneYearAgo.toISOString(),
  };
  await mkdir(path.dirname(PLAN_PATH), { recursive: true });
  await writeFile(PLAN_PATH, JSON.stringify(serialized), 'utf-8');
}

export async function loadPlan(): Promise<PriceFixturePlan> {
  const raw = await readFile(PLAN_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as SerializedPlan;
  return {
    fund: { id: BigInt(parsed.fund.id), symbol: parsed.fund.symbol },
    now: new Date(parsed.now),
    oneMonthAgo: new Date(parsed.oneMonthAgo),
    threeMonthsAgo: new Date(parsed.threeMonthsAgo),
    oneYearAgo: new Date(parsed.oneYearAgo),
  };
}

export async function deletePlanFile(): Promise<void> {
  await rm(PLAN_PATH, { force: true });
}
