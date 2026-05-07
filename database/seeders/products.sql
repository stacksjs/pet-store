-- Pet-store launch catalog: 6 dog-only single-ingredient treats.
-- Re-runnable: deletes existing rows by slug then inserts fresh.
DELETE FROM products WHERE slug IN (
  'chicken-paws','beef-liver','chicken-liver','sweet-potatoes','leberwurst','dog-seasoning',
  -- legacy slugs from earlier scaffolds; kept here so a re-seed cleans
  -- them up without us having to track which DBs were ahead.
  'duck-neck','turkey-gizzard','lamb-lung','rabbit-ear'
);

INSERT INTO products (
  slug, name, description, tagline, ingredient, pet_species, weight_grams,
  price, image_url, sourced_from, inventory_count, is_available,
  guaranteed_analysis
) VALUES
('chicken-paws',
 'Dehydrated Chicken Paws',
 'Whole, single-cut chicken paws. Long-lasting natural chew, naturally rich in glucosamine and chondroitin for joints.',
 'Long-lasting natural chew. Joint-supporting glucosamine, no additives.',
 'Chicken Paws','dog',227,22,
 '/images/products/chicken-paws.jpg',
 'USDA-Inspected · Pennsylvania',60,1,
 '{"protein":"58%","fat":"19%","fiber":"< 1%","moisture":"8%"}'),

('beef-liver',
 'Dehydrated Beef Liver',
 'Iron-rich, single-cut beef liver. Slow-dehydrated at low temperature so the nutrients stay where they belong.',
 'Iron-rich training treats. One cut. Nothing else.',
 'Beef Liver','dog',113,18,
 '/images/products/beef-liver.jpg',
 'USDA-Inspected · Family Ranch, Idaho',75,1,
 '{"protein":"68%","fat":"14%","fiber":"< 1%","moisture":"6%"}'),

('chicken-liver',
 'Dehydrated Chicken Liver',
 'Light, crumbly training bites. Pure chicken liver, dehydrated whole.',
 'Tiny, taurine-rich training bites. Pure chicken liver.',
 'Chicken Liver','dog',85,15,
 '/images/products/chicken-liver.jpg',
 'Free-Range · Mary''s Farm, California',90,1,
 '{"protein":"70%","fat":"15%","fiber":"< 1%","moisture":"6%"}'),

('sweet-potatoes',
 'Dehydrated Sweet Potato Chews',
 'Slow-dried sweet potato strips. Naturally sweet, easy to digest, gentle on sensitive stomachs.',
 'Slow-dried, no oil added. The vegetable that didn''t need anything else.',
 'Sweet Potatoes','dog',170,12,
 '/images/products/sweet-potatoes.jpg',
 'Organic · North Carolina',100,1,
 '{"protein":"6%","fat":"< 1%","fiber":"12%","moisture":"8%"}'),

('leberwurst',
 'Dehydrated Leberwurst — Liver & Sweet Potato Bites',
 'Two real ingredients pressed into chewable squares: USDA beef liver and organic sweet potato. The liver brings iron and B-vitamins, the sweet potato brings fiber and a touch of sweetness most dogs go nuts for.',
 'Two ingredients. Liver bringing the iron, sweet potato bringing the calm.',
 'Beef Liver, Sweet Potatoes','dog',142,24,
 '/images/products/leberwurst.jpg',
 'USDA-Inspected · Family Ranch, Idaho · Organic NC sweet potato',50,1,
 '{"protein":"52%","fat":"12%","fiber":"5%","moisture":"7%"}'),

('dog-seasoning',
 'Dog Seasoning — Five-Ingredient Topper',
 'Five real things, dehydrated and torn into bite-sized strips. Toss a handful onto kibble or fresh food for a meal upgrade your dog will absolutely notice.',
 'Toss five real things on dinner. That''s the whole product.',
 'Chicken Hearts, Chicken Gizzards, Beef Liver, Chicken Liver, Sweet Potatoes','dog',113,28,
 '/images/products/dog-seasoning.jpg',
 'USDA-Inspected · Family Ranch, Idaho',80,1,
 '{"protein":"54%","fat":"16%","fiber":"3%","moisture":"7%"}');
