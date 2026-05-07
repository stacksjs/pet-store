-- A handful of seed batch codes so the /standard batch-code lookup
-- has something real to surface during dev + demos. The format
-- "PS-YYYY-MMDD-A" matches what's printed on the bag (PS = PetStore;
-- the trailing letter increments per same-day run).
--
-- Every batch has passed pathogen screen — failures don't ship.

DELETE FROM product_batches WHERE code LIKE 'PS-2026-%';

INSERT INTO product_batches (
  code, product_slug, processed_at,
  lab_protein, lab_fat, lab_fiber, lab_moisture,
  lab_pathogen_screen, lab_partner, sourced_from, notes
) VALUES
('PS-2026-0421-A', 'beef-liver',     '2026-04-21',
 '67.8%', '14.1%', '< 1%', '5.9%',
 'pass', 'Eurofins Scientific',
 'USDA-Inspected · Family Ranch, Idaho',
 'Above-spec protein (target 65%); within tolerance on all other metrics.'),

('PS-2026-0421-B', 'beef-liver',     '2026-04-21',
 '68.2%', '13.8%', '< 1%', '6.1%',
 'pass', 'Eurofins Scientific',
 'USDA-Inspected · Family Ranch, Idaho',
 'Sister batch to PS-2026-0421-A; shipped to Pacific NW + Mountain West fulfillment.'),

('PS-2026-0418-A', 'chicken-paws',   '2026-04-18',
 '57.4%', '19.2%', '< 1%', '7.8%',
 'pass', 'Eurofins Scientific',
 'USDA-Inspected · Pennsylvania',
 'First batch of the spring run.'),

('PS-2026-0415-A', 'chicken-liver',  '2026-04-15',
 '69.9%', '14.7%', '< 1%', '5.5%',
 'pass', 'Covance Food Solutions',
 'Free-Range · Mary''s Farm, California',
 ''),

('PS-2026-0410-A', 'sweet-potatoes', '2026-04-10',
 '5.9%',  '< 1%', '12.4%', '7.6%',
 'pass', 'Covance Food Solutions',
 'Organic · North Carolina',
 'Sourced from Thompson Farms; organic certification on file.'),

('PS-2026-0408-A', 'leberwurst',     '2026-04-08',
 '52.3%', '11.9%', '5.1%',  '6.8%',
 'pass', 'Eurofins Scientific',
 'USDA-Inspected · Family Ranch, Idaho · Organic NC sweet potato',
 'Two-ingredient blend: 70% beef liver / 30% sweet potato by weight.'),

('PS-2026-0405-A', 'dog-seasoning',  '2026-04-05',
 '53.8%', '15.6%', '3.2%',  '6.9%',
 'pass', 'Eurofins Scientific',
 'USDA-Inspected · Family Ranch, Idaho',
 'Five-ingredient blend per spec.');
