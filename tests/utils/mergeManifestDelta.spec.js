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

	// Nested menu children merge by child `id` (KEYED_ARRAYS.children) — the
	// backend `/api/manifest` per-tenant / per-case-type menu fan-out relies on
	// this so a group's children can be extended without clobbering the rest.
	describe('nested menu children (keyed by id)', () => {
		const menuBase = () => ({
			menu: [
				{
					id: 'CasesGroup',
					label: 'Cases',
					children: [
						{ id: 'AllCases', label: 'All cases', route: 'Cases' },
					],
				},
			],
		})

		it('adds new children to a group without dropping the existing ones', () => {
			const { manifest } = mergeManifestDelta(menuBase(), {
				menu: [{
					id: 'CasesGroup',
					children: [
						{ id: 'ct-bezwaar', label: 'Objections', route: 'Cases' },
						{ id: 'ct-subsidie', label: 'Subsidies', route: 'Cases' },
					],
				}],
			})
			const group = manifest.menu.find((m) => m.id === 'CasesGroup')
			expect(group.children.map((c) => c.id)).toEqual(['AllCases', 'ct-bezwaar', 'ct-subsidie'])
		})

		it('patches an existing child in place without touching siblings', () => {
			const b = menuBase()
			b.menu[0].children.push({ id: 'ct-x', label: 'Old', route: 'Cases' })
			const { manifest } = mergeManifestDelta(b, {
				menu: [{ id: 'CasesGroup', children: [{ id: 'ct-x', label: 'New' }] }],
			})
			const group = manifest.menu.find((m) => m.id === 'CasesGroup')
			expect(group.children.find((c) => c.id === 'ct-x').label).toBe('New')
			expect(group.children.find((c) => c.id === 'AllCases').label).toBe('All cases')
		})

		it('removes a single child via $op:"remove" leaving the rest', () => {
			const b = menuBase()
			b.menu[0].children.push({ id: 'ct-gone', label: 'Gone', route: 'Cases' })
			const { manifest } = mergeManifestDelta(b, {
				menu: [{ id: 'CasesGroup', children: [{ id: 'ct-gone', $op: 'remove' }] }],
			})
			const group = manifest.menu.find((m) => m.id === 'CasesGroup')
			expect(group.children.map((c) => c.id)).toEqual(['AllCases'])
		})
	})
})
