/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 *
 * CnIndexPage applies a header filter through the same state the facet
 * sidebar writes: one fetch and one route update per apply, every key the
 * column owns at once.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: () => Promise.resolve({ data: { results: [], total: 0 } }) },
}))

describe('CnIndexPage header filters', () => {
	it('defaults headerFilters to on', () => {
		expect(CnIndexPage.props.headerFilters.default).toBe(true)
	})

	it('self-fetch: merges a range into the active filters, fetches once and persists once', () => {
		const ctx = {
			isSelfFetchMode: true,
			isNamedSource: false,
			list: { activeFilters: { value: { status: ['open'], 'value[lte]': ['9'] } }, refresh: jest.fn() },
			persistViewStateToRoute: jest.fn(),
			currentViewState: () => ({}),
			setNamedFilter: jest.fn(),
			$emit: jest.fn(),
		}
		CnIndexPage.methods.onColumnFilterEvent.call(ctx, { key: 'value', params: { 'value[gte]': ['5'], 'value[lte]': [] } })
		expect(ctx.list.activeFilters.value).toEqual({ status: ['open'], 'value[gte]': ['5'] })
		expect(ctx.list.refresh).toHaveBeenCalledTimes(1)
		expect(ctx.persistViewStateToRoute).toHaveBeenCalledTimes(1)
		expect(ctx.$emit).toHaveBeenCalledWith('filter-change', { key: 'value[gte]', values: ['5'] })
		expect(ctx.$emit).toHaveBeenCalledWith('filter-change', { key: 'value[lte]', values: [] })
	})

	it('named source: records the header filter in the page\'s own state', () => {
		const replace = jest.fn(() => Promise.resolve())
		const route = { query: {}, params: {}, path: '/tasks' }
		const wrapper = mount(CnIndexPage, {
			props: {
				title: 'Tasks',
				entitySource: 'tasks',
				sidebar: { enabled: true, fields: { state: { type: 'string', enum: ['active', 'done'], facetable: true } } },
			},
			global: {
				mocks: { $route: route, $router: { replace } },
				stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnIndexSidebar: true },
			},
		})
		wrapper.vm.onColumnFilterEvent({ key: 'state', params: { state: ['done'] } })
		expect(wrapper.vm.effectiveActiveFilters).toEqual({ state: ['done'] })
		expect(wrapper.emitted('filter-change')[0][0]).toEqual({ key: 'state', values: ['done'] })
	})

	// Audit G2: the table only got header filters when a schema object had
	// resolved, so manifest pages without one had sort but no filters.
	describe('when the table shows header filters', () => {
		const show = (ctx) => CnIndexPage.computed.tableHeaderFilters.call({ headerFilters: true, effectiveSchema: null, isSelfFetchMode: false, $: { vnode: { props: {} } }, ...ctx })

		it('a self-fetching page shows them without a resolved schema', () => {
			expect(show({ isSelfFetchMode: true })).toBe(true)
		})

		it('a page with a schema shows them, as before', () => {
			expect(show({ effectiveSchema: { properties: {} } })).toBe(true)
		})

		it('a host-fed table without a schema shows them when the host listens for filter-change', () => {
			expect(show({ $: { vnode: { props: { onFilterChange: () => {} } } } })).toBe(true)
			expect(show({})).toBe(false)
		})

		it('headerFilters: false still turns them off', () => {
			expect(show({ headerFilters: false, isSelfFetchMode: true })).toBe(false)
		})

		it('renders the filter on a manifest column when no schema resolved', async () => {
			const wrapper = mount(CnIndexPage, {
				props: { title: 'Products', objects: [{ id: '1', name: 'Widget' }], columns: [{ key: 'name', label: 'Name' }], viewMode: 'table', onFilterChange: () => {} },
				global: { mocks: { $route: { query: {}, params: {}, path: '/products' }, $router: { replace: jest.fn() } } },
			})
			await wrapper.vm.$nextTick()
			expect(wrapper.find('[data-testid="cn-table-header-filter"]').exists()).toBe(true)
		})
	})
})
