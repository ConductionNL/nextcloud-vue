/**
 * Tests for useManifestEditor — in-app edit-mode state (ADR-041).
 *
 * Edit-in-place model: edits mutate the LIVE manifest (so already-mounted
 * renderers, which captured the manifest object once via Vue-2 inject, see them
 * reactively). A snapshot is kept for the diff baseline + Cancel.
 *
 * - enter() snapshots; editing flips true; working IS the live manifest
 * - dirty reflects live-vs-snapshot difference
 * - save() emits diffManifest(snapshot, live) and round-trips via mergeManifestDelta
 * - successful save re-baselines + clears editing; cancel restores in place
 * - injected persist is called with the delta; a persist throw aborts the save
 */

import { ref, shallowRef, isReactive, toRaw } from 'vue'

const { useManifestEditor } = require('../../src/composables/useManifestEditor.js')
const { mergeManifestDelta } = require('../../src/utils/mergeManifestDelta.js')
const { diffManifest } = require('../../src/utils/diffManifest.js')

const baseManifest = () => ({
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [
		{ id: 'home', route: '/', type: 'dashboard', title: 'Home', widgets: [{ id: 'w1', widgetKey: 'k', slot: 'body', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 }] },
	],
})

describe('useManifestEditor', () => {
	it('enters edit mode, snapshots, and edits the live manifest in place', () => {
		const base = ref(baseManifest())
		const live = base.value
		const ed = useManifestEditor(base)
		ed.enter()
		expect(ed.editing.value).toBe(true)
		// working IS the live manifest (edits must reach already-mounted renderers)
		expect(ed.working.value).toBe(live)
		ed.working.value.pages[0].title = 'Changed'
		expect(base.value.pages[0].title).toBe('Changed') // live mutation
		expect(ed.snapshot.value.pages[0].title).toBe('Home') // snapshot pristine
	})

	it('source is always the live manifest', () => {
		const base = ref(baseManifest())
		const ed = useManifestEditor(base)
		expect(ed.source.value).toBe(base.value)
		ed.enter()
		expect(ed.source.value).toBe(base.value)
	})

	it('dirty reflects live-vs-snapshot difference', () => {
		const base = ref(baseManifest())
		const ed = useManifestEditor(base)
		ed.enter()
		expect(ed.dirty.value).toBe(false)
		ed.working.value.pages[0].widgets[0].gridX = 6
		expect(ed.dirty.value).toBe(true)
	})

	it('save emits the minimal delta and round-trips', async () => {
		const base = ref(baseManifest())
		const before = baseManifest()
		const ed = useManifestEditor(base)
		ed.enter()
		ed.working.value.pages[0].widgets[0].gridX = 6
		const live = JSON.parse(JSON.stringify(base.value))
		const delta = await ed.save()
		expect(delta).toEqual(diffManifest(before, live))
		expect(mergeManifestDelta(before, delta).manifest).toEqual(live)
	})

	it('successful save re-baselines and clears editing/dirty', async () => {
		const base = ref(baseManifest())
		const ed = useManifestEditor(base)
		ed.enter()
		ed.working.value.pages[0].title = 'New'
		await ed.save()
		expect(base.value.pages[0].title).toBe('New')
		expect(ed.editing.value).toBe(false)
		expect(ed.dirty.value).toBe(false)
	})

	it('cancel restores the live manifest from the snapshot in place', () => {
		const base = ref(baseManifest())
		const live = base.value
		const ed = useManifestEditor(base)
		ed.enter()
		ed.working.value.pages[0].title = 'Discarded'
		ed.cancel()
		expect(ed.editing.value).toBe(false)
		expect(base.value).toBe(live) // same object identity preserved
		expect(base.value.pages[0].title).toBe('Home') // contents restored
	})

	it('calls the injected persist with the delta', async () => {
		const base = ref(baseManifest())
		const persist = jest.fn().mockResolvedValue(undefined)
		const ed = useManifestEditor(base, { persist })
		ed.enter()
		ed.working.value.pages[0].title = 'Persisted'
		const delta = await ed.save()
		expect(persist).toHaveBeenCalledWith(delta)
	})

	it('aborts the save when persist throws (edits + editing preserved)', async () => {
		const base = ref(baseManifest())
		const persist = jest.fn().mockRejectedValue(new Error('network'))
		const ed = useManifestEditor(base, { persist })
		ed.enter()
		ed.working.value.pages[0].title = 'Failed'
		await expect(ed.save()).rejects.toThrow('network')
		expect(ed.editing.value).toBe(true)
		expect(base.value.pages[0].title).toBe('Failed') // in-place edit retained for retry
	})

	// Audit item 9 (manifest-markraw-reactivity): CnAppRoot holds the manifest in
	// a shallowRef so the immutable graph is NOT deep-observed at boot. enter()
	// is the reactivity opt-in — it observes the live manifest IN PLACE, keeping
	// object identity so already-mounted (inject-once) renderers pick up edits.
	describe('raw/reactive boundary (audit item 9)', () => {
		// Vue 2's `observable()` rewrote the object's properties in place and
		// returned the SAME reference, so the opt-in preserved `===`. Vue 3's
		// `reactive()` returns a PROXY and leaves the target untouched, so the
		// reference read back through `.value` is necessarily the proxy. The
		// invariant that survives — and that the editor depends on — is that the
		// proxy's target is the host's object: `toRaw(...) === live`, so writes
		// land there and `cancel()` restores it in place.
		it('holds the manifest raw and opts it into reactivity on enter (host object still the write target)', () => {
			const base = shallowRef(baseManifest())
			const live = base.value
			// Boot read path: raw, no per-node observer conversion.
			expect(isReactive(base.value)).toBe(false)
			expect(isReactive(base.value.pages[0])).toBe(false)
			const ed = useManifestEditor(base)
			ed.enter()
			// reactive IN PLACE — same object identity (critical: CnPageRenderer
			// captured this object once via inject('cnManifest')), now deep-observed.
			expect(toRaw(base.value)).toBe(live)
			expect(toRaw(ed.working.value)).toBe(live)
			expect(isReactive(base.value)).toBe(true)
			expect(isReactive(base.value.pages[0])).toBe(true)
		})

		it('a page subtree becomes reactive on enter and a fresh manifest reads raw again on exit', async () => {
			const base = shallowRef(baseManifest())
			const ed = useManifestEditor(base)
			expect(isReactive(base.value.pages[0])).toBe(false)
			ed.enter()
			expect(isReactive(base.value.pages[0])).toBe(true)
			ed.working.value.pages[0].title = 'Edited'
			await ed.save()
			// On the next manifest publish (host reload / backend delta merge) the
			// shallowRef re-installs a fresh RAW manifest → read path non-reactive.
			base.value = baseManifest()
			expect(isReactive(base.value)).toBe(false)
			expect(isReactive(base.value.pages[0])).toBe(false)
		})

		it('is idempotent on a second edit session (reactive() no-op)', () => {
			const base = shallowRef(baseManifest())
			const ed = useManifestEditor(base)
			ed.enter()
			ed.cancel()
			expect(ed.editing.value).toBe(false)
			ed.enter()
			expect(isReactive(base.value)).toBe(true)
			expect(ed.editing.value).toBe(true)
		})
	})
})
