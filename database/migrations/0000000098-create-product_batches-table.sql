-- Per-batch lab reports surfaced behind the public batch-code lookup
-- on /standard. Every bag prints a code (e.g. "PS-2026-0421-A") which
-- the customer can paste into the form to see the third-party
-- laboratory results for THAT batch — protein/fat/fiber/moisture
-- numbers, pathogen screen pass/fail, and the lab document URL.
--
-- Read-only on the storefront. New rows land via the (still TODO)
-- internal Buddy command + a CSV upload from the lab partner.

CREATE TABLE IF NOT EXISTS "product_batches" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "code" TEXT NOT NULL UNIQUE,
  "product_slug" TEXT NOT NULL,
  "processed_at" TEXT NOT NULL,
  "lab_protein" TEXT,
  "lab_fat" TEXT,
  "lab_fiber" TEXT,
  "lab_moisture" TEXT,
  "lab_pathogen_screen" TEXT CHECK ("lab_pathogen_screen" IN ('pass', 'fail')) DEFAULT 'pass',
  "lab_partner" TEXT,
  "lab_report_url" TEXT,
  "sourced_from" TEXT,
  "notes" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT
);

CREATE INDEX IF NOT EXISTS "product_batches_code_idx" ON "product_batches" ("code");
CREATE INDEX IF NOT EXISTS "product_batches_product_slug_idx" ON "product_batches" ("product_slug");
