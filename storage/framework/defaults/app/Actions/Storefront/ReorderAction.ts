import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { response } from '@stacksjs/router'
import { randomUUIDv7 } from 'bun'
import { readCartCookie, writeCartCookie } from '../../Storefront/CartCookie'

const CART_COOKIE = 'stacks_cart'
const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Re-add every item from a past order to the shopper's current cart.
 *
 * Use case: the order-detail page renders a "Reorder this bowl" CTA
 * so repeat shoppers can recreate a previous bowl in one click —
 * the most common e-commerce repeat-purchase path. We accept the
 * order's `uuid` (capability token, same as /orders/{uuid}) rather
 * than the auto-increment id to avoid an enumeration hole.
 *
 * Out-of-stock items at reorder time are silently skipped — better
 * to add what's available than fail the whole reorder. The response
 * reports how many lines were added vs. skipped so the order page
 * can surface that to the shopper after the redirect (future TODO).
 *
 * Mirrors AddToCartAction's anonymous-cart-cookie pattern so the same
 * unauthenticated checkout flow works end-to-end without requiring
 * the shopper to be logged in.
 */
export default new Action({
  name: 'ReorderAction',
  description: 'Re-add every item from a past order to the shopper\'s current cart.',
  method: 'POST',

  async handle(request: any) {
    const rawUuid = String(request.get('order_uuid') ?? '').trim().toLowerCase()
    if (!UUID_RE.test(rawUuid))
      return response.json({ error: 'A valid order_uuid is required.' }, { status: 422 })

    const order = await (db as any)
      .selectFrom('orders')
      .where('uuid', '=', rawUuid)
      .selectAll()
      .executeTakeFirst()

    if (!order)
      return response.json({ error: 'Order not found.' }, { status: 404 })

    // Pull the original line items joined back to products so we can
    // verify the SKU is still in the catalogue (slugs can be reused if
    // a product is rebuilt; we'd rather skip a stale SKU than fail).
    // `is_available` filter mirrors AddToCart's check so a delisted
    // SKU doesn't get pulled back in.
    const orderItems = await (db as any)
      .selectFrom('order_items as oi')
      .leftJoin('products as p', 'p.id', 'oi.product_id')
      .where('oi.order_id', '=', order.id)
      .select([
        'oi.quantity as quantity',
        'p.id as product_id',
        'p.slug as slug',
        'p.name as name',
        'p.price as price',
        'p.image_url as image_url',
        'p.is_available as is_available',
      ])
      .execute()

    // Ensure we have an active cart. Re-uses the existing
    // anonymous-cart-cookie flow so a logged-out shopper can still
    // reorder from a link without first authenticating.
    let token = readCartCookie(request, CART_COOKIE)
    let cart = token
      ? await (db as any).selectFrom('carts').where('session_token', '=', token).selectAll().executeTakeFirst()
      : null

    if (!cart) {
      token = randomUUIDv7()
      await (db as any)
        .insertInto('carts')
        .values({
          status: 'active',
          total_items: 0,
          subtotal: 0,
          total: 0,
          currency: 'USD',
          session_token: token,
          checkout_step: 'cart',
        })
        .execute()
      cart = await (db as any)
        .selectFrom('carts')
        .where('session_token', '=', token)
        .selectAll()
        .executeTakeFirst()
      writeCartCookie(request, CART_COOKIE, token, COOKIE_OPTS)
    }

    let added = 0
    let skipped = 0

    for (const row of orderItems) {
      const qty = Math.max(1, Math.min(99, Number(row.quantity) || 1))
      if (!row.slug || !row.is_available) {
        skipped += 1
        continue
      }

      const existingItem = await (db as any)
        .selectFrom('cart_items')
        .where('cart_id', '=', cart.id)
        .where('product_sku', '=', row.slug)
        .selectAll()
        .executeTakeFirst()

      if (existingItem) {
        const newQty = Number(existingItem.quantity) + qty
        await (db as any)
          .updateTable('cart_items')
          .set({
            quantity: newQty,
            total_price: newQty * Number(existingItem.unit_price),
          })
          .where('id', '=', existingItem.id)
          .execute()
      }
      else {
        await (db as any)
          .insertInto('cart_items')
          .values({
            cart_id: cart.id,
            quantity: qty,
            unit_price: Number(row.price),
            total_price: qty * Number(row.price),
            product_name: row.name,
            product_sku: row.slug,
            product_image: row.image_url,
          })
          .execute()
      }
      added += 1
    }

    await recomputeCartTotals(cart.id)

    const wantsHtml = (request.headers?.get?.('accept') || '').includes('text/html')
    const xhr = request.headers?.get?.('x-requested-with') === 'XMLHttpRequest'

    if (wantsHtml && !xhr)
      return response.redirect('/cart')

    return response.json({ ok: true, cart_id: cart.id, added, skipped })
  },
})

async function recomputeCartTotals(cartId: number): Promise<void> {
  const items = await (db as any)
    .selectFrom('cart_items')
    .where('cart_id', '=', cartId)
    .selectAll()
    .execute()

  const totalItems = items.reduce((s: number, i: any) => s + Number(i.quantity), 0)
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.total_price || 0), 0)

  await (db as any)
    .updateTable('carts')
    .set({ total_items: totalItems, subtotal, total: subtotal })
    .where('id', '=', cartId)
    .execute()
}
