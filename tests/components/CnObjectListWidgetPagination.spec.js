/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectListWidget's pagination.
 *
 * The design constraint these encode is that the pager must never lie. Paging
 * client-side over an already-`_limit`-ed window would have been much simpler
 * — and would have shown "1–5 of 137" while only the first 25 rows were ever
 * reachable, silently dropping the other 112. So the pager is server-side
 * (`_page`), and it is SUPPRESSED on a cell too short to show a whole page,
 * because `visibleRows` clips the page there and a pager over clipped rows
 * would be claiming a range it is not showing.
 */

import { shallowMount, flushPromises } from '@vue/test-utils'

// `mock`-prefixed so jest's hoisted factory may close over it.
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const rowsPage = (n, offset = 0) => Array.from({ length: n }, (_, i) => ({ id: String(offset + i), title: 'r' + (offset + i) }))

function mountWidget(content = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 's', limit: 5, ...content } },
		stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true },
		mocks: { t: (_a, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

describe('CnObjectListWidget — pagination', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGet.mockResolvedValue({ data: { results: rowsPage(5), total: 137 } })
	})

	it('asks the server for one page, not for a capped window', async () => {
		mountWidget()
		await flushPromises()
		expect(mockGet).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ params: expect.objectContaining({ _limit: 5, _page: 1 }) }),
		)
	})

	it('derives the page count from the SERVER total, not from the rows it fetched', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(w.vm.rows).toHaveLength(5)
		expect(w.vm.total).toBe(137)
		expect(w.vm.totalPages).toBe(28)
	})

	it('refetches the next page from the server rather than slicing what it has', async () => {
		const w = mountWidget()
		await flushPromises()
		mockGet.mockResolvedValue({ data: { results: rowsPage(5, 5), total: 137 } })

		w.vm.onPageChange(2)
		await flushPromises()

		expect(mockGet).toHaveBeenLastCalledWith(
			expect.any(String),
			expect.objectContaining({ params: expect.objectContaining({ _page: 2 }) }),
		)
		expect(w.vm.rows[0].id).toBe('5')
	})

	it('clamps a page request to the real range', async () => {
		const w = mountWidget()
		await flushPromises()
		w.vm.onPageChange(9999)
		await flushPromises()
		expect(w.vm.page).toBe(28)
		w.vm.onPageChange(-3)
		await flushPromises()
		expect(w.vm.page).toBe(1)
	})

	it('renders the pager when there is more than one page', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(w.vm.showPager).toBe(true)
		expect(w.find('.cn-object-list-widget__pager').exists()).toBe(true)
	})

	it('does not render a pager for a single page', async () => {
		mockGet.mockResolvedValue({ data: { results: rowsPage(3), total: 3 } })
		const w = mountWidget()
		await flushPromises()
		expect(w.vm.showPager).toBe(false)
	})

	// The honesty guard. A cell that fits 2 of the page's 5 rows must not also
	// show a control that says it is showing "1–5 of 137".
	it('suppresses the pager on a cell too short to show a whole page', async () => {
		const w = mountWidget()
		await flushPromises()
		w.vm.fitRows = 2
		await w.vm.$nextTick()
		expect(w.vm.visibleRows).toHaveLength(2)
		expect(w.vm.showPager).toBe(false)
		// The fit-to-cell "+N more" line is what remains in that case.
		expect(w.vm.hiddenCount).toBe(135)
	})

	it('resets to page 1 when the query changes', async () => {
		const w = mountWidget()
		await flushPromises()
		w.vm.onPageChange(4)
		await flushPromises()
		expect(w.vm.page).toBe(4)

		await w.setProps({ content: { register: 'r', schema: 's', limit: 5, filter: { status: 'open' } } })
		await flushPromises()
		// Page 4 of the OLD result set means nothing against the new one, and an
		// out-of-range `_page` answers with an empty list — which would read as
		// "no matches" rather than "wrong page".
		expect(w.vm.page).toBe(1)
	})
})
