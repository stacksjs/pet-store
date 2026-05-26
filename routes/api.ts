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

// One-click reorder. Takes an order UUID (capability token, same as
// /orders/{uuid}), re-adds every still-available line to the
// shopper's current cart, redirects to /cart. Anonymous-safe — uses
// the same cart-cookie flow as AddToCart, no login required.
route.post('/api/cart/reorder', 'Actions/Storefront/ReorderAction').skipCsrf()

// Guest order tracking. POSTs order_number + email; returns the
// order uuid on match so the client can redirect to /orders/{uuid}.
// Constant-message failure prevents enumerating sequential order
// ids; per-IP rate-limit caps brute-force probes.
route.post('/api/orders/lookup', 'Actions/Storefront/LookupOrderAction').skipCsrf()

// Coupon apply / remove. Single endpoint, `remove=1` clears the
// active coupon. Validates against the coupons table (active, in
// date range, under usage limit, min subtotal met) and updates the
// cart's discount_amount + total. usage_count is bumped at
// PlaceOrderAction time, not here, so an abandoned try doesn't burn
// up a one-shot code.
route.post('/api/cart/coupon', 'Actions/Storefront/ApplyCouponAction').skipCsrf()

// Customer address book. Each action reads the `stacks_customer`
// cookie inline + scopes every UPDATE/DELETE by `customer_id` so a
// guessed row id can't be hijacked across accounts. SaveAddress
// handles both create and update — splitting them doubled the route
// + view code without doubling the value.
route.post('/api/account/addresses', 'Actions/Storefront/SaveAddressAction').skipCsrf()
route.post('/api/account/addresses/{id}/delete', 'Actions/Storefront/DeleteAddressAction').skipCsrf()
route.post('/api/account/addresses/{id}/default', 'Actions/Storefront/SetDefaultAddressAction').skipCsrf()

// ============================================================================
// Admin: order lifecycle
//
// Admin-only — gated by the framework's `auth` middleware (User-side
// session, same as the rest of the dashboard).
//
//   /ship       → save tracking info + flip to SHIPPED + email buyer
//   /deliver    → flip to DELIVERED (no email; carrier already sent one)
//   /cancel     → flip to CANCELED + email buyer with reason + refund
// ============================================================================
route.post('/api/orders/{id}/ship', 'Actions/Commerce/MarkOrderShippedAction').middleware('auth')
route.post('/api/orders/{id}/deliver', 'Actions/Commerce/MarkOrderDeliveredAction').middleware('auth')
route.post('/api/orders/{id}/cancel', 'Actions/Commerce/CancelOrderAction').middleware('auth')
