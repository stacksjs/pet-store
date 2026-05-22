import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { rateLimit, response } from '@stacksjs/router'
import { readCustomerCookie } from '../../Storefront/CustomerCookie'

const CUSTOMER_COOKIE = 'stacks_customer'

/**
 * Create or update an address in the logged-in customer's address
 * book.
 *
 * The form posts the same fields whether it's a brand-new address
 * (no `id` field) or an edit (`id` set + the row already belongs to
 * this customer). Splitting the two paths into separate actions
 * doubled the route + view code without doubling the value, so they
 * share one endpoint here.
 *
 * Ownership: every UPDATE includes `WHERE id = ? AND customer_id = ?`
 * so a guessed id from a different account can't be hijacked. CREATE
 * always uses the cookie's customer_id directly.
 *
 * Validation is intentionally loose on the postal-address fields —
 * different countries shape addresses differently, and we don't want
 * to reject "1A 1AA" because it doesn't match a US ZIP regex. The
 * carrier will fail the label if the address is truly garbage.
 */
export default new Action({
  name: 'SaveAddressAction',
  description: 'Create or update an address in the logged-in customer\'s address book.',
  method: 'POST',

  async handle(request: any) {
    await rateLimit('storefront-address-save', 20).per('minute')

    const customerId = readCustomerCookie(request, CUSTOMER_COOKIE)
    if (!customerId) {
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'Sign in first.' }, { status: 401 })
        : response.redirect('/login')
    }

    const id = Number(request.get('id') ?? 0)
    const label = String(request.get('label') ?? '').trim().slice(0, 50)
    const name = String(request.get('name') ?? '').trim()
    const phone = String(request.get('phone') ?? '').trim()
    const street1 = String(request.get('street_1') ?? '').trim()
    const street2 = String(request.get('street_2') ?? '').trim()
    const city = String(request.get('city') ?? '').trim()
    const region = String(request.get('region') ?? '').trim()
    const postalCode = String(request.get('postal_code') ?? '').trim()
    const country = String(request.get('country') ?? 'US').trim().toUpperCase().slice(0, 2)
    const setDefault = String(request.get('is_default') ?? '') === '1'

    if (!name || !street1 || !city || !postalCode) {
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'Name, street, city, and postal code are required.' }, { status: 422 })
        : response.redirect('/addresses?notice=missing-fields')
    }
    if (name.length > 255 || street1.length > 255 || street2.length > 255 || city.length > 100 || region.length > 100 || postalCode.length > 20) {
      return request.wantsJson?.()
        ? response.json({ success: false, message: 'One of those fields is too long.' }, { status: 422 })
        : response.redirect('/addresses?notice=field-too-long')
    }

    const now = new Date().toISOString()

    if (id > 0) {
      // Update path. The WHERE clause includes `customer_id` so an
      // attacker can't update someone else's row even if they guess
      // the id.
      const existing = await (db as any)
        .selectFrom('addresses')
        .where('id', '=', id)
        .where('customer_id', '=', customerId)
        .selectAll()
        .executeTakeFirst()

      if (!existing) {
        return request.wantsJson?.()
          ? response.json({ success: false, message: 'Address not found.' }, { status: 404 })
          : response.redirect('/addresses?notice=not-found')
      }

      await (db as any)
        .updateTable('addresses')
        .set({
          label: label || null,
          name,
          phone: phone || null,
          street_1: street1,
          street_2: street2 || null,
          city,
          region: region || null,
          postal_code: postalCode,
          country,
          updated_at: now,
        })
        .where('id', '=', id)
        .where('customer_id', '=', customerId)
        .execute()

      if (setDefault)
        await markDefault(customerId, id, now)
    }
    else {
      // Insert. If the customer has no addresses yet, this one auto-
      // wins the default flag — saves a second click on first save.
      const existing = await (db as any)
        .selectFrom('addresses')
        .where('customer_id', '=', customerId)
        .select('id')
        .execute()

      const isFirst = existing.length === 0

      const result = await (db as any)
        .insertInto('addresses')
        .values({
          customer_id: customerId,
          uuid: crypto.randomUUID(),
          label: label || null,
          name,
          phone: phone || null,
          street_1: street1,
          street_2: street2 || null,
          city,
          region: region || null,
          postal_code: postalCode,
          country,
          is_default: setDefault || isFirst ? 1 : 0,
          created_at: now,
        })
        .executeTakeFirstOrThrow?.() ?? await (db as any)
        .insertInto('addresses')
        .values({
          customer_id: customerId,
          uuid: crypto.randomUUID(),
          label: label || null,
          name,
          phone: phone || null,
          street_1: street1,
          street_2: street2 || null,
          city,
          region: region || null,
          postal_code: postalCode,
          country,
          is_default: setDefault || isFirst ? 1 : 0,
          created_at: now,
        })
        .execute()

      // If the user explicitly checked "set as default" on a non-
      // first address, demote the previous default. (For first-
      // address inserts the auto-default flag above already wins.)
      if (setDefault && !isFirst) {
        const newId = Number(result?.insertId ?? 0)
        if (newId > 0)
          await markDefault(customerId, newId, now)
      }
    }

    if (request.wantsJson?.())
      return response.json({ success: true })
    return response.redirect('/addresses?notice=saved')
  },
})

async function markDefault(customerId: number, addressId: number, now: string) {
  // Demote every other address for this customer, then promote the
  // target. Two writes; sqlite has no atomic "set this one to 1 and
  // every other to 0" idiom that's cleaner than this pair.
  await (db as any)
    .updateTable('addresses')
    .set({ is_default: 0, updated_at: now })
    .where('customer_id', '=', customerId)
    .where('id', '!=', addressId)
    .execute()
  await (db as any)
    .updateTable('addresses')
    .set({ is_default: 1, updated_at: now })
    .where('id', '=', addressId)
    .where('customer_id', '=', customerId)
    .execute()
}
