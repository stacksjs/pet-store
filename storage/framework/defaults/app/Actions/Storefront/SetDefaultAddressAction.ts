import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { rateLimit, response } from '@stacksjs/router'
import { readCustomerCookie } from '../../Storefront/CustomerCookie'

const CUSTOMER_COOKIE = 'stacks_customer'

/**
 * Mark one address as the default for the logged-in customer; demote
 * every other address for that same customer to non-default in the
 * same flow. Two writes — sqlite has no atomic "flip every row that
 * matches X to 0 except this one" idiom that's cleaner than a pair.
 *
 * Defaults are mutually exclusive per customer: at most one row per
 * customer has `is_default = 1`. Checkout's pre-fill flow reads that
 * row, so keeping the invariant matters.
 */
export default new Action({
  name: 'SetDefaultAddressAction',
  description: 'Mark one address as the customer\'s default; demote the others.',
  method: 'POST',

  async handle(request: any) {
    await rateLimit('storefront-address-default', 20).per('minute')

    const customerId = readCustomerCookie(request, CUSTOMER_COOKIE)
    if (!customerId) {
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'Sign in first.' }, { status: 401 })
        : response.redirect('/login')
    }

    const id = Number(request.getParam('id') ?? request.get('id') ?? 0)
    if (!id) {
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'Missing address id.' }, { status: 422 })
        : response.redirect('/addresses')
    }

    // Verify ownership before doing the demote/promote pair so we
    // don't accidentally clear someone else's default just because
    // they got the same id.
    const target = await (db as any)
      .selectFrom('addresses')
      .where('id', '=', id)
      .where('customer_id', '=', customerId)
      .select('id')
      .executeTakeFirst()

    if (!target) {
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'Address not found.' }, { status: 404 })
        : response.redirect('/addresses?notice=not-found')
    }

    const now = new Date().toISOString()
    await (db as any)
      .updateTable('addresses')
      .set({ is_default: 0, updated_at: now })
      .where('customer_id', '=', customerId)
      .where('id', '!=', id)
      .execute()
    await (db as any)
      .updateTable('addresses')
      .set({ is_default: 1, updated_at: now })
      .where('id', '=', id)
      .where('customer_id', '=', customerId)
      .execute()

    if (request.wantsJson?.())
      return response.json({ success: true })
    return response.redirect('/addresses?notice=default-set')
  },
})
