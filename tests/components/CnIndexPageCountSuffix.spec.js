/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The count line can say what the selected quick filter or lens does: a lens
 * that sorts the unassigned items by waiting time reads
 * "12 of 40 · longest waiting first". The text comes from the tab's own
 * `countSuffix`, else from `countSuffixByFilter` by tab id, then by label.
 *
 * @spec openspec/changes/index-count-suffix-per-filter/specs/index-page/spec.md#requirement-the-count-line-can-say-what-the-selected-quick-filter-does
 */
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const { headerDescription, quickFilterCountSuffix } = CnIndexPage.computed

const TABS = [
	{ label: 'All' },
	{ id: 'unassigned', label: 'Unassigned', filter: { assignee: { isnull: true } } },
	{ label: 'Mine', filter: { assignee: 'me' }, countSuffix: 'assigned to you' },
	{ label: 'Overdue', filter: { overdue: true } },
]

function ctx(over = {}) {
	const c = {
		tabStripEntries: TABS,
		quickFilterMultiple: false,
		selectedQuickFilterIndices: [],
		activeQuickFilterIndex: 0,
		countSuffixByFilter: { unassigned: 'longest waiting first', Overdue: 'oldest deadline first', Unassigned: 'not this one' },
		cnTranslate: (s) => `T(${s})`,
		headerDescriptionBase: '12 of 40',
		currentViewMode: 'table',
		mapListEnabled: false,
		...over,
	}
	c.quickFilterCountSuffix = quickFilterCountSuffix.call(c)
	return c
}

describe('CnIndexPage count text per quick filter', () => {
	it('adds the text of the selected lens by id, translated, after a middle dot', () => {
		expect(headerDescription.call(ctx({ activeQuickFilterIndex: 1 }))).toBe('12 of 40 · T(longest waiting first)')
	})

	it('reads a tab by label when it has no id, and a tab\'s own countSuffix first', () => {
		expect(headerDescription.call(ctx({ activeQuickFilterIndex: 3 }))).toBe('12 of 40 · T(oldest deadline first)')
		expect(headerDescription.call(ctx({ activeQuickFilterIndex: 2, countSuffixByFilter: { Mine: 'other' } }))).toBe('12 of 40 · T(assigned to you)')
	})

	it('keeps the line as it is for a tab without text, or without the option', () => {
		expect(headerDescription.call(ctx({ activeQuickFilterIndex: 0 }))).toBe('12 of 40')
		expect(headerDescription.call(ctx({ activeQuickFilterIndex: 1, countSuffixByFilter: null }))).toBe('12 of 40')
		expect(headerDescription.call(ctx({ activeQuickFilterIndex: null }))).toBe('12 of 40')
	})

	it('adds nothing to an empty count line', () => {
		expect(headerDescription.call(ctx({ activeQuickFilterIndex: 1, headerDescriptionBase: '' }))).toBe('')
	})

	it('joins the texts of several selected tabs', () => {
		const c = ctx({ quickFilterMultiple: true, selectedQuickFilterIndices: [1, 3] })
		expect(headerDescription.call(c)).toBe('12 of 40 · T(longest waiting first) · T(oldest deadline first)')
	})
})
