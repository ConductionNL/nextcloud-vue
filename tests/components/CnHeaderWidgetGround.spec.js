/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.ground: true` draws the greeting on the page ground, as the
 * board's kicker and h1 on the background: the plain look with no card
 * padding, a 6px gap and the 32px heading, and the dashboard drops the
 * widget's card for it. Without the key the greeting renders as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-a-greeting-can-sit-on-the-page-ground
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnHeaderWidget from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'

function mountHeader(content) {
	return mount(CnHeaderWidget, {
		propsData: { content, now: new Date('2026-10-05T14:00:00') },
		global: { mocks: { $route: { name: 'Dashboard' } } },
	})
}
const contentStyle = (w) => w.find('.cn-header-widget__content').attributes('style')

describe('CnHeaderWidget: ground', () => {
	it('keeps the plain card padding and gap without the key', () => {
		const w = mountHeader({ greeting: true, showDate: true, plain: true })
		expect(w.classes()).not.toContain('cn-header-widget--ground')
		expect(contentStyle(w)).toContain('padding: 16px;')
		expect(contentStyle(w)).toContain('gap: 8px;')
	})

	it('drops the padding, takes a 6px gap and the plain look with ground: true', () => {
		const w = mountHeader({ greeting: true, showDate: true, ground: true })
		expect(w.classes()).toContain('cn-header-widget--ground')
		expect(w.classes()).toContain('cn-header-widget--plain')
		expect(contentStyle(w)).toContain('padding: 0px;')
		expect(contentStyle(w)).toContain('gap: 6px;')
		expect(w.attributes('style')).toContain('background-color: transparent')
	})
})

describe('CnDashboardPage: a ground greeting has no card', () => {
	const stubs = {
		CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
		CnWidgetWrapper: { props: ['borderless'], template: '<div class="ww" :data-borderless="String(borderless)"><slot /></div>' },
		CnHeaderWidget: { template: '<div class="greeting" />' },
		NcButton: { template: '<button><slot /></button>' },
		NcEmptyContent: { template: '<div />' },
		NcLoadingIcon: { template: '<div />' },
	}
	const mountPage = (content) => mount(CnDashboardPage, {
		propsData: {
			widgets: [{ id: 'hello', type: 'header', title: 'Greeting', content }],
			layout: [{ id: '1', widgetId: 'hello', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
		},
		global: { stubs },
	})

	it('keeps the card for a greeting without ground', () => {
		expect(mountPage({ greeting: true, plain: true }).find('.ww').attributes('data-borderless')).toBe('false')
	})

	it('drops the card for a greeting with ground: true', () => {
		expect(mountPage({ greeting: true, ground: true }).find('.ww').attributes('data-borderless')).toBe('true')
	})
})
