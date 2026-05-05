import { db, Seeder } from '@stacksjs/database'

/**
 * BareBowl ships dog treats only — single-ingredient, freeze-dried or
 * air-dried, from named, traceable sources. The 5 SKUs below are the
 * launch catalog the marketing pages refer to. Re-running is safe:
 * we upsert by `slug`.
 */
const treats = [
  {
    slug: 'beef-liver',
    name: 'Freeze-Dried Beef Liver',
    description: 'Iron-rich, single-cut beef liver. Freeze-dried at low temperature so the nutrients stay where they belong.',
    tagline: 'Iron-rich, single-cut beef liver. Freeze-dried at low temperature so the nutrients stay where they belong.',
    ingredient: 'Beef Liver',
    pet_species: 'dog',
    weight_grams: 113,
    price: 18,
    image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=1200&q=80',
    sourced_from: 'USDA-Inspected · Family Ranch, Idaho',
    inventory_count: 50,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '68%', fat: '14%', fiber: '< 1%', moisture: '4%' }),
  },
  {
    slug: 'duck-neck',
    name: 'Air-Dried Duck Necks',
    description: 'A long-lasting natural chew. Soft enough for seniors, dense enough to clean teeth.',
    tagline: 'A long-lasting natural chew. Soft enough for seniors, dense enough to clean teeth.',
    ingredient: 'Pasture-Raised Duck Neck',
    pet_species: 'dog',
    weight_grams: 227,
    price: 28,
    image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&q=80',
    sourced_from: 'Pasture-Raised · Hudson Valley, NY',
    inventory_count: 35,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '42%', fat: '21%', fiber: '< 1%', moisture: '8%' }),
  },
  {
    slug: 'turkey-gizzard',
    name: 'Freeze-Dried Turkey Gizzard',
    description: 'Lean, taurine-rich training treats. Heart-healthy and shelf-stable without preservatives.',
    tagline: 'Lean, taurine-rich training treats. Heart-healthy and shelf-stable without preservatives.',
    ingredient: 'Turkey Gizzard',
    pet_species: 'dog',
    weight_grams: 170,
    price: 21,
    image_url: 'https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=1200&q=80',
    sourced_from: 'USDA-Inspected · Plainville Farms, PA',
    inventory_count: 40,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '64%', fat: '12%', fiber: '< 1%', moisture: '5%' }),
  },
  {
    slug: 'lamb-lung',
    name: 'Air-Dried Lamb Lung',
    description: 'Light and crispy training treats. Easy to break, easy to digest.',
    tagline: 'Light and crispy training treats. Easy to break, easy to digest.',
    ingredient: 'New Zealand Lamb Lung',
    pet_species: 'dog',
    weight_grams: 113,
    price: 19,
    image_url: 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=1200&q=80',
    sourced_from: 'Pasture-Raised · New Zealand',
    inventory_count: 45,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '60%', fat: '10%', fiber: '< 1%', moisture: '6%' }),
  },
  {
    slug: 'rabbit-ear',
    name: 'Whole Rabbit Ears',
    description: 'A natural, gnaw-friendly chew. Novel protein for sensitive dogs.',
    tagline: 'A natural, gnaw-friendly chew. Novel protein for sensitive dogs.',
    ingredient: 'Free-Range Rabbit Ear',
    pet_species: 'dog',
    weight_grams: 170,
    price: 24,
    image_url: 'https://images.unsplash.com/photo-1583511666372-62fc211f8377?w=1200&q=80',
    sourced_from: 'Free-Range · Czech Republic',
    inventory_count: 25,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '52%', fat: '14%', fiber: '< 1%', moisture: '7%' }),
  },
]

export default class ProductsSeeder extends Seeder {
  async run(): Promise<void> {
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
