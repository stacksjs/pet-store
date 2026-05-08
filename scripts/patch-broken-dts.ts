#!/usr/bin/env bun
/**
 * Patch broken type declarations in upstream packages.
 *
 * Some published packages ship `.d.ts` files with literal SYNTAX
 * errors (not just bad types) — most commonly missing generic args
 * (`Promise<;` instead of `Promise<Foo>;`) or missing return types
 * (`=> ;` instead of `=> Foo;`). TypeScript's `skipLibCheck` skips
 * *semantic* checks but still parses every .d.ts the program
 * references; a parse error is fatal regardless. `// @ts-nocheck`
 * also doesn't help — it's ignored in `.d.ts` files.
 *
 * Workaround: rewrite the broken tokens in place to syntactically
 * valid TypeScript (`Promise<any>`, `=> any`, etc). This degrades
 * the affected types to `any` but keeps the rest of the package's
 * types live. Each replacement is anchored on a substring unique to
 * the broken file so this is a no-op on already-patched or fixed-
 * upstream files.
 *
 * Wired up as a postinstall hook in package.json so it runs
 * automatically after `bun install` in both local dev and CI.
 *
 * When upstream ships fixes: the substring matches will stop
 * triggering and the script becomes a no-op. When upstream ships
 * NEW breakage: add an entry to PATCHES below.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Patch {
  // node_modules-relative AND pantry-relative paths to patch — same
  // broken content ships in both because pantry mirrors npm.
  files: string[]
  // Substring → replacement. Applied with String.replaceAll, so the
  // match must be unique enough that we don't accidentally rewrite
  // unrelated code in the same file.
  rewrites: Array<[string, string]>
}

const PATCHES: Patch[] = [
  {
    // bun-query-builder@0.1.16 — `Promise<;` (missing type arg) on
    // the `browserAuth.login` and `browserAuth.register` signatures.
    files: [
      'node_modules/bun-query-builder/dist/browser.d.ts',
      'pantry/bun-query-builder/dist/browser.d.ts',
    ],
    rewrites: [
      ['=> Promise<;', '=> Promise<any>;'],
    ],
  },
  {
    // bun-query-builder@0.1.16 — `=> ;` (missing return type) on
    // several `SingleTablePatterns` signatures.
    files: [
      'node_modules/bun-query-builder/dist/dynamodb-single-table.d.ts',
      'pantry/bun-query-builder/dist/dynamodb-single-table.d.ts',
    ],
    rewrites: [
      [') => ;', ') => any;'],
    ],
  },
  {
    // ts-images@0.1.7 — the `options: { ... }` parameter on
    // `modulate` is closed with `)` before `}`, leaving a dangling
    // object literal. Patch the specific signature in place.
    files: [
      'node_modules/ts-images/dist/core/color/index.d.ts',
      'pantry/ts-images/dist/core/color/index.d.ts',
    ],
    rewrites: [
      [
        'export declare function modulate(src: ImageData, options: {\n    brightness?: number): ImageData;',
        'export declare function modulate(src: ImageData, options: {\n    brightness?: number;\n}): ImageData;',
      ],
    ],
  },
]

let patched = 0
let alreadyClean = 0

for (const { files, rewrites } of PATCHES) {
  for (const rel of files) {
    const path = resolve(process.cwd(), rel)
    if (!existsSync(path))
      continue

    const original = readFileSync(path, 'utf-8')
    let updated = original
    for (const [from, to] of rewrites)
      updated = updated.replaceAll(from, to)

    if (updated === original) {
      alreadyClean++
      continue
    }

    writeFileSync(path, updated)
    patched++
  }
}

if (patched + alreadyClean > 0)
  console.log(`[patch-broken-dts] patched ${patched}, already-clean ${alreadyClean}`)
