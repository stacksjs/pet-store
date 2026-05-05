CREATE TABLE IF NOT EXISTS "customers" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "total_spent" INTEGER default 0,
  "last_order" TEXT,
  "status" TEXT CHECK ("status" IN ('Active', 'Inactive')) default 'Active',
  "avatar" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);