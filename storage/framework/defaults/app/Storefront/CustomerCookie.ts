/**
 * Customer-session cookie helper — signs / verifies the
 * `stacks_customer` token that identifies a logged-in storefront
 * shopper.
 *
 * Same shape as CartCookie: `<customerId>.<sig>`, where `<sig>` is the
 * first 22 base64url chars of HMAC-SHA256(APP_KEY, customerId). 128
 * bits is plenty for tamper detection — and unlike the cart token,
 * the unsigned half here is just an integer id, so signing is
 * mandatory: an unsigned cookie would let any visitor type
 * `?cookie=stacks_customer=42` and impersonate customer 42.
 *
 * No legacy / unsigned fallback. The cart cookie tolerates legacy
 * shapes for migration; this one's brand-new and should never accept
 * an unsigned value.
 */

import { createHmac } from 'node:crypto'

const SIG_BYTES = 16
const SIG_CHARS = 22

function getKey(): string {
  const raw = process.env.APP_KEY || ''
  if (raw.startsWith('base64:'))
    return raw.slice('base64:'.length)
  return raw || 'unsigned-fallback-set-APP_KEY'
}

function sign(value: string): string {
  const sig = createHmac('sha256', getKey())
    .update(value)
    .digest('base64url')
    .slice(0, SIG_CHARS)
  return `${value}.${sig}`
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++)
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Pull a verified customer id out of the request, or null if the
 * cookie is missing/malformed/forged. Returns the id as a number for
 * direct use against `customers.id`.
 */
export function readCustomerCookie(request: any, cookieName: string): number | null {
  const raw = request.cookies?.get?.(cookieName)
  if (!raw || typeof raw !== 'string') return null
  if (!raw.includes('.')) return null

  const dot = raw.lastIndexOf('.')
  const value = raw.slice(0, dot)
  const presented = raw.slice(dot + 1)
  if (!value || presented.length !== SIG_CHARS) return null

  const expected = createHmac('sha256', getKey())
    .update(value)
    .digest('base64url')
    .slice(0, SIG_CHARS)

  if (!timingSafeEqual(expected, presented)) return null

  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function writeCustomerCookie(
  request: any,
  cookieName: string,
  customerId: number,
  opts: Record<string, unknown>,
): void {
  request.cookies?.set?.(cookieName, sign(String(customerId)), opts)
}

export function clearCustomerCookie(
  request: any,
  cookieName: string,
  opts: Record<string, unknown>,
): void {
  request.cookies?.set?.(cookieName, '', { ...opts, maxAge: 0 })
}

export const customerCookie = {
  read: readCustomerCookie,
  write: writeCustomerCookie,
  clear: clearCustomerCookie,
}
export default customerCookie

export const _internals = { SIG_BYTES, SIG_CHARS }
