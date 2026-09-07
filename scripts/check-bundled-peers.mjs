#!/usr/bin/env node

/**
 * Vendored-peer-dependency gate.
 *
 * THE BUG THIS GUARDS AGAINST
 * ---------------------------
 * A peerDependency that gets inlined into the dist becomes a build-time
 * SNAPSHOT frozen into the library. The consuming app resolves its own copy at
 * install time, so the two drift apart on the next release and the app runs two
 * different modules for one package — with ours winning inside our own
 * components. The consumer cannot fix it: bumping their own dependency does
 * nothing to the copy inside our dist.
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
 * WHY A RULE IN THE CONFIG WAS NOT ENOUGH
 * ---------------------------------------
 * The rule already existed — as a hand-written `external` list in
 * rollup.config.js. Then rollup.config.vue3.mjs arrived as a second config with
 * its own list, the rule was never copied across, and the divergence shipped
 * four vendored peers for months. Measured on that tarball: 49 packages inlined
 * into dist/esm/node_modules/, four of them declared peers (dexie, dompurify,
 * marked, @vueuse/core).
 *
 * Two fixes followed. rollup.singleton-externals.mjs makes the list a single
 * source of truth both configs import, so neither can be the one that forgot.
 * This gate is the second half: it asserts the OUTCOME on the built artifact.
 * That distinction is deliberate — it reads the dist rather than trusting a
 * config or a build-time plugin manifest, so it still fires if a future config
 * forgets to import the shared list, if a plugin resolves a peer some other
 * way, or if the output layout changes. A rule is only as good as the thing
 * that checks it, and the thing that checks it must not share the rule's
 * failure mode.
 *
 * WHAT THIS DOES
 * --------------
 * Walks the built `dist/`, collects every package vendored under any
 * `node_modules/` segment (scoped packages included, nesting included), and
 * intersects that set with `peerDependencies`. Any overlap fails the build and
 * names the packages. Runs after `npm run build` / `npm run build:vue3`, and
 * gates whichever config produced the dist.
 *
 * USAGE
 *   node scripts/check-bundled-peers.mjs [repoRoot]
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
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

if (peers.length === 0) {
	console.log('check-bundled-peers: OK — this package declares no peerDependencies, so nothing can be vendored in violation.')
	process.exit(0)
}

if (!existsSync(distDir)) {
	console.error(`check-bundled-peers: FAIL — no dist/ at ${distDir}. This gate reads the BUILT artifact; run the build first (npm run build, or npm run build:vue3).`)
	process.exit(1)
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

const vendored = new Set()
collect(distDir, vendored)

const offenders = peers.filter((peer) => vendored.has(peer)).sort()

if (offenders.length > 0) {
	console.error(`check-bundled-peers: FAIL — ${offenders.length} declared peerDependency(ies) are vendored into dist/:`)
	console.error('')
	for (const name of offenders) {
		console.error(`    ${name}  (peer range ${pkg.peerDependencies[name]})`)
	}
	console.error('')
	console.error('A vendored peer is a build-time snapshot frozen into the library. The consuming app resolves its own copy at')
	console.error('install time, the two drift apart on the next release, and the app then runs two different modules for one')
	console.error('package — with ours winning inside our own components. Consumers cannot fix it from their side.')
	console.error('')
	console.error('For dexie this is fatal rather than subtle: it claims a page-global singleton and throws at module evaluation')
	console.error('when the copies disagree ("Two different versions of Dexie loaded in the same app"), so the consuming app')
	console.error('loads its bundle and mounts nothing. For dompurify it is a security defect — consumers bump their own copy,')
	console.error('npm audit reports green, and the vulnerable copy inside our dist keeps sanitizing.')
	console.error('')
	console.error('Fix: add the package to SINGLETON_PACKAGES in rollup.singleton-externals.mjs, which both rollup configs')
	console.error('import. If it genuinely must be bundled, it is not a peer dependency — move it to dependencies and say why.')
	process.exit(1)
}

console.log(`check-bundled-peers: OK — ${vendored.size} package(s) vendored into dist/, none of the ${peers.length} declared peer(s) among them.`)
