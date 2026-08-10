### İterasyon 1 — Kök Layout ve Tasarım Temeli (§4.1)

**Hedef:** Tailwind CSS + shadcn/ui kurulu; kök `layout.tsx` header + `DisclaimerFooter` ile render ediyor (`P-006` sabit uyarı, tüm sayfalarda).

**Teslim çıktısı:**
- `apps/web/tailwind.config.ts`, `postcss.config.js`, `app/globals.css`
- `components.json` (shadcn/ui) + `components/ui/{button,select,table,badge,skeleton}.tsx`
- `components/ui/disclaimer-footer.tsx`
- `app/layout.tsx` (Faz 0 placeholder'dan gerçek layout'a)

**Önkoşullar:**
- [ ] Faz 3 Done Definition tamam (API endpoint'leri hazır — bu iterasyonda henüz tüketilmiyor ama sonraki iterasyonlar için gerekli)
- [ ] `feat/root-layout-design-foundation` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §4.1 — iterasyon kapsamı
2. `docs/05_FRONTEND_SPEC.md` §1, §7 — klasör organizasyonu, tasarım token'ları/stil kuralları
3. `docs/06_SCREEN_CATALOG.md` §2 — layout tanımları (kök layout vs operatör layout)
4. `.claude/rules/00-project-identity.md` — TS-002 (Tailwind+shadcn/ui pin)

**Uygulama planı:**
1. Next.js'e Tailwind CSS kurulumu — `tailwind.config.ts`, `postcss.config.js`, `app/globals.css`.
2. shadcn/ui init — `components.json`, `components/ui/` altına yalnızca gerekli primitive'ler: `Button`, `Select`, `Table`, `Badge`, `Skeleton` (`docs/05` §6 katman tablosu).
3. `app/layout.tsx` — kök layout: font, global stil, header ("Terazi" adı, tık ile ana sayfaya döner — `docs/06` §2), `<DisclaimerFooter/>`.
4. `components/ui/disclaimer-footer.tsx` — `P-006` sabit metin ("Geçmiş performans gelecekteki getiriyi göstermez. Bu sayfadaki bilgiler yatırım tavsiyesi niteliği taşımaz.", `docs/06` §4 TR mesaj metinleri), `text-sm text-muted-foreground` stiliyle (`docs/05` §7).
5. `app/page.tsx` — Faz 0'daki placeholder'ın yerine gerçek S-HOME iskeleti (henüz veri yok, yalnızca layout içi yerleşim — gerçek `ComparisonTable` İterasyon 2'de).

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `tailwind.config.ts`, `postcss.config.js`, `app/globals.css`, `components.json`, `components/ui/{button,select,table,badge,skeleton}.tsx`, `components/ui/disclaimer-footer.tsx` |
| Güncelle | `app/layout.tsx`, `app/page.tsx` |
| Dokunma | `app/admin/layout.tsx` (Faz 5 §5.2), gerçek veri çekme (İterasyon 2) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Sabit uyarı her sayfada | `docs/05` §7, `docs/06` §6, `P-006` | `DisclaimerFooter` tek bileşenden render, kopyalanmaz |
| Kök layout header | `docs/06` §2 | `app/layout.tsx` |
| Tailwind+shadcn/ui pin | `.claude/rules/00-project-identity.md` TS-002 | `tailwind.config.ts` + `components.json` |
| Karanlık mod yok | `docs/05` §7 | Tema tek (light), toggle eklenmez |

**Kalite kapıları:**
- [ ] `DisclaimerFooter` layout üzerinden render ediliyor (render/snapshot testi)
- [ ] a11y: WCAG AA kontrast manuel kontrol (shadcn varsayılan tema)
- [ ] `pnpm --filter web build` hatasız

**Bu iterasyonda yok:** `ComparisonTable`, `PeriodSelector`, veri çekme, admin layout (Faz 5).

**Risk / dikkat:** shadcn/ui component'leri "değiştirilmemiş" halde tutulur (`.claude/rules/24-frontend-components.md`) — proje-özel bir tasarım sistemi dokümanı yazılmaz, doğrudan varsayılan estetik kullanılır.

**Stop:**
- [ ] `pnpm --filter web build`
- [ ] `pnpm --filter web dev` (manuel görsel kontrol: header + footer render)
- [ ] PR/onay → İterasyon 2
