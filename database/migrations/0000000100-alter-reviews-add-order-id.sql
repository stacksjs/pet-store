-- Add order_id to reviews so the storefront submission flow can
-- 1) verify the reviewer actually shipped a matching order, and
-- 2) prevent dupes by enforcing one review per (order, product).
--
-- Nullable because legacy seeded reviews predate the ordering flow
-- and we don't want to backfill with a synthetic FK.
ALTER TABLE "reviews" ADD COLUMN "order_id" INTEGER;
CREATE INDEX IF NOT EXISTS "reviews_order_product_idx" ON "reviews" ("order_id", "product_id");
