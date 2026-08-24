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
import { toRaw } from 'vue'
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
		// The host app declares both of these on its shared channel (see
		// decidiq src/App.vue). They belong in the fixture for the same reason
		// the rest do: a field the fixture omits is a field this suite cannot
		// notice being dropped.
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

	describe('refresh stickiness (enabled: !loading hosts)', () => {
		it('keeps the sidebar active through a refresh-driven enabled flip', async () => {
			const state = makeState()
			// Mimic a legacy host: `:sidebar="{ enabled: !loading }"`.
			const wrapper = mountDetailPage({
				title: 'Lead',
				objectType: 'lead',
				objectId: '1',
				loading: true,
				sidebar: { enabled: false },
			}, state)
			// First load: sidebar inactive (object not ready yet).
			expect(state.active).toBe(false)

			// First load completes → sidebar activates.
			await wrapper.setProps({ loading: false, sidebar: { enabled: true } })
			expect(state.active).toBe(true)

			// Refresh starts: loading true, enabled flips false again. The
			// sidebar must stay active (no teardown / sub-resource refetch).
			await wrapper.setProps({ loading: true, sidebar: { enabled: false } })
			expect(state.active).toBe(true)

			// Refresh settles → still active.
			await wrapper.setProps({ loading: false, sidebar: { enabled: true } })
			expect(state.active).toBe(true)
		})
	})

	describe('ADR-019 registry sidebar forwarding', () => {
		// REGRESSION. `config.sidebar.useRegistry` reached resolvedSidebar()
		// intact and survived mergeSidebarSources(), and then was never
		// published onto the shared channel — so the host's CnObjectSidebar
		// always saw the prop default `false` and rendered its
		// backwards-compatible branch: five hard-coded built-in tabs instead of
		// one tab per registered provider.
		//
		// Measured on decidiq run 32702211376, whose MeetingIntegrations page
		// sets `useRegistry: true`: the server reported 10 available providers,
		// the JS registry carried every one of them WITH a tab component, and
		// the sidebar rendered 5 tabs — exactly the fallback set. The
		// declaration did nothing at all, in every app that used it.
		it('publishes useRegistry from the manifest sidebar config', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Meeting',
				objectType: 'meeting',
				objectId: '1',
				sidebar: { useRegistry: true },
			}, state)
			expect(state.active).toBe(true)
			expect(state.useRegistry).toBe(true)
		})

		it('leaves useRegistry false when the config does not ask for it', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Meeting',
				objectType: 'meeting',
				objectId: '1',
				sidebar: { register: 'decidiq' },
			}, state)
			expect(state.active).toBe(true)
			expect(state.useRegistry).toBe(false)
		})

		// Strict `=== true`, so a truthy-but-not-true manifest value cannot
		// switch a host into registry mode by accident.
		it('does not treat a truthy non-boolean as opt-in', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Meeting',
				objectType: 'meeting',
				objectId: '1',
				sidebar: { useRegistry: 'yes' },
			}, state)
			expect(state.useRegistry).toBe(false)
		})

		it('publishes excludeIntegrations, which rides the same channel', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Meeting',
				objectType: 'meeting',
				objectId: '1',
				sidebar: { useRegistry: true, excludeIntegrations: ['talk'] },
			}, state)
			expect(state.useRegistry).toBe(true)
			expect(state.excludeIntegrations).toEqual(['talk'])
		})
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

		it('does NOT log the deprecation warning when the prop is omitted (Object default)', () => {
			const state = makeState()
			mountDetailPage({
				title: 'Lead',
				objectType: 'lead',
				objectId: '1',
			}, state)
			expect(state.active).toBe(false)
			const matching = warnSpy.mock.calls.filter((c) => /\[CnDetailPage\].*deprecated/.test(c[0]))
			expect(matching.length).toBe(0)
		})
	})

	describe('open is seeded once, not re-applied on every sync', () => {
		// REGRESSION. `syncSidebarState()` documents this exactly:
		//
		//   Seed `open` only on the inactive→active edge (first activation of
		//   this object). Subsequent syncs must NOT clobber it, otherwise the
		//   user's close/toggle would be undone on the next reactive change.
		//
		// The code set `sidebarSeeded = true` and then passed `open` to
		// `assignSidebarState()` unconditionally, so the flag was written and
		// never read. Every later sync — and a detail page emits several while
		// it hydrates — slammed `open` back to the prop's default of `false`,
		// reclosing a sidebar the user had just opened.
		//
		// Downstream this made openbuild's e2e suite race the UI: the sidebar
		// reopened, the tab was clicked, and the panel content was hidden again
		// before the assertion ran (openbuild#268 — "resolves 30×, hidden").

		it('does not reclose a sidebar the user opened, on a later sync', async () => {
			const state = makeState()
			const wrapper = mountDetailPage({
				title: 'Lead',
				objectType: 'lead',
				objectId: '1',
				sidebar: { register: 'leads', schema: 'lead' },
			}, state)

			// First activation seeds the prop default.
			expect(state.active).toBe(true)
			expect(state.open).toBe(false)

			// The user (or NcAppSidebar's own toggle) opens it. The shared
			// channel owns `open` from here on.
			state.open = true

			// Any later reactive change re-runs the sync. A hydrating detail
			// page does this repeatedly as the object and schema resolve.
			await wrapper.setProps({ title: 'Lead (loaded)' })
			expect(state.open).toBe(true)

			await wrapper.setProps({ subtitle: 'now with a subtitle' })
			expect(state.open).toBe(true)
		})

		it('re-seeds on the next activation after going inactive', async () => {
			const state = makeState()
			const wrapper = mountDetailPage({
				title: 'Lead',
				objectType: 'lead',
				objectId: '1',
				sidebar: { register: 'leads', schema: 'lead' },
			}, state)
			expect(state.open).toBe(false)

			state.open = true

			// Deactivate — the seed re-arms.
			await wrapper.setProps({ sidebar: { show: false } })
			expect(state.active).toBe(false)

			// Reactivating is a fresh activation, so the prop seeds again and
			// the stale `open: true` from the previous object does not leak in.
			await wrapper.setProps({ sidebar: { register: 'leads', schema: 'lead' } })
			expect(state.active).toBe(true)
			expect(state.open).toBe(false)
		})

		it('seeds sidebarOpen: true when the host asks for it', () => {
			const state = makeState()
			state.open = false
			mountDetailPage({
				title: 'Lead',
				objectType: 'lead',
				objectId: '1',
				sidebarOpen: true,
				sidebar: { register: 'leads', schema: 'lead' },
			}, state)
			expect(state.open).toBe(true)
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
			// `toRaw` on the received side — the sidebar state is reactive, so
			// the tabs array comes back as a Proxy. Still an identity check:
			// the configured array is forwarded, not rebuilt.
			expect(toRaw(state.tabs)).toBe(tabs)
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
