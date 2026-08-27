/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * THE EDITOR DECIDES WHICH PORTS A STEP HAS; THE NODE ONLY DRAWS THEM.
 *
 * CnFlowNode is a generic canvas component — it knows nothing about triggers,
 * end steps, or which lines exist. CnFlowDetail is where the flow's own
 * vocabulary lives, so it derives the four flags from the CATALOGUE's role and
 * from the edges the document actually holds, and hands them down.
 *
 * ⚠️ FROM THE ROLE, NEVER FROM GRAPH POSITION. Deciding "this is a trigger
 * because nothing points at it" is what once painted every unconnected step
 * green — and it would have removed the entry port from a step the author had
 * simply not wired up yet, making it impossible to wire up at all.
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

const CATALOG = [
	{ id: 'openregister.trigger-manual', displayName: 'Manual', role: 'trigger' },
	{ id: 'openregister.set-fields', displayName: 'Edit fields', role: 'step' },
	{ id: 'openregister.end', displayName: 'End', role: 'end' },
]

/**
 * Mount the editor over a seeded store and return the canvas node records.
 *
 * @param {object} flow The flow document.
 * @return {Promise<Map<string, object>>} The node data bags, by node id.
 */
async function portsOf(flow) {
	setActivePinia(createPinia())

	const wrapper = mount(CnFlowDetail, {
		global: {
			stubs: { CnGraphCanvas: true, NcEmptyContent: true, Sitemap: true },
			mocks: { t: (app, s) => s },
		},
	})

	Object.assign(wrapper.vm.store, { nodeCatalog: CATALOG, flow })
	await wrapper.vm.$nextTick()

	return new Map(wrapper.vm.canvasNodes.map((node) => [node.id, node.data]))
}

const CHAIN = {
	name: 'chain',
	nodes: [
		{ id: 'a', type: 'openregister.trigger-manual', config: {} },
		{ id: 'b', type: 'openregister.set-fields', config: {} },
		{ id: 'c', type: 'openregister.end', config: {} },
		{ id: 'lonely', type: 'openregister.set-fields', config: {} },
	],
	edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
}

describe('CnFlowDetail — which ports each step gets', () => {
	it('gives a trigger an exit and no entry', async () => {
		const trigger = (await portsOf(CHAIN)).get('a')

		expect(trigger.hasTarget).toBe(false)
		expect(trigger.hasSource).toBe(true)
	})

	it('gives an end step an entry and no exit', async () => {
		const end = (await portsOf(CHAIN)).get('c')

		expect(end.hasTarget).toBe(true)
		expect(end.hasSource).toBe(false)
	})

	it('gives an ordinary step both', async () => {
		const step = (await portsOf(CHAIN)).get('b')

		expect(step.hasTarget).toBe(true)
		expect(step.hasSource).toBe(true)
	})

	it('reports which steps a line actually touches', async () => {
		const ports = await portsOf(CHAIN)

		expect(ports.get('b').hasIncoming).toBe(true)
		expect(ports.get('b').hasOutgoing).toBe(true)
		expect(ports.get('a').hasIncoming).toBe(false)
		expect(ports.get('c').hasOutgoing).toBe(false)
	})

	it('marks a step nothing is wired to on BOTH ends', async () => {
		const lonely = (await portsOf(CHAIN)).get('lonely')

		expect(lonely.hasIncoming).toBe(false)
		expect(lonely.hasOutgoing).toBe(false)
	})

	/**
	 * `canvasEdges` expands a list endpoint into one line per pair. Reading
	 * `flow.edges` directly instead would see a single record whose `to` is an
	 * ARRAY, match neither `b` nor `c`, and report both branches of a split as
	 * having nothing arriving at them.
	 */
	it('sees both branches of a split as connected', async () => {
		const ports = await portsOf({
			name: 'split',
			nodes: [
				{ id: 'a', type: 'openregister.trigger-manual', config: {} },
				{ id: 'b', type: 'openregister.end', config: {} },
				{ id: 'c', type: 'openregister.end', config: {} },
			],
			edges: [{ from: 'a', to: ['b', 'c'] }],
		})

		expect(ports.get('b').hasIncoming).toBe(true)
		expect(ports.get('c').hasIncoming).toBe(true)
	})

	/**
	 * A step whose type the catalogue cannot explain still has to be
	 * connectable — otherwise a flow carrying one node from an app that is
	 * momentarily unavailable becomes uneditable.
	 */
	it('gives an unknown step both ports rather than none', async () => {
		const ports = await portsOf({
			name: 'unknown',
			nodes: [{ id: 'x', type: 'someapp.mystery', config: {} }],
			edges: [],
		})

		expect(ports.get('x').hasTarget).toBe(true)
		expect(ports.get('x').hasSource).toBe(true)
	})
})
