/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
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
					// Vue 3 requires a key on v-for; without it the stub renders
					// nothing and every assertion sees an empty wrapper.
					template: '<div><div v-for="n in nodes" :key="n.id"><slot name="node" :node="n" /></div></div>',
				},
				NcEmptyContent: true,
				Sitemap: true,
			},
			mocks: { t: (app, s) => s },
		},
	})

	// Seed the store the COMPONENT holds, not one from a pinia of our own.
	// tests/setup.js installs a global pinia, so `useFlowStore()` called out
	// here resolves to a different instance — seeding that one leaves the
	// component rendering an empty flow, and every assertion sees "".
	const store = wrapper.vm.store
	Object.assign(store, state)
	await wrapper.vm.$nextTick()

	return { wrapper, store }
}

describe('CnFlowDetail', () => {
	describe('node type identity', () => {
		/**
		 * THE DEFECT THIS COMPONENT EXISTS TO REMOVE.
		 *
		 * hermiq's builder drew its palette from the engine catalogue —
		 * namespaced ids — and then matched BARE ids in its labels, its config
		 * panes and its executor. Every node placed from the palette therefore
		 * fell through, was skipped at run time, and the run reported success.
		 */
		it('labels a node from the catalogue using its namespaced id', async () => {
			const { wrapper } = await mountDetail({
				nodeCatalog: [{ id: 'openregister.set-fields', displayName: 'Edit fields' }],
				flow: {
					nodes: [{ id: 'n1', type: 'openregister.set-fields', config: {} }],
					edges: [],
				},
			})

			expect(wrapper.text()).toContain('Edit fields')
		})

		it('marks a node the engine does not know, instead of rendering it as fine', async () => {
			const { wrapper } = await mountDetail({
				nodeCatalog: [{ id: 'openregister.set-fields', displayName: 'Edit fields' }],
				flow: {
					// A BARE id — what the old builder produced.
					nodes: [{ id: 'n1', type: 'set-fields', config: {} }],
					edges: [],
				},
			})

			expect(wrapper.text()).toContain('Unknown step')
		})

		/**
		 * An unreadable catalogue is not the same as "every node is unknown".
		 * Flagging all of them then would be noise that hides the real case.
		 */
		it('flags nothing when the catalogue could not be read', async () => {
			const { wrapper } = await mountDetail({
				nodeCatalog: [],
				flow: {
					nodes: [{ id: 'n1', type: 'anything', config: {} }],
					edges: [],
				},
			})

			expect(wrapper.text()).not.toContain('Unknown step')
		})

		it('turns a namespaced id into a usable class name', async () => {
			const { wrapper } = await mountDetail()

			// A dot mid-class is a compound selector, not a name, so the accent
			// silently matched nothing for every catalogue type.
			expect(wrapper.vm.typeSlug('hermiq.agent-step')).toBe('hermiq-agent-step')
		})
	})

	describe('node summary', () => {
		it('summarises whatever config is set, for any node type', async () => {
			const { wrapper } = await mountDetail()

			expect(wrapper.vm.nodeLabel({ config: { field: 'title' } })).toBe('field: title')
			expect(wrapper.vm.nodeLabel({ config: { a: '1', b: '2' } })).toBe('a: 1 +1')
		})

		it('says so when a node has no configuration yet', async () => {
			const { wrapper } = await mountDetail()

			expect(wrapper.vm.nodeLabel({ config: {} })).toBe('not configured')
		})

		it('ignores empty values so a blanked field does not read as set', async () => {
			const { wrapper } = await mountDetail()

			expect(wrapper.vm.nodeLabel({ config: { field: '', other: 'x' } })).toBe('other: x')
		})
	})

	describe('edge routing', () => {
		it('draws a straight line between nodes that are in line', async () => {
			const { wrapper } = await mountDetail()
			const d = wrapper.vm.edgePath({ x: 100, y: 0 }, { x: 100, y: 300 })

			// No curve commands: a near-aligned pair used to get two corner arcs
			// with a zero-length leg between them — a wobble in place of a line.
			expect(d).not.toContain('Q')
		})

		it('bends only when the nodes are genuinely out of line', async () => {
			const { wrapper } = await mountDetail()
			const d = wrapper.vm.edgePath({ x: 0, y: 0 }, { x: 600, y: 300 })

			expect(d).toContain('Q')
		})
	})

	describe('following the route', () => {
		/**
		 * THE DEFECT: the canvas kept the previous flow, and so did the store.
		 *
		 * Vue reuses this instance when only the route PARAM changes, so
		 * `mounted` does not fire again. Without a watcher the store still held
		 * the flow the user had open — including its id — while the route said
		 * a different one. `save()` picks PUT over POST from `flow.id`, so
		 * Save on what looked like a blank "new flow" issued a PUT against the
		 * previous flow and overwrote it.
		 */
		it('reloads when the route names a different flow', async () => {
			const { wrapper, store } = await mountDetail()
			const load = jest.spyOn(store, 'load').mockResolvedValue(undefined)

			await wrapper.setProps({ id: 'flow-b' })
			await wrapper.vm.$nextTick()

			expect(load).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'flow-b' }),
			)
		})

		it('reloads when leaving a saved flow for a blank one', async () => {
			const { wrapper, store } = await mountDetail()
			const load = jest.spyOn(store, 'load').mockResolvedValue(undefined)

			await wrapper.setProps({ id: 'new' })
			await wrapper.vm.$nextTick()

			expect(load).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'new' }),
			)
		})

		it('does not reload when the id is set to what it already was', async () => {
			const { wrapper, store } = await mountDetail()
			await wrapper.setProps({ id: 'flow-a' })
			await wrapper.vm.$nextTick()

			const load = jest.spyOn(store, 'load').mockResolvedValue(undefined)
			await wrapper.setProps({ id: 'flow-a' })
			await wrapper.vm.$nextTick()

			expect(load).not.toHaveBeenCalled()
		})
	})
})
