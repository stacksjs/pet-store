import { Action } from '@stacksjs/actions'
import { Subscriber, SubscriberEmail } from '@stacksjs/orm'
import { rateLimit, response } from '@stacksjs/router'
import { sendSubscriptionConfirmation } from '../Mail/SubscriptionConfirmation'

export default new Action({
  name: 'SubscriberEmailAction',
  description: 'Save emails from subscribe page and send confirmation email',
  method: 'POST',

  async handle(request: RequestInstance) {
    // Per-IP throttle. The endpoint is unauthenticated and skipCsrf'd so
    // bots will find it; without this they can flood the subscribers
    // table within minutes and burn through SES/SendGrid quota. 10/min
    // is generous for a real human filling the same form repeatedly.
    await rateLimit('email-subscribe', 10).per('minute')

    const email = String(request.get('email') ?? '').trim()
    const source = String(request.get('source') ?? 'homepage').trim() || 'homepage'

    // HTML form submissions (storefront footer, restock-notify, waitlist)
    // want a real page when the response comes back; XHR callers want
    // JSON they can act on. Differentiate via Accept + X-Requested-With
    // so both shapes work off the same endpoint without each caller
    // having to thread a `redirect=` field through.
    const wantsHtml = String((request as any).headers?.get?.('accept') || '').includes('text/html')
    const xhr = String((request as any).headers?.get?.('x-requested-with') || '') === 'XMLHttpRequest'
    const isHtmlForm = wantsHtml && !xhr

    if (!email || !email.includes('@')) {
      if (isHtmlForm)
        return response.redirect(`/newsletter/thanks?status=invalid&source=${encodeURIComponent(source)}`)
      return { success: false, message: 'A valid email is required' }
    }

    // Check if subscriber already exists
    const existingSubscriber = await Subscriber.where('email', email).first()
    if (existingSubscriber) {
      if (isHtmlForm)
        return response.redirect(`/newsletter/thanks?status=existing&source=${encodeURIComponent(source)}`)
      return { success: true, message: 'Already subscribed' }
    }

    // Create subscriber record
    const subscriber = await Subscriber.create({ email, status: 'subscribed', source })

    // Log the email event
    await SubscriberEmail.create({ email, source })

    // Send subscription confirmation email asynchronously (do not block the response)
    sendSubscriptionConfirmation({
      to: email,
      subscriberUuid: subscriber.uuid,
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`Failed to send confirmation email to ${email}:`, message)
    })

    if (isHtmlForm)
      return response.redirect(`/newsletter/thanks?status=ok&source=${encodeURIComponent(source)}`)

    return { success: true, subscriber }
  },
})
