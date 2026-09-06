/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The sidebar's palette, and nothing else.
 *
 * ⚠️ THE MESSAGE ASSERTIONS THAT USED TO LIVE HERE MOVED, THEY WERE NOT DROPPED.
 * A refused save (#607), a lifecycle refusal, unsaved changes and a flow that
 * can never finish all render in the canvas message area now, and are asserted
 * in `CnFlowDetailMessages.spec.js`. That the sidebar no longer renders them is
 * asserted in `CnFlowSidebarHeader.spec.js`, so deleting a message from one
 * half and forgetting the other still fails.
 *
 * The original reason those assertions exist is worth keeping in front of
 * whoever reads this file: `store.save()` and `store.run()` both swallow their
 * failure into `return null` after setting `store.error`, and nothing rendered
 * it. The consuming `onSave()` then skips its `$router.replace`, so the entire
 * visible effect of a rejected save was the button flickering. There is no
 * server log line to fall back on either: a 400 JSONResponse is not an
 * exception. Measured on openregister, where the API answers 400 "A flow needs
 * a name." for a flow the editor let the user save before it had been
 * initialised.
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

		it('says the list is empty, once loading is over', async () => {
			const { wrapper } = await mountSidebar({
				nodeCatalog: [],
				catalogLoading: false,
			})

			// One short line AT the list. Why it could not be read, and that no
			// step can be added at all, is a standing condition of the flow and
			// renders on the canvas.
			expect(wrapper.text()).toContain('No steps are available to add.')
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
})
