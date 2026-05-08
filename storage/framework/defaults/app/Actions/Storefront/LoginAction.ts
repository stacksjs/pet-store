import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { rateLimit, response } from '@stacksjs/router'
import { writeCustomerCookie } from '../../Storefront/CustomerCookie'

const CUSTOMER_COOKIE = 'stacks_customer'
const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

/**
 * Storefront login — STUB.
 *
 * Currently authenticates anyone who types an email that matches a
 * known customer. There is no password check. This is a deliberate
 * scaffold: it gives the account pages a working session cookie so
 * we can build /account, /account/orders, address book, etc. without
 * also designing the real auth pipeline in the same change.
 *
 * TODO before this hits real users:
 *   - swap email-only flow for a magic-link emailed via the existing
 *     mail.send() pipeline (token + expiry, single-use, HMAC over
 *     APP_KEY — same shape as the order capability URL),
 *     OR
 *   - add a `password_hash` column to `customers` and verify with
 *     bun's argon2 / scrypt.
 *
 * Spam handling: rate-limit per IP (10/min) so a hostile actor can't
 * brute-enumerate the customer list. Form posts redirect to
 * /account; XHR callers (a future SPA login) get JSON.
 */
export default new Action({
  name: 'LoginAction',
  description: 'STUB customer login — sets session cookie if email matches a customer row.',
  method: 'POST',

  async handle(request: any) {
    await rateLimit('storefront-login', 10).per('minute')

    const email = String(request.get('email') ?? '').trim().toLowerCase()
    if (!email)
      return response.json({ success: false, message: 'Enter your email.' }, { status: 422 })

    const customer = await (db as any)
      .selectFrom('customers')
      .where('email', '=', email)
      .selectAll()
      .executeTakeFirst()

    if (!customer) {
      // Stub-mode honesty: the real magic-link flow will paper over
      // "unknown email" with a generic "check your inbox" page, but
      // until we actually send anything it's better to surface the
      // miss so the dev/tester knows why nothing happened.
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'No account with that email yet.' }, { status: 404 })
        : response.redirect('/login?notice=not-found')
    }

    writeCustomerCookie(request, CUSTOMER_COOKIE, Number(customer.id), COOKIE_OPTS)

    if (request.wantsJson?.())
      return response.json({ success: true, redirect: '/account' })
    return response.redirect('/account')
  },
})
