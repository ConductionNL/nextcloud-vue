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

	// A non-empty top-level `sidebarTabs` prop (the manifest pattern —
	// CnPageRenderer forwards `config.sidebarTabs`) must by itself opt
	// the sidebar in, even when no `sidebar` config object is present.
	// Without this, a `type:"detail"` page that declares only
	// `config.sidebarTabs` (procest CaseDetail) never publishes its
	// strip because resolvedSidebar defaulted to show/enabled: false.
	describe('sidebarTabs prop implies an enabled sidebar', () => {
		// A no-op store so the schema-driven mount path (register+schema+
		// objectId) doesn't reach Pinia — we only exercise the sidebar sync.
		const noopStore = {
			objects: {}, schemas: {}, loading: {},
			registerObjectType() {}, fetchObject() { return Promise.resolve(null) }, fetchSchema() { return Promise.resolve(null) },
			getObject() { return null }, getSchema() { return null },
		}
		function mountSchemaDriven(extra, state) {
			return mountDetailPage({
				title: 'Case 1',
				register: 'procest',
				schema: 'case',
				objectId: 'abc-123',
				objectStore: noopStore,
				subscribe: false,
				...extra,
			}, state)
		}

		it('activates + publishes tabs when only sidebarTabs is set (no sidebar config)', () => {
			const state = makeState()
			const tabs = [
				{ id: 'tasks', label: 'Tasks', component: 'CaseTasksTab' },
				{ id: 'email', label: 'Email', component: 'CaseEmailTab' },
			]
			mountSchemaDriven({ sidebarTabs: tabs }, state)
			expect(state.active).toBe(true)
			expect(state.objectType).toBe('procest-case')
			expect(state.objectId).toBe('abc-123')
			expect(state.tabs).toBe(tabs)
		})

		it('stays inactive when sidebarTabs is empty and no sidebar config', () => {
			const state = makeState()
			mountSchemaDriven({ sidebarTabs: [] }, state)
			expect(state.active).toBe(false)
			expect(state.tabs).toBeUndefined()
		})

		it('the Object form sidebar:{show:false} suppresses even with a non-empty sidebarTabs', () => {
			// Boolean false is indistinguishable from the prop default (and
			// from "no manifest sidebar config"), so tabs win over it. A page
			// that genuinely wants to hide a declared strip uses the explicit
			// Object form, which always wins.
			const state = makeState()
			mountSchemaDriven({
				sidebar: { show: false },
				sidebarTabs: [{ id: 'tasks', label: 'Tasks', component: 'CaseTasksTab' }],
			}, state)
			expect(state.active).toBe(false)
			expect(state.tabs).toBeUndefined()
		})
	})

	// Regression: syncSidebarState must not put a fresh array/value on the
	// reactive objectSidebarState when nothing changed. A new `hiddenTabs`
	// ref every sync churns the channel → host App re-renders → its
	// <router-view> re-renders the detail page → the page's inline `:sidebar`
	// prop re-fires this sync → infinite render loop (froze the tab on the
	// expense detail page).
	describe('idempotent objectSidebarState writes', () => {
		it('keeps the same hiddenTabs array ref across repeated syncs (no churn)', () => {
			const state = makeState()
			const wrapper = mountDetailPage({
				title: 'Decision X',
				sidebar: { enabled: true },
				objectType: 'decision',
				objectId: 'd-1',
				sidebarProps: { register: 'r', schema: 's' }, // no hiddenTabs
			}, state)
			expect(state.active).toBe(true)
			const ref1 = state.hiddenTabs
			wrapper.vm.syncSidebarState()
			wrapper.vm.syncSidebarState()
			expect(state.hiddenTabs).toBe(ref1)
		})
	})
})
