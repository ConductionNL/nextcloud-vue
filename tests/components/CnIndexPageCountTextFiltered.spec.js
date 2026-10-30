/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The count line while a filter narrows the list (`countTextFiltered`): the
 * messages of one sending, opened from a link with `?sendingRef=…`, read
 * "18 of 24 read", a count value over the same filters.
 *
 * @spec openspec/changes/index-count-text-filtered/specs/index-page/spec.md#requirement-the-count-line-can-differ-while-a-filter-narrows-the-list
 */
jest.mock('../../src/utils/fetchAggregate.js', () => ({
	...jest.requireActual('../../src/utils/fetchAggregate.js'),
	fetchAggregateValue: jest.fn(async () => 18),
}))

const { fetchAggregateValue } = require('../../src/utils/fetchAggregate.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const { headerDescriptionBase, listIsNarrowed, quickFilterNarrows, countValuesKey } = CnIndexPage.computed
const { countValueToken, loadCountValues } = CnIndexPage.methods

const READ = { read: { metric: 'count', filter: { read: true } } }

function ctx(over = {}) {
	const c = {
		presentation: {},
		presented(key) { return this.presentation[key] },
		cnTranslate: (s) => s,
		effectivePagination: { total: 24 },
		effectiveObjects: new Array(20).fill({}),
		isBoardLook: false,
		countSubtitle: '',
		description: 'Messages in the portal inboxes',
		activeScopePresentation: {},
		countTextByView: null,
		sourceTerm: '',
		appliedViewConditionsText: '',
		register: 'portal',
		exportSchemaSlug: 'message',
		filter: null,
		effectiveActiveFilters: { sendingRef: 'letter-5b' },
		tabStripEntries: [],
		quickFilterMultiple: false,
		selectedQuickFilterIndices: [],
		activeQuickFilterIndex: 0,
		countTextFiltered: '{read} of {total} read',
		countValues: READ,
		countValueResults: { read: 18 },
		$route: { params: {}, query: { sendingRef: 'letter-5b' } },
		countValueToken,
		...over,
	}
	c.quickFilterNarrows = quickFilterNarrows.call(c)
	c.listIsNarrowed = listIsNarrowed.call(c)
	c.countValuesKey = countValuesKey.call(c)
	c.presentedCountText = CnIndexPage.computed.presentedCountText.call(c)
	return c
}

describe('CnIndexPage countTextFiltered', () => {
	it('reads the filtered line while a filter narrows the list, also outside the board look', () => {
		expect(headerDescriptionBase.call(ctx())).toBe('18 of 24 read')
	})

	it('wins over the board count line while filtered', () => {
		const c = ctx({ isBoardLook: true, presentation: { countText: '{shown} of {total} messages' } })
		expect(headerDescriptionBase.call(c)).toBe('18 of 24 read')
	})

	it('keeps the page line without a filter', () => {
		expect(headerDescriptionBase.call(ctx({ effectiveActiveFilters: {} }))).toBe('Messages in the portal inboxes')
		expect(headerDescriptionBase.call(ctx({ effectiveActiveFilters: { sendingRef: '', status: [] } }))).toBe('Messages in the portal inboxes')
		const board = ctx({ effectiveActiveFilters: {}, isBoardLook: true, presentation: { countText: '{shown} of {total} messages' } })
		expect(headerDescriptionBase.call(board)).toBe('20 of 24 messages')
	})

	it('changes nothing without countTextFiltered', () => {
		expect(headerDescriptionBase.call(ctx({ countTextFiltered: '' }))).toBe('Messages in the portal inboxes')
	})

	it('counts a selected quick filter tab with a filter as narrowing, an All tab not', () => {
		const tabs = [{ label: 'All' }, { label: 'Unread', filter: { read: false } }]
		expect(listIsNarrowed.call(ctx({ effectiveActiveFilters: {}, tabStripEntries: tabs, activeQuickFilterIndex: 0, quickFilterNarrows: false }))).toBe(false)
		const onUnread = ctx({ effectiveActiveFilters: {}, tabStripEntries: tabs, activeQuickFilterIndex: 1 })
		expect(onUnread.listIsNarrowed).toBe(true)
		expect(headerDescriptionBase.call(onUnread)).toBe('18 of 24 read')
		const multi = ctx({ effectiveActiveFilters: {}, tabStripEntries: tabs, quickFilterMultiple: true, selectedQuickFilterIndices: [1] })
		expect(multi.listIsNarrowed).toBe(true)
	})

	it('waits for the total, and leaves a count value not read yet empty', () => {
		expect(headerDescriptionBase.call(ctx({ effectivePagination: {} }))).toBe('Messages in the portal inboxes')
		expect(headerDescriptionBase.call(ctx({ countValueResults: {} }))).toBe(' of 24 read')
	})

	it('reads the count value under the filter the address set', async () => {
		fetchAggregateValue.mockClear()
		const c = ctx({ countValueResults: {} })
		await loadCountValues.call(c)
		expect(fetchAggregateValue).toHaveBeenCalledWith(
			expect.objectContaining({ register: 'portal', schema: 'message', metric: 'count', filter: { sendingRef: 'letter-5b', read: true } }),
			expect.anything(),
		)
		expect(c.countValueResults).toEqual({ read: 18 })
	})
})
