/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A named-source page (the tasks list, DqTaken) opens with its
 * `defaultFilters` too: "Deadline: 1 tot en met 31 oktober" is the month's
 * due range, written as tokens. An address that names a filter, or a saved
 * view, wins over the defaults.
 *
 * @spec openspec/changes/named-source-default-filters/specs/index-page/spec.md#requirement-a-named-source-page-can-open-with-removable-default-filters
 */
var mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}`, generateOcsUrl: (url) => url }))

const { flushPromises, mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const SIDEBAR = { fields: { dueAt: { title: 'Due between', facetable: true, inputControl: 'date-range' } } }
const DEFAULTS = { dueAt: { from: '@monthStart', to: '@monthEnd' } }

/**
 * @param {object} query The starting `$route.query`.
 * @param {object} [extra] More props.
 * @return {object} The wrapper.
 */
function mountPage(query, extra = {}) {
	const $route = { query, params: {}, path: '/tasks' }
	const $router = { replace: jest.fn(() => Promise.resolve()), push: jest.fn() }
	return mount(CnIndexPage, {
		propsData: {
			title: 'Tasks',
			entitySource: 'endpoint',
			sourceConfig: { url: '/apps/x/api/tasks' },
			sidebar: SIDEBAR,
			defaultFilters: DEFAULTS,
			columns: [{ key: 'title', label: 'Title' }],
			...extra,
		},
		global: { mocks: { $route, $router } },
		mocks: { $route, $router },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
	})
}

/**
 * This month's first and last day, as the tokens resolve them.
 *
 * @return {{from: string, to: string}} The range.
 */
function thisMonth() {
	const now = new Date()
	const pad = (n) => String(n).padStart(2, '0')
	const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
	return {
		from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
		to: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(last)}`,
	}
}

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { results: [] } })
})

describe('default filters on a named source', () => {
	it('opens on the month\'s due range, tokens resolved', async () => {
		const wrapper = mountPage({})
		await flushPromises()
		expect(wrapper.vm.namedActiveFilters).toEqual({ dueAt: thisMonth() })
	})

	it('lets the address win', async () => {
		const wrapper = mountPage({ dueAt: '2026-01-01..2026-01-31' })
		await flushPromises()
		expect(wrapper.vm.namedActiveFilters).toEqual({ dueAt: { from: '2026-01-01', to: '2026-01-31' } })
	})

	it('applies none when the address names a saved view', async () => {
		const wrapper = mountPage({ savedView: 'mine' })
		await flushPromises()
		expect(wrapper.vm.namedActiveFilters).toEqual({})
	})

	it('goes with Clear all', async () => {
		const wrapper = mountPage({})
		await flushPromises()
		wrapper.vm.onClearFilters()
		expect(wrapper.vm.namedActiveFilters).toEqual({})
	})
})
