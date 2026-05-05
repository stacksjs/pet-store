import { response, route } from '@stacksjs/router'

/**
 * Pet-store custom routes.
 *
 * Framework defaults — storefront cart + checkout, auth, dashboard,
 * commerce admin, CMS — are loaded automatically from
 * storage/framework/defaults/routes/dashboard.ts. Anything below is
 * pet-store specific.
 *
 * @see https://docs.stacksjs.com/routing
 */

route.get('/health', () => response.json({ status: 'ok', name: 'PetStore' }))
route.get('/coming-soon', 'Controllers/ComingSoonController@index')
