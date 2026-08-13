/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A placement's `borderless` flag decouples "no header" from "no card".
 *
 * They used to be the same decision: a widget with `showTitle: false` was drawn
 * borderless, so a headerless TILE (a KPI whose label IS its content) lost its
 * card entirely. Authors then drew their own bordered box inside the grid cell
 * to get it back — a card inside a card, which is the visual defect this flag
 * exists to remove. `borderless: false` keeps the chrome and lets the widget
 * stay flat.
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { props: ['flush', 'showTitle', 'showActions', 'title', 'borderless'], template: '<div class="ww" :data-borderless="String(borderless)" :data-show-title="String(showTitle)"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

// A custom-slot widget: the family that lost its card when its header was off.
const mountWith = (placement = {}) => mount(CnDashboardPage, {
	propsData: {
		widgets: [{ id: 'w', type: 'custom', title: 'Quota' }],
		layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2, ...placement }],
	},
	slots: { 'widget-w': '<div class="mine" />' },
	stubs,
})

describe('CnDashboardPage — borderless', () => {
	it('keeps the card when the header is shown', () => {
		expect(mountWith().find('.ww').attributes('data-borderless')).toBe('false')
	})

	it('drops the card with the header, as before, when nothing is declared', () => {
		expect(mountWith({ showTitle: false }).find('.ww').attributes('data-borderless')).toBe('true')
	})

	it('keeps the card on a headerless tile when the placement says so', () => {
		const ww = mountWith({ showTitle: false, borderless: false }).find('.ww')
		expect(ww.attributes('data-borderless')).toBe('false')
		expect(ww.attributes('data-show-title')).toBe('false')
	})

	it('drops the card on a titled widget when the placement says so', () => {
		expect(mountWith({ borderless: true }).find('.ww').attributes('data-borderless')).toBe('true')
	})
})
