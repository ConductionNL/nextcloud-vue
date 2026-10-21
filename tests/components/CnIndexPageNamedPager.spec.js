/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * A named source with `pages: true` (the tasks inbox) gets a pager: the page
 * asks for one page by `limit` and `offset` and draws the footer from the
 * source's total.
 */

import { flushPromises, mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const mockGet = jest.fn(() => Promise.resolve({ data: { results: [], total: 45 } }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))

/**
 * Mount the index page over the tasks source.
 *
 * @return {object} The wrapper.
 */
function mountTasksPage() {
	const route = { query: {}, params: {}, path: '/tasks' }
	const router = { replace: jest.fn(() => Promise.resolve()) }
	return mount(CnIndexPage, {
		propsData: { title: 'Tasks', entitySource: 'tasks' },
		global: { mocks: { $route: route, $router: router } },
		mocks: { $route: route, $router: router },
		stubs: {
			CnDataTable: true,
			CnCardGrid: true,
			CnPagination: true,
			CnActionsBar: true,
			CnContextMenu: true,
			CnIndexSidebar: true,
		},
	})
}

/**
 * @return {object} The params of the last request.
 */
function lastParams() {
	return mockGet.mock.calls[mockGet.mock.calls.length - 1][1].params
}

describe('a paging named source', () => {
	beforeEach(() => mockGet.mockClear())

	it('asks for the first page and pages the total', async () => {
		const wrapper = mountTasksPage()
		await flushPromises()

		expect(lastParams()).toMatchObject({ limit: 20, offset: 0 })
		expect(wrapper.vm.effectivePagination).toEqual({ page: 1, limit: 20, total: 45, pages: 3 })
	})

	it('loads the page the pager picks', async () => {
		const wrapper = mountTasksPage()
		await flushPromises()

		wrapper.vm.onPageEvent(3)
		await flushPromises()

		expect(lastParams()).toMatchObject({ limit: 20, offset: 40 })
		expect(wrapper.vm.effectivePagination.page).toBe(3)
	})

	it('returns to page 1 on a new page size', async () => {
		const wrapper = mountTasksPage()
		await flushPromises()
		wrapper.vm.onPageEvent(2)
		await flushPromises()

		wrapper.vm.onPageSizeEvent(50)
		await flushPromises()

		expect(lastParams()).toMatchObject({ limit: 50, offset: 0 })
		expect(wrapper.vm.effectivePagination).toEqual({ page: 1, limit: 50, total: 45, pages: 1 })
	})

	it('returns to page 1 on a new tab', async () => {
		const wrapper = mountTasksPage()
		await flushPromises()
		wrapper.vm.onPageEvent(2)
		await flushPromises()

		wrapper.vm.activeQuickFilterIndex = 1
		await flushPromises()

		expect(lastParams()).toMatchObject({ scope: 'pooled', offset: 0 })
		expect(wrapper.vm.effectivePagination.page).toBe(1)
	})
})
