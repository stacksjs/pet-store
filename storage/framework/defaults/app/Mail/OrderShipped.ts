import { config } from '@stacksjs/config'
import { mail, template } from '@stacksjs/email'

export interface OrderShippedItem {
  name: string
  qty: number
}

export interface OrderShippedOptions {
  to: string
  orderId: number | string
  customerName?: string
  items: OrderShippedItem[]
  /** Carrier name for the package, e.g. `UPS`, `USPS`, `FedEx`. */
  carrier?: string
  /** Carrier-issued tracking number (printed in the email body). */
  trackingNumber?: string
  /** Optional deep-link to the carrier's tracking page. */
  trackingUrl?: string
  /** Free-text estimated arrival window, e.g. `Tue, May 12`. */
  estimatedArrival?: string
  shippingAddress?: string
  /** Absolute URL the "View your order" CTA should link to. */
  orderUrl: string
}

/**
 * Send the "your order shipped" email.
 *
 * Uses `resources/emails/order-shipped.stx` for the layout. The
 * template degrades gracefully — if `trackingNumber` is missing the
 * tracking block is omitted, if `items` is empty the contents block
 * is omitted, etc — so callers can fire this off as soon as a label
 * is printed without waiting for every field to be populated.
 *
 * Failures bubble up as rejected promises. Marking an order shipped
 * shouldn't fail just because the mailer is down — the calling
 * action should `.catch()` and continue.
 */
export async function sendOrderShipped(options: OrderShippedOptions): Promise<void> {
  const appName = config.app.name || 'PetStore'
  const fromAddress = config.email.from?.address || 'hello@stacksjs.com'

  const { html, text } = await template('order-shipped', {
    variables: {
      orderId: options.orderId,
      orderUrl: options.orderUrl,
      customerName: options.customerName || 'there',
      items: options.items,
      carrier: options.carrier || '',
      trackingNumber: options.trackingNumber || '',
      trackingUrl: options.trackingUrl || '',
      estimatedArrival: options.estimatedArrival || '',
      shippingAddress: options.shippingAddress || '',
      appName,
    },
    subject: `Your ${appName} order #${options.orderId} just shipped`,
  })

  await mail.send({
    to: [options.to],
    from: { name: appName, address: fromAddress },
    subject: `Your ${appName} order #${options.orderId} just shipped`,
    html,
    text,
  })
}

export default sendOrderShipped
