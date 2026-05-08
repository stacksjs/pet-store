import { Action } from '@stacksjs/actions'
import { response } from '@stacksjs/router'
import { clearCustomerCookie } from '../../Storefront/CustomerCookie'

const CUSTOMER_COOKIE = 'stacks_customer'
const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
}

/**
 * Storefront logout — clears the `stacks_customer` cookie and bounces
 * back to the home page. Form posts redirect; XHR callers get JSON.
 *
 * Intentionally does not clear the cart cookie. A shopper logging out
 * should still see whatever they were about to buy when they come
 * back, and the cart token isn't tied to identity.
 */
export default new Action({
  name: 'LogoutAction',
  description: 'Clear the storefront customer session cookie.',
  method: 'POST',

  async handle(request: any) {
    clearCustomerCookie(request, CUSTOMER_COOKIE, COOKIE_OPTS)

    if (request.wantsJson?.())
      return response.json({ success: true, redirect: '/' })
    return response.redirect('/')
  },
})
