import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { rateLimit, response } from '@stacksjs/router'

/**
 * Guest order tracking lookup.
 *
 * The buyer pastes the order number + the email on the order; we
 * verify both match a row in `orders` (joined through `customers`)
 * and hand back the order's `uuid` so the client can redirect to
 * `/orders/{uuid}` — the same capability-token URL the receipt
 * email links to. Returning the uuid (rather than redirecting from
 * the server) keeps the form on /track so a failed match can show
 * inline without abandoning the page.
 *
 * Security:
 *   - Rate-limited per IP (5/min). The endpoint is unauthenticated
 *     and an enumeration attack would otherwise scan sequential
 *     order numbers against guessed emails.
 *   - Constant-message failure — never distinguish "order doesn't
 *     exist" from "email mismatch", so an attacker can't probe for
 *     valid order ids.
 *   - Email comparison is case-insensitive against `customers.email`
 *     since that's the proof-of-ownership signal the rest of the
 *     storefront uses (see SubmitReviewAction).
 */
export default new Action({
  name: 'LookupOrderAction',
  description: 'Public order-tracking lookup by order number + email; returns the order uuid on match.',
  method: 'POST',

  async handle(request: any) {
    await rateLimit('order-lookup', 5).per('minute')

    const rawOrderId = String(request.get('order_number') ?? request.get('order_id') ?? '').trim()
    const orderId = Number(rawOrderId.replace(/^#/, ''))
    const email = String(request.get('email') ?? '').trim().toLowerCase()

    // Identical "not found" message for any failure mode so a hostile
    // caller can't tell apart bad-id from bad-email from rate-limit-edge.
    const failure = response.json(
      { success: false, message: "We couldn't find that order. Double-check the number and email on the receipt." },
      { status: 404 },
    )

    if (!orderId || !email || !email.includes('@'))
      return failure

    const order = await (db as any)
      .selectFrom('orders')
      .where('id', '=', orderId)
      .selectAll()
      .executeTakeFirst()
    if (!order || !order.customer_id || !order.uuid)
      return failure

    const customer = await (db as any)
      .selectFrom('customers')
      .where('id', '=', order.customer_id)
      .selectAll()
      .executeTakeFirst()
    if (!customer || String(customer.email || '').toLowerCase() !== email)
      return failure

    return response.json({ success: true, uuid: order.uuid })
  },
})
