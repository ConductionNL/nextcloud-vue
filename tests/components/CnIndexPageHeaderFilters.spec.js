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
})
