/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The sidebar header becomes the flow's own surface, and the Flow tab goes.
 *
 * WHAT MOVED AND WHY
 * ------------------
 * The Flow tab held the things that are true of the FLOW rather than of a tab:
 * its name, its description, how it is triggered, what it is restricted to, and
 * whether it is enabled. A tab is a place you have to be looking at, so all of
 * it was invisible while the author worked on the graph or read a run.
 *
 * So the header carries the identity (name, version, draft or published) and an
 * action menu carries the verbs (Edit flow, Enable, Publish, Deprecate, Create
 * draft). The fields themselves open in a modal of their own. Once every one of
 * them has a home, the Flow tab has nothing left to show and is deleted: the
 * sidebar is Steps and Runs.
 *
 * ⚠️ THE TRIGGER SUBTITLE GOES TOO. A small grey "manual" under the flow's name
 * announced a setting nobody was about to change from there, and it is edited in
 * the modal like every other field.
 *
 * ⚠️ THE MODAL IS ITS OWN COMPONENT, NOT `CnFlowEditModal`. That name is already
 * taken by the FULL editor in a dialog — canvas and sidebar together, what
 * Buildiq's "Edit flows…" opens. A modal that means the whole editor to one
 * caller and five fields to another is the kind of thing that bites six weeks
 * later, so this one is `CnFlowSettingsModal` and says what it edits.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowSidebar from '../../src/components/CnFlowDetail/CnFlowSidebar.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * Mount the sidebar over a store seeded with the given state.
 *
 * NcActions is stubbed as a plain wrapper so its items are queryable: the real
 * one teleports its menu to the body on open, which a mounted-component test
 * cannot reach without driving a click first.
 *
 * @param {object} state Store overrides.
 * @param {object} props Component props.
 * @return {object} The wrapper and the store.
 */
async function mountSidebar(state = {}, props = {}) {
	setActivePinia(createPinia())

	const wrapper = mount(CnFlowSidebar, {
		props,
		global: {
			stubs: {
				NcAppSidebar: {
					props: ['subname'],
					template: '<aside class="app-sidebar"><header class="app-sidebar__header"><p class="app-sidebar__subname">{{ subname }}</p><slot name="description" /><slot name="secondary-actions" /></header><slot /></aside>',
				},
				NcAppSidebarTab: {
					template: '<div class="app-sidebar-tab" :data-tab="name"><slot /></div>',
					props: ['name'],
				},
				NcActions: { template: '<div class="actions"><slot /></div>' },
				NcActionButton: {
					// ⚠️ NO `@click="$emit('click')"` HERE. The parent's listener
					// already falls through to this root <button> as a native
					// handler, so re-emitting fires it a SECOND time — a toggle
					// then runs twice and lands back where it started, which
					// reads as "the click did nothing".
					template: '<button class="action-button"><slot /></button>',
				},
				NcButton: {
					template: '<button :disabled="disabled" :aria-label="ariaLabel"><slot /></button>',
					props: ['disabled', 'ariaLabel'],
				},
				NcCheckboxRadioSwitch: true,
				NcSelect: true,
				NcTextField: true,
				CnFlowSettingsModal: { template: '<div class="settings-modal" />' },
				Cog: true,
				History: true,
				Sitemap: true,
			},
			mocks: { t: (app, s) => s },
		},
	})

	const store = wrapper.vm.store
	Object.assign(store, state)
	await wrapper.vm.$nextTick()

	return { wrapper, store }
}

const FLOW = { id: 'f1', name: 'Mandaatbesluit', version: 2, lifecycleStatus: 'draft', trigger: 'manual', nodes: [], edges: [] }

describe('CnFlowSidebar — the header carries the flow', () => {
	describe('the trigger subtitle', () => {
		it('does not announce the trigger under the flow name', async () => {
			const { wrapper } = await mountSidebar({ flow: { ...FLOW, trigger: 'manual' } })

			// The stub renders whatever `subname` it is given, so an empty
			// header is the assertion. Nothing is bound, and the computed that
			// used to build the line is gone rather than returning '' — a
			// computed that can only answer one thing is a comment with a
			// runtime cost.
			expect(wrapper.find('.app-sidebar__subname').text()).toBe('')
			expect(wrapper.vm.sidebarSubname).toBeUndefined()
		})
	})

	describe('the action menu', () => {
		it('offers Edit flow, and opens the settings modal', async () => {
			const { wrapper } = await mountSidebar({ flow: FLOW })

			expect(wrapper.find('.settings-modal').exists()).toBe(false)

			await wrapper.find('[data-testid="flow-action-edit"]').trigger('click')

			expect(wrapper.find('.settings-modal').exists()).toBe(true)
		})

		it('carries Publish as a menu item, not as a header button', async () => {
			const { wrapper } = await mountSidebar({ flow: FLOW })

			// The verb lives in the menu; the header states the version and
			// whether it is a draft, which is a fact rather than an action.
			expect(wrapper.find('[data-testid="flow-publish"]').exists()).toBe(true)
			expect(wrapper.find('.cn-flow-lifecycle__actions').exists()).toBe(false)
		})

		it('offers Create draft version and Deprecate on a published flow', async () => {
			const { wrapper } = await mountSidebar({
				flow: { ...FLOW, lifecycleStatus: 'published' },
			})

			expect(wrapper.find('[data-testid="flow-create-draft"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="flow-deprecate"]').exists()).toBe(true)
			// Publishing a published version is not a thing.
			expect(wrapper.find('[data-testid="flow-publish"]').exists()).toBe(false)
		})

		it('toggles enabled from the menu, and says which way it will go', async () => {
			const { wrapper, store } = await mountSidebar({
				flow: { ...FLOW, enabled: false },
			})

			const toggle = wrapper.find('[data-testid="flow-toggle-enabled"]')
			expect(toggle.text()).toContain('Enable')

			await toggle.trigger('click')
			expect(store.flow.enabled).toBe(true)

			await wrapper.vm.$nextTick()
			// The label follows the state: a menu item that always says
			// "Enable" tells you nothing about which state you are in.
			expect(wrapper.find('[data-testid="flow-toggle-enabled"]').text()).toContain('Disable')
		})
	})

	describe('the header still states the version', () => {
		it('shows the version and its lifecycle as a badge', async () => {
			const { wrapper } = await mountSidebar({ flow: FLOW })

			const header = wrapper.find('.app-sidebar__header')
			expect(header.find('[data-testid="flow-version"]').text()).toBe('v2')
			expect(header.find('[data-testid="flow-lifecycle"]').text()).toBe('Draft')
		})
	})

	describe('the Flow tab is gone', () => {
		it('renders exactly ONE tab: Runs', async () => {
			// Was two (Steps and Runs), and before that three. The palette moved
			// to a modal off the toolbar and took the Steps tab with it, so the
			// sidebar is the flow's runs. A strip with one tab in it is chrome
			// around nothing, which is why the strip itself is gone too.
			const { wrapper } = await mountSidebar()

			const names = wrapper.findAll('.app-sidebar-tab').map((n) => n.attributes('data-tab'))
			expect(names.filter(Boolean)).toEqual(['Runs'])
		})

		it('does not render the flow settings fields in a tab any more', async () => {
			const { wrapper } = await mountSidebar({ flow: FLOW })

			// Every field the Flow tab held now lives in the modal. Leaving one
			// behind is how a form comes to disagree with itself.
			expect(wrapper.text()).not.toContain('Restrict to register')
			expect(wrapper.text()).not.toContain('Cron schedule')
		})
	})
})
