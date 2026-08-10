# Terazi

Döviz, gram altın, kripto ve TEFAS yatırım fonlarının TL bazında, TÜFE ile
enflasyondan arındırılmış reel getirisini karşılaştıran, read-only ve
hesapsız bir vitrin projesi. Yatırım tavsiyesi vermez.

Proje kimliği ve kapsam için: [`CLAUDE.md`](./CLAUDE.md) · [`docs/`](./docs).

## Local Kurulum

Adım adım prosedür: [`docs/09_DEV_WORKFLOW.md §6`](./docs/09_DEV_WORKFLOW.md).
Kısaca:

```bash
pnpm install
docker compose up -d   # lokal PostgreSQL
cp .env.example .env   # değerleri doldur, bkz. docs/09_DEV_WORKFLOW.md §7
```

Sonraki adımlar (migration, seed, dev server) Faz 1+ ile birlikte anlam
kazanır — bkz. `docs/09_DEV_WORKFLOW.md §6` madde 4-7.

## Env Değişkenleri

Tam liste ve gizlilik sınıflandırması:
[`docs/04_BACKEND_SPEC.md §10`](./docs/04_BACKEND_SPEC.md). Gerçek değerler
asla commit edilmez (`.env` `.gitignore`'dadır).
