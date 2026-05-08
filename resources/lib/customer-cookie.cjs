// Customer-session cookie verifier for stx <script server> blocks.
// Mirrors storage/framework/defaults/app/Storefront/CustomerCookie.ts
// in CommonJS so views can `require()` it without a build step.
//
// Returns the verified customer id (number) on a valid cookie, or
// null on missing / tampered / unknown shape. Unlike the cart cookie
// helper, there's no legacy unsigned fallback — the unsigned half
// here is just an integer id, and accepting it unsigned would let
// any visitor impersonate any customer.
const crypto = require('node:crypto')

const SIG_CHARS = 22

function getKey() {
  const raw = process.env.APP_KEY || ''
  if (raw.startsWith('base64:')) return raw.slice('base64:'.length)
  return raw || 'unsigned-fallback-set-APP_KEY'
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function readCustomerId(raw) {
  if (!raw || typeof raw !== 'string') return null
  if (!raw.includes('.')) return null

  const dot = raw.lastIndexOf('.')
  const value = raw.slice(0, dot)
  const presented = raw.slice(dot + 1)
  if (!value || presented.length !== SIG_CHARS) return null

  const expected = crypto
    .createHmac('sha256', getKey())
    .update(value)
    .digest('base64url')
    .slice(0, SIG_CHARS)

  if (!timingSafeEqual(expected, presented)) return null

  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

module.exports = { readCustomerId }
