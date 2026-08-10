-- CreateTable
CREATE TABLE "asset_classes" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name_tr" VARCHAR(50) NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" BIGSERIAL NOT NULL,
    "asset_class_id" BIGINT NOT NULL,
    "symbol" VARCHAR(30) NOT NULL,
    "name_tr" VARCHAR(120) NOT NULL,
    "data_source" VARCHAR(20) NOT NULL,
    "external_ref" VARCHAR(60) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_prices" (
    "id" BIGSERIAL NOT NULL,
    "asset_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "price" DECIMAL(20,6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpi_index" (
    "id" BIGSERIAL NOT NULL,
    "period_month" CHAR(7) NOT NULL,
    "index_value" DECIMAL(12,4) NOT NULL,
    "as_of_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpi_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" BIGSERIAL NOT NULL,
    "data_source" VARCHAR(20) NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "records_upserted" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_classes_code_key" ON "asset_classes"("code");

-- CreateIndex
CREATE INDEX "assets_asset_class_id_idx" ON "assets"("asset_class_id");

-- CreateIndex
-- docs/02_DATABASE_SCHEMA.md §4: partial index (küçük ve sık çalışan "aktif varlık" sorgusu için).
CREATE INDEX "assets_is_active_idx" ON "assets"("is_active") WHERE "is_active" = true;

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_key" ON "assets"("symbol");

-- CreateIndex
CREATE INDEX "asset_prices_asset_id_as_of_date_idx" ON "asset_prices"("asset_id", "as_of_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "asset_prices_asset_id_as_of_date_key" ON "asset_prices"("asset_id", "as_of_date");

-- CreateIndex
CREATE UNIQUE INDEX "cpi_index_period_month_key" ON "cpi_index"("period_month");

-- CreateIndex
CREATE INDEX "job_runs_data_source_started_at_idx" ON "job_runs"("data_source", "started_at" DESC);

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_asset_class_id_fkey" FOREIGN KEY ("asset_class_id") REFERENCES "asset_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint
-- docs/02_DATABASE_SCHEMA.md §2.1-§2.5: Prisma native CHECK üretmez, elle eklenir
-- (bkz. .claude/skills/phase-01-domain-database, İterasyon 1 risk notu).
ALTER TABLE "asset_classes" ADD CONSTRAINT "asset_classes_code_check" CHECK ("code" IN ('fx', 'gold', 'crypto', 'fund'));

ALTER TABLE "assets" ADD CONSTRAINT "assets_data_source_check" CHECK ("data_source" IN ('tcmb', 'tefas', 'coingecko'));

ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_price_check" CHECK ("price" > 0);

ALTER TABLE "cpi_index" ADD CONSTRAINT "cpi_index_index_value_check" CHECK ("index_value" > 0);

ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_data_source_check" CHECK ("data_source" IN ('tcmb', 'tefas', 'coingecko'));

ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_status_check" CHECK ("status" IN ('pending', 'running', 'success', 'partial', 'failed'));
