/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The sidebar after the flow editor's messages moved to the canvas.
 *
 * Three changes, one file, because they are one surface:
 *
 * 1. THE MESSAGES ARE GONE FROM HERE. A refused save, a lifecycle refusal,
 *    unsaved changes and a flow that can never finish all render on the canvas
 *    now (CnFlowCanvasMessages). Leaving a copy behind would put the same
 *    sentence in two places and make neither one authoritative.
 *
 * 2. "SELECTED STEP" IS GONE. Selecting a node used to fill a sidebar section
 *    with the step's name and Edit / Remove buttons. The canvas has a per-node
 *    action menu with Edit / Copy / Delete now, at the node, so the sidebar
 *    block was a second way to do the same thing from further away.
 *
 * 3. VERSION MOVED INTO THE HEADER. Publish state is a property of the FLOW,
 *    not of the Steps tab, so v2 / Draft / Publish stays visible with Runs or
 *    Flow open too. It used to sit inside the Steps tab content and vanish the
 *    moment the author looked at a run.
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
 * The NcAppSidebar stub renders the `description` slot inside a marked HEADER
 * element and the default slot after it, so "in the header" and "in a tab" are
 * two different queries rather than one `wrapper.text()` that cannot tell them
 * apart.
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
					template: '<aside class="app-sidebar"><header class="app-sidebar__header"><slot name="description" /></header><slot /></aside>',
				},
				NcAppSidebarTab: { template: '<div class="app-sidebar-tab"><slot /></div>' },
				NcButton: {
					template: '<button :disabled="disabled" :aria-label="ariaLabel"><slot /></button>',
					props: ['disabled', 'ariaLabel'],
				},
				NcNoteCard: { template: '<div class="note-card" :data-type="type"><slot /></div>', props: ['type'] },
				NcCheckboxRadioSwitch: true,
				NcSelect: true,
				NcTextField: true,
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

describe('CnFlowSidebar — after the messages moved to the canvas', () => {
	describe('nothing says the same thing twice', () => {
		it('does not render a refused save here any more', async () => {
			const { wrapper } = await mountSidebar({
				error: { response: { data: { error: 'A flow needs a name.' } } },
			})

			expect(wrapper.text()).not.toContain('A flow needs a name.')
			expect(wrapper.find('.cn-flow-sidebar__failure').exists()).toBe(false)
		})

		it('does not render a lifecycle refusal here any more', async () => {
			const { wrapper } = await mountSidebar({
				lifecycleRefusal: { reason: 'version-immutable', lifecycleStatus: 'published' },
			})

			expect(wrapper.text()).not.toContain('cannot be changed')
		})

		it('does not render unsaved changes here any more', async () => {
			const { wrapper } = await mountSidebar({ dirty: true })

			expect(wrapper.text()).not.toContain('unsaved changes')
		})

		it('does not render a flow that can never finish here any more', async () => {
			const { wrapper, store } = await mountSidebar({
				nodeCatalog: [{ id: 'openregister.filter', displayName: 'Filter', role: 'step' }],
			})
			store.flow = { name: 'x', nodes: [{ id: 'n1', type: 'openregister.filter', config: {} }], edges: [] }
			await wrapper.vm.$nextTick()

			expect(wrapper.text()).not.toContain('no trigger')
		})

		it('still explains an empty palette AT the palette, in one short line', async () => {
			const { wrapper } = await mountSidebar({ nodeCatalog: [], catalogLoading: false })

			// The canvas carries the diagnosis: the catalogue could not be read
			// and no step can be added. The list still has to say why it is
			// empty, or a blank palette reads as a broken component.
			expect(wrapper.text()).toContain('No steps are available to add.')
			expect(wrapper.text()).not.toContain('could not be read')
		})
	})

	describe('the selected step no longer gets its own block', () => {
		it('renders no "Selected step" section when a node is selected', async () => {
			const { wrapper, store } = await mountSidebar({
				nodeCatalog: [{ id: 'openregister.filter', displayName: 'Filter', description: 'Drop items that do not match.' }],
			})
			store.flow = { name: 'x', nodes: [{ id: 'n1', type: 'openregister.filter', config: {} }], edges: [] }
			store.selectedNodeId = 'n1'
			await wrapper.vm.$nextTick()

			expect(wrapper.text()).not.toContain('Selected step')
			expect(wrapper.text()).not.toContain('Edit step')
			expect(wrapper.text()).not.toContain('Remove step')
			expect(wrapper.find('.cn-flow-sidebar__selected-actions').exists()).toBe(false)
		})
	})

	describe('version and publish live in the header', () => {
		it('renders the version, its status and Publish in the sidebar header', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 3, name: 'Mandaatbesluit', version: 2, lifecycleStatus: 'draft', nodes: [], edges: [] },
			})

			const header = wrapper.find('.app-sidebar__header')
			expect(header.find('[data-testid="flow-version"]').text()).toBe('v2')
			expect(header.find('[data-testid="flow-lifecycle"]').text()).toBe('Draft')
			expect(header.find('[data-testid="flow-publish"]').exists()).toBe(true)
		})

		it('keeps them OUT of the Steps tab, so Runs and Flow show them too', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 3, name: 'x', version: 2, lifecycleStatus: 'draft', nodes: [], edges: [] },
			})

			// The whole point of the move: a tab-scoped Publish disappears the
			// moment the author opens Runs.
			const tabs = wrapper.findAll('.app-sidebar-tab')
			for (const tab of tabs) {
				expect(tab.find('[data-testid="flow-version"]').exists()).toBe(false)
				expect(tab.find('[data-testid="flow-publish"]').exists()).toBe(false)
			}
		})

		it('offers Create draft version on a published flow, in the header', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 3, name: 'x', version: 2, lifecycleStatus: 'published', nodes: [], edges: [] },
			})

			const header = wrapper.find('.app-sidebar__header')
			expect(header.find('[data-testid="flow-create-draft"]').exists()).toBe(true)
			expect(header.find('[data-testid="flow-deprecate"]').exists()).toBe(true)
		})

		it('renders the same header in the embedded variant, above the tab strip', async () => {
			// CnFlowEditModal renders these tabs inside a dialog, where there is
			// no NcAppSidebar to hold a header. Losing Publish there would make
			// the two hosts disagree about what the editor can do.
			const { wrapper } = await mountSidebar({
				flow: { id: 3, name: 'x', version: 2, lifecycleStatus: 'draft', nodes: [], edges: [] },
			}, { embedded: true })

			const header = wrapper.find('.cn-flow-sidebar__header')
			expect(header.exists()).toBe(true)
			expect(header.find('[data-testid="flow-version"]').text()).toBe('v2')
			expect(header.find('[data-testid="flow-publish"]').exists()).toBe(true)
		})
	})
})
