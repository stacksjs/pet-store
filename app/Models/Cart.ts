import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'Cart',
  table: 'carts',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSearch: {
      displayable: ['id', 'customerId', 'status', 'totalItems', 'subtotal', 'total', 'expiresAt'],
      searchable: ['id', 'customerId', 'status'],
      sortable: ['createdAt', 'updatedAt', 'expiresAt', 'total'],
      filterable: ['status', 'customerId'],
    },

    useSeeder: {
      count: 10,
    },

    useApi: {
      uri: 'carts',
    },

    observe: true,
  },

  hasMany: ['CartItem'],
  belongsTo: ['Customer', 'Coupon'],

  attributes: {
    status: {
      default: 'active',
      order: 1,
      fillable: true,
      validation: {
        rule: schema.enum(['active', 'abandoned', 'converted', 'expired']),
      },
      factory: faker => faker.helpers.arrayElement(['active', 'abandoned', 'converted', 'expired']),
    },

    totalItems: {
      default: 0,
      order: 2,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: faker => faker.number.int({ min: 0, max: 20 }),
    },

    subtotal: {
      default: 0,
      order: 3,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: faker => faker.number.int({ min: 0, max: 1000 }),
    },

    taxAmount: {
      default: 0,
      order: 4,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: faker => faker.number.int({ min: 0, max: 200 }),
    },

    discountAmount: {
      default: 0,
      order: 5,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: faker => faker.number.int({ min: 0, max: 100 }),
    },

    total: {
      default: 0,
      order: 6,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: faker => faker.number.int({ min: 0, max: 1200 }),
    },

    expiresAt: {
      order: 7,
      fillable: true,
      validation: {
        rule: schema.timestamp().required(),
      },
      factory: (faker) => {
        const date = faker.date.past()
        return date.toISOString().slice(0, 19).replace('T', ' ')
      },
    },

    currency: {
      default: 'USD',
      order: 8,
      fillable: true,
      validation: {
        rule: schema.string().max(3),
      },
      factory: faker => faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'JPY', 'AUD']),
    },

    notes: {
      order: 9,
      fillable: true,
      validation: {
        rule: schema.string().max(1000),
      },
      factory: faker => faker.lorem.sentence(),
    },

    appliedCouponId: {
      order: 10,
      fillable: true,
      validation: {
        rule: schema.string().required(),
      },
      factory: () => 'test-coupon-id',
    },

    // Anonymous-cart identifier. Cookie-keyed so a guest shopper can
    // come back to the same cart without logging in.
    sessionToken: {
      order: 11,
      fillable: true,
      unique: true,
      validation: {
        rule: schema.string().max(64),
      },
      factory: faker => faker.string.uuid(),
    },

    // Multi-step checkout state. Each column maps to one of the
    // checkout steps the storefront walks the shopper through, so the
    // cart row is the source of truth between steps.
    email: {
      order: 12,
      fillable: true,
      validation: {
        rule: schema.string().email().max(255),
      },
      factory: faker => faker.internet.email(),
    },

    shippingName: {
      order: 13,
      fillable: true,
      validation: {
        rule: schema.string().max(120),
      },
      factory: faker => faker.person.fullName(),
    },

    shippingAddress: {
      order: 14,
      fillable: true,
      validation: {
        rule: schema.string().max(255),
      },
      factory: faker => faker.location.streetAddress(),
    },

    shippingCity: {
      order: 15,
      fillable: true,
      validation: {
        rule: schema.string().max(120),
      },
      factory: faker => faker.location.city(),
    },

    shippingState: {
      order: 16,
      fillable: true,
      validation: {
        rule: schema.string().max(60),
      },
      factory: faker => faker.location.state({ abbreviated: true }),
    },

    shippingZip: {
      order: 17,
      fillable: true,
      validation: {
        rule: schema.string().max(20),
      },
      factory: faker => faker.location.zipCode(),
    },

    checkoutStep: {
      default: 'cart',
      order: 18,
      fillable: true,
      validation: {
        rule: schema.enum(['cart', 'contact', 'shipping', 'payment', 'placed']),
      },
      factory: faker => faker.helpers.arrayElement(['cart', 'contact', 'shipping', 'payment', 'placed']),
    },
  },

  dashboard: {
    highlight: true,
  },
} as const)
