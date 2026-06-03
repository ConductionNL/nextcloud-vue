/**
 * Tests for CnDetailPage's `sidebar` Object form + `show` flag.
 *
 * Covers REQ-MDSC-1 / REQ-MDSC-2 / REQ-MDSC-3 from the
 * `manifest-detail-sidebar-config` change. Verifies that:
 *
 *   - The Boolean form remains backwards-compatible.
 *   - The Object form passes through register/schema/tabs etc.
 *   - `sidebar.show: false` deactivates the external sidebar
 *     channel even when the rest of the config is valid.
 *   - The deprecation warning for the Boolean form fires once
 *     per component instance.
 *   - Object-form fields take precedence over `sidebarProps`
 *     for overlapping fields, with a one-shot conflict warning.
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
		useRegistry: false,
		excludeIntegrations: [],
	}
}

function mountDetailPage(propsData, state) {
	return mount(CnDetailPage, {
		propsData,
		provide: { objectSidebarState: state },
	})
}

describe('CnDetailPage — sidebar Object form + show flag', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	describe('Boolean back-compat', () => {
		it('treats sidebar=true as an active Object form', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Lead',
				sidebar: true,
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.active).toBe(true)
			expect(state.objectType).toBe('lead')
			expect(state.objectId).toBe('1')
		})

		it('treats sidebar=false as inactive', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Lead',
				sidebar: false,
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.active).toBe(false)
		})

		it('logs the deprecation warning once per component instance', async () => {
			const state = makeState()
			const wrapper = mountDetailPage({
				title: 'Lead',
				sidebar: true,
				objectType: 'lead',
				objectId: '1',
			}, state)
			const matching = warnSpy.mock.calls.filter((c) => /\[CnDetailPage\].*deprecated/.test(c[0]))
			expect(matching.length).toBe(1)
			// Toggling the Boolean prop must NOT emit another warning.
			await wrapper.setProps({ sidebar: false })
			await wrapper.setProps({ sidebar: true })
			const after = warnSpy.mock.calls.filter((c) => /\[CnDetailPage\].*deprecated/.test(c[0]))
			expect(after.length).toBe(1)
		})

		it('does NOT log the deprecation warning when the Object form is used', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Lead',
				sidebar: { register: 'r', schema: 's' },
				objectType: 'lead',
				objectId: '1',
			}, state)
			const matching = warnSpy.mock.calls.filter((c) => /\[CnDetailPage\].*deprecated/.test(c[0]))
			expect(matching.length).toBe(0)
		})
	})

	describe('Object form fields', () => {
		it('forwards register / schema / hiddenTabs / title / subtitle / tabs', () => {
			const state = makeState()
			const tabs = [{ id: 'overview', label: 'Overview', component: 'X' }]
			mountDetailPage({
				title: 'Lead',
				sidebar: {
					register: 'leads',
					schema: 'lead',
					hiddenTabs: ['notes'],
					title: 'Override title',
					subtitle: 'Override sub',
					tabs,
				},
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.active).toBe(true)
			expect(state.register).toBe('leads')
			expect(state.schema).toBe('lead')
			expect(state.hiddenTabs).toEqual(['notes'])
			expect(state.title).toBe('Override title')
			expect(state.subtitle).toBe('Override sub')
			expect(state.tabs).toBe(tabs)
		})

		it('show: false suppresses the sidebar even with full config', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Lead',
				sidebar: {
					show: false,
					register: 'leads',
					schema: 'lead',
					tabs: [{ id: 'a', label: 'A', component: 'X' }],
				},
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.active).toBe(false)
			expect(state.tabs).toBeUndefined()
		})

		it('show defaults to true when omitted', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Lead',
				sidebar: { register: 'r', schema: 's' },
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.active).toBe(true)
		})

		it('enabled: false also deactivates the sidebar', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Lead',
				sidebar: { enabled: false, register: 'r', schema: 's' },
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.active).toBe(false)
		})

		it('clears tabs when sidebar transitions to show: false', async () => {
			const state = makeState()
			const wrapper = mountDetailPage({
				title: 'Lead',
				sidebar: { register: 'r', schema: 's', tabs: [{ id: 'a', label: 'A', component: 'X' }] },
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.tabs).toHaveLength(1)
			await wrapper.setProps({
				sidebar: { show: false, register: 'r', schema: 's', tabs: [{ id: 'a', label: 'A', component: 'X' }] },
			})
			expect(state.active).toBe(false)
			expect(state.tabs).toBeUndefined()
		})
	})

	describe('Object form vs sidebarProps precedence', () => {
		it('Object form wins on overlapping register/schema and warns once', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Lead',
				sidebar: { register: 'A', schema: 'A' },
				sidebarProps: { register: 'B', schema: 'B' },
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.register).toBe('A')
			expect(state.schema).toBe('A')
			const matching = warnSpy.mock.calls.filter((c) => /\[CnDetailPage\].*sidebar.*sidebarProps/.test(c[0]))
			expect(matching.length).toBe(1)
		})

		it('falls back to sidebarProps for fields the Object omits', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Lead',
				sidebar: { register: 'A' },
				sidebarProps: { schema: 'fromProps', hiddenTabs: ['notes'] },
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.register).toBe('A')
			expect(state.schema).toBe('fromProps')
			expect(state.hiddenTabs).toEqual(['notes'])
		})
	})
})

describe('CnDetailPage — sidebar registry mode (useRegistry / excludeIntegrations)', () => {
	it('pushes useRegistry + excludeIntegrations from the Object form into objectSidebarState', () => {
		const state = makeState()
		mountDetailPage({
			sidebar: { register: 'crm', schema: 'lead', useRegistry: true, excludeIntegrations: ['tags'] },
			objectType: 'lead',
			objectId: '1',
		}, state)
		expect(state.active).toBe(true)
		expect(state.useRegistry).toBe(true)
		expect(state.excludeIntegrations).toEqual(['tags'])
		// in registry mode the manifest `tabs` array isn't set
		expect(state.tabs).toBeUndefined()
	})

	it('defaults useRegistry to false and excludeIntegrations to [] when the Object form omits them', () => {
		const state = makeState()
		mountDetailPage({
			sidebar: { register: 'crm', schema: 'lead' },
			objectType: 'lead',
			objectId: '1',
		}, state)
		expect(state.useRegistry).toBe(false)
		expect(state.excludeIntegrations).toEqual([])
	})

	it('clears useRegistry / excludeIntegrations when the page is suppressed', () => {
		const state = makeState()
		state.useRegistry = true
		state.excludeIntegrations = ['tags']
		mountDetailPage({
			sidebar: { show: false, useRegistry: true, excludeIntegrations: ['tags'] },
			objectType: 'lead',
			objectId: '1',
		}, state)
		expect(state.active).toBe(false)
		expect(state.useRegistry).toBe(false)
		expect(state.excludeIntegrations).toEqual([])
	})

	it('falls back to sidebarProps for useRegistry / excludeIntegrations the Object form omits', () => {
		const state = makeState()
		mountDetailPage({
			// the Object form activates the sidebar; sidebarProps fills the rest
			sidebar: { register: 'crm', schema: 'lead' },
			sidebarProps: { useRegistry: true, excludeIntegrations: ['notes'] },
			objectType: 'lead',
			objectId: '1',
		}, state)
		expect(state.active).toBe(true)
		expect(state.useRegistry).toBe(true)
		expect(state.excludeIntegrations).toEqual(['notes'])
	})
})
