/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Dashboard content widgets render FLUSH by DEFAULT — no CnWidgetWrapper content
 * padding — so tables / KPIs / charts meet the card edges instead of sitting in
 * a padded box. A placement opts back into padding with `flush: false`.
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'

const renderer = { template: '<div class="rend" />' }
registerDashboardWidget('test-plain', { renderer, form: {}, defaultContent: {}, displayName: 'P', icon: 'X' })
registerDashboardWidget('test-card', { renderer, form: {}, defaultContent: {}, displayName: 'C', icon: 'X', card: true })

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { props: ['flush', 'showTitle', 'showActions', 'title'], template: '<div class="ww" :data-flush="String(flush)"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' }, NcLoadingIcon: { template: '<div />' },
}

const mountItem = (type, extra = {}) => mount(CnDashboardPage, {
	propsData: {
		widgets: [{ id: 'w', type }],
		layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, ...extra }],
	},
	stubs,
})

describe('CnDashboardPage — flush by default', () => {
	it('a registry widget renders flush by default (no content padding)', () => {
		expect(mountItem('test-plain').find('.ww').attributes('data-flush')).toBe('true')
	})

	it('a card widget is flush too', () => {
		expect(mountItem('test-card').find('.ww').attributes('data-flush')).toBe('true')
	})

	it('a placement opts back into padding with flush: false', () => {
		expect(mountItem('test-plain', { flush: false }).find('.ww').attributes('data-flush')).toBe('false')
	})
})
