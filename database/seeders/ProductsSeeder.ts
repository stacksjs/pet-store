import { db, Seeder } from '@stacksjs/database'

/**
 * Pet-store launch catalog: five dog-only single-ingredient treats.
 * Re-running is safe — we upsert by `slug`.
 */
const treats = [
  {
    slug: 'chicken-paws',
    name: 'Freeze-Dried Chicken Paws',
    description: 'Whole, single-cut chicken paws. Long-lasting natural chew, naturally rich in glucosamine and chondroitin for joints.',
    tagline: 'Long-lasting natural chew. Joint-supporting glucosamine, no additives.',
    ingredient: 'Chicken Paws',
    pet_species: 'dog',
    weight_grams: 227,
    price: 22,
    image_url: 'https://images.unsplash.com/photo-1601758003122-53c40e686a19?w=1200&q=80',
    sourced_from: 'USDA-Inspected · Pennsylvania',
    inventory_count: 60,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '58%', fat: '19%', fiber: '< 1%', moisture: '6%' }),
  },
  {
    slug: 'dog-seasoning',
    name: 'Dog Seasoning — Five-Ingredient Powder',
    description: 'A finely milled topper made from five things: chicken hearts, chicken gizzards, beef liver, chicken liver, and sweet potatoes. Sprinkle on kibble or fresh food.',
    tagline: 'Sprinkle five real things on dinner. That\'s the whole product.',
    ingredient: 'Chicken Hearts, Chicken Gizzards, Beef Liver, Chicken Liver, Sweet Potatoes',
    pet_species: 'dog',
    weight_grams: 113,
    price: 28,
    image_url: 'https://images.unsplash.com/photo-1606851094291-6efae152bb87?w=1200&q=80',
    sourced_from: 'USDA-Inspected · Family Ranch, Idaho',
    inventory_count: 80,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '54%', fat: '16%', fiber: '3%', moisture: '5%' }),
  },
  {
    slug: 'beef-liver',
    name: 'Freeze-Dried Beef Liver',
    description: 'Iron-rich, single-cut beef liver. Freeze-dried at low temperature so the nutrients stay where they belong.',
    tagline: 'Iron-rich training treats. One cut. Nothing else.',
    ingredient: 'Beef Liver',
    pet_species: 'dog',
    weight_grams: 113,
    price: 18,
    image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=1200&q=80',
    sourced_from: 'USDA-Inspected · Family Ranch, Idaho',
    inventory_count: 75,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '68%', fat: '14%', fiber: '< 1%', moisture: '4%' }),
  },
  {
    slug: 'chicken-liver',
    name: 'Freeze-Dried Chicken Liver',
    description: 'Light, crumbly training bites. Pure chicken liver, freeze-dried whole.',
    tagline: 'Tiny, taurine-rich training bites. Pure chicken liver.',
    ingredient: 'Chicken Liver',
    pet_species: 'dog',
    weight_grams: 85,
    price: 15,
    image_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1200&q=80',
    sourced_from: 'Free-Range · Mary\'s Farm, California',
    inventory_count: 90,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '70%', fat: '15%', fiber: '< 1%', moisture: '4%' }),
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
    image_url: 'https://images.unsplash.com/photo-1596097635121-14b63b7a0c23?w=1200&q=80',
    sourced_from: 'Organic · North Carolina',
    inventory_count: 100,
    is_available: 1,
    guaranteed_analysis: JSON.stringify({ protein: '6%', fat: '< 1%', fiber: '12%', moisture: '8%' }),
  },
]

const LEGACY_SLUGS_TO_REMOVE = ['duck-neck', 'turkey-gizzard', 'lamb-lung', 'rabbit-ear']

export default class ProductsSeeder extends Seeder {
  async run(): Promise<void> {
    // Drop legacy SKUs that were renamed since the previous seed.
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
