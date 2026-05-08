import { config } from '@stacksjs/config'
import { mail, template } from '@stacksjs/email'

export interface OrderCanceledOptions {
  to: string
  orderId: number | string
  customerName?: string
  /** Free-text reason shown to the customer ("out of stock", "fraud check", …). */
  reason?: string
  /** Dollar amount being refunded; pass 0 for cancellations before payment. */
  refundAmount?: number
  /** Absolute URL the "View order details" CTA should link to. */
  orderUrl: string
}

/**
 * Send the order-canceled notification.
 *
 * Uses `resources/emails/order-canceled.stx`. The template degrades
 * cleanly without a reason or refund — the buyer still gets the
 * "we canceled your order" message either way.
 *
 * Failures bubble up as rejected promises. The action that calls
 * this should `.catch()` so a flaky mailer doesn't unwind the
 * cancellation in the database.
 */
export async function sendOrderCanceled(options: OrderCanceledOptions): Promise<void> {
  const appName = config.app.name || 'PetStore'
  const fromAddress = config.email.from?.address || 'hello@stacksjs.com'

  const { html, text } = await template('order-canceled', {
    variables: {
      orderId: options.orderId,
      orderUrl: options.orderUrl,
      customerName: options.customerName || 'there',
      reason: options.reason || '',
      refundAmount: options.refundAmount ?? 0,
      appName,
    },
    subject: `Your ${appName} order #${options.orderId} was canceled`,
  })

  await mail.send({
    to: [options.to],
    from: { name: appName, address: fromAddress },
    subject: `Your ${appName} order #${options.orderId} was canceled`,
    html,
    text,
  })
}

export default sendOrderCanceled
