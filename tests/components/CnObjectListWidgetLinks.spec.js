/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectListWidget's rows and "View all (N)" footer behave like links: a
 * plain click navigates in place, a ctrl/cmd/shift or middle click opens a
 * new tab.
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const rowsPage = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i), title: 'r' + i }))

/**
 * Mount the widget with a router that resolves hrefs.
 *
 * @param {object} content Extra content config.
 * @param {object} [mocks] Instance mocks, replacing the router.
 * @return {{ wrapper: object, $router: object }} The wrapper and the router mock.
 */
function mountWidget(content = {}, mocks = null) {
	const $router = {
		push: jest.fn(() => Promise.resolve()),
		resolve: jest.fn((loc) => ({ href: `/apps/x/#/${loc.name}${loc.params ? `/${loc.params.id}` : ''}` })),
	}
	const wrapper = shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 's', limit: 5, ...content } },
		stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true },
		mocks: mocks || { $router },
	})
	return { wrapper, $router }
}

describe('CnObjectListWidget — links', () => {
	let openSpy

	beforeEach(() => {
		jest.clearAllMocks()
		mockGet.mockResolvedValue({ data: { results: rowsPage(5), total: 137 } })
		openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
	})

	afterEach(() => openSpy.mockRestore())

	it('renders "View all" as a real link to the resolved route', async () => {
		const { wrapper, $router } = mountWidget({ viewAllRoute: 'leads-index', viewAllQuery: { status: 'open' } })
		await flushPromises()
		const link = wrapper.find('.cn-object-list-widget__view-all')
		expect(link.element.tagName).toBe('A')
		expect(link.attributes('href')).toBe('/apps/x/#/leads-index')
		expect($router.resolve).toHaveBeenCalledWith({ name: 'leads-index', query: { status: 'open' } })
	})

	it('routes a plain click on "View all" in place and still emits view-all', async () => {
		const { wrapper, $router } = mountWidget({ viewAllRoute: 'leads-index' })
		await flushPromises()
		await wrapper.find('a.cn-object-list-widget__view-all').trigger('click')
		expect($router.push).toHaveBeenCalledWith({ name: 'leads-index', query: {} })
		expect(wrapper.emitted('view-all')).toEqual([[{ total: 137 }]])
	})

	it('leaves a ctrl-click on "View all" to the browser', async () => {
		const { wrapper, $router } = mountWidget({ viewAllRoute: 'leads-index' })
		await flushPromises()
		await wrapper.find('a.cn-object-list-widget__view-all').trigger('click', { ctrlKey: true })
		expect($router.push).not.toHaveBeenCalled()
		expect(wrapper.emitted('view-all')).toHaveLength(1)
	})

	it('falls back to a button outside a router context', async () => {
		const { wrapper } = mountWidget({ viewAllRoute: 'leads-index' }, {})
		await flushPromises()
		const control = wrapper.find('.cn-object-list-widget__view-all')
		expect(control.element.tagName).toBe('BUTTON')
		await control.trigger('click')
		expect(wrapper.emitted('view-all')).toHaveLength(1)
	})

	it('navigates a plain row click in place and emits row-click with (row, event)', async () => {
		const { wrapper, $router } = mountWidget({ rowRoute: 'lead' })
		await flushPromises()
		const event = new MouseEvent('click')
		wrapper.vm.onRowClick({ id: '3' }, event)
		expect($router.push).toHaveBeenCalledWith({ name: 'lead', params: { id: '3' } })
		expect(openSpy).not.toHaveBeenCalled()
		expect(wrapper.emitted('row-click')[0]).toEqual([{ id: '3' }, event])
	})

	it.each([
		['ctrl-click', new MouseEvent('click', { ctrlKey: true })],
		['middle click', new MouseEvent('auxclick', { button: 1 })],
	])('opens the row in a new tab on a %s', async (_label, event) => {
		const { wrapper, $router } = mountWidget({ rowRoute: 'lead' })
		await flushPromises()
		wrapper.vm.onRowClick({ id: '3' }, event)
		expect(openSpy).toHaveBeenCalledWith('/apps/x/#/lead/3', '_blank', 'noopener,noreferrer')
		expect($router.push).not.toHaveBeenCalled()
	})
})
