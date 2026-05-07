import { db, Seeder } from '@stacksjs/database'

/**
 * Pet-store launch catalog: six dog-only single-ingredient
 * (or near-single-ingredient) treats. The launch line is *dehydrated*
 * — freeze-dried versions are on the roadmap and gated behind the
 * waitlist signup on the storefront. Re-running is safe: we upsert by
 * `slug`.
 *
 * Imagery lives in `public/images/products/<slug>.jpg`. Hosting the
 * files in-repo means the catalog doesn't break when an upstream CDN
 * rehashes their URLs (the prior Unsplash references rotted within a
 * release cycle), and we get one consistent visual treatment across
 * the line — whole-pile shots on white.
 */
const treats = [
  {
    slug: 'chicken-paws',
    name: 'Dehydrated Chicken Paws',
    description: 'Whole, single-cut chicken paws. Long-lasting natural chew, naturally rich in glucosamine and chondroitin for joints.',
    tagline: 'Long-lasting natural chew. Joint-supporting glucosamine, no additives.',
    ingredient: 'Chicken Paws',
    pet_species: 'dog',
    weight_grams: 227,
    price: 22,
    image_url: '/images/products/chicken-paws.jpg',
    sourced_from: 'USDA-Inspected · Pennsylvania',
    inventory_count: 60,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '58%', fat: '19%', fiber: '< 1%', moisture: '8%' }),
  },
  {
    slug: 'beef-liver',
    name: 'Dehydrated Beef Liver',
    description: 'Iron-rich, single-cut beef liver. Slow-dehydrated at low temperature so the nutrients stay where they belong.',
    tagline: 'Iron-rich training treats. One cut. Nothing else.',
    ingredient: 'Beef Liver',
    pet_species: 'dog',
    weight_grams: 113,
    price: 18,
    image_url: '/images/products/beef-liver.jpg',
    sourced_from: 'USDA-Inspected · Family Ranch, Idaho',
    inventory_count: 75,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '68%', fat: '14%', fiber: '< 1%', moisture: '6%' }),
  },
  {
    slug: 'chicken-liver',
    name: 'Dehydrated Chicken Liver',
    description: 'Light, crumbly training bites. Pure chicken liver, dehydrated whole.',
    tagline: 'Tiny, taurine-rich training bites. Pure chicken liver.',
    ingredient: 'Chicken Liver',
    pet_species: 'dog',
    weight_grams: 85,
    price: 15,
    image_url: '/images/products/chicken-liver.jpg',
    sourced_from: 'Free-Range · Mary\'s Farm, California',
    inventory_count: 90,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '70%', fat: '15%', fiber: '< 1%', moisture: '6%' }),
  },
  {
    slug: 'sweet-potatoes',
    name: 'Dehydrated Sweet Potato Chews',
    description: 'Slow-dried sweet potato strips. Naturally sweet, easy to digest, gentle on sensitive stomachs.',
    tagline: 'Slow-dried, no oil added. The vegetable that didn\'t need anything else.',
    ingredient: 'Sweet Potatoes',
    pet_species: 'dog',
    weight_grams: 170,
    price: 12,
    image_url: '/images/products/sweet-potatoes.jpg',
    sourced_from: 'Organic · North Carolina',
    inventory_count: 100,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '6%', fat: '< 1%', fiber: '12%', moisture: '8%' }),
  },
  {
    slug: 'leberwurst',
    name: 'Dehydrated Leberwurst — Liver & Sweet Potato Bites',
    description: 'Two real ingredients pressed into chewable squares: USDA beef liver and organic sweet potato. The liver brings iron and B-vitamins, the sweet potato brings fiber and a touch of sweetness most dogs go nuts for.',
    tagline: 'Two ingredients. Liver bringing the iron, sweet potato bringing the calm.',
    ingredient: 'Beef Liver, Sweet Potatoes',
    pet_species: 'dog',
    weight_grams: 142,
    price: 24,
    image_url: '/images/products/leberwurst.jpg',
    sourced_from: 'USDA-Inspected · Family Ranch, Idaho · Organic NC sweet potato',
    inventory_count: 50,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '52%', fat: '12%', fiber: '5%', moisture: '7%' }),
  },
  {
    slug: 'dog-seasoning',
    name: 'Dog Seasoning — Five-Ingredient Topper',
    description: 'Five real things, dehydrated and torn into bite-sized strips. Toss a handful onto kibble or fresh food for a meal upgrade your dog will absolutely notice.',
    tagline: 'Toss five real things on dinner. That\'s the whole product.',
    ingredient: 'Chicken Hearts, Chicken Gizzards, Beef Liver, Chicken Liver, Sweet Potatoes',
    pet_species: 'dog',
    weight_grams: 113,
    price: 28,
    image_url: '/images/products/dog-seasoning.jpg',
    sourced_from: 'USDA-Inspected · Family Ranch, Idaho',
    inventory_count: 80,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '54%', fat: '16%', fiber: '3%', moisture: '7%' }),
  },
]

// Slugs that have lived in this seeder at some point and need to be
// removed on every run so a `db:seed` doesn't leave orphan rows after
// a SKU rename. Keep the list cumulative — new renames append, old
// ones don't get removed (cheap idempotency).
const LEGACY_SLUGS_TO_REMOVE = ['duck-neck', 'turkey-gizzard', 'lamb-lung', 'rabbit-ear']

export default class ProductsSeeder extends Seeder {
  async run(): Promise<void> {
    for (const slug of LEGACY_SLUGS_TO_REMOVE) {
      await (db as any).deleteFrom('products').where('slug', '=', slug).execute()
    }

    for (const treat of treats) {
      const existing = await (db as any)
        .selectFrom('products')
        .where('slug', '=', treat.slug)
        .selectAll()
        .executeTakeFirst()

      if (existing) {
        await (db as any)
          .updateTable('products')
          .set(treat)
          .where('id', '=', existing.id)
          .execute()
      }
      else {
        await (db as any)
          .insertInto('products')
          .values(treat)
          .execute()
      }
    }
  }
}
