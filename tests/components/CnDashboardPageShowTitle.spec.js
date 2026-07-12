/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget's `showTitle` / `showActions` chrome flags resolve from the layout
 * placement FIRST, then fall back to the widget definition. The def fallback
 * matters because the in-place style editor persists `showTitle` onto the
 * widget def (onWidgetConfigSave), and hand-written manifests may set the flag
 * on either object — the header must hide either way. Regression for the header
 * rendering even when the manifest carried `showTitle: false` on the def.
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('vue-apexcharts', () => ({ name: 'vue-apexcharts-stub' }), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'

const renderer = { template: '<div class="rend" />' }
registerDashboardWidget('test-showtitle', { renderer, form: {}, defaultContent: {}, displayName: 'S', icon: 'X' })

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { props: ['flush', 'showTitle', 'showActions', 'title'], template: '<div class="ww" :data-show-title="String(showTitle)" :data-show-actions="String(showActions)"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' }, NcLoadingIcon: { template: '<div />' },
}

const mountWith = ({ def = {}, placement = {} } = {}) => mount(CnDashboardPage, {
	propsData: {
		widgets: [{ id: 'w', type: 'test-showtitle', ...def }],
		layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, ...placement }],
	},
	stubs,
})

describe('CnDashboardPage — showTitle / showActions def fallback', () => {
	it('shows the header by default', () => {
		const ww = mountWith().find('.ww')
		expect(ww.attributes('data-show-title')).toBe('true')
		expect(ww.attributes('data-show-actions')).toBe('true')
	})

	it('hides the title when showTitle: false is on the layout placement', () => {
		expect(mountWith({ placement: { showTitle: false } }).find('.ww').attributes('data-show-title')).toBe('false')
	})

	it('hides the title when showTitle: false is on the widget definition', () => {
		expect(mountWith({ def: { showTitle: false } }).find('.ww').attributes('data-show-title')).toBe('false')
	})

	it('hides the actions menu when showActions: false is on the widget definition', () => {
		expect(mountWith({ def: { showActions: false } }).find('.ww').attributes('data-show-actions')).toBe('false')
	})

	it('lets the placement override the def (placement true wins over def false)', () => {
		expect(mountWith({ def: { showTitle: false }, placement: { showTitle: true } }).find('.ww').attributes('data-show-title')).toBe('true')
	})
})
