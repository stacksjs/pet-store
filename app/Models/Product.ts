import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'Product',
  table: 'products',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSearch: {
      displayable: ['id', 'name', 'description', 'price', 'ingredient', 'petSpecies', 'lifeStage', 'isAvailable', 'inventoryCount'],
      searchable: ['name', 'description', 'ingredient'],
      sortable: ['price', 'createdAt', 'updatedAt', 'inventoryCount'],
      filterable: ['categoryId', 'petSpecies', 'lifeStage', 'isAvailable'],
    },

    useSeeder: {
      count: 12,
    },

    useApi: {
      uri: 'products',
    },

    observe: true,
  },

  belongsTo: ['Category'],

  hasMany: ['Review', 'CartItem', 'OrderItem'],

  attributes: {
    name: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.string().required().max(100),
        message: { max: 'Name must have a maximum of 100 characters' },
      },
      factory: (faker) => {
        const cuts = ['Beef Liver', 'Chicken Heart', 'Lamb Lung', 'Salmon Skin', 'Duck Neck', 'Turkey Gizzard', 'Bison Trachea', 'Rabbit Ear', 'Sardine']
        const formats = ['Freeze-Dried', 'Air-Dried', 'Raw Frozen']
        return `${faker.helpers.arrayElement(formats)} ${faker.helpers.arrayElement(cuts)}`
      },
    },

    description: {
      order: 2,
      fillable: true,
      validation: { rule: schema.string() },
      factory: () => 'A single, traceable, human-grade ingredient. Nothing else. Nothing fillerish, nothing weird.',
    },

    price: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.number().required().min(1),
        message: { min: 'Price must be at least 1' },
      },
      factory: faker => faker.number.int({ min: 800, max: 4500 }),
    },

    imageUrl: {
      order: 4,
      fillable: true,
      validation: { rule: schema.string() },
      factory: faker => faker.image.urlPicsumPhotos({ width: 800, height: 800 }),
    },

    ingredient: {
      order: 5,
      fillable: true,
      validation: {
        rule: schema.string().required().max(80),
        message: { max: 'Ingredient must have a maximum of 80 characters' },
      },
      factory: faker => faker.helpers.arrayElement(['Beef Liver', 'Chicken Heart', 'Lamb Lung', 'Salmon Skin', 'Duck Neck', 'Turkey Gizzard']),
    },

    petSpecies: {
      order: 6,
      fillable: true,
      validation: { rule: schema.string().required() },
      factory: faker => faker.helpers.arrayElement(['dog', 'cat']),
    },

    lifeStage: {
      order: 7,
      fillable: true,
      validation: { rule: schema.string() },
      factory: faker => faker.helpers.arrayElement(['puppy', 'adult', 'senior', 'all']),
    },

    weightGrams: {
      order: 8,
      fillable: true,
      validation: {
        rule: schema.number().min(1),
        message: { min: 'Weight must be at least 1g' },
      },
      factory: faker => faker.helpers.arrayElement([56, 85, 113, 170, 227, 340]),
    },

    isAvailable: {
      order: 9,
      fillable: true,
      validation: { rule: schema.boolean() },
      factory: () => true,
    },

    inventoryCount: {
      order: 10,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
        message: { min: 'Inventory count must be at least 0' },
      },
      factory: faker => faker.number.int({ min: 0, max: 250 }),
    },

    sourcedFrom: {
      order: 11,
      fillable: true,
      validation: { rule: schema.string() },
      factory: faker => faker.helpers.arrayElement(['USDA-Inspected US Farm', 'New Zealand Pasture', 'Wild-Caught Alaskan', 'Family Ranch, Idaho']),
    },
  },

  dashboard: {
    highlight: true,
  },
} as const)
