import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { rateLimit, response } from '@stacksjs/router'
import { readCustomerCookie } from '../../Storefront/CustomerCookie'

const CUSTOMER_COOKIE = 'stacks_customer'

/**
 * Update the logged-in customer's profile (name + phone). Email is
 * intentionally NOT editable here — it's the auth identifier today
 * (see LoginAction) and changing it would orphan the session cookie
 * mid-request. A future "change email" flow should re-issue the
 * cookie, send a confirmation to the new address, etc.
 *
 * Form posts redirect back to /profile with a flash notice; XHR
 * callers get JSON. Both paths are rate-limited (10/min/IP) so a
 * compromised cookie can't be used to spam the customers table.
 */
export default new Action({
  name: 'UpdateProfileAction',
  description: 'Update the logged-in customer\'s name and phone.',
  method: 'POST',

  async handle(request: any) {
    await rateLimit('storefront-profile-update', 10).per('minute')

    const customerId = readCustomerCookie(request, CUSTOMER_COOKIE)
    if (!customerId) {
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'Sign in first.' }, { status: 401 })
        : response.redirect('/login')
    }

    const name = String(request.get('name') ?? '').trim()
    const phone = String(request.get('phone') ?? '').trim()

    if (!name || name.length < 2 || name.length > 255) {
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'Name must be 2–255 characters.' }, { status: 422 })
        : response.redirect('/profile?notice=invalid-name')
    }
    // Phone optional, but if provided must look phone-shaped. The
    // customers table already enforces 10–50 chars when present; we
    // mirror that loosely here so a one-character typo doesn't slip
    // through and break the checkout shipping form later.
    if (phone && (phone.length < 10 || phone.length > 50)) {
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'Phone must be 10–50 characters.' }, { status: 422 })
        : response.redirect('/profile?notice=invalid-phone')
    }

    await (db as any)
      .updateTable('customers')
      .set({
        name,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', customerId)
      .execute()

    if (request.wantsJson?.())
      return response.json({ success: true, message: 'Profile saved.' })
    return response.redirect('/profile?notice=saved')
  },
})
