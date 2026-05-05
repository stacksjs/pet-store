CREATE TABLE IF NOT EXISTS "reviews" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "rating" INTEGER,
  "title" TEXT,
  "content" TEXT,
  "is_verified_purchase" INTEGER,
  "is_approved" INTEGER,
  "is_featured" INTEGER,
  "helpful_votes" INTEGER default 0,
  "unhelpful_votes" INTEGER default 0,
  "purchase_date" TEXT,
  "images" TEXT,
  "product_id" INTEGER,
  "customer_id" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);