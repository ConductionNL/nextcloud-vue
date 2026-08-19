/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A refused save or run must be VISIBLE (#607).
 *
 * `store.save()` and `store.run()` both swallow the failure into `return null`
 * after setting `store.error`, and nothing rendered that. The consuming
 * `onSave()` then skips its `$router.replace`, so the entire visible effect of
 * a rejected save was the button flickering. There is no server log line to
 * fall back on either: a 400 JSONResponse is not an exception.
 *
 * Measured on openregister, where the API answers 400 "A flow needs a name."
 * for a flow the editor let the user save before it had been initialised.
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
 * @param {object} state Store overrides.
 * @return {object} The wrapper and the store.
 */
async function mountSidebar(state = {}) {
	setActivePinia(createPinia())

	const wrapper = mount(CnFlowSidebar, {
		global: {
			stubs: {
				NcAppSidebar: { template: '<aside class="app-sidebar"><slot /></aside>' },
				NcAppSidebarTab: { template: '<div class="app-sidebar-tab"><slot /></div>' },
				NcButton: { template: '<button :disabled="disabled"><slot /></button>', props: ['disabled'] },
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

describe('CnFlowSidebar', () => {
	describe('a refused action', () => {
		it("shows the server's own reason when a save is rejected", async () => {
			const { wrapper } = await mountSidebar({
				error: {
					message: 'Request failed with status code 400',
					response: { data: { error: 'A flow needs a name.' } },
				},
			})

			// The API's sentence, not axios's. "A flow needs a name." says what
			// to do; "Request failed with status code 400" does not.
			expect(wrapper.text()).toContain('A flow needs a name.')
		})

		it('falls back to the transport message when the API sent no reason', async () => {
			const { wrapper } = await mountSidebar({
				error: { message: 'Network Error' },
			})

			expect(wrapper.text()).toContain('Network Error')
		})

		it('shows nothing while no action has failed', async () => {
			const { wrapper } = await mountSidebar({ error: null })

			expect(wrapper.find('.cn-flow-sidebar__failure').exists()).toBe(false)
		})
	})

	describe('the palette states', () => {
		it('says it is loading while the catalogue request is in flight', async () => {
			const { wrapper } = await mountSidebar({
				nodeCatalog: [],
				catalogLoading: true,
			})

			// An in-flight catalogue is NOT a failed one. The failure text used
			// to show during every first paint of /flows/new.
			expect(wrapper.text()).toContain('Loading the available steps')
			expect(wrapper.text()).not.toContain('could not be read')
		})

		it('reports a catalogue that could not be read, once loading is over', async () => {
			const { wrapper } = await mountSidebar({
				nodeCatalog: [],
				catalogLoading: false,
			})

			expect(wrapper.text()).toContain('could not be read')
		})

		it('offers the catalogue with role badges, triggers first', async () => {
			const { wrapper } = await mountSidebar({
				nodeCatalog: [
					{ id: 'openregister.end', displayName: 'End', role: 'end' },
					{ id: 'openregister.trigger-manual', displayName: 'When someone runs it', role: 'trigger' },
					{ id: 'openregister.filter', displayName: 'Filter', role: 'step' },
				],
			})

			const names = wrapper.findAll('.cn-flow-sidebar__palette-name').map((n) => n.text())
			expect(names).toEqual(['When someone runs it', 'Filter', 'End'])
		})

		it('finds a step by its description, not only its name', async () => {
			const { wrapper } = await mountSidebar({
				nodeCatalog: [
					{ id: 'openregister.filter', displayName: 'Filter', role: 'step', description: 'Drop items that do not match.' },
					{ id: 'openregister.end', displayName: 'End', role: 'end', description: 'End the flow here.' },
				],
			})

			wrapper.vm.paletteSearch = 'drop items'
			await wrapper.vm.$nextTick()

			const names = wrapper.findAll('.cn-flow-sidebar__palette-name').map((n) => n.text())
			expect(names).toEqual(['Filter'])
		})
	})

	describe('what stops the flow from finishing', () => {
		it('says a flow with steps but no trigger will never start', async () => {
			const { wrapper, store } = await mountSidebar({
				nodeCatalog: [
					{ id: 'openregister.filter', displayName: 'Filter', role: 'step' },
					{ id: 'openregister.end', displayName: 'End', role: 'end' },
				],
			})
			store.flow = { name: 'x', nodes: [{ id: 'n1', type: 'openregister.filter', config: {} }], edges: [] }
			await wrapper.vm.$nextTick()

			expect(wrapper.text()).toContain('no trigger')
		})

		it('reports nothing for an empty flow — a blank canvas is not incomplete', async () => {
			const { wrapper, store } = await mountSidebar({})
			store.flow = { name: 'x', nodes: [], edges: [] }
			await wrapper.vm.$nextTick()

			expect(wrapper.text()).not.toContain('no trigger')
		})
	})
})
