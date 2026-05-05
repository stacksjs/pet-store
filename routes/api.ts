import { response, route } from '@stacksjs/router'

/**
 * BareBowl storefront routes.
 *
 * Framework routes (auth, dashboard, commerce admin, CMS, etc.) are
 * loaded automatically from storage/framework/defaults/routes/dashboard.ts.
 * Anything below is the public storefront surface.
 *
 * @see https://docs.stacksjs.com/routing
 */

// Health
route.get('/health', () => response.json({ status: 'ok', name: 'BareBowl' }))

// Cart + checkout. CSRF is skipped because the storefront uses
// progressive-enhancement HTML forms — no JS to mint a token — and
// the cart is already gated by an opaque session cookie that can't
// be guessed.
route.post('/api/cart/add', 'Actions/Storefront/AddToCartAction').skipCsrf()
route.post('/api/cart/update', 'Actions/Storefront/UpdateCartItemAction').skipCsrf()
route.post('/api/checkout', 'Actions/Storefront/CheckoutAction').skipCsrf()

// Coming-soon page kept from the scaffold for marketing redirects.
route.get('/coming-soon', 'Controllers/ComingSoonController@index')
