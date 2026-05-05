CREATE TABLE IF NOT EXISTS "orders" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "status" TEXT,
  "total_amount" INTEGER,
  "tax_amount" INTEGER,
  "discount_amount" INTEGER,
  "delivery_fee" INTEGER,
  "tip_amount" INTEGER,
  "order_type" TEXT,
  "delivery_address" TEXT,
  "special_instructions" TEXT,
  "estimated_delivery_time" TEXT,
  "applied_coupon_id" INTEGER,
  "customer_id" INTEGER,
  "coupon_id" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);