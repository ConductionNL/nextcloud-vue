/**
 * Tests for mergeManifestDelta — keyed structural manifest merge.
 *
 * Covers the manifest-delta-merge capability:
 * - patch an existing page without resending siblings
 * - append a new widget by new id
 * - remove a keyed entry via $op:"remove"
 * - reorder via __order map
 * - orphaned remove (missing key) skipped + surfaced
 * - non-keyed arrays replace; inputs never mutated
 */

const { mergeManifestDelta } = require('../../src/utils/mergeManifestDelta.js')

const base = () => ({
	version: '1.0.0',
	pages: [
		{ id: 'a', title: 'A', widgets: [{ id: 'w1', widgetKey: 'k1' }, { id: 'w2', widgetKey: 'k2' }] },
		{ id: 'b', title: 'B' },
	],
})

describe('mergeManifestDelta', () => {
	it('patches an existing page without touching siblings', () => {
		const { manifest } = mergeManifestDelta(base(), { pages: [{ id: 'a', title: 'A2' }] })
		expect(manifest.pages.find((p) => p.id === 'a').title).toBe('A2')
		expect(manifest.pages.find((p) => p.id === 'b').title).toBe('B')
		// untouched widgets survive the patch
		expect(manifest.pages.find((p) => p.id === 'a').widgets).toHaveLength(2)
	})

	it('appends a new widget by new id, keeping base widgets', () => {
		const { manifest } = mergeManifestDelta(base(), {
			pages: [{ id: 'a', widgets: [{ id: 'w3', widgetKey: 'k3' }] }],
		})
		const ids = manifest.pages.find((p) => p.id === 'a').widgets.map((w) => w.id)
		expect(ids).toEqual(['w1', 'w2', 'w3'])
	})

	it('removes a keyed entry via $op:"remove"', () => {
		const { manifest } = mergeManifestDelta(base(), { pages: [{ id: 'b', $op: 'remove' }] })
		expect(manifest.pages.map((p) => p.id)).toEqual(['a'])
	})

	it('reorders widgets via __order map', () => {
		const { manifest } = mergeManifestDelta(base(), {
			pages: [{ id: 'a', __order: { widgets: ['w2', 'w1'] } }],
		})
		expect(manifest.pages.find((p) => p.id === 'a').widgets.map((w) => w.id)).toEqual(['w2', 'w1'])
	})

	it('surfaces an orphaned remove that targets a missing key', () => {
		const { manifest, orphanedDeltaPaths } = mergeManifestDelta(base(), {
			pages: [{ id: 'gone', $op: 'remove' }],
		})
		expect(manifest.pages.map((p) => p.id)).toEqual(['a', 'b'])
		expect(orphanedDeltaPaths).toEqual(['pages/gone'])
	})

	it('replaces non-keyed arrays wholesale', () => {
		const b = { dependencies: ['x', 'y'], menu: [], pages: [] }
		const { manifest } = mergeManifestDelta(b, { dependencies: ['z'] })
		expect(manifest.dependencies).toEqual(['z'])
	})

	it('does not mutate its inputs', () => {
		const b = base()
		const snapshot = JSON.stringify(b)
		mergeManifestDelta(b, { pages: [{ id: 'a', title: 'changed' }] })
		expect(JSON.stringify(b)).toBe(snapshot)
	})

	it('strips delta markers from merged entries', () => {
		const { manifest } = mergeManifestDelta(base(), {
			pages: [{ id: 'a', __order: { widgets: ['w2', 'w1'] } }],
		})
		expect(manifest.pages.find((p) => p.id === 'a').__order).toBeUndefined()
	})
})
