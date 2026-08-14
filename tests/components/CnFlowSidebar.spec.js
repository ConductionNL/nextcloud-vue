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
				NcButton: { template: '<button :disabled="disabled"><slot /></button>', props: ['disabled'] },
				NcNoteCard: { template: '<div class="note-card" :data-type="type"><slot /></div>', props: ['type'] },
				NcCheckboxRadioSwitch: true,
				NcSelect: true,
				NcTextArea: true,
				NcTextField: true,
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

	describe('save is offered only when it can succeed', () => {
		it('disables Save while the flow has no name', async () => {
			const { wrapper } = await mountSidebar({
				flow: { name: '', nodes: [], edges: [] },
			})

			const save = wrapper.findAll('button').find((b) => b.text().includes('Save'))
			expect(save?.attributes('disabled')).toBeDefined()
		})

		it('enables Save once the flow is initialised', async () => {
			const { wrapper } = await mountSidebar({
				flow: { name: 'New flow', nodes: [], edges: [] },
			})

			const save = wrapper.findAll('button').find((b) => b.text().includes('Save'))
			expect(save?.attributes('disabled')).toBeUndefined()
		})
	})
})
