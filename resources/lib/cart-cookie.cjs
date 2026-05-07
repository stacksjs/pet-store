// Cart cookie verifier for stx <script server> blocks. Mirrors
// storage/framework/defaults/app/Storefront/CartCookie.ts but in
// CommonJS so views can `require()` it without a build step.
//
// Returns the raw token (string) on a valid cookie, or null on
// missing / tampered / unknown shape. Legacy unsigned UUIDs (no `.`)
// are accepted as-is so existing carts keep rendering until the
// next write re-signs them.
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

function readCartToken(raw) {
  if (!raw || typeof raw !== 'string') return null
  // Legacy unsigned shape — accept once; the next mutation re-signs.
  if (!raw.includes('.')) return raw

  const dot = raw.lastIndexOf('.')
  const token = raw.slice(0, dot)
  const presented = raw.slice(dot + 1)
  if (!token || presented.length !== SIG_CHARS) return null

  const expected = crypto
    .createHmac('sha256', getKey())
    .update(token)
    .digest('base64url')
    .slice(0, SIG_CHARS)

  return timingSafeEqual(expected, presented) ? token : null
}

module.exports = { readCartToken }
