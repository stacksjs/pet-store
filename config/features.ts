import type { FeaturesConfig } from '@stacksjs/types'

/**
 * **Pet-store Feature Bundles**
 *
 * pet-store is a commerce demo app and relies on the framework's
 * dashboard + commerce + cms bundles for its storefront, admin SPA,
 * and content pages. We default to the kitchen-sink so the app boots
 * with the same surface area it had before the feature-manifest
 * landed; trim by running `./buddy <feature>:uninstall` as needed.
 */
export default {
  core: true,
  auth: true,
  marketing: true,
  cms: true,
  commerce: true,
  dashboard: true,
  monitoring: true,
  realtime: true,
  queue: true,
} satisfies FeaturesConfig
