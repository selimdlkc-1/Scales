### İterasyon 4 — Health Endpoint'i (§3.4)

**Hedef:** `GET /api/health` çalışır — `docs/03_API_CONTRACTS.md §5.4`, **düz JSON** döner (response envelope'unu kullanmaz).

**Teslim çıktısı:**
- `apps/web/app/api/health/route.ts`

**Önkoşullar:**
- [ ] İterasyon 3 Stop tamam
- [ ] `feat/health-endpoint` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §3.4 — iterasyon kapsamı
2. `docs/03_API_CONTRACTS.md` §5.4 — tam contract (envelope istisnası dahil)

**Uygulama planı:**
1. `app/api/health/route.ts` — Prisma ile basit bağlantı kontrolü (`prisma.$queryRaw` ile `SELECT 1`); başarılıysa `{status:"ok",database:"ok"}` `200`; başarısızsa `{status:"degraded",database:"error"}` `503` — **düz JSON, `{data,meta}` sarmalamaz** (`docs/03` §5.4 notu).
2. `Cache-Control: no-store`.
3. Integration test — DB ayaktayken `200`, Prisma çağrısı mock'lanarak DB kesikken `503`.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `app/api/health/route.ts` (+`.test.ts`) |
| Güncelle | — |
| Dokunma | — |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Düz JSON, envelope yok | `docs/03` §5.4 | `NextResponse.json({status,database})` doğrudan, `{data,meta}` sarmalamaz |
| DB bağlantı kontrolü | `docs/03` §5.4 | `prisma.$queryRaw\`SELECT 1\`` |
| `503 degraded` | `docs/03` §5.4 | `catch` bloğunda `503` |

**Kalite kapıları:**
- [ ] `200 {status:"ok",database:"ok"}` testi
- [ ] `503 {status:"degraded",database:"error"}` testi (Prisma çağrısı mock'lanarak hata simülasyonu)

**Bu iterasyonda yok:** Rate limit (`health` limitsiz, `docs/03` §6), merkezi middleware.

**Risk / dikkat:** `health` endpoint'ini yanlışlıkla `{data,meta}` envelope'una sarmama — `docs/03` §5.4 bunu özellikle bir istisna olarak belirtiyor (hosting platformu health check parser'ları sade yanıt bekler).

**Stop:**
- [ ] `pnpm --filter web vitest run app/api/health`
- [ ] PR/onay → İterasyon 5
