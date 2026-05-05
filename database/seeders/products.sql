-- Pet-store launch catalog: 5 dog-only single-ingredient treats.
-- Re-runnable: deletes existing rows by slug then inserts fresh.
DELETE FROM products WHERE slug IN (
  'chicken-paws','dog-seasoning','beef-liver','chicken-liver','sweet-potatoes',
  -- legacy slugs from the earlier scaffold; deleted on every seed so
  -- old rows don't linger after a SKU rename.
  'duck-neck','turkey-gizzard','lamb-lung','rabbit-ear'
);

INSERT INTO products (
  slug, name, description, tagline, ingredient, pet_species, weight_grams,
  price, image_url, sourced_from, inventory_count, is_available,
  guaranteed_analysis
) VALUES
('chicken-paws',
 'Freeze-Dried Chicken Paws',
 'Whole, single-cut chicken paws. Long-lasting natural chew, naturally rich in glucosamine and chondroitin for joints.',
 'Long-lasting natural chew. Joint-supporting glucosamine, no additives.',
 'Chicken Paws','dog',227,22,
 'https://images.unsplash.com/photo-1601758003122-53c40e686a19?w=1200&q=80',
 'USDA-Inspected · Pennsylvania',60,1,
 '{"protein":"58%","fat":"19%","fiber":"< 1%","moisture":"6%"}'),

('dog-seasoning',
 'Dog Seasoning — Five-Ingredient Powder',
 'A finely milled topper made from five things: chicken hearts, chicken gizzards, beef liver, chicken liver, and sweet potatoes. Sprinkle on kibble or fresh food.',
 'Sprinkle five real things on dinner. That''s the whole product.',
 'Chicken Hearts, Chicken Gizzards, Beef Liver, Chicken Liver, Sweet Potatoes','dog',113,28,
 'https://images.unsplash.com/photo-1606851094291-6efae152bb87?w=1200&q=80',
 'USDA-Inspected · Family Ranch, Idaho',80,1,
 '{"protein":"54%","fat":"16%","fiber":"3%","moisture":"5%"}'),

('beef-liver',
 'Freeze-Dried Beef Liver',
 'Iron-rich, single-cut beef liver. Freeze-dried at low temperature so the nutrients stay where they belong.',
 'Iron-rich training treats. One cut. Nothing else.',
 'Beef Liver','dog',113,18,
 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=1200&q=80',
 'USDA-Inspected · Family Ranch, Idaho',75,1,
 '{"protein":"68%","fat":"14%","fiber":"< 1%","moisture":"4%"}'),

('chicken-liver',
 'Freeze-Dried Chicken Liver',
 'Light, crumbly training bites. Pure chicken liver, freeze-dried whole.',
 'Tiny, taurine-rich training bites. Pure chicken liver.',
 'Chicken Liver','dog',85,15,
 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1200&q=80',
 'Free-Range · Mary''s Farm, California',90,1,
 '{"protein":"70%","fat":"15%","fiber":"< 1%","moisture":"4%"}'),

('sweet-potatoes',
 'Dehydrated Sweet Potato Chews',
 'Slow-dried sweet potato strips. Naturally sweet, easy to digest, gentle on sensitive stomachs.',
 'Slow-dried, no oil added. The vegetable that didn''t need anything else.',
 'Sweet Potatoes','dog',170,12,
 'https://images.unsplash.com/photo-1596097635121-14b63b7a0c23?w=1200&q=80',
 'Organic · North Carolina',100,1,
 '{"protein":"6%","fat":"< 1%","fiber":"12%","moisture":"8%"}');
