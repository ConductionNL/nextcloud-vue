/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The step picker: every step the engine offers, searchable, in a modal.
 *
 * ⚠️ THESE TESTS MOVED HERE FROM `CnFlowSidebar.spec.js`, they were not
 * rewritten. The palette used to be a column in the Steps tab, and a live
 * instance serves SIXTY-FIVE step types into roughly 300px — a scroll rather
 * than a chooser. The surface moved to a modal; the claims about it did not
 * change, so they follow the surface rather than being deleted with it.
 *
 * The three empty states are the part worth keeping distinct. "Still loading",
 * "the catalogue is empty" and "your search matched nothing" say three
 * different things to the author, and collapsing them into one "nothing here"
 * is what made a broken catalogue look like a bad search term.
 */

import { mount } from '@vue/test-utils'
import CnFlowStepPickerModal from '../../src/dialogs/CnFlowStepPickerModal.vue'

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
 * Mount the picker over the store THE COMPONENT holds.
 *
 * `tests/setup.js` installs a global pinia, so a store made out here is a
 * different instance and every assertion would read "".
 *
 * @param {object} state Store overrides.
 * @return {Promise<object>} The wrapper.
 */
async function mountPicker(state = {}) {
	const wrapper = mount(CnFlowStepPickerModal, {
		global: {
			stubs: {
				NcDialog: { template: '<div class="dialog"><slot /></div>' },
				NcTextField: true,
				NcSelect: true,
			},
			mocks: { t: (app, s) => s },
		},
	})

	Object.assign(wrapper.vm.store, {
		flow: { id: 'f-1', name: 'A flow', nodes: [], edges: [] },
		...state,
	})
	await wrapper.vm.$nextTick()

	return wrapper
}

describe('the step picker', () => {
	describe('the three empty states, which say three different things', () => {
		it('says it is loading while the catalogue request is in flight', async () => {
			const wrapper = await mountPicker({ nodeCatalog: [], catalogLoading: true })

			// An in-flight catalogue is NOT a failed one. The failure text used
			// to show during every first paint of /flows/new.
			expect(wrapper.text()).toContain('Loading the available steps')
			expect(wrapper.text()).not.toContain('could not be read')
		})

		it('says the list is empty, once loading is over', async () => {
			const wrapper = await mountPicker({ nodeCatalog: [], catalogLoading: false })

			// One short line AT the list. Why it could not be read, and that no
			// step can be added at all, is a standing condition of the flow and
			// renders on the canvas.
			expect(wrapper.text()).toContain('No steps are available to add.')
		})

		it('distinguishes a search that matched nothing from a catalogue that is empty', async () => {
			const wrapper = await mountPicker({
				nodeCatalog: [{ id: 'openregister.filter', displayName: 'Filter', role: 'step' }],
			})

			wrapper.vm.search = 'nothing matches this'
			await wrapper.vm.$nextTick()

			expect(wrapper.find('[data-testid="flow-step-picker-nomatch"]').exists()).toBe(true)
			expect(wrapper.text()).not.toContain('No steps are available to add.')
		})
	})

	describe('what it offers', () => {
		it('offers the catalogue with role badges, triggers first', async () => {
			const wrapper = await mountPicker({
				nodeCatalog: [
					{ id: 'openregister.end', displayName: 'End', role: 'end' },
					{ id: 'openregister.trigger-manual', displayName: 'When someone runs it', role: 'trigger' },
					{ id: 'openregister.filter', displayName: 'Filter', role: 'step' },
				],
			})

			const names = wrapper.findAll('.cn-step-picker__name').map((n) => n.text())
			expect(names).toEqual(['When someone runs it', 'Filter', 'End'])
		})

		it('finds a step by its description, not only its name', async () => {
			const wrapper = await mountPicker({
				nodeCatalog: [
					{ id: 'openregister.filter', displayName: 'Filter', role: 'step', description: 'Drop items that do not match.' },
					{ id: 'openregister.end', displayName: 'End', role: 'end', description: 'End the flow here.' },
				],
			})

			wrapper.vm.search = 'drop items'
			await wrapper.vm.$nextTick()

			const names = wrapper.findAll('.cn-step-picker__name').map((n) => n.text())
			expect(names).toEqual(['Filter'])
		})

		it('still carries DRAGGING, which the palette had', async () => {
			// Moving the surface must not trade one interaction for another.
			const wrapper = await mountPicker({
				nodeCatalog: [{ id: 'openregister.filter', displayName: 'Filter', role: 'step' }],
			})

			const item = wrapper.find('[data-testid="flow-step-picker-item"]')
			expect(item.attributes('draggable')).toBe('true')

			await item.trigger('dragstart')
			expect(wrapper.vm.store.paletteDragType).toBe('openregister.filter')

			await item.trigger('dragend')
			expect(wrapper.vm.store.paletteDragType).toBeNull()
		})
	})

	describe('closing', () => {
		it('closes once the step is on the canvas, because it covers the canvas', async () => {
			const wrapper = await mountPicker({
				nodeCatalog: [{ id: 'openregister.filter', displayName: 'Filter', role: 'step' }],
			})

			await wrapper.find('[data-testid="flow-step-picker-item"]').trigger('click')

			expect(wrapper.emitted('close')).toBeTruthy()
		})

		it('closes on a REFUSAL too, because the refusal is behind it', async () => {
			// A published version cannot be changed, and the refusal renders in
			// the canvas message area. This modal covers the canvas — so
			// staying open is what would hide it. Both outcomes end here.
			const wrapper = await mountPicker({
				nodeCatalog: [{ id: 'openregister.filter', displayName: 'Filter', role: 'step' }],
				flow: { id: 'f-1', name: 'A flow', lifecycleStatus: 'published', nodes: [], edges: [] },
			})

			await wrapper.find('[data-testid="flow-step-picker-item"]').trigger('click')

			expect(wrapper.vm.store.nodes).toHaveLength(0)
			expect(wrapper.emitted('close')).toBeTruthy()
		})
	})
})
