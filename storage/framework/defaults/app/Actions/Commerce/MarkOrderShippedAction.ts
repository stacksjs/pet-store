import { Action } from '@stacksjs/actions'
import { config } from '@stacksjs/config'
import { db } from '@stacksjs/database'
import { log } from '@stacksjs/logging'
import { response } from '@stacksjs/router'
import sendOrderShipped from '../../Mail/OrderShipped'

/**
 * Admin-only: mark an order as shipped, save the carrier + tracking
 * info, and fire the "your order shipped" email.
 *
 * The route is gated by the `auth` middleware (see routes/api.ts) so
 * a session token from the dashboard's existing User auth is required
 * — same surface as `/api/orders/{id}` PATCH. The action accepts the
 * order's auto-increment id (matching the rest of the commerce admin
 * routes), not the storefront-facing uuid.
 *
 * Email failures are caught and logged. The DB update is the source
 * of truth for "did this order ship?"; bouncing an admin response
 * because SES is having a bad day would force the operator to mark
 * the same order shipped twice.
 */
export default new Action({
  name: 'MarkOrderShippedAction',
  description: 'Update tracking info on an order, flip status to SHIPPED, and notify the customer.',
  method: 'POST',

  async handle(request: any) {
    const id = Number(request.getParam('id') ?? request.get('id') ?? 0)
    if (!id)
      return response.json({ success: false, message: 'Missing order id.' }, { status: 422 })

    const trackingNumber = String(request.get('tracking_number') ?? '').trim()
    const carrier = String(request.get('carrier') ?? '').trim()
    const trackingUrl = String(request.get('tracking_url') ?? '').trim()
    const estimatedArrival = String(request.get('estimated_arrival') ?? '').trim()

    // Tracking fields are optional in the schema (not every shipment
    // has a label — local delivery, in-person handoff, etc.) but if
    // any are provided, they should look like the right shape.
    if (trackingNumber && (trackingNumber.length < 3 || trackingNumber.length > 100))
      return response.json({ success: false, message: 'Tracking number looks malformed.' }, { status: 422 })
    if (trackingUrl && !/^https?:\/\//.test(trackingUrl))
      return response.json({ success: false, message: 'Tracking URL must start with http(s)://.' }, { status: 422 })

    const order = await (db as any)
      .selectFrom('orders')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst()

    if (!order)
      return response.json({ success: false, message: 'Order not found.' }, { status: 404 })

    const now = new Date().toISOString()
    await (db as any)
      .updateTable('orders')
      .set({
        status: 'SHIPPED',
        shipped_at: now,
        tracking_number: trackingNumber || null,
        carrier: carrier || null,
        tracking_url: trackingUrl || null,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute()

    // Hydrate the email payload. Failures here shouldn't block the
    // status update — log and move on. The admin can resend manually
    // from the order detail page if needed.
    try {
      const customer = order.customer_id
        ? await (db as any)
            .selectFrom('customers')
            .where('id', '=', order.customer_id)
            .selectAll()
            .executeTakeFirst()
        : null

      if (customer?.email) {
        const items = await (db as any)
          .selectFrom('order_items')
          .innerJoin('products', 'products.id', 'order_items.product_id')
          .where('order_items.order_id', '=', id)
          .select(['products.name', 'order_items.quantity'])
          .execute()

        const baseUrl = config.app?.url || 'http://localhost:3000'
        await sendOrderShipped({
          to: customer.email,
          orderId: order.id,
          customerName: customer.name || 'there',
          items: items.map((row: any) => ({ name: row.name, qty: Number(row.quantity) })),
          carrier: carrier || undefined,
          trackingNumber: trackingNumber || undefined,
          trackingUrl: trackingUrl || undefined,
          estimatedArrival: estimatedArrival || undefined,
          shippingAddress: order.delivery_address || undefined,
          orderUrl: `${baseUrl}/orders/${order.uuid}`,
        })
      }
    }
    catch (err) {
      log.error?.('[MarkOrderShipped] email failed', err)
    }

    return response.json({
      success: true,
      message: 'Order marked shipped.',
      order: {
        id: order.id,
        status: 'SHIPPED',
        shipped_at: now,
        tracking_number: trackingNumber || null,
        carrier: carrier || null,
        tracking_url: trackingUrl || null,
      },
    })
  },
})
