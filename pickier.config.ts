import type { PickierConfig } from 'pickier'
import { defaultConfig } from 'pickier'

/**
 * Pet-store pickier config.
 *
 * The defaults from `pickier/defaultConfig` already cover node_modules,
 * dist, build, etc. We extend the ignores to also skip the vendored
 * framework tree under `storage/framework/core/**` because that code
 * is rsync'd in from upstream `stacksjs/stacks` (see the
 * `chore(framework): sync` commits) — its lint debt belongs to the
 * upstream repo, not to pet-store. Linting it here would force every
 * pet-store PR to either fix unrelated upstream code or pile up
 * eslint-disable comments that get clobbered on the next sync.
 *
 * Generated artifacts under `storage/framework/api`,
 * `storage/framework/types`, and `storage/framework/auto-imports` are
 * also rebuilt from scratch by buddy and aren't authored by hand.
 */
const config: PickierConfig = {
  ...defaultConfig,
  ignores: [
    ...defaultConfig.ignores,
    'storage/framework/core/**',
    'storage/framework/api/**',
    'storage/framework/types/**',
    'storage/framework/auto-imports/**',
    'storage/framework/server/**',
    'storage/framework/cloud/**',
    'storage/framework/orm/**',
    'storage/framework/libs/**',
    'storage/framework/scripts/**',
    'storage/framework/cache/**',
    'storage/framework/docs/**',
    // `storage/framework/defaults/**` is upstream-vendored too. Pet-store
    // shadows specific files in here (e.g. our Storefront/* actions and
    // CustomerCookie helper); those still get linted because the user's
    // `routes/api.ts` and `resources/views/**` paths are the real source
    // of truth. Linting the rsync'd defaults churns on upstream debt.
    'storage/framework/defaults/**',
    'pantry/**',
    '.stx/**',
  ],
}

export default config
