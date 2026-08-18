#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Fail if the public site-block entry point can reach the Nextcloud runtime.
 *
 * `src/public/index.js` promises components that render at a public origin
 * with no Nextcloud behind them. That promise is only worth something if it is
 * CHECKED: the failure mode is a `@nextcloud/router` call reaching for an `OC`
 * global that does not exist, in a browser, on a live government portal —
 * never at build time, and never in a Nextcloud-hosted test.
 *
 * TRANSITIVE, NOT DIRECT, AND THE DIFFERENCE IS THE WHOLE POINT. Checking only
 * each file's own imports reported 12 of 13 candidate widgets clean; following
 * relative imports through the tree showed 12 of 13 UNSAFE, almost all via
 * `@nextcloud/l10n`. A direct-only check would have certified the exact set of
 * components that cannot run.
 *
 * Exits 1 with the offending chain, or 0. It also fails when it inspects
 * NOTHING — "no violations found" and "no files were read" are the two
 * outcomes a checker must never conflate.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENTRY = path.join(ROOT, 'src/public/index.js')

/** Any Nextcloud runtime package. The portal has none of these at a public origin. */
const FORBIDDEN = /^@nextcloud\//

const visited = new Set()
const violations = []
let filesInspected = 0

/**
 * Resolve a relative import to a file on disk.
 *
 * @param {string} spec The import specifier.
 * @param {string} from The importing file.
 * @return {string|null} Resolved path, or null when not a local file.
 */
function resolveLocal(spec, from) {
	if (!spec.startsWith('.')) return null
	const base = path.resolve(path.dirname(from), spec)
	const candidates = [
		base,
		`${base}.vue`,
		`${base}.js`,
		`${base}.ts`,
		path.join(base, 'index.js'),
		path.join(base, 'index.vue'),
	]
	return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null
}

/**
 * Walk a file's imports, depth first.
 *
 * @param {string} file  Absolute path.
 * @param {Array}  chain How we got here, for the error message.
 * @return {void}
 */
function walk(file, chain) {
	if (visited.has(file)) return
	visited.add(file)
	filesInspected++

	const source = fs.readFileSync(file, 'utf8')
	const specs = [...source.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
	const here = chain.concat(path.relative(ROOT, file))

	for (const spec of specs) {
		if (FORBIDDEN.test(spec)) {
			violations.push({ spec, chain: here })
			continue
		}
		const local = resolveLocal(spec, file)
		if (local) walk(local, here)
	}
}

if (!fs.existsSync(ENTRY)) {
	console.error(`::error::public entry not found at ${path.relative(ROOT, ENTRY)} — nothing was checked.`)
	process.exit(1)
}

walk(ENTRY, [])

// A run that inspected one file read the entry and no components: that is a
// broken resolver, not a clean bill of health.
if (filesInspected < 2) {
	console.error(
		`::error::check-public-safe inspected only ${filesInspected} file(s). `
		+ 'The entry point resolves no local imports, so this run proves nothing.',
	)
	process.exit(1)
}

if (violations.length > 0) {
	console.error(`::error::${violations.length} Nextcloud runtime import(s) reachable from the public site-block entry:`)
	for (const v of violations) {
		console.error(`  ${v.spec}`)
		console.error(`    via ${v.chain.join(' -> ')}`)
	}
	console.error('')
	console.error('These blocks must render at a public origin with no Nextcloud.')
	console.error('Take strings as props instead of calling t(), and build URLs from')
	console.error('props instead of generateUrl().')
	process.exit(1)
}

console.log(`[public-safe] OK — ${filesInspected} file(s) inspected, no @nextcloud/* reachable.`)
