CREATE TABLE IF NOT EXISTS "cart_items" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "quantity" INTEGER,
  "unit_price" INTEGER,
  "total_price" INTEGER,
  "tax_rate" INTEGER,
  "tax_amount" INTEGER,
  "discount_percentage" INTEGER,
  "discount_amount" INTEGER,
  "product_name" TEXT,
  "product_sku" TEXT,
  "product_image" TEXT,
  "notes" TEXT,
  "cart_id" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);