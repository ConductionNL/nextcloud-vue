/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Proof that the singleton-externals rule keeps its boundaries.
 *
 * WHY THIS EXISTS
 * ---------------
 * `isSingletonExternal()` is the single point of failure for a rule that
 * already drifted silently once. It used to be a hand-written `external` list
 * in rollup.config.js; rollup.config.vue3.mjs arrived with its own list, never
 * got the rule, and the divergence shipped five vendored peerDependencies for
 * months. Centralising the list is what stops that recurring — which puts the
 * whole guarantee on this one function.
 *
 * The `bundled-peers` CI job checks the outcome end to end, but it needs two
 * full rollup builds to say anything. That is the wrong instrument for pinning
 * the boundary of a string predicate, and it runs far too late to tell someone
 * their edit was wrong.
 *
 * WHAT IS ACTUALLY AT RISK
 * ------------------------
 * The subpath handling. `dexie/import-wrapper.mjs` and
 * `gridstack/dist/gridstack.js` are the specifiers really written in source, so
 * matching only the bare name would let the deep import get inlined anyway —
 * and `dexie/import-wrapper.mjs` is precisely the module that throws
 * "Two different versions of Dexie loaded in the same app".
 *
 * The opposite error is the quiet one. `isSingletonExternal` uses
 * `startsWith(pkg + '/')`, and the obvious "simplification" to
 * `startsWith(pkg)` would externalise every package that merely shares a
 * prefix — `dexie-export-import`, `marked-terminal`, `@vueuse/shared`. Those
 * are real packages. Externalising one the library actually bundles moves a
 * runtime failure into consumers as an unresolved bare specifier, and no
 * existing gate would notice: `check-bundled-peers` only looks at
 * peerDependencies, so a wrongly-externalised NON-peer is invisible to it.
 * That is the gap these tests close.
 */

import { isSingletonExternal, SINGLETON_PACKAGES } from '../../rollup.singleton-externals.mjs'

describe('singleton externals', () => {
	describe('the list itself', () => {
		it('covers every package the incident was about', () => {
			// dexie is the boot-killer, dompurify the security boundary, marked and
			// @vueuse/core the silent duplicates, gridstack the JS/CSS pair.
			expect(SINGLETON_PACKAGES).toEqual(expect.arrayContaining(['@vueuse/core', 'dexie', 'dompurify', 'gridstack', 'marked']))
		})

		it('is declared in peerDependencies and NOT in dependencies', () => {
			// The shape that makes externalising meaningful. A package in both
			// dependencies and peerDependencies is installed into the consumer tree
			// by npm and can nest under our own node_modules, so the bare specifier
			// the dist emits resolves to OUR copy and there is still no singleton.
			// dompurify and marked were in exactly that state.
			const pkg = require('../../package.json')

			for (const name of SINGLETON_PACKAGES) {
				expect(pkg.peerDependencies).toHaveProperty(name)
				expect(pkg.dependencies || {}).not.toHaveProperty(name)
			}
		})
	})

	describe('exact names match', () => {
		it.each(SINGLETON_PACKAGES)('externalises %s', (name) => {
			expect(isSingletonExternal(name)).toBe(true)
		})
	})

	describe('subpaths match — these are the specifiers source actually writes', () => {
		it.each([
			['dexie/import-wrapper.mjs'],
			['dexie/dist/dexie.js'],
			['gridstack/dist/gridstack.js'],
			['dompurify/dist/purify.js'],
			['marked/lib/marked.esm.js'],
			['@vueuse/core/index.mjs'],
		])('externalises %s', (id) => {
			expect(isSingletonExternal(id)).toBe(true)
		})
	})

	describe('shared prefixes do NOT match', () => {
		// Guards against a well-meant `startsWith(pkg)` simplification. Each of
		// these is a real package, and wrongly externalising one would surface in
		// consumers as an unresolved bare specifier that no other gate catches.
		it.each([
			['dexie-export-import'],
			['dexie-encrypted'],
			['marked-terminal'],
			['markedjs'],
			['@vueuse/shared'],
			['@vueuse/core-extras'],
			['gridstack-extra'],
			['dompurify-fork'],
		])('leaves %s bundled', (id) => {
			expect(isSingletonExternal(id)).toBe(false)
		})
	})

	describe('unrelated ids do NOT match', () => {
		it.each([
			['vue'],
			['pinia'],
			['@nextcloud/axios'],
			['./relative.js'],
			['../parent.js'],
			['apexcharts'],
			['leaflet'],
		])('leaves %s alone', (id) => {
			expect(isSingletonExternal(id)).toBe(false)
		})
	})
})
