#!/usr/bin/env node

/**
 * Vendored-peer-dependency gate.
 *
 * THE BUG THIS GUARDS AGAINST
 * ---------------------------
 * A peerDependency that reaches the consumer as OUR copy rather than theirs
 * stops being a singleton. The consuming app resolves its own copy too, so the
 * app runs two different modules for one package — with ours winning inside our
 * own components — and the consumer cannot fix it: bumping their own dependency
 * does nothing to the copy that arrived with us.
 *
 * `dexie` is the case that made this urgent, because it does not fail quietly.
 * Its ESM entry claims a page-global singleton (globalThis[Symbol.for("Dexie")])
 * and THROWS at module evaluation when the copies disagree, before the app
 * mounts:
 *
 *   Two different versions of Dexie loaded in the same app: 4.4.5 and 4.4.4
 *
 * Those are real numbers. The published `2.1.0-vue3.16` tarball froze dexie
 * 4.4.4 while declaring peer ^4.0.8, which resolves to 4.4.5 — so every
 * consumer carried both, with exactly ONE dexie in its own lockfile. The second
 * copy was ours. pipelinq#1431 (a dependabot 4.4.4 -> 4.4.5 bump) failed its
 * E2E boot gate this way; pipelinq#1455 repeated it for `marked`.
 *
 * TWO WAYS OUR COPY REACHES THE CONSUMER
 * --------------------------------------
 * Both are checked here, because fixing only the first leaves the defect intact
 * and merely moves where it lives.
 *
 *  1. INLINED INTO THE DIST by rollup, when a config `external` list misses it.
 *     That is the original defect: the rule lived as a hand-written list in
 *     rollup.config.js, rollup.config.vue3.mjs arrived with its own list and
 *     never got it, and the divergence shipped five vendored peers.
 *
 *  2. DECLARED IN `dependencies` AS WELL AS `peerDependencies`, in which case
 *     npm installs our copy into the consumer tree no matter what rollup does.
 *     When the consumer range cannot dedupe with ours, npm nests it at
 *     `node_modules/@conduction/nextcloud-vue/node_modules/<pkg>`, and the bare
 *     specifier the dist emits resolves to THAT — not to the consumer copy,
 *     because node resolution walks up from our own dist directory and hits our
 *     nested copy first. Externalising a package in this shape is a no-op: the
 *     duplicate just moves out of `dist/` where the walk below cannot see it.
 *     `dompurify` and `marked` were in exactly this state.
 *
 *     The working shape is peerDependencies (what the consumer must supply)
 *     plus devDependencies (what our own build and tests resolve) and NOTHING
 *     in dependencies — how `dexie` and `gridstack` are already declared.
 *
 * WHY A RULE IN THE CONFIG WAS NOT ENOUGH
 * ---------------------------------------
 * rollup.singleton-externals.mjs makes the list a single source of truth both
 * configs import, so neither can be the one that forgot. This gate is the other
 * half: it asserts the OUTCOME rather than trusting that rule, so it still
 * fires if a future config forgets to import the shared list, or resolves a
 * peer some other way. A check must not share the failure mode of the rule it
 * checks.
 *
 * WHAT THIS DOES, AND WHAT IT DOES NOT COVER
 * ------------------------------------------
 * Three assertions, all against `peerDependencies`:
 *
 *  a. No peer appears in `dependencies` (manifest check — catches shape 2, and
 *     needs no build).
 *  b. No peer is vendored under a `node_modules/` segment of `dist/`. This
 *     covers the ESM `preserveModules` output, where every included module
 *     keeps its own file and directory.
 *  c. No peer is listed in `dist/bundled-packages.json` when that file exists.
 *     That manifest is emitted by the `recordBundledPackages` plugin in
 *     rollup.config.js from `generateBundle`, walking every chunk `modules`
 *     map, so it is the ONLY signal covering `dist/nextcloud-vue.cjs.js` — a
 *     single `inlineDynamicImports` bundle whose contents are inlined as text
 *     with no directory to find.
 *
 * The gap that remains, stated rather than hidden: `npm run build:vue3` does
 * not run the manifest plugin, so on a Vue 3 dist only (a) and (b) apply and
 * nothing inspects a CJS-shaped artifact. Every run prints which assertions it
 * was able to make, so a green line is never read as more than it is.
 *
 * USAGE
 *   node scripts/check-bundled-peers.mjs [repoRoot]
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

const root = resolve(process.argv[2] || '.')
const distDir = join(root, 'dist')
const pkgPath = join(root, 'package.json')

if (!existsSync(pkgPath)) {
	console.error(`check-bundled-peers: FAIL — no package.json at ${pkgPath}.`)
	process.exit(1)
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const peers = Object.keys(pkg.peerDependencies || {})
const deps = pkg.dependencies || {}

if (peers.length === 0) {
	console.log('check-bundled-peers: OK — this package declares no peerDependencies, so nothing can be vendored in violation.')
	process.exit(0)
}

const failures = []
const coverage = []

// (a) Shape check. Runs without a build, and catches the case the dist walk
//     structurally cannot see.
const alsoDependencies = peers.filter((peer) => deps[peer]).sort()
coverage.push('dependencies overlap')

if (alsoDependencies.length > 0) {
	failures.push({
		title: `${alsoDependencies.length} declared peerDependency(ies) are ALSO in dependencies`,
		items: alsoDependencies.map((name) => `${name}  (dependencies ${deps[name]}, peer ${pkg.peerDependencies[name]})`),
		why: [
			'npm installs our copy into the consumer tree regardless of what rollup does. When the consumer range cannot',
			'dedupe with ours, npm nests it under node_modules/@conduction/nextcloud-vue/node_modules/, and the bare',
			'specifier the dist emits resolves to OUR nested copy — node resolution walks up from our dist directory and',
			'finds it first. Externalising a package in this shape does not make it a singleton; it only moves the',
			'duplicate out of dist/, where the vendored-file check cannot see it.',
			'',
			'Fix: declare it as peerDependencies (what the consumer supplies) + devDependencies (what our build and tests',
			'resolve), with nothing in dependencies — the shape dexie and gridstack already use.',
		],
	})
}

/**
 * Collect every package vendored under a `node_modules/` segment of the dist.
 *
 * Recorded by position rather than by name matching: a directory qualifies when
 * the path segments immediately following the last `node_modules` segment are
 * either `[name]` or `[@scope, name]`. That handles scoped packages and
 * vendored-inside-vendored nesting without special cases.
 *
 * @param {string} dir  Directory to walk.
 * @param {Set}    into Accumulator of package names.
 *
 * @return {void}
 */
function collect(dir, into) {
	let entries
	try {
		entries = readdirSync(dir, { withFileTypes: true })
	} catch {
		return
	}

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue
		}

		const full = join(dir, entry.name)
		const segments = full.slice(distDir.length + 1).split(sep)
		const last = segments.lastIndexOf('node_modules')

		if (last !== -1) {
			const tail = segments.slice(last + 1)
			if (tail.length === 1 && !tail[0].startsWith('@')) {
				into.add(tail[0])
			} else if (tail.length === 2 && tail[0].startsWith('@')) {
				into.add(`${tail[0]}/${tail[1]}`)
			}
		}

		collect(full, into)
	}
}

if (!existsSync(distDir)) {
	console.error(`check-bundled-peers: FAIL — no dist/ at ${distDir}. Assertions (b) and (c) read the BUILT artifact; run the build first (npm run build, or npm run build:vue3).`)
	process.exit(1)
}

// (b) Vendored files in the ESM preserveModules output.
const vendored = new Set()
collect(distDir, vendored)
coverage.push('vendored dist files (ESM preserveModules)')

const inlined = peers.filter((peer) => vendored.has(peer)).sort()

if (inlined.length > 0) {
	failures.push({
		title: `${inlined.length} declared peerDependency(ies) are vendored into dist/`,
		items: inlined.map((name) => `${name}  (peer range ${pkg.peerDependencies[name]})`),
		why: [
			'Rollup inlined the package instead of leaving it external, so the dist ships a build-time snapshot frozen at',
			'library build time while the app resolves its own copy at install time.',
			'',
			'Fix: add it to SINGLETON_PACKAGES in rollup.singleton-externals.mjs, which both rollup configs import. If it',
			'genuinely must be bundled, it is not a peer dependency — move it to dependencies and say why.',
		],
	})
}

// (c) The bundle manifest, the only signal covering the single-file CJS output.
const manifestPath = join(distDir, 'bundled-packages.json')
let manifestNote = 'dist/bundled-packages.json ABSENT — the CJS bundle was NOT inspected (npm run build:vue3 does not emit it)'

if (existsSync(manifestPath)) {
	const listed = new Set(JSON.parse(readFileSync(manifestPath, 'utf8')))
	coverage.push(`bundle manifest (${listed.size} packages, covers dist/nextcloud-vue.cjs.js)`)
	manifestNote = null

	const viaManifest = peers.filter((peer) => listed.has(peer) && !vendored.has(peer)).sort()

	if (viaManifest.length > 0) {
		failures.push({
			title: `${viaManifest.length} declared peerDependency(ies) are inlined into a bundled chunk`,
			items: viaManifest.map((name) => `${name}  (peer range ${pkg.peerDependencies[name]})`),
			why: [
				'These do not show up as vendored files because the CJS output is one inlineDynamicImports bundle: the code',
				'is inlined as text with no directory to find. dist/bundled-packages.json records what rollup included.',
				'',
				'Fix: add it to SINGLETON_PACKAGES in rollup.singleton-externals.mjs.',
			],
		})
	}
}

if (failures.length > 0) {
	console.error('check-bundled-peers: FAIL')
	for (const failure of failures) {
		console.error('')
		console.error(`  ${failure.title}:`)
		console.error('')
		for (const item of failure.items) {
			console.error(`    ${item}`)
		}
		console.error('')
		for (const line of failure.why) {
			console.error(`  ${line}`)
		}
	}
	console.error('')
	console.error(`  Assertions made: ${coverage.join('; ')}.`)
	process.exit(1)
}

console.log(`check-bundled-peers: OK — none of the ${peers.length} declared peer(s) reach consumers as our copy.`)
console.log(`  Assertions made: ${coverage.join('; ')}.`)
console.log(`  ${vendored.size} package(s) vendored into dist/ in total (non-peers are fine).`)
if (manifestNote) {
	console.log(`  LIMITATION: ${manifestNote}.`)
}
