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
})
