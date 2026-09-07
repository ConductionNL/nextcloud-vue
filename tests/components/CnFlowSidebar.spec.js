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
	// ⚠️ THE PALETTE TESTS MOVED, they were not deleted. The palette is now
	// `CnFlowStepPickerModal`, opened from the editor's toolbar, and every
	// claim that used to be made here is made in
	// `tests/dialogs/CnFlowStepPickerModal.spec.js` against that surface —
	// including the three distinct empty states and search-by-description.
	//
	// What is asserted HERE is the consequence for the sidebar: it no longer
	// offers a way to add a step at all.
	it('offers no palette: adding a step is the toolbar’s job now', async () => {
		const { wrapper } = await mountSidebar({
			nodeCatalog: [{ id: 'openregister.filter', displayName: 'Filter', role: 'step' }],
		})

		expect(wrapper.find('.cn-flow-sidebar__palette').exists()).toBe(false)
		expect(wrapper.text()).not.toContain('Search steps')
	})
})
