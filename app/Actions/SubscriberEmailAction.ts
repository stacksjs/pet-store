import { Action } from '@stacksjs/actions'
import { Subscriber, SubscriberEmail } from '@stacksjs/orm'
import { db } from '@stacksjs/database'
import { rateLimit } from '@stacksjs/router'
import { sendSubscriptionConfirmation } from '../../storage/framework/defaults/app/Mail/SubscriptionConfirmation'

/**
 * Pet-store override of the framework's SubscriberEmailAction.
 *
 * Adds the freeze-dried launch waitlist hook on top of the framework
 * default: any signup whose `source` starts with
 * `freeze-dried-waitlist` (the home / products / FAQ waitlist
 * sections all stamp this) gets the FREEZE15 launch coupon attached
 * to the response. The WaitlistSection component picks the
 * `coupon.code` out of the JSON and surfaces it inline so the shopper
 * sees their reward immediately — that's the entire reason we asked
 * for the email.
 *
 * Published from `storage/framework/defaults/app/Actions/SubscriberEmailAction.ts`
 * via `./buddy publish:action SubscriberEmailAction`. Local edits live
 * in `app/Actions/`; the framework default stays brand-agnostic.
 */

const FREEZE_DRIED_WAITLIST_PREFIX = 'freeze-dried-waitlist'

export default new Action({
  name: 'SubscriberEmailAction',
  description: 'Save subscriber emails + attach the freeze-dried launch coupon when applicable',
  method: 'POST',

  async handle(request: RequestInstance) {
    // Per-IP throttle on the unauthenticated subscribe endpoint. Mirrors
    // the framework default — kept here too because publish:action
    // copies the file wholesale and the override would otherwise lose
    // the limit. 10/min is enough for a real shopper retrying on a
    // typo and tight enough that a bot tops out before it inflates the
    // list or burns through the mailer quota.
    await rateLimit('email-subscribe', 10).per('minute')

    const email = request.get('email')
    const source = request.get('source') || 'homepage'

    if (!email || !email.includes('@'))
      return { success: false, message: 'A valid email is required' }

    const existingSubscriber = await Subscriber.where('email', email).first()
    if (existingSubscriber) {
      const coupon = await issueWaitlistCoupon(source)
      return { success: true, message: 'Already subscribed', ...(coupon ? { coupon } : {}) }
    }

    const subscriber = await Subscriber.create({ email, status: 'subscribed', source })
    await SubscriberEmail.create({ email, source })

    const coupon = await issueWaitlistCoupon(source)

    sendSubscriptionConfirmation({
      to: email,
      subscriberUuid: subscriber.uuid,
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`Failed to send confirmation email to ${email}:`, message)
    })

    return { success: true, subscriber, ...(coupon ? { coupon } : {}) }
  },
})

/**
 * Look up (or create) the FREEZE15 coupon and return the shape the
 * WaitlistSection component expects:
 *
 *     { code: 'FREEZE15', discountLabel: '15% off …' }
 *
 * One coupon row, reused across every signup. Per-signup attribution
 * lives on the subscriber_emails row's `source` column. Returns null
 * when the source isn't a waitlist signup or when the insert fails
 * for an unexpected reason — a missing coupon doesn't fail the
 * signup itself.
 */
async function issueWaitlistCoupon(source: string): Promise<{
  code: string
  discountLabel: string
} | null> {
  if (!source.startsWith(FREEZE_DRIED_WAITLIST_PREFIX))
    return null

  const code = 'FREEZE15'
  const discountLabel = '15% off when the freeze-dried line drops'

  try {
    const existing = await (db as any)
      .selectFrom('coupons')
      .where('code', '=', code)
      .select(['id'])
      .executeTakeFirst()

    if (!existing) {
      try {
        await (db as any)
          .insertInto('coupons')
          .values({
            code,
            description: 'Freeze-dried launch waitlist · 15% off your first freeze-dried order',
            // The migration's CHECK constraint on `status` is
            // case-sensitive and accepts 'Active' / 'Scheduled' /
            // 'Expired' (capitalized). Match the existing seeder
            // convention rather than introducing a third casing.
            status: 'Active',
            is_active: 1,
            discount_type: 'percentage',
            discount_value: 15,
            min_order_amount: 0,
            usage_count: 0,
          } as any)
          .execute()
      }
      catch (insertErr) {
        if (!/UNIQUE/i.test(String(insertErr)))
          throw insertErr
      }
    }
  }
  catch (err) {
    console.error('[SubscriberEmailAction] coupon issue failed:', err instanceof Error ? err.message : String(err))
    return null
  }

  return { code, discountLabel }
}
