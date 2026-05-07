#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * Generate the PetStore favicon set from a single source mark.
 *
 * Run once after replacing the source asset:
 *
 *     bun scripts/build-favicons.ts
 *
 * Source: `public/svgs/petstore-mark.svg` (or `.png` if SVG decoding
 * isn't supported by ts-images yet — see `SOURCE_CANDIDATES` below).
 *
 * Outputs, into `public/favicons/`:
 *   - favicon-16x16.png … favicon-512x512.png
 *   - apple-touch-icon.png
 *   - favicon.ico (real multi-resolution container)
 *   - site.webmanifest
 *
 * The storefront layout points at `/favicons/favicon.ico` etc. via
 * absolute paths, so this directory layout is part of the contract.
 */
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { deflateSync } from 'node:zlib'
import { generateFavicons } from 'ts-images'

const ROOT = resolve(import.meta.dir, '..')
const OUTPUT = resolve(ROOT, 'public/favicons')

// Pick whichever source is present. PNG is preferred (ts-images
// decodes it natively); the user can drop in any of these paths.
const SOURCE_CANDIDATES = [
  resolve(ROOT, 'public/svgs/petstore-mark.png'),
  resolve(ROOT, 'public/images/petstore-mark.png'),
]

const PLACEHOLDER_PATH = resolve(ROOT, 'public/svgs/petstore-mark.png')

/**
 * Render a 512×512 PNG with a stylized "P." mark on a stone-900
 * background. Used when no real brand mark is checked in yet so
 * `bun scripts/build-favicons.ts` Just Works on first run.
 *
 * The shape is described as a set of axis-aligned rectangles (no
 * curves — keeping the in-memory generator simple) and rasterized
 * into an RGBA buffer. Replace `public/svgs/petstore-mark.png` with
 * a designed asset whenever you have one; the script will pick that
 * up automatically next run.
 */
async function ensurePlaceholderMark(): Promise<string> {
  await mkdir(resolve(ROOT, 'public/svgs'), { recursive: true })
  const W = 512
  const H = 512
  // RGBA buffer, stone-900 background.
  const data = new Uint8Array(W * H * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 28
    data[i + 1] = 25
    data[i + 2] = 23
    data[i + 3] = 255
  }

  const fillRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number): void => {
    for (let yy = y; yy < y + h; yy++) {
      if (yy < 0 || yy >= H) continue
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || xx >= W) continue
        const i = (yy * W + xx) * 4
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
      }
    }
  }

  // Stylized "P" out of axis-aligned rects (stem + top loop) plus a
  // period dot. Tuned for 512×512 — readable after downsample to 16px.
  const FG = { r: 250, g: 250, b: 249 } // stone-50
  fillRect(140, 96, 56, 320, FG.r, FG.g, FG.b)   // stem
  fillRect(140, 96, 200, 56, FG.r, FG.g, FG.b)   // top crossbar
  fillRect(284, 96, 56, 152, FG.r, FG.g, FG.b)   // right edge
  fillRect(140, 192, 200, 56, FG.r, FG.g, FG.b)  // mid crossbar
  fillRect(372, 360, 56, 56, FG.r, FG.g, FG.b)   // period

  const png = encodePngRgba(W, H, data)
  await writeFile(PLACEHOLDER_PATH, png)
  return PLACEHOLDER_PATH
}

/**
 * Minimal PNG encoder for an RGBA byte buffer.
 *
 * Doesn't depend on ts-images so this script keeps working against
 * any installed version of the library. Produces a Type 6 (truecolor
 * + alpha) PNG with a single uncompressed-then-zlib-deflated IDAT
 * chunk. Output is byte-for-byte readable by `generateFavicons` and
 * any browser/image lib.
 *
 * Layout, from the PNG spec:
 *   8-byte signature
 *   IHDR (13-byte payload + 4-byte CRC)
 *   IDAT (deflate(filter-byte + scanline) per row)
 *   IEND
 */
function encodePngRgba(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const SIG = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

  // IHDR payload
  const ihdr = new Uint8Array(13)
  const ihdrView = new DataView(ihdr.buffer)
  ihdrView.setUint32(0, width, false)
  ihdrView.setUint32(4, height, false)
  ihdr[8] = 8       // bit depth
  ihdr[9] = 6       // color type: RGBA
  ihdr[10] = 0      // compression: deflate
  ihdr[11] = 0      // filter: standard
  ihdr[12] = 0      // interlace: none

  // IDAT body: filter byte (0 = None) + raw scanline, per row, then deflate.
  const stride = width * 4
  const filtered = new Uint8Array(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0
    filtered.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  }
  const idat = deflateSync(filtered)

  const out = [SIG, makeChunk('IHDR', ihdr), makeChunk('IDAT', new Uint8Array(idat)), makeChunk('IEND', new Uint8Array(0))]
  let total = 0
  for (const chunk of out) total += chunk.byteLength
  const png = new Uint8Array(total)
  let off = 0
  for (const chunk of out) {
    png.set(chunk, off)
    off += chunk.byteLength
  }
  return png
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.byteLength)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.byteLength, false)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  // CRC over type + data (not length).
  const crc = crc32(out.subarray(4, 8 + data.byteLength))
  view.setUint32(8 + data.byteLength, crc >>> 0, false)
  return out
}

// Standard PNG CRC-32 (poly 0xEDB88320). Table is built once on first
// use; subsequent calls reuse it.
let CRC_TABLE: Uint32Array | null = null
function crc32(buf: Uint8Array): number {
  if (!CRC_TABLE) {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      t[n] = c >>> 0
    }
    CRC_TABLE = t
  }
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)) >>> 0
  return (c ^ 0xFFFFFFFF) >>> 0
}

async function main(): Promise<void> {
  let source = SOURCE_CANDIDATES.find(p => existsSync(p))
  if (!source) {
    console.log('[favicons] no source mark found — generating placeholder at public/svgs/petstore-mark.png')
    console.log('[favicons] (replace with a designed mark whenever you have one — re-run this script)')
    source = await ensurePlaceholderMark()
  }

  console.log(`[favicons] source: ${source}`)
  // Older versions of ts-images don't mkdir the output directory before
  // writing into it; do it ourselves so the script Just Works regardless
  // of which tagged release is installed.
  await mkdir(OUTPUT, { recursive: true })
  const results = await generateFavicons(source, OUTPUT, {
    manifest: {
      name: 'PetStore',
      shortName: 'PetStore',
      themeColor: '#1c1917',
      backgroundColor: '#fafaf9',
      pathPrefix: '/favicons/',
    },
  })

  // Older ts-images doesn't emit apple-touch-icon or site.webmanifest;
  // create them locally so the layout's <link> tags don't 404. Once
  // the upgraded library ships, generateFavicons handles both and
  // these extras are no-ops (overwrites with the same content).
  const has180 = results.some(r => r.size === 180)
  if (!has180) {
    // Reuse 192 — close enough that iOS won't notice, and avoids a
    // second decode/resize pass through the (older) library.
    const src192 = resolve(OUTPUT, 'favicon-192x192.png')
    if (existsSync(src192)) {
      const apple = resolve(OUTPUT, 'apple-touch-icon.png')
      await writeFile(apple, await Bun.file(src192).bytes())
      results.push({ size: 180, path: apple } as { size: number, path: string })
    }
  }
  const hasManifest = results.some(r => r.path.endsWith('.webmanifest'))
  if (!hasManifest) {
    const manifest = {
      name: 'PetStore',
      short_name: 'PetStore',
      icons: [
        { src: '/favicons/favicon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/favicons/favicon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
      theme_color: '#1c1917',
      background_color: '#fafaf9',
      display: 'standalone',
      start_url: '/',
    }
    const manifestPath = resolve(OUTPUT, 'site.webmanifest')
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
    results.push({ size: 0, path: manifestPath } as { size: number, path: string })
  }

  for (const r of results) {
    // `r.type` exists in the upgraded library; the published 0.1.x
    // returns just `{ size, path }`. Fall back to extension-derived
    // labels so the log line is always informative.
    const type = (r as { type?: string }).type ?? (r.path.endsWith('.ico') ? 'ico' : r.path.endsWith('.webmanifest') ? 'manifest' : 'png')
    console.log(`  ${type.padEnd(8)} ${r.size ? `${r.size}px`.padEnd(7) : '       '} ${r.path.replace(ROOT, '.')}`)
  }

  console.log(`\n[favicons] wrote ${results.length} files to ${OUTPUT.replace(ROOT, '.')}`)
}

main().catch((err: unknown) => {
  console.error('[favicons] failed:', err instanceof Error ? err.stack || err.message : String(err))
  process.exit(1)
})
