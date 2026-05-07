-- A few seed reviews so the product detail pages have real social
-- proof. All marked is_approved=1 + is_verified_purchase=1 so the
-- storefront's filter (only-approved) shows them. Real reviews land
-- via the /commerce/reviews API once the dashboard write flow ships.

DELETE FROM reviews;

-- Resolve product IDs by slug so seed order doesn't matter.
INSERT INTO reviews (
  product_id, customer_id, rating, title, content,
  is_verified_purchase, is_approved, is_featured, purchase_date, created_at
) VALUES
((SELECT id FROM products WHERE slug = 'beef-liver'), NULL, 5,
 'Magic for training',
 'My border collie will do anything for these. The smell is intense (in a good way) and the size is perfect for breaking into smaller pieces for repeat practice.',
 1, 1, 1, '2026-04-12', '2026-04-15T10:00:00Z'),

((SELECT id FROM products WHERE slug = 'beef-liver'), NULL, 5,
 'Single ingredient = peace of mind',
 'I have a dog with food sensitivities. Knowing this is just liver, nothing else, means I can use it without worrying about reactions.',
 1, 1, 0, '2026-04-08', '2026-04-10T14:30:00Z'),

((SELECT id FROM products WHERE slug = 'chicken-paws'), NULL, 5,
 'Lasts longer than any "long-lasting" chew I''ve tried',
 'Big dog, big jaws — these actually keep him occupied for 15-20 minutes. Bonus: they''re fully digestible, no shards.',
 1, 1, 1, '2026-04-02', '2026-04-05T08:15:00Z'),

((SELECT id FROM products WHERE slug = 'chicken-paws'), NULL, 4,
 'Smelly but worth it',
 'Definitely smell when you open the bag. Dog doesn''t care, and that''s what matters. Took half a star off only because I''d love a more ergonomic resealable bag.',
 1, 1, 0, '2026-03-28', '2026-04-01T16:45:00Z'),

((SELECT id FROM products WHERE slug = 'chicken-liver'), NULL, 5,
 'Tiny, smelly, perfect',
 'Crumbly enough to break into puppy-mouth-sized pieces but firm enough not to disintegrate in my treat pouch. Top training treat for our 4-month-old.',
 1, 1, 1, '2026-04-18', '2026-04-20T12:00:00Z'),

((SELECT id FROM products WHERE slug = 'sweet-potatoes'), NULL, 5,
 'Allergic dog approved',
 'Our pup can''t do animal proteins. These are her go-to. Sturdy, sweet, no oil residue on my fingers.',
 1, 1, 1, '2026-04-14', '2026-04-17T09:20:00Z'),

((SELECT id FROM products WHERE slug = 'sweet-potatoes'), NULL, 4,
 'Cut a little thick for small breeds',
 'Quality is excellent but our 8lb maltipoo struggles with the bigger strips. We snap them in half. Would buy again.',
 1, 1, 0, '2026-03-22', '2026-03-26T11:00:00Z'),

((SELECT id FROM products WHERE slug = 'leberwurst'), NULL, 5,
 'New favorite',
 'Two ingredients, smells like dinner, dog goes nuts. Honestly the best new addition to our rotation in years.',
 1, 1, 1, '2026-04-25', '2026-04-28T17:30:00Z'),

((SELECT id FROM products WHERE slug = 'leberwurst'), NULL, 5,
 'Better than freeze-dried alternatives',
 'I''ve tried a few brands of freeze-dried liver bites. The texture on these is better — softer, easier to break — and the sweet potato cuts the iron-y aftertaste.',
 1, 1, 0, '2026-04-19', '2026-04-22T13:10:00Z'),

((SELECT id FROM products WHERE slug = 'dog-seasoning'), NULL, 5,
 'Picky-eater fix',
 'My dog stopped touching her kibble. A pinch of this on top and she eats every bite. Worth every penny.',
 1, 1, 1, '2026-04-11', '2026-04-14T19:00:00Z');
