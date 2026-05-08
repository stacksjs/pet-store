import { Action } from '@stacksjs/actions'
import { config } from '@stacksjs/config'
import { db } from '@stacksjs/database'
import { log } from '@stacksjs/logging'
import { response } from '@stacksjs/router'
import sendOrderCanceled from '../../Mail/OrderCanceled'

/**
 * Admin-only: cancel an order. Flips status to CANCELED and emails
 * the customer with the reason + refund amount (if any).
 *
 * Email failures are caught + logged. The DB write is the source of
 * truth for "is this order canceled?" — bouncing the admin response
 * because the mailer is down forces them to cancel the same order
 * twice, which can confuse a refund flow downstream.
 *
 * Currently does not initiate the actual payment refund — that lives
 * in the payments package and depends on the gateway. The
 * `refund_amount` here is informational on the email; the refund
 * itself is the operator's next step.
 */
export default new Action({
  name: 'CancelOrderAction',
  description: 'Mark an order CANCELED and notify the customer.',
  method: 'POST',

  async handle(request: any) {
    const id = Number(request.getParam('id') ?? request.get('id') ?? 0)
    if (!id)
      return response.json({ success: false, message: 'Missing order id.' }, { status: 422 })

    const reason = String(request.get('reason') ?? '').trim().slice(0, 200)
    const refundAmount = Number(request.get('refund_amount') ?? 0)

    if (!Number.isFinite(refundAmount) || refundAmount < 0)
      return response.json({ success: false, message: 'Invalid refund amount.' }, { status: 422 })

    const order = await (db as any)
      .selectFrom('orders')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst()

    if (!order)
      return response.json({ success: false, message: 'Order not found.' }, { status: 404 })

    // Already-canceled is idempotent — re-canceling shouldn't fire
    // another email or reset shipped_at fields. Just return the row.
    if (String(order.status || '').toUpperCase() === 'CANCELED') {
      return response.json({
        success: true,
        message: 'Order was already canceled.',
        order: { id: order.id, status: 'CANCELED' },
      })
    }

    const now = new Date().toISOString()
    await (db as any)
      .updateTable('orders')
      .set({ status: 'CANCELED', updated_at: now })
      .where('id', '=', id)
      .execute()

    try {
      const customer = order.customer_id
        ? await (db as any)
            .selectFrom('customers')
            .where('id', '=', order.customer_id)
            .selectAll()
            .executeTakeFirst()
        : null

      if (customer?.email) {
        const baseUrl = config.app?.url || 'http://localhost:3000'
        await sendOrderCanceled({
          to: customer.email,
          orderId: order.id,
          customerName: customer.name || 'there',
          reason: reason || undefined,
          refundAmount,
          orderUrl: `${baseUrl}/orders/${order.uuid}`,
        })
      }
    }
    catch (err) {
      log.error?.('[CancelOrder] email failed', err)
    }

    return response.json({
      success: true,
      message: 'Order canceled.',
      order: { id: order.id, status: 'CANCELED', reason: reason || null, refundAmount },
    })
  },
})
