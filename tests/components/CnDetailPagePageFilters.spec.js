/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page can draw page filters that its widgets read
 * (detail-page-filters): the filters seed the page's workspace context, a
 * choice writes it, a descendant reads it through the provided
 * `cnWorkspaceContext`, and the filters draw in the band even without band
 * widgets.
 *
 * @spec openspec/changes/detail-page-filters/specs/detail-page/spec.md#requirement-a-detail-page-can-draw-page-filters-that-its-widgets-read
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const PERIOD = {
	key: 'period',
	label: 'Period',
	control: 'segmented',
	options: [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '365', label: '12 months' }],
	default: '30',
}

function makeStore(object) {
	return {
		objects: { 'portaliq-portal': { 'p-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

function mountPage(extra = {}) {
	return shallowMount(CnDetailPage, {
		props: {
			title: 'Portal',
			register: 'portaliq',
			schema: 'portal',
			objectId: 'p-1',
			objectStore: makeStore({ id: 'p-1', slug: 'zuiddrecht' }),
			pageFilters: [PERIOD],
			...extra,
		},
		global: {
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'portal' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

describe('CnDetailPage: page filters', () => {
	it('seeds the workspace context from the default and writes a choice', async () => {
		const wrapper = mountPage()
		await flushPromises()
		expect(wrapper.vm.workspaceContext.period).toBe('30')
		wrapper.vm.onPageFilterChange(PERIOD, { value: '7', label: '7 days' })
		expect(wrapper.vm.workspaceContext.period).toBe('7')
		expect(wrapper.emitted('page-filter-change')[0][0]).toEqual({ key: 'period', value: '7' })
	})

	it('seeds the first option when no default is given', async () => {
		const { default: _default, ...noDefault } = PERIOD
		const wrapper = mountPage({ pageFilters: [noDefault] })
		await flushPromises()
		expect(wrapper.vm.workspaceContext.period).toBe('7')
	})

	it('provides the context a widget on the page reads, and draws the filters in the band', async () => {
		const wrapper = mountPage()
		await flushPromises()
		const provided = wrapper.vm.$.provides.cnWorkspaceContext
		expect(provided.value.period).toBe('30')
		wrapper.vm.onPageFilterChange(PERIOD, '365')
		expect(provided.value.period).toBe('365')
		expect(wrapper.vm.showsBand).toBe(true)
		expect(wrapper.find('[data-testid="cn-detail-page-page-filters"]').exists()).toBe(true)
	})

	it('draws no filter row without page filters', async () => {
		const wrapper = mountPage({ pageFilters: [] })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-detail-page-page-filters"]').exists()).toBe(false)
	})
})
