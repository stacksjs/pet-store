-- Customer address book.
--
-- One row per address a customer has saved; `is_default = 1` marks
-- the address that pre-fills checkout's shipping form. The action
-- that flips a row to default also flips every other row for that
-- customer back to 0, so at most one default exists per customer.
--
-- `name` and `phone` are denormalized from `customers` because each
-- shipment can go to a different person at a different number — the
-- gift-to-mom case. Pre-filling them from the customer record on
-- the form is fine, but the row of record is per-address.
--
-- Postal address fields follow the rough US/CA shape; the
-- `country` column is intentionally TEXT (ISO-2 like 'US' or full
-- name) so storefronts can localize without a schema change.
CREATE TABLE IF NOT EXISTS "addresses" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "customer_id" INTEGER NOT NULL,
  "label" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "street_1" TEXT NOT NULL,
  "street_2" TEXT,
  "city" TEXT NOT NULL,
  "region" TEXT,
  "postal_code" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'US',
  "is_default" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
CREATE INDEX IF NOT EXISTS "addresses_customer_idx" ON "addresses" ("customer_id");
CREATE INDEX IF NOT EXISTS "addresses_customer_default_idx" ON "addresses" ("customer_id", "is_default");
