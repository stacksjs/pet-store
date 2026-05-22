#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * Generate `public/sitemap.xml` for the pet-store storefront.
 *
 *     bun scripts/generate-sitemap.ts
 *
 * Why this exists as a script (not the framework's GET /sitemap.xml
 * route): the dev + prod servers in this app run stx-serve for the
 * storefront frontend, which routes by file (`resources/views/`).
 * The framework's `Actions/SitemapAction` is registered on the
 * bun-router-side server and never reaches the storefront port, so
 * crawlers hitting `https://<domain>/sitemap.xml` fall through to the
 * SPA layout. Dropping a static `public/sitemap.xml` lets stx-serve's
 * public-file handler serve it at the right URL with the right
 * Content-Type — same trick we already rely on for /robots.txt and
 * /favicons/*.
 *
 * Logic mirrors `storage/framework/defaults/app/Actions/SitemapAction.ts`:
 *   1. Walk `resources/views/` collecting static page paths
 *      (skips dynamic [slug] / catch-all / private surfaces).
 *   2. Query the `products` table for `slug` + `updated_at` of
 *      available rows to fan out product detail URLs.
 *   3. Emit XML with absolute URLs anchored at $APP_URL.
 *
 * Re-run after seeding products, after adding/removing storefront
 * views, or wire into a buddy command / cron once the catalog
 * settles.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'

const PROJECT_VIEWS = 'resources/views'
const FRAMEWORK_VIEWS = 'storage/framework/defaults/resources/views'
const OUTPUT_PATH = 'public/sitemap.xml'
const DB_PATH = process.env.DB_DATABASE_PATH || 'database/stacks.sqlite'

const EXCLUDED_PATTERNS: ReadonlyArray<string | RegExp> = [
  '/cart',
  '/checkout',
  '/orders',
  '/login',
  '/register',
  '/logout',
  '/account',
  '/addresses',
  '/profile',
  '/dashboard',
  '/api',
  '/auth',
  '/me',
  '/admin',
  '/install',
  '/test-error',
  '/_stx',
  '/blog/category',
  '/blog/post',
  '/blog/categories',
  '/emails',
  /^\/\[\.\.\..+\]/,
]

interface SitemapEntry {
  loc: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  lastmod?: string
}

function isExcluded(urlPath: string): boolean {
  for (const pat of EXCLUDED_PATTERNS) {
    if (typeof pat === 'string') {
      if (urlPath === pat || urlPath.startsWith(`${pat}/`))
        return true
    }
    else if (pat.test(urlPath)) {
      return true
    }
  }
  return false
}

function fileToUrl(viewsRoot: string, file: string): string | null {
  let rel = file.startsWith(viewsRoot) ? file.slice(viewsRoot.length) : file
  if (rel.startsWith('/'))
    rel = rel.slice(1)
  rel = rel.replace(/\.(stx|md|html)$/i, '')
  if (rel === 'index')
    return '/'
  if (rel.endsWith('/index'))
    rel = rel.slice(0, -'/index'.length)
  return `/${rel}`
}

function walkViews(root: string): string[] {
  if (!existsSync(root))
    return []
  const out: string[] = []
  function visit(dir: string): void {
    let entries: string[]
    try { entries = readdirSync(dir) }
    catch { return }
    for (const name of entries) {
      const full = join(dir, name)
      let s
      try { s = statSync(full) }
      catch { continue }
      if (s.isDirectory()) {
        // Layouts/components/partials/emails/dashboard aren't addressable URLs.
        if (['layouts', 'components', 'partials', 'emails', 'dashboard'].includes(name))
          continue
        visit(full)
      }
      else if (/\.(?:stx|md|html)$/i.test(name)) {
        out.push(full)
      }
    }
  }
  visit(root)
  return out
}

function discoverProducts(): SitemapEntry[] {
  // Best effort: pulls slugs from the SQLite catalog. Apps running on
  // postgres/mysql can still call this script after first dumping
  // products into the local sqlite for sitemap purposes, or replace
  // this block with their own query.
  if (!existsSync(DB_PATH)) {
    console.warn(`[sitemap] No sqlite db at ${DB_PATH} — skipping product URLs.`)
    return []
  }
  try {
    const db = new Database(DB_PATH, { readonly: true })
    const rows = db
      .query<{ slug: string, updated_at: string | null }, []>(
        `SELECT slug, updated_at FROM products WHERE is_available = 1 AND slug IS NOT NULL`,
      )
      .all()
    db.close()
    return rows
      .filter(r => r.slug)
      .map(r => ({
        loc: `/products/${r.slug}`,
        changefreq: 'weekly' as const,
        priority: 0.8,
        lastmod: r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : undefined,
      }))
  }
  catch (err) {
    console.warn(`[sitemap] Product query failed:`, err instanceof Error ? err.message : err)
    return []
  }
}

function staticEntries(): SitemapEntry[] {
  const seen = new Set<string>()
  const entries: SitemapEntry[] = []

  for (const root of [PROJECT_VIEWS, FRAMEWORK_VIEWS]) {
    for (const file of walkViews(root)) {
      const urlPath = fileToUrl(root, file)
      if (!urlPath)
        continue
      if (urlPath.includes('['))
        continue
      if (isExcluded(urlPath))
        continue
      if (seen.has(urlPath))
        continue
      seen.add(urlPath)

      const isHome = urlPath === '/'
      const isHighChurn = /^\/(?:products|blog)\b/.test(urlPath)
      entries.push({
        loc: urlPath,
        changefreq: isHome ? 'daily' : (isHighChurn ? 'daily' : 'weekly'),
        priority: isHome ? 1.0 : (isHighChurn ? 0.9 : 0.6),
      })
    }
  }
  return entries
}

function normalizeSiteUrl(siteUrl: string): string {
  let u = siteUrl.trim().replace(/\/$/, '')
  if (!/^https?:\/\//i.test(u))
    u = `https://${u}`
  return u
}

function renderXml(siteUrl: string, entries: SitemapEntry[]): string {
  const url = normalizeSiteUrl(siteUrl)
  const xmlEntries = entries.map((e) => {
    const tags: string[] = [`    <loc>${url}${e.loc}</loc>`]
    if (e.lastmod)
      tags.push(`    <lastmod>${e.lastmod}</lastmod>`)
    if (e.changefreq)
      tags.push(`    <changefreq>${e.changefreq}</changefreq>`)
    if (typeof e.priority === 'number')
      tags.push(`    <priority>${e.priority.toFixed(1)}</priority>`)
    return `  <url>\n${tags.join('\n')}\n  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>\n`
}

async function main(): Promise<void> {
  const siteUrl = process.env.APP_URL || 'http://localhost:3000'
  const entries = [...staticEntries(), ...discoverProducts()]
  const xml = renderXml(siteUrl, entries)
  await writeFile(OUTPUT_PATH, xml, 'utf-8')
  console.log(`[sitemap] wrote ${entries.length} URLs → ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error('[sitemap] failed:', err)
  process.exit(1)
})
