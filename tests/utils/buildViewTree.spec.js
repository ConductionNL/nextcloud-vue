/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The order two hundred saved views go on screen in.
 *
 * Each case below is a way the tree can be wrong and still render a perfectly
 * ordinary-looking dropdown: a view silently missing, a view rendered twice, a
 * dropdown that hangs on data written before the save-time rules existed, or
 * an order that changes between two openings so nobody can build a habit.
 */

const {
	VIEW_GROUPS,
	buildViewTree,
	labelsInUse,
	labelsOf,
} = require('../../src/utils/buildViewTree.js')

/** Shorthand for a view. */
const v = (slug, extra = {}) => ({ slug, name: slug, ...extra })

describe('the tree order', () => {
	it('puts seeded views first, then the own views of the reader, each alphabetically', () => {
		const rows = buildViewTree({
			views: [
				v('zebra'),
				v('alpha'),
				v('shipped-b', { seeded: true }),
				v('shipped-a', { seeded: true }),
			],
		})

		expect(rows.map((row) => row.view.slug)).toEqual([
			'shipped-a',
			'shipped-b',
			'alpha',
			'zebra',
		])
		expect(rows[0].group).toBe(VIEW_GROUPS.SEEDED)
		expect(rows[2].group).toBe(VIEW_GROUPS.OWN)
	})

	it('nests a child under its parent and gives it a depth', () => {
		const rows = buildViewTree({
			views: [v('parent'), v('child', { parent: 'parent' }), v('grandchild', { parent: 'child' })],
		})

		expect(rows.map((row) => [row.view.slug, row.depth])).toEqual([
			['parent', 0],
			['child', 1],
			['grandchild', 2],
		])
	})

	it('flattens past maxDepth rather than indenting off the screen', () => {
		const rows = buildViewTree({
			views: [v('a'), v('b', { parent: 'a' }), v('c', { parent: 'b' }), v('d', { parent: 'c' })],
			maxDepth: 2,
		})

		expect(rows.map((row) => row.depth)).toEqual([0, 1, 2, 2])
		// Still four rows: flattening is about indentation, never about
		// dropping a view somebody saved.
		expect(rows).toHaveLength(4)
	})
})

describe('a view whose parent is not in the list', () => {
	it('comes back at the root, flagged', () => {
		// The parent is shared with a group this reader is not in. Dropping
		// the child would take a person's own view off their own screen
		// because of somebody else's permissions.
		const rows = buildViewTree({ views: [v('kind', { parent: 'onzichtbaar' })] })

		expect(rows).toHaveLength(1)
		expect(rows[0].depth).toBe(0)
		expect(rows[0].orphaned).toBe(true)
	})

	it('does not flag a child whose parent is right there', () => {
		// The control for the flag: one that was always true would print
		// "parts you cannot see" against every child in the tree.
		const rows = buildViewTree({ views: [v('ouder'), v('kind', { parent: 'ouder' })] })

		expect(rows.every((row) => row.orphaned === false)).toBe(true)
	})
})

describe('a cycle written before the save-time refusal existed', () => {
	it('emits every view once and does not hang', () => {
		const rows = buildViewTree({
			views: [v('a', { parent: 'b' }), v('b', { parent: 'a' })],
		})

		expect(rows.map((row) => row.view.slug).sort()).toEqual(['a', 'b'])
	})
})

describe('the label filter', () => {
	it('narrows to the views carrying the label', () => {
		const rows = buildViewTree({
			views: [
				v('bezwaar-1', { labels: ['bezwaar'] }),
				v('bezwaar-2', { label: 'bezwaar' }),
				v('iets-anders', { labels: ['wob'] }),
				v('geen-label'),
			],
			labelFilter: 'bezwaar',
		})

		expect(rows.map((row) => row.view.slug)).toEqual(['bezwaar-1', 'bezwaar-2'])
	})

	it('keeps an unlabelled view reachable when no filter is active', () => {
		// The half that keeps the filter optional rather than a labelling
		// regime nobody agreed to.
		const rows = buildViewTree({ views: [v('geen-label')] })

		expect(rows).toHaveLength(1)
	})

	it('brings a child back to the root when the filter hid its parent', () => {
		// The parent is not in the visible set any more, so nesting the child
		// under it would lose it. It is still the reader's view.
		const rows = buildViewTree({
			views: [v('ouder'), v('kind', { parent: 'ouder', labels: ['bezwaar'] })],
			labelFilter: 'bezwaar',
		})

		expect(rows.map((row) => row.view.slug)).toEqual(['kind'])
		expect(rows[0].depth).toBe(0)
		expect(rows[0].orphaned).toBe(true)
	})
})

describe('labelsOf and labelsInUse', () => {
	it('reads both shapes, because the manifest and the store differ', () => {
		expect(labelsOf({ labels: ['a', 'b'] })).toEqual(['a', 'b'])
		expect(labelsOf({ label: 'c' })).toEqual(['c'])
		expect(labelsOf({ labels: ['a'], label: 'b' })).toEqual(['a', 'b'])
		expect(labelsOf({})).toEqual([])
	})

	it('drops blanks, so a stray space is not a label', () => {
		expect(labelsOf({ labels: ['  ', 'real', ''] })).toEqual(['real'])
	})

	it('offers the labels already in use, sorted and without duplicates', () => {
		// A label set that grows one typo at a time stops being a filter, so
		// what exists is offered before somebody types something new.
		expect(labelsInUse([v('a', { labels: ['wob', 'bezwaar'] }), v('b', { label: 'bezwaar' })])).toEqual(['bezwaar', 'wob'])
	})
})
