CREATE TABLE IF NOT EXISTS "order_items" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "quantity" INTEGER default 1,
  "price" INTEGER,
  "special_instructions" TEXT,
  "order_id" INTEGER,
  "product_id" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);