/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A layout placement can title its card: board PqWerkplekKlant titles the
 * in-call cards for the call while the page's own layout keeps the widget's
 * dashboard title.
 *
 * @spec openspec/changes/dashboard-placement-title/specs/dashboard-placement-title/spec.md#requirement-a-layout-placement-can-title-its-card
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const stubs = {
	CnDashboardGrid: { template: '<div />', props: ['layout'] },
	CnWidgetWrapper: { template: '<div />' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const nl = { 'New contact moment': 'Nieuw contactmoment', 'This contact moment': 'Dit contactmoment' }
const widgets = [{ id: 'form', type: 'text', title: 'New contact moment' }]
const own = { id: 'a', widgetId: 'form', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 4 }

/**
 * Mount a dashboard with a Dutch translate.
 *
 * @return {object} The wrapper.
 */
function mountPage() {
	return mount(CnDashboardPage, {
		propsData: { title: 'Werkplek', widgets, layout: [own] },
		stubs,
		provide: { cnTranslate: (key) => nl[key] || key },
	})
}

describe('CnDashboardPage: a placement title', () => {
	it('titles the card with the placement title, translated', () => {
		const w = mountPage()
		expect(w.vm.getWidgetTitle({ ...own, title: 'This contact moment' })).toBe('Dit contactmoment')
	})

	it('keeps the widget title for a placement without one', () => {
		const w = mountPage()
		expect(w.vm.getWidgetTitle(own)).toBe('Nieuw contactmoment')
	})

	it('lets a custom title win over the placement title', () => {
		const w = mountPage()
		expect(w.vm.getWidgetTitle({ ...own, title: 'This contact moment', customTitle: 'Mijn formulier' })).toBe('Mijn formulier')
	})

	it('fills {count} in a placement title', () => {
		const w = mountPage()
		const item = { ...own, title: 'Earlier contact {count}' }
		expect(w.vm.titleHoldsCount(item)).toBe(true)
		expect(w.vm.getWidgetTitle(item)).toBe('Earlier contact')
	})
})
