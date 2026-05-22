import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { response } from '@stacksjs/router'

/**
 * Admin-only: mark an order as delivered.
 *
 * No email — buyers see "Delivered" on the order detail page next
 * time they load it, and most carriers send their own delivery
 * confirmation. Spamming a second one from us is noise.
 *
 * Idempotent on already-delivered orders: re-marking just bumps
 * `updated_at` so admins know the row was acknowledged.
 */
export default new Action({
  name: 'MarkOrderDeliveredAction',
  description: 'Flip an order to DELIVERED.',
  method: 'POST',

  async handle(request: any) {
    const id = Number(request.getParam('id') ?? request.get('id') ?? 0)
    if (!id)
      return response.json({ success: false, message: 'Missing order id.' }, { status: 422 })

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
      .set({ status: 'DELIVERED', updated_at: now })
      .where('id', '=', id)
      .execute()

    return response.json({ success: true, message: 'Order marked delivered.', order: { id: order.id, status: 'DELIVERED' } })
  },
})
