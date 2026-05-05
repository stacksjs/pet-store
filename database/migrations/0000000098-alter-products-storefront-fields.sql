-- Storefront fields for the BareBowl product catalog.
-- The default `products` table is a generic restaurant-flavored schema
-- (preparation_time, allergens, nutritional_info). BareBowl needs single-
-- ingredient pet-treat columns plus a URL slug.
ALTER TABLE "products" ADD COLUMN "slug" TEXT;
ALTER TABLE "products" ADD COLUMN "pet_species" TEXT;
ALTER TABLE "products" ADD COLUMN "ingredient" TEXT;
ALTER TABLE "products" ADD COLUMN "weight_grams" INTEGER;
ALTER TABLE "products" ADD COLUMN "sourced_from" TEXT;
ALTER TABLE "products" ADD COLUMN "guaranteed_analysis" TEXT;
ALTER TABLE "products" ADD COLUMN "tagline" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_unique" ON "products" ("slug");
