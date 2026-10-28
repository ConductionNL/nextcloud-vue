/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget can be drawn on a phone only (`viewport: "narrow"`) or on a wider
 * window only (`viewport: "wide"`): PqMobiel draws My work as one list grouped
 * by when it is due, where PqMijnWerk draws three lists and a side column.
 * The breakpoint is the one where the board grid stacks, 640px.
 *
 * @spec openspec/changes/dashboard-widget-viewport/specs/dashboard-widget-viewport/spec.md#requirement-a-widget-can-be-drawn-on-a-phone-only-or-a-wide-screen-only
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

registerDashboardWidget('test-viewport-widget', { renderer: { template: '<div />' }, form: {}, defaultContent: {}, displayName: 'V', icon: 'X' })

const stubs = {
	CnDashboardGrid: {
		template: '<div><div v-for="it in layout" :key="it.id" class="cell" :data-wid="it.widgetId"><slot name="widget" :item="it" /></div></div>',
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
	},
	CnWidgetWrapper: { template: '<div class="ww"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

/**
 * Mount a page with a phone-only, a wide-only and a plain widget.
 *
 * @param {boolean} narrow Whether the window is phone-wide.
 * @return {Promise<object>} The wrapper.
 */
async function mountAt(narrow) {
	window.matchMedia = jest.fn(() => ({ matches: narrow, addEventListener: jest.fn(), removeEventListener: jest.fn() }))
	const wrapper = mount(CnDashboardPage, {
		propsData: {
			widgets: [
				{ id: 'phone', type: 'test-viewport-widget', viewport: 'narrow' },
				{ id: 'desk', type: 'test-viewport-widget', viewport: 'wide' },
				{ id: 'both', type: 'test-viewport-widget' },
			],
			layout: [
				{ id: '1', widgetId: 'phone', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
				{ id: '2', widgetId: 'desk', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2 },
				{ id: '3', widgetId: 'both', gridX: 0, gridY: 4, gridWidth: 12, gridHeight: 2 },
			],
		},
		stubs,
	})
	await flushPromises()
	return wrapper
}

const shown = (wrapper) => wrapper.findAll('.cell').map((c) => c.attributes('data-wid'))

describe('CnDashboardPage: a widget per viewport', () => {
	it('draws the phone-only widget on a phone, not the wide one', async () => {
		expect(shown(await mountAt(true))).toEqual(['phone', 'both'])
	})

	it('draws the wide-only widget on a wider window, not the phone one', async () => {
		expect(shown(await mountAt(false))).toEqual(['desk', 'both'])
	})
})
