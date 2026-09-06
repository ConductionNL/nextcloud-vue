/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Where the flow editor's messages come from, now that they land on the canvas.
 *
 * THE JOURNEY THIS FIXES
 * ----------------------
 * Add a step to a PUBLISHED flow. `pushUndo()` refuses the edit and records the
 * reason, and until this change the only place that showed was a note card at
 * the top of the Steps tab in the right sidebar — past the palette, past the
 * search box, on the other side of the screen from the click. The author sees
 * a canvas that did nothing.
 *
 * So CnFlowDetail derives ONE list from every source the editor has, and pins
 * it to the canvas. This file asserts the derivation: the sources, the identity
 * that stops repeats stacking, and which messages may be dismissed.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'

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
 * Mount the canvas over a store seeded with the given state.
 *
 * @param {object} state Store overrides.
 * @return {object} The wrapper and the store.
 */
async function mountDetail(state = {}) {
	setActivePinia(createPinia())

	const wrapper = mount(CnFlowDetail, {
		global: {
			stubs: {
				CnGraphCanvas: {
					name: 'CnGraphCanvas',
					props: ['nodes', 'edges'],
					template: '<div><div v-for="n in nodes" :key="n.id"><slot name="node" :node="n" /></div></div>',
				},
				NcEmptyContent: true,
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

/**
 * The message ids currently on the canvas.
 *
 * @param {object} wrapper The mounted wrapper.
 * @return {Array<string>} The ids, in render order.
 */
function messageIds(wrapper) {
	return wrapper.vm.canvasMessages.map((m) => m.id)
}

describe('CnFlowDetail — the canvas message area', () => {
	describe('the refusal Ruben could not find', () => {
		it('puts a refused edit on the CANVAS, not in a sidebar tab', async () => {
			const { wrapper, store } = await mountDetail({
				flow: {
					name: 'Mandaatbesluit',
					lifecycleStatus: 'published',
					nodes: [],
					edges: [],
				},
			})

			// Exactly what the author did: pick a step from the palette.
			store.addNode('openregister.filter')
			await wrapper.vm.$nextTick()

			expect(store.lifecycleRefusal).not.toBeNull()

			const area = wrapper.find('.cn-flow-canvas-messages')
			expect(area.exists()).toBe(true)
			expect(area.text()).toContain('cannot be changed')

			// And it did what it said: no step was added.
			expect(store.nodes).toHaveLength(0)
		})

		it('does not stack when the same refusal fires again', async () => {
			const { wrapper, store } = await mountDetail({
				flow: { name: 'x', lifecycleStatus: 'published', nodes: [], edges: [] },
			})

			// Seeded AFTER mounting, or `mounted()`'s own catalogue request
			// resolves over it and the empty-catalogue warning joins the count
			// below. The count is the assertion here, so a second message for
			// an unrelated reason would fail it for the wrong reason.
			store.nodeCatalog = [{ id: 'openregister.filter', displayName: 'Filter', role: 'step' }]
			await wrapper.vm.$nextTick()

			store.addNode('openregister.filter')
			store.addNode('openregister.end')
			await wrapper.vm.$nextTick()

			// One id, one card. An author who clicks the palette five times has
			// one thing wrong, not five.
			expect(messageIds(wrapper).filter((id) => id === 'graph-locked')).toHaveLength(1)
			expect(wrapper.findAll('.cn-flow-canvas-messages__item')).toHaveLength(1)
		})

		it('states the standing lock BEFORE the author tries, in the same one card', async () => {
			const { wrapper } = await mountDetail({
				flow: { name: 'x', lifecycleStatus: 'published', nodes: [], edges: [] },
			})

			// Nothing refused yet, and the canvas already explains why it will
			// not accept edits. Discovering immutability by dragging a node and
			// watching nothing happen reads as a broken editor.
			expect(messageIds(wrapper)).toContain('graph-locked')
			expect(wrapper.text()).toContain('read-only')
		})

		it('offers the remedy on the message itself', async () => {
			const { wrapper, store } = await mountDetail({
				flow: { id: 7, name: 'x', lifecycleStatus: 'published', nodes: [], edges: [] },
			})

			const action = wrapper.find('[data-testid="flow-message-action-graph-locked"]')
			expect(action.exists()).toBe(true)

			const createDraft = jest.spyOn(store, 'createDraft').mockResolvedValue(null)
			await action.trigger('click')

			expect(createDraft).toHaveBeenCalled()
		})

		it('clears the refusal as soon as an edit succeeds', async () => {
			const { wrapper, store } = await mountDetail({
				flow: { name: 'x', lifecycleStatus: 'published', nodes: [], edges: [] },
			})

			store.addNode('openregister.filter')
			expect(store.lifecycleRefusal).not.toBeNull()

			// The author created a draft; the canvas is writable again.
			store.flow.lifecycleStatus = 'draft'
			store.addNode('openregister.filter')
			await wrapper.vm.$nextTick()

			// A refusal that outlives its cause is a lie the author has to
			// learn to ignore, and then ignores the true one too.
			expect(store.lifecycleRefusal).toBeNull()
			expect(messageIds(wrapper)).not.toContain('graph-locked')
		})
	})

	describe('the standing conditions, all of them', () => {
		it('reports unsaved changes, and will not let them be dismissed', async () => {
			const { wrapper } = await mountDetail({
				flow: { name: 'x', nodes: [], edges: [] },
				dirty: true,
			})

			expect(messageIds(wrapper)).toContain('unsaved')
			// Still unsaved after a dismiss would be a lie, so there is no
			// dismiss.
			expect(wrapper.find('[data-testid="flow-message-dismiss-unsaved"]').exists()).toBe(false)
		})

		it('reports a flow that can never finish', async () => {
			const { wrapper } = await mountDetail({
				nodeCatalog: [{ id: 'openregister.filter', displayName: 'Filter', role: 'step' }],
				flow: {
					name: 'x',
					nodes: [{ id: 'n1', type: 'openregister.filter', config: {} }],
					edges: [],
				},
			})

			expect(messageIds(wrapper)).toContain('missing-ends')
			expect(wrapper.text()).toContain('no trigger')
		})

		it('reports a catalogue that could not be read', async () => {
			const { wrapper } = await mountDetail({
				flow: { name: 'x', nodes: [], edges: [] },
				nodeCatalog: [],
				catalogLoading: false,
			})

			expect(messageIds(wrapper)).toContain('no-catalog')
		})

		it('says nothing about the catalogue while the request is still in the air', async () => {
			const { wrapper, store } = await mountDetail({
				flow: { name: 'x', nodes: [], edges: [] },
			})

			// Set AFTER mounting. `mounted()` fires its own catalogue request,
			// and the mocked axios resolves it in a microtask that lands after
			// the seed — so a `catalogLoading: true` passed to `mountDetail`
			// is switched back off before the assertion runs, and the test
			// would be measuring the mock's timing rather than the component.
			store.nodeCatalog = []
			store.catalogLoading = true
			await wrapper.vm.$nextTick()

			// An in-flight catalogue is not a failed one, and both are an empty
			// list.
			expect(messageIds(wrapper)).not.toContain('no-catalog')
		})

		it('reports an enabled flow with no owner, which a trigger will never start', async () => {
			const { wrapper } = await mountDetail({
				flow: { name: 'x', enabled: true, owner: null, nodes: [], edges: [] },
			})

			expect(messageIds(wrapper)).toContain('no-owner')
		})

		it('drops a standing message the moment its condition clears', async () => {
			const { wrapper, store } = await mountDetail({
				flow: { name: 'x', nodes: [], edges: [] },
				dirty: true,
			})
			expect(messageIds(wrapper)).toContain('unsaved')

			store.dirty = false
			await wrapper.vm.$nextTick()

			// It goes when the fact goes, never on a timer.
			expect(messageIds(wrapper)).not.toContain('unsaved')
		})
	})

	describe('the one-off messages, and their way out', () => {
		it('shows a failed action, and dismissing it clears the failure', async () => {
			const { wrapper, store } = await mountDetail({
				flow: { name: 'x', nodes: [], edges: [] },
				error: { response: { data: { error: 'A flow needs a name.' } } },
			})

			expect(wrapper.text()).toContain('A flow needs a name.')

			await wrapper.find('[data-testid="flow-message-dismiss-action-failed"]').trigger('click')

			// Dismissal clears the SOURCE, so nothing can revive a message the
			// author has already read and closed.
			expect(store.error).toBeNull()
			expect(messageIds(wrapper)).not.toContain('action-failed')
		})

		it('shows the Check verdict on the canvas, and lets it be dismissed', async () => {
			const { wrapper, store } = await mountDetail({
				flow: { name: 'x', nodes: [], edges: [] },
				checkResult: { valid: false, message: 'This flow cannot run yet.', blocking: [{ message: 'A step has nowhere to send its work.', node: 'n2' }] },
			})

			expect(messageIds(wrapper)).toContain('check')
			expect(wrapper.text()).toContain('A step has nowhere to send its work.')

			await wrapper.find('[data-testid="flow-message-dismiss-check"]').trigger('click')
			expect(store.checkResult).toBeNull()
		})
	})

	describe('ordering, so the cap never hides the worst of it', () => {
		it('puts errors above warnings', async () => {
			const { wrapper } = await mountDetail({
				nodeCatalog: [{ id: 'openregister.filter', displayName: 'Filter', role: 'step' }],
				flow: {
					name: 'x',
					nodes: [{ id: 'n1', type: 'openregister.filter', config: {} }],
					edges: [],
				},
				dirty: true,
			})

			const ids = messageIds(wrapper)
			expect(ids.indexOf('missing-ends')).toBeLessThan(ids.indexOf('unsaved'))
		})
	})
})
