/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * actionsPlacement: in the board look a dashboard can put its own actions
 * component (the `#actions` slot, an availability toggle) first in the header
 * row, before the buildiq square and the primary header actions, as PqDashboard
 * draws "Beschikbaar". The default keeps it rightmost.
 *
 * @spec openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

/**
 * Mount a board-look dashboard with an actions slot and a header action.
 *
 * @param {object} props Extra props.
 * @return {object} Wrapper.
 */
function mountPage(props = {}) {
	return mount(CnDashboardPage, {
		props: {
			title: 'My customer contact',
			pageId: 'kcc',
			widgets: [],
			layout: [],
			headerActions: [{ id: 'log', label: 'Log contact', type: 'navigate', route: 'Log', variant: 'primary' }],
			...props,
		},
		slots: { actions: '<button class="availability">Available</button>' },
		global: {
			stubs: {
				CnDashboardGrid: { template: '<div />' },
				CnWidgetWrapper: { template: '<div><slot /></div>' },
				CnBuildiqEditButton: { template: '<span class="buildiq" />' },
				CnActionButtons: { props: ['actions'], template: '<span class="header-action">{{ actions.map((a) => a.label).join() }}</span>' },
			},
			mocks: { $route: { name: 'Kcc', query: {} }, $router: { replace: jest.fn(async () => {}), push: jest.fn() } },
			provide: { cnLook: 'board' },
		},
	})
}

/**
 * The header row's elements we care about, in document order.
 *
 * @param {object} wrapper The page.
 * @return {Array<string>} Their classes.
 */
function order(wrapper) {
	return wrapper.findAll('.cn-dashboard-page__header-actions .availability, .cn-dashboard-page__header-actions .buildiq, .cn-dashboard-page__header-actions .header-action')
		.map((element) => element.classes()[0])
}

describe('CnDashboardPage actionsPlacement', () => {
	it('keeps the actions component rightmost by default', () => {
		expect(order(mountPage())).toEqual(['buildiq', 'header-action', 'availability'])
	})

	it('puts it first with actionsPlacement start, drawn once', () => {
		const w = mountPage({ actionsPlacement: 'start' })
		expect(order(w)).toEqual(['availability', 'buildiq', 'header-action'])
		expect(w.findAll('.availability')).toHaveLength(1)
	})
})
