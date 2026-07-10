/**
 * Tests for manifest-shallow-reactivity-by-default.
 *
 * The manifest returned by useAppManifest is shallow by default (shallowRef,
 * no deep-reactive __ob__ conversion of the tree on boot). CnAppRoot /
 * useManifestEditor.enter() upgrade the SAME object to deep-reactive IN PLACE
 * (Vue 2.7 reactive(), preserving object identity) only when OpenBuild in-app
 * editing is available — preserving ADR-041's live-editing contract while
 * skipping the boot cost for every non-editing (currently: all) app.
 *
 * This file also pins the two load-bearing Vue 2.7 assumptions the design
 * depends on (design.md §2 / tasks §1): reactive() converts in place and
 * returns the same reference, and shallowRef does not deep-convert.
 */

import { shallowRef, reactive, isReactive } from 'vue'

const { useAppManifest } = require('../../src/composables/useAppManifest.js')
const { useManifestEditor, upgradeManifestToEditable } = require('../../src/composables/useManifestEditor.js')

const baseManifest = () => ({
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [
		{ id: 'home', route: '/', type: 'dashboard', title: 'Home', widgets: [] },
	],
})

describe('manifest-shallow-reactivity: load-bearing Vue 2.7 assumptions', () => {
	it('1.1 reactive() converts IN PLACE and returns the same reference (Vue 2 semantics, not a Vue-3 Proxy)', () => {
		const obj = { a: 1, nested: { b: 2 } }
		const r = reactive(obj)
		expect(r).toBe(obj)
		expect(isReactive(obj)).toBe(true)
	})

	it('1.2 shallowRef does NOT deep-convert its value (no __ob__ on the object or nested props)', () => {
		const obj = { pages: [{ id: 'p1' }], menu: [] }
		const sr = shallowRef(obj)
		expect(sr.value).toBe(obj)
		expect(Object.prototype.hasOwnProperty.call(sr.value, '__ob__')).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(sr.value.pages[0], '__ob__')).toBe(false)
	})
})

describe('useAppManifest — shallow by default', () => {
	it('in-memory branch returns the manifest object by reference, NOT deep-reactive', () => {
		const m = baseManifest()
		const { manifest } = useAppManifest({ manifest: m })
		expect(manifest.value).toBe(m)
		expect(isReactive(manifest.value)).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(manifest.value, '__ob__')).toBe(false)
	})

	it('in-memory branch: the object is NOT markRaw-frozen, so a later reactive() upgrade still works', () => {
		const m = baseManifest()
		const { manifest } = useAppManifest({ manifest: m })
		upgradeManifestToEditable(manifest.value)
		expect(isReactive(manifest.value)).toBe(true)
	})

	it('legacy backend branch starts with the bundled manifest by reference and shallow', () => {
		const bundled = baseManifest()
		const { manifest } = useAppManifest('someapp', bundled, {
			// no-op fetcher: no /api/manifest, keep bundled
			fetcher: () => Promise.reject(new Error('no endpoint')),
		})
		expect(manifest.value).toBe(bundled)
		expect(isReactive(manifest.value)).toBe(false)
	})
})

describe('upgradeManifestToEditable — in-place deep-reactive upgrade (ADR-041 contract)', () => {
	it('upgrades the SAME object reference to deep-reactive (identity preserved for inject consumers)', () => {
		const m = baseManifest()
		const returned = upgradeManifestToEditable(m)
		expect(returned).toBe(m)
		expect(isReactive(m)).toBe(true)
	})

	it('is idempotent (repeat call is a no-op, marker is non-enumerable)', () => {
		const m = baseManifest()
		upgradeManifestToEditable(m)
		upgradeManifestToEditable(m)
		expect(isReactive(m)).toBe(true)
		// marker must not leak into enumerable keys (would pollute diff/serialisation)
		expect(Object.keys(m)).toEqual(['version', 'menu', 'pages'])
	})

	it('tolerates null / non-object input without throwing', () => {
		expect(() => upgradeManifestToEditable(null)).not.toThrow()
		expect(() => upgradeManifestToEditable(undefined)).not.toThrow()
		expect(upgradeManifestToEditable(null)).toBe(null)
	})
})

describe('useManifestEditor — enter() upgrades then edits live in place (5.1)', () => {
	it('a nested mutation of the live manifest after enter() reaches the shared object reactively', () => {
		// Simulate the shallow manifest a consuming app holds.
		const m = baseManifest()
		const base = shallowRef(m)
		expect(isReactive(base.value)).toBe(false)

		const ed = useManifestEditor(base)
		ed.enter()
		// enter() must have upgraded the live manifest to deep-reactive so
		// descendants that captured `m` via inject observe in-place edits.
		expect(isReactive(m)).toBe(true)
		// working IS the same live object (edits reach already-mounted renderers)
		expect(ed.working.value).toBe(m)

		ed.working.value.pages[0].title = 'Changed'
		expect(base.value.pages[0].title).toBe('Changed') // live mutation, same ref
		expect(ed.snapshot.value.pages[0].title).toBe('Home') // snapshot pristine
	})
})

describe('no upgrade when OpenBuild editing is never invoked (5.3)', () => {
	it('a shallow manifest that never enters edit mode stays raw (non-reactive)', () => {
		const m = baseManifest()
		const { manifest } = useAppManifest({ manifest: m })
		// No CnAppRoot upgrade, no editor enter() → object never deep-converted.
		expect(isReactive(manifest.value)).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(manifest.value, '__ob__')).toBe(false)
	})
})
