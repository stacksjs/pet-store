import { response, route } from '@stacksjs/router'

/**
 * Pet-store custom routes.
 *
 * Framework defaults — storefront cart + checkout, auth, dashboard,
 * commerce admin, CMS — are loaded automatically from
 * storage/framework/defaults/routes/dashboard.ts. Anything below is
 * pet-store specific.
 *
 * bun-router is first-registration-wins, and user routes load before
 * framework routes, so anything declared here overrides the matching
 * framework default. Don't edit the dashboard.ts file directly — add
 * the override here instead.
 *
 * @see https://docs.stacksjs.com/routing
 */

route.get('/health', () => response.json({ status: 'ok', name: 'PetStore' }))
route.get('/coming-soon', 'Controllers/ComingSoonController@index')

// ============================================================================
// Storefront customer session
//
// Login is a stub today — accepts an email and sets the
// `stacks_customer` cookie if the address matches a row in
// `customers`, with no password check. See LoginAction's header for
// the upgrade path (magic-link or password_hash). Logout just clears
// the cookie.
//
// CSRF is skipped for the same reason the cart routes skip it: the
// storefront uses progressive-enhancement HTML forms with no JS to
// mint a token, and the auth check happens server-side anyway.
// ============================================================================
route.post('/api/auth/login', 'Actions/Storefront/LoginAction').skipCsrf()
route.post('/api/auth/logout', 'Actions/Storefront/LogoutAction').skipCsrf()

// Self-serve profile edit. Reads the `stacks_customer` cookie inside
// the action — no separate middleware — and rate-limits per IP.
route.post('/api/account/profile', 'Actions/Storefront/UpdateProfileAction').skipCsrf()
