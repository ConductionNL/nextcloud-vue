/**
 * Tests for diffManifest — minimal keyed delta producer.
 *
 * Covers the manifest-delta-merge capability:
 * - round-trip a single-field edit (diff → merge reproduces edited)
 * - round-trip a removal
 * - round-trip an addition + reorder
 * - equal manifests produce an empty delta
 * - id-less mergeable arrays fall back to whole-array replace + warn
 */

const { diffManifest } = require('../../src/utils/diffManifest.js')
const { mergeManifestDelta } = require('../../src/utils/mergeManifestDelta.js')

const base = () => ({
	version: '1.0.0',
	menu: [],
	pages: [
		{ id: 'a', title: 'A', widgets: [{ id: 'w1', widgetKey: 'k1' }, { id: 'w2', widgetKey: 'k2' }] },
		{ id: 'b', title: 'B' },
	],
})

function roundTrip(b, edited) {
	const delta = diffManifest(b, edited)
	return mergeManifestDelta(b, delta).manifest
}

describe('diffManifest', () => {
	it('produces an empty delta for equal manifests', () => {
		expect(diffManifest(base(), base())).toEqual({})
	})

	it('round-trips a single-field page edit with a minimal delta', () => {
		const edited = base()
		edited.pages[0].title = 'A2'
		const delta = diffManifest(base(), edited)
		// Only page a, keyed, with the changed title.
		expect(delta.pages).toEqual([{ id: 'a', title: 'A2' }])
		expect(roundTrip(base(), edited)).toEqual(edited)
	})

	it('round-trips a removal via $op:"remove"', () => {
		const edited = base()
		edited.pages = edited.pages.filter((p) => p.id !== 'b')
		const delta = diffManifest(base(), edited)
		expect(delta.pages).toContainEqual({ id: 'b', $op: 'remove' })
		expect(roundTrip(base(), edited)).toEqual(edited)
	})

	it('round-trips an addition', () => {
		const edited = base()
		edited.pages.push({ id: 'c', title: 'C' })
		expect(roundTrip(base(), edited)).toEqual(edited)
	})

	it('round-trips a widget reorder', () => {
		const edited = base()
		edited.pages[0].widgets = [edited.pages[0].widgets[1], edited.pages[0].widgets[0]]
		const delta = diffManifest(base(), edited)
		expect(delta.pages[0].__order).toEqual({ widgets: ['w2', 'w1'] })
		expect(roundTrip(base(), edited)).toEqual(edited)
	})

	it('falls back to whole-array replace for id-less entries and warns', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const b = { menu: [{ id: 'm1' }], pages: [{ id: 'a', widgets: [{ widgetKey: 'noid' }] }] }
		const edited = { menu: [{ id: 'm1' }], pages: [{ id: 'a', widgets: [{ widgetKey: 'changed' }] }] }
		const delta = diffManifest(b, edited)
		expect(delta.pages[0].widgets).toEqual([{ widgetKey: 'changed' }])
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	// Nested menu children diff by child id, symmetric with the merge engine.
	describe('nested menu children (keyed)', () => {
		const menuBase = () => ({
			menu: [{ id: 'CasesGroup', children: [{ id: 'AllCases', label: 'All cases' }] }],
		})

		it('emits a minimal per-child delta for an added child and round-trips', () => {
			const edited = {
				menu: [{ id: 'CasesGroup', children: [
					{ id: 'AllCases', label: 'All cases' },
					{ id: 'ct-new', label: 'Objections', route: 'Cases' },
				] }],
			}
			const delta = diffManifest(menuBase(), edited)
			// Only the new child travels in the delta, keyed under the group.
			expect(delta.menu[0].id).toBe('CasesGroup')
			expect(delta.menu[0].children).toEqual([{ id: 'ct-new', label: 'Objections', route: 'Cases' }])
			expect(roundTrip(menuBase(), edited)).toEqual(edited)
		})

		it('round-trips a child removal via $op:"remove"', () => {
			const b = { menu: [{ id: 'CasesGroup', children: [{ id: 'AllCases' }, { id: 'ct-x' }] }] }
			const edited = { menu: [{ id: 'CasesGroup', children: [{ id: 'AllCases' }] }] }
			const delta = diffManifest(b, edited)
			expect(delta.menu[0].children).toEqual([{ id: 'ct-x', $op: 'remove' }])
			expect(roundTrip(b, edited)).toEqual(edited)
		})
	})
})
