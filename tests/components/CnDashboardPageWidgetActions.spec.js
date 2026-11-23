/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `showWidgetActions: false` drops the overflow Actions menu from every
 * widget that does not set `showActions` itself, for the board's dashboard
 * whose widget headers carry a header link and nothing else. A widget that
 * says `showActions: true` keeps it. Without the key nothing changes.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-a-dashboard-can-drop-the-widget-actions-menu
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { props: ['showActions', 'widgetId'], template: '<div class="ww" :data-id="widgetId" :data-actions="String(showActions)"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

function mountPage(props = {}) {
	return mount(CnDashboardPage, {
		propsData: {
			widgets: [
				{ id: 'deadlines', type: 'custom', title: 'Deadlines this week', headerLink: { label: 'All deadlines', href: '#all' } },
				{ id: 'tasks', type: 'custom', title: 'My tasks', showActions: true },
			],
			layout: [
				{ id: '1', widgetId: 'deadlines', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 4 },
				{ id: '2', widgetId: 'tasks', gridX: 8, gridY: 0, gridWidth: 4, gridHeight: 4 },
			],
			...props,
		},
		slots: { 'widget-deadlines': '<div />', 'widget-tasks': '<div />' },
		global: { stubs },
	})
}

const actions = (w, id) => w.find(`.ww[data-id="${id}"]`).attributes('data-actions')

describe('CnDashboardPage: showWidgetActions', () => {
	it('shows every widget menu by default', () => {
		const w = mountPage()
		expect(actions(w, 'deadlines')).toBe('true')
		expect(actions(w, 'tasks')).toBe('true')
	})

	it('drops the menu from widgets that do not set showActions', () => {
		const w = mountPage({ showWidgetActions: false })
		expect(actions(w, 'deadlines')).toBe('false')
	})

	it('keeps the menu on a widget that sets showActions: true', () => {
		expect(actions(mountPage({ showWidgetActions: false }), 'tasks')).toBe('true')
	})
})
