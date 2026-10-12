/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-dashboard-phone: under the board look a dashboard grid reflows to one
 * column below 640px; without the board look its columns stay fixed as before.
 *
 * @spec openspec/changes/screens-dashboard-phone/specs/dashboard-phone/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const stubs = {
	CnDashboardGrid: { name: 'CnDashboardGrid', template: '<div class="grid-stub" />', props: ['layout', 'editable', 'columns', 'columnOpts', 'cellHeight', 'margin', 'float'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

/**
 * @param {object} global extra global mount options
 * @return {object} wrapper
 */
function mountPage(global = {}) {
	return mount(CnDashboardPage, {
		propsData: { widgets: [{ id: 'w', type: 'text', content: { text: 'x' } }], layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }] },
		stubs,
		global,
	})
}

describe('CnDashboardPage grid columns on a phone', () => {
	it('under the board look the grid reflows to one column below 640px', () => {
		const wrapper = mountPage({ provide: { cnLook: 'board' } })
		const opts = wrapper.findComponent({ name: 'CnDashboardGrid' }).props('columnOpts')
		expect(opts).toEqual({ columnMax: 12, breakpoints: [{ w: 640, c: 1 }], layout: 'list', breakpointForWindow: true })
	})

	it('without the board look the grid has no responsive columns', () => {
		const wrapper = mountPage()
		expect(wrapper.findComponent({ name: 'CnDashboardGrid' }).props('columnOpts')).toBeNull()
	})
})
