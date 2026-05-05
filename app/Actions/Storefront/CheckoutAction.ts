import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { response } from '@stacksjs/router'

const CART_COOKIE = 'barebowl_cart'
const FREE_SHIPPING_THRESHOLD = 40
const FLAT_SHIPPING = 5

/**
 * Place an order from the cart referenced by the caller's cookie.
 *
 * The flow is intentionally minimal — a real Stripe charge would slot
 * in between the cart lookup and order creation — but it produces a
 * real `orders` + `order_items` graph keyed off a real `customers`
 * row, so the dashboard sees the purchase like any other and the
 * shopper gets a confirmation page they can refresh.
 *
 * Cart is marked `converted` and the cookie cleared so a refresh
 * after checkout starts the next bowl from scratch.
 */
export default new Action({
  name: 'CheckoutAction',
  description: 'Convert the active cart into an Order + OrderItems.',
  method: 'POST',

  // Validation is hand-rolled below to avoid the framework's
  // schema.* rules tripping on raw form-body strings.

  async handle(request: any) {
    const token = request.cookies?.get?.(CART_COOKIE)
    if (!token)
      return response.json({ error: 'Your cart is empty.' }, { status: 400 })

    const cart = await (db as any)
      .selectFrom('carts')
      .where('session_token', '=', token)
      .where('status', '=', 'active')
      .selectAll()
      .executeTakeFirst()

    if (!cart)
      return response.json({ error: 'Your cart is empty.' }, { status: 400 })

    const items = await (db as any)
      .selectFrom('cart_items')
      .where('cart_id', '=', cart.id)
      .selectAll()
      .execute()

    if (items.length === 0)
      return response.json({ error: 'Your cart is empty.' }, { status: 400 })

    const name = String(request.get('customer_name') ?? '').trim()
    const email = String(request.get('customer_email') ?? '').trim().toLowerCase()
    const address = String(request.get('address') ?? '').trim()

    if (!name || !email || !address || !email.includes('@'))
      return response.json({ error: 'Name, valid email, and address are required.' }, { status: 422 })

    // One customer per email — repeat shoppers reuse the same row so
    // the dashboard's customer total isn't inflated by checkouts.
    let customer = await (db as any)
      .selectFrom('customers')
      .where('email', '=', email)
      .selectAll()
      .executeTakeFirst()

    if (!customer) {
      await (db as any)
        .insertInto('customers')
        .values({ name, email })
        .execute()
      // Re-read by email — bun-query-builder's RETURNING-based insert
      // doesn't reliably echo back the row on sqlite (we get metadata
      // instead), so we look up the row to get a real id.
      customer = await (db as any)
        .selectFrom('customers')
        .where('email', '=', email)
        .selectAll()
        .executeTakeFirst()
    }

    const subtotal = items.reduce((s: number, i: any) => s + Number(i.total_price || 0), 0)
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING
    const total = subtotal + shipping

    await (db as any)
      .insertInto('orders')
      .values({
        customer_id: customer.id,
        status: 'paid',
        order_type: 'shipping',
        total_amount: total,
        delivery_fee: shipping,
        delivery_address: address,
      })
      .execute()
    // Re-read latest order for this customer — RETURNING * doesn't
    // round-trip the row reliably on sqlite via bun-query-builder.
    const order = await (db as any)
      .selectFrom('orders')
      .where('customer_id', '=', customer.id)
      .orderBy('id', 'desc')
      .limit(1)
      .selectAll()
      .executeTakeFirst()

    // Map cart_items → order_items. We resolve product_id by SKU
    // (the slug stored on cart_item.product_sku) so the order ties
    // back to inventory, not just a snapshot.
    for (const item of items) {
      const product = await (db as any)
        .selectFrom('products')
        .where('slug', '=', item.product_sku)
        .selectAll()
        .executeTakeFirst()

      await (db as any)
        .insertInto('order_items')
        .values({
          order_id: order.id,
          product_id: product?.id ?? null,
          quantity: Number(item.quantity),
          price: Number(item.unit_price),
        })
        .execute()
    }

    // Decrement inventory for what we just sold. Best-effort: we
    // already accepted the order, so a stock-row miss shouldn't
    // fail the response. We re-read each row to compute the new
    // count rather than using a raw `inventory_count - n` expression
    // because bun-query-builder's `.set()` parameterizes everything.
    for (const item of items) {
      try {
        const product = await (db as any)
          .selectFrom('products')
          .where('slug', '=', item.product_sku)
          .selectAll()
          .executeTakeFirst()
        if (product) {
          const next = Math.max(0, Number(product.inventory_count || 0) - Number(item.quantity))
          await (db as any)
            .updateTable('products')
            .set({ inventory_count: next })
            .where('id', '=', product.id)
            .execute()
        }
      }
      catch { /* keep going */ }
    }

    await (db as any)
      .updateTable('carts')
      .set({ status: 'converted' })
      .where('id', '=', cart.id)
      .execute()

    request.cookies?.delete?.(CART_COOKIE, { path: '/' })

    const wantsHtml = (request.headers?.get?.('accept') || '').includes('text/html')
    const xhr = request.headers?.get?.('x-requested-with') === 'XMLHttpRequest'
    if (wantsHtml && !xhr)
      return response.redirect(`/orders/${order.id}`)

    return response.json({
      ok: true,
      order_id: order.id,
      total,
      subtotal,
      shipping,
    })
  },
})
