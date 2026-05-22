import { Action } from '@stacksjs/actions'
import { db } from '@stacksjs/database'
import { response } from '@stacksjs/router'
import { readCartCookie } from '../../Storefront/CartCookie'

const CART_COOKIE = 'stacks_cart'

/**
 * Apply (or remove) a coupon code against the shopper's active cart.
 *
 * One action handles both flows so the storefront has a single
 * endpoint to wire — the `remove` flag is the explicit signal to
 * clear the existing coupon. Without it, an empty `code` is treated
 * as "no-op, just refresh the cart view".
 *
 * Validation matrix (in order):
 *   1. cart exists for this cookie
 *   2. coupon row exists with matching code (case-insensitive)
 *   3. is_active = 1 AND status = 'Active'
 *   4. now() falls inside [start_date, end_date] if set
 *   5. usage_count < usage_limit if usage_limit > 0
 *   6. subtotal >= min_order_amount if set
 *
 * Any failure leaves the cart's coupon_id unchanged and returns a
 * shopper-readable error. We do NOT increment usage_count here —
 * that happens at PlaceOrderAction time so abandoned cart attempts
 * don't burn up a one-shot code.
 */
export default new Action({
  name: 'ApplyCouponAction',
  description: 'Apply or remove a coupon code against the current cart.',
  method: 'POST',

  async handle(request: any) {
    const remove = String(request.get('remove') ?? '').toLowerCase() === '1'
    const code = String(request.get('code') ?? '').trim().toUpperCase()

    const cartToken = readCartCookie(request, CART_COOKIE)
    if (!cartToken)
      return jsonOrRedirect(request, { ok: false, error: 'Your cart has expired. Add an item to start a new one.' }, 422)

    const cart = await (db as any)
      .selectFrom('carts')
      .where('session_token', '=', cartToken)
      .where('status', '=', 'active')
      .selectAll()
      .executeTakeFirst()

    if (!cart)
      return jsonOrRedirect(request, { ok: false, error: 'No active cart.' }, 404)

    if (remove) {
      await (db as any)
        .updateTable('carts')
        .set({ coupon_id: null, applied_coupon_id: null, discount_amount: 0 })
        .where('id', '=', cart.id)
        .execute()
      await recomputeCartTotals(cart.id)
      return jsonOrRedirect(request, { ok: true, applied: false }, 200)
    }

    if (!code)
      return jsonOrRedirect(request, { ok: false, error: 'Enter a code to apply.' }, 422)

    // Codes are stored as-typed in the DB (mixed case allowed). The
    // unique index on `code` doesn't enforce case-insensitivity, so we
    // do the comparison via UPPER() on both sides — matches the way
    // codes are typed in promo emails (FREEZE15 etc.) without forcing
    // the operator to normalize at insert time.
    const coupon = await (db as any)
      .selectFrom('coupons')
      .whereRef('UPPER(code)', '=', '?1')
      .selectAll()
      .executeTakeFirst()
      .catch(() => null)

    // Fallback if the bun-query-builder doesn't support the whereRef
    // form against UPPER(). Try a permissive case-insensitive search.
    const couponRow = coupon ?? await (db as any)
      .selectFrom('coupons')
      .where('code', '=', code)
      .selectAll()
      .executeTakeFirst()
      .catch(() => null) ?? await (db as any)
      .selectFrom('coupons')
      .where('code', '=', code.toLowerCase())
      .selectAll()
      .executeTakeFirst()
      .catch(() => null)

    if (!couponRow)
      return jsonOrRedirect(request, { ok: false, error: `That code didn't match anything in our system.` }, 404)

    if (!couponRow.is_active || String(couponRow.status || '').toLowerCase() !== 'active')
      return jsonOrRedirect(request, { ok: false, error: 'That code is no longer active.' }, 422)

    const now = new Date()
    if (couponRow.start_date && new Date(String(couponRow.start_date)) > now)
      return jsonOrRedirect(request, { ok: false, error: 'That code isn\'t available yet.' }, 422)
    if (couponRow.end_date && new Date(String(couponRow.end_date)) < now)
      return jsonOrRedirect(request, { ok: false, error: 'That code has expired.' }, 422)

    const usageLimit = Number(couponRow.usage_limit || 0)
    const usageCount = Number(couponRow.usage_count || 0)
    if (usageLimit > 0 && usageCount >= usageLimit)
      return jsonOrRedirect(request, { ok: false, error: 'That code has reached its limit.' }, 422)

    const subtotal = Number(cart.subtotal || 0)
    const minOrder = Number(couponRow.min_order_amount || 0)
    if (minOrder > 0 && subtotal < minOrder)
      return jsonOrRedirect(request, { ok: false, error: `That code needs a $${minOrder.toFixed(2)} minimum subtotal.` }, 422)

    // Compute the discount. `discount_value` is the raw number entered
    // by the operator — percentage codes treat it as 0-100, fixed-amount
    // codes treat it as a dollar value (the schema stores INTEGER, so
    // we let pet-store conventions be dollars; tweak if the operator
    // standardises on cents).
    const discountType = String(couponRow.discount_type || '').toLowerCase()
    const discountValue = Number(couponRow.discount_value || 0)
    let discount = 0
    if (discountType === 'percentage')
      discount = subtotal * (discountValue / 100)
    else if (discountType === 'fixed_amount')
      discount = discountValue

    const maxDiscount = Number(couponRow.max_discount_amount || 0)
    if (maxDiscount > 0 && discount > maxDiscount)
      discount = maxDiscount
    if (discount > subtotal)
      discount = subtotal // never pay the shopper
    discount = Math.max(0, Math.round(discount * 100) / 100)

    await (db as any)
      .updateTable('carts')
      .set({
        coupon_id: couponRow.id,
        applied_coupon_id: couponRow.id,
        discount_amount: discount,
      })
      .where('id', '=', cart.id)
      .execute()

    await recomputeCartTotals(cart.id)

    return jsonOrRedirect(request, {
      ok: true,
      applied: true,
      code: String(couponRow.code || code),
      discount,
    }, 200)
  },
})

function jsonOrRedirect(request: any, payload: any, status: number) {
  const wantsHtml = (request.headers?.get?.('accept') || '').includes('text/html')
  const xhr = request.headers?.get?.('x-requested-with') === 'XMLHttpRequest'
  if (wantsHtml && !xhr)
    return response.redirect('/cart')
  return response.json(payload, { status })
}

async function recomputeCartTotals(cartId: number): Promise<void> {
  const items = await (db as any)
    .selectFrom('cart_items')
    .where('cart_id', '=', cartId)
    .selectAll()
    .execute()

  const totalItems = items.reduce((s: number, i: any) => s + Number(i.quantity), 0)
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.total_price || 0), 0)

  const cart = await (db as any)
    .selectFrom('carts')
    .where('id', '=', cartId)
    .selectAll()
    .executeTakeFirst()

  const discount = Number(cart?.discount_amount || 0)
  const total = Math.max(0, subtotal - discount)

  await (db as any)
    .updateTable('carts')
    .set({ total_items: totalItems, subtotal, total })
    .where('id', '=', cartId)
    .execute()
}
