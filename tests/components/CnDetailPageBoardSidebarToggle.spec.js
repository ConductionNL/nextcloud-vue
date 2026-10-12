/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Under the board look the sidebar's own open toggle (NcAppSidebar's
 * `.app-sidebar__toggle`, hidden by the look's CSS because it sat over the
 * header's last button) is replaced by an "Open sidebar" entry in the header
 * menu, for a page with an active, closed sidebar. Without the look the toggle
 * stays and the entry is not offered.
 */
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function mountPage({ look = 'board', open = false, sidebar = true } = {}) {
	const state = reactive({ active: false, open, tabs: undefined })
	const w = mount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			sidebar,
			objectStore: {
				objects: { 'reg-case': { 'id-1': { id: 'id-1', name: 'x' } } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
		},
		global: {
			stubs: { CnDashboardGrid: { template: '<div />' }, CnDetailWidgetHost: { template: '<div />' } },
			provide: { cnLook: look, objectSidebarState: state },
		},
	})
	return { w, state }
}

describe('CnDetailPage "Open sidebar" under the board look', () => {
	it('is offered when the sidebar is active and closed, and opens it through the shared channel', () => {
		const { w, state } = mountPage()
		expect(w.vm.showOpenSidebar).toBe(true)
		w.vm.openSidebar()
		expect(state.open).toBe(true)
		expect(w.vm.openSidebarLabel).toBe('Open sidebar')
	})

	it('is not offered once the sidebar is open', () => {
		const { w, state } = mountPage()
		state.open = true
		expect(w.vm.showOpenSidebar).toBe(false)
	})

	it('is not offered without the board look (the sidebar keeps its own toggle)', () => {
		expect(mountPage({ look: 'nextcloud' }).w.vm.showOpenSidebar).toBe(false)
	})

	it('is not offered when the page has no sidebar', () => {
		expect(mountPage({ sidebar: false }).w.vm.showOpenSidebar).toBe(false)
	})
})
