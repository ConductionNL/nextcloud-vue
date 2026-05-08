/**
 * Tests for CnDetailPage's forwarding of `sidebarProps.tabs` through
 * the `objectSidebarState` provide/inject channel.
 *
 * Covers REQ-MAS-5 from the manifest-abstract-sidebar spec — when a
 * manifest declares `pages[].config.sidebarProps.tabs`, that array
 * must reach the host app's mounted CnObjectSidebar via the existing
 * inject channel that already carries `objectId` / `register` /
 * `schema` / `hiddenTabs`.
 */

import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function makeState() {
	return {
		active: false,
		open: true,
		objectType: '',
		objectId: '',
		title: '',
		subtitle: '',
		register: '',
		schema: '',
		hiddenTabs: [],
		tabs: undefined,
	}
}

function mountDetailPage(propsData, state) {
	return mount(CnDetailPage, {
		propsData,
		provide: { objectSidebarState: state },
	})
}

describe('CnDetailPage — sidebarProps.tabs forwarding', () => {
	it('forwards sidebarProps.tabs through objectSidebarState', () => {
		const state = makeState()
		const tabs = [
			{ id: 'overview', label: 'Overview', widgets: [{ type: 'metadata' }] },
			{ id: 'related', label: 'Related', component: 'MyRelatedTab' },
		]
		mountDetailPage({
			title: 'Decision X',
			sidebar: true,
			objectType: 'decision',
			objectId: 'd-1',
			sidebarProps: { tabs, register: 'r', schema: 's' },
		}, state)
		expect(state.active).toBe(true)
		expect(state.tabs).toBe(tabs)
		expect(state.register).toBe('r')
		expect(state.schema).toBe('s')
	})

	it('leaves objectSidebarState.tabs as undefined when sidebarProps.tabs is absent', () => {
		const state = makeState()
		mountDetailPage({
			title: 'D',
			sidebar: true,
			objectType: 'decision',
			objectId: 'd-1',
			sidebarProps: { register: 'r', schema: 's' },
		}, state)
		expect(state.active).toBe(true)
		expect(state.tabs).toBeUndefined()
	})

	it('clears objectSidebarState.tabs when the page deactivates the sidebar', () => {
		const state = makeState()
		// Mount with sidebar=false (no objectId) — sidebar inactive.
		mountDetailPage({
			title: 'D',
			sidebar: false,
			objectType: '',
			objectId: '',
			sidebarProps: { tabs: [{ id: 'a', label: 'A', component: 'X' }] },
		}, state)
		expect(state.active).toBe(false)
		expect(state.tabs).toBeUndefined()
	})

	it('reactively updates objectSidebarState.tabs when sidebarProps changes', async () => {
		const state = makeState()
		const wrapper = mountDetailPage({
			title: 'D',
			sidebar: true,
			objectType: 'decision',
			objectId: 'd-1',
			sidebarProps: { tabs: [{ id: 'a', label: 'A', component: 'X' }] },
		}, state)
		expect(state.tabs).toHaveLength(1)
		await wrapper.setProps({
			sidebarProps: {
				tabs: [
					{ id: 'a', label: 'A', component: 'X' },
					{ id: 'b', label: 'B', component: 'Y' },
				],
			},
		})
		expect(state.tabs).toHaveLength(2)
	})
})
