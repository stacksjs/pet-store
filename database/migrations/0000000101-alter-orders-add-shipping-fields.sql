-- Add shipping fulfillment fields to orders so the storefront-side
-- "your package shipped" email has somewhere to read tracking info
-- from, and the order detail page can show carrier + ETA.
--
-- All nullable: orders that were placed before fulfillment lands
-- (or that ship without a trackable carrier — local delivery, etc.)
-- still need to be valid rows.
--
-- `shipped_at` is ISO-8601 UTC for parity with other timestamp
-- columns on this table (`created_at` / `updated_at`). Keep `status`
-- as the source of truth for whether shipping has happened — the
-- admin action that fills these columns also flips status to
-- 'SHIPPED'.
ALTER TABLE "orders" ADD COLUMN "tracking_number" TEXT;
ALTER TABLE "orders" ADD COLUMN "carrier" TEXT;
ALTER TABLE "orders" ADD COLUMN "tracking_url" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipped_at" TEXT;
