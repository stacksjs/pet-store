#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * Generate responsive JPEG variants for every product image in
 * `public/images/products/`. Run once after adding/replacing a
 * product photo:
 *
 *     bun scripts/optimize-product-images.ts
 *
 * Output, given `public/images/products/chicken-paws.jpg`:
 *
 *     public/images/products/chicken-paws-400.jpg   (~24 KB)
 *     public/images/products/chicken-paws-600.jpg   (~47 KB)
 *     public/images/products/chicken-paws-900.jpg   (~90 KB)
 *
 * The original-size source stays in place so old paths and CDN
 * caches keep working. ProductCard + ProductGallery reach for the
 * variants via srcset for proper responsive delivery.
 *
 * JPEG-only. WebP and AVIF would be wins on paper but, at the time
 * of writing, ts-webp's lossy VP8 encoder is "minimal-but-functional"
 * (its own description) and produces files LARGER than this script's
 * JPEG output for the catalog's white-background product photos —
 * shipping WebP would be an anti-optimization. ts-avif's encoder is a
 * stub (writes a valid AVIF container with no actual frame data,
 * ~341 bytes of empty pixels). When either of those libraries gets
 * its codec story finished, this script gains an extra format and the
 * <picture> tags in the components below get an extra <source>.
 */
import { readdir, stat } from 'node:fs/promises'
import process from 'node:process'
import { join } from 'node:path'
import { generateResponsiveImages } from 'ts-images'

const PRODUCT_DIR = 'public/images/products'

// Breakpoints anchored to where the storefront actually paints:
//   - 400 → small-screen catalog cards + cart-drawer thumbs
//   - 600 → catalog grid tile (rendered at 600x600 on standard DPI)
//   - 900 → product-detail hero (aspect-square 900x900)
const BREAKPOINTS = [400, 600, 900]

async function main(): Promise<void> {
  const all = await readdir(PRODUCT_DIR)

  // Only process originals (no -<digits> suffix). Skip JPGs we
  // generated last run so the script is re-runnable without
  // recursively reprocessing variants.
  const originals = all.filter(f =>
    /\.(?:jpe?g|png)$/i.test(f) && !/-\d+\.(?:jpe?g|png)$/i.test(f),
  )

  if (originals.length === 0) {
    console.error(`no source images in ${PRODUCT_DIR}`)
    process.exit(1)
  }

  let totalIn = 0
  let totalOut = 0
  let count = 0

  for (const source of originals) {
    const srcPath = join(PRODUCT_DIR, source)
    const srcSize = (await stat(srcPath)).size
    totalIn += srcSize
    const slug = source.replace(/\.(jpe?g|png)$/i, '')

    const r = await generateResponsiveImages({
      input: srcPath,
      breakpoints: BREAKPOINTS,
      formats: ['jpeg'],
      outputDir: PRODUCT_DIR,
      filenameTemplate: '[name]-[width].[ext]',
      quality: 80,
      generateSrcset: false,
    })

    // ts-images writes the jpeg variants with `.jpeg` extension by
    // default. Rename to `.jpg` so the storefront srcset URLs match
    // the convention used by the source files (chicken-paws.jpg etc).
    for (const v of r.variants) {
      if (v.path.endsWith('.jpeg')) {
        const newPath = v.path.replace(/\.jpeg$/, '.jpg')
        await Bun.write(newPath, await Bun.file(v.path).arrayBuffer())
        await Bun.file(v.path).delete()
        v.path = newPath
      }
      totalOut += v.size
      count++
    }

    console.log(
      `${slug}: source ${(srcSize / 1024).toFixed(0)} KB → ` +
      r.variants.map(v => `${v.width}w ${(v.size / 1024).toFixed(0)} KB`).join(' · '),
    )
  }

  console.log()
  console.log(`originals total: ${(totalIn / 1024).toFixed(0)} KB`)
  console.log(`${count} variants total: ${(totalOut / 1024).toFixed(0)} KB`)
  console.log(`avg variant: ${(totalOut / count / 1024).toFixed(0)} KB`)
}

// eslint-disable-next-line ts/no-top-level-await -- this file is invoked as a CLI script (`bun scripts/optimize-product-images.ts`), not imported. Top-level await is the simplest entry point.
await main()
