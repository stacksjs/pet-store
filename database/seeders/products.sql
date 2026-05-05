-- BareBowl launch catalog: 5 dog-only single-ingredient treats.
-- Re-runnable: deletes existing rows by slug then inserts fresh.
DELETE FROM products WHERE slug IN (
  'beef-liver','duck-neck','turkey-gizzard','lamb-lung','rabbit-ear'
);

INSERT INTO products (
  slug, name, description, tagline, ingredient, pet_species, weight_grams,
  price, image_url, sourced_from, inventory_count, is_available,
  guaranteed_analysis
) VALUES
('beef-liver',
 'Freeze-Dried Beef Liver',
 'Iron-rich, single-cut beef liver. Freeze-dried at low temperature so the nutrients stay where they belong.',
 'Iron-rich, single-cut beef liver. Freeze-dried at low temperature so the nutrients stay where they belong.',
 'Beef Liver','dog',113,18,
 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=1200&q=80',
 'USDA-Inspected · Family Ranch, Idaho',50,1,
 '{"protein":"68%","fat":"14%","fiber":"< 1%","moisture":"4%"}'),

('duck-neck',
 'Air-Dried Duck Necks',
 'A long-lasting natural chew. Soft enough for seniors, dense enough to clean teeth.',
 'A long-lasting natural chew. Soft enough for seniors, dense enough to clean teeth.',
 'Pasture-Raised Duck Neck','dog',227,28,
 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&q=80',
 'Pasture-Raised · Hudson Valley, NY',35,1,
 '{"protein":"42%","fat":"21%","fiber":"< 1%","moisture":"8%"}'),

('turkey-gizzard',
 'Freeze-Dried Turkey Gizzard',
 'Lean, taurine-rich training treats. Heart-healthy and shelf-stable without preservatives.',
 'Lean, taurine-rich training treats. Heart-healthy and shelf-stable without preservatives.',
 'Turkey Gizzard','dog',170,21,
 'https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=1200&q=80',
 'USDA-Inspected · Plainville Farms, PA',40,1,
 '{"protein":"64%","fat":"12%","fiber":"< 1%","moisture":"5%"}'),

('lamb-lung',
 'Air-Dried Lamb Lung',
 'Light and crispy training treats. Easy to break, easy to digest.',
 'Light and crispy training treats. Easy to break, easy to digest.',
 'New Zealand Lamb Lung','dog',113,19,
 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=1200&q=80',
 'Pasture-Raised · New Zealand',45,1,
 '{"protein":"60%","fat":"10%","fiber":"< 1%","moisture":"6%"}'),

('rabbit-ear',
 'Whole Rabbit Ears',
 'A natural, gnaw-friendly chew. Novel protein for sensitive dogs.',
 'A natural, gnaw-friendly chew. Novel protein for sensitive dogs.',
 'Free-Range Rabbit Ear','dog',170,24,
 'https://images.unsplash.com/photo-1583511666372-62fc211f8377?w=1200&q=80',
 'Free-Range · Czech Republic',25,1,
 '{"protein":"52%","fat":"14%","fiber":"< 1%","moisture":"7%"}');
