import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { rateLimit, response } from '@stacksjs/router'
import { readCustomerCookie } from '../../Storefront/CustomerCookie'

const CUSTOMER_COOKIE = 'stacks_customer'

/**
 * Delete an address from the logged-in customer's address book.
 *
 * The action is idempotent: deleting an address that doesn't exist
 * (or that belongs to someone else) silently no-ops, then redirects
 * back to /addresses. We don't surface "not found" because that
 * would leak whether a row id existed for a different customer.
 *
 * If the deleted row was the default, the next-most-recent address
 * gets promoted automatically. We keep the address book having a
 * default whenever it's non-empty so checkout pre-fill always has
 * something to load.
 */
export default new Action({
  name: 'DeleteAddressAction',
  description: 'Remove an address from the logged-in customer\'s address book.',
  method: 'POST',

  async handle(request: any) {
    await rateLimit('storefront-address-delete', 20).per('minute')

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

    const target = await (db as any)
      .selectFrom('addresses')
      .where('id', '=', id)
      .where('customer_id', '=', customerId)
      .selectAll()
      .executeTakeFirst()

    if (target) {
      await (db as any)
        .deleteFrom('addresses')
        .where('id', '=', id)
        .where('customer_id', '=', customerId)
        .execute()

      // If we just deleted the default, promote the most recent
      // remaining address so the address book never sits in a
      // "no default" state for someone with addresses on file.
      if (target.is_default) {
        const fallback = await (db as any)
          .selectFrom('addresses')
          .where('customer_id', '=', customerId)
          .orderBy('id', 'desc')
          .select('id')
          .executeTakeFirst()
        if (fallback?.id) {
          await (db as any)
            .updateTable('addresses')
            .set({ is_default: 1, updated_at: new Date().toISOString() })
            .where('id', '=', fallback.id)
            .execute()
        }
      }
    }

    if (request.wantsJson?.())
      return response.json({ success: true })
    return response.redirect('/addresses?notice=deleted')
  },
})
