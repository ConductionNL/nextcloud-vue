/**
 * Tests for the render-time auto layout in useFlowStore.
 *
 * 🔴 THE PROPERTY THAT MATTERS: opening a flow whose nodes carry no usable
 * positions must produce a readable graph WITHOUT editing anything — on a
 * PUBLISHED flow above all, because a flow imported from a schema's
 * `x-openregister-flows` is published the moment it exists. The old fallback
 * went through `autoSort()`, whose `pushUndo()` gate refuses locked graphs,
 * so exactly those flows opened as a pile of 18 nodes on one point. And a
 * flow somebody arranged must open exactly as they left it.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

// 🔑 HELD, NOT REQUIRED BACK. `@nextcloud/axios` is a PEER dependency, so
// `require()`ing it here trips eslint's `n/no-missing-require` — the module is
// legitimately absent from this package's own tree. A `mock`-prefixed variable
// is the one thing a jest.mock factory may close over, so the spec keeps a
// handle on the double without ever importing the real module.
const mockAxios = {
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
}

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: mockAxios,
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path) => path,
}))

const { setActivePinia, createPinia } = require('pinia')
const { useFlowStore } = require('../useFlowStore.js')
const caseFlow = require('./__fixtures__/case-behandeling-flow.json')

/**
 * A store whose list holds one flow, ready to be opened.
 *
 * @param {object} flow Fields of the stored flow.
 * @return {object} The store.
 */
function storeHolding(flow) {
	const store = useFlowStore()
	store.flows = [{
		id: 'flow-1',
		app: 'openregister',
		name: 'Flow under test',
		version: 1,
		lifecycleStatus: 'draft',
		edges: [],
		...flow,
	}]
	return store
}

describe('useFlowStore — auto layout on open', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		jest.clearAllMocks()
		// open() tail-calls loadRuns(); the run history is not under test.
		mockAxios.get.mockResolvedValue({ data: { results: [] } })
	})

	it('lays out the imported dossiq case flow, published and position-less', () => {
		const store = storeHolding({
			lifecycleStatus: 'published',
			nodes: JSON.parse(JSON.stringify(caseFlow.nodes)),
			edges: JSON.parse(JSON.stringify(caseFlow.edges)),
		})

		store.open('flow-1')

		expect(store.nodes).toHaveLength(18)
		const seen = new Set()
		for (const node of store.nodes) {
			expect(Number.isFinite(node.x)).toBe(true)
			expect(Number.isFinite(node.y)).toBe(true)
			seen.add(`${node.x},${node.y}`)
		}
		// Eighteen nodes, eighteen distinct points: the pile is gone.
		expect(seen.size).toBe(18)
	})

	it('renders the fallback as a fallback: no edit, no refusal, no undo entry', () => {
		const store = storeHolding({
			lifecycleStatus: 'published',
			nodes: JSON.parse(JSON.stringify(caseFlow.nodes)),
			edges: JSON.parse(JSON.stringify(caseFlow.edges)),
		})

		store.open('flow-1')

		expect(store.dirty).toBe(false)
		expect(store.lifecycleRefusal).toBeNull()
		expect(store.undoStack).toHaveLength(0)
	})

	it('never rewrites the stored list row it deep-copied from', () => {
		const store = storeHolding({
			nodes: JSON.parse(JSON.stringify(caseFlow.nodes)),
			edges: JSON.parse(JSON.stringify(caseFlow.edges)),
		})

		store.open('flow-1')

		expect(store.flows[0].nodes.some((node) => 'x' in node)).toBe(false)
	})

	it('opens the same flow onto the same coordinates every time', () => {
		const layoutOf = () => {
			setActivePinia(createPinia())
			const store = storeHolding({
				nodes: JSON.parse(JSON.stringify(caseFlow.nodes)),
				edges: JSON.parse(JSON.stringify(caseFlow.edges)),
			})
			store.open('flow-1')
			return store.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y }))
		}

		expect(layoutOf()).toEqual(layoutOf())
	})

	it('treats a graph of explicit identical points as the pile it is', () => {
		const store = storeHolding({
			nodes: [
				{ id: 'a', type: 't', position: { x: 0, y: 0 } },
				{ id: 'b', type: 't', position: { x: 0, y: 0 } },
				{ id: 'c', type: 't', position: { x: 0, y: 0 } },
			],
			edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
		})

		store.open('flow-1')

		const points = new Set(store.nodes.map((node) => `${node.x},${node.y}`))
		expect(points.size).toBe(3)
		expect(store.dirty).toBe(false)
	})

	it('leaves an arranged flow exactly as its author left it', () => {
		const arranged = [
			{ id: 'a', type: 't', position: { x: 60, y: 96 }, config: {} },
			{ id: 'b', type: 't', position: { x: 320, y: 400 }, config: {} },
		]
		const store = storeHolding({
			nodes: JSON.parse(JSON.stringify(arranged)),
			edges: [{ from: 'a', to: 'b' }],
		})

		store.open('flow-1')

		expect(store.nodes).toEqual(arranged)
	})

	it('slots only the loose nodes beneath an arranged graph', () => {
		const store = storeHolding({
			nodes: [
				{ id: 'a', type: 't', x: 200, y: 300 },
				{ id: 'b', type: 't' },
			],
			edges: [{ from: 'a', to: 'b' }],
		})

		store.open('flow-1')

		const a = store.nodes.find((node) => node.id === 'a')
		const b = store.nodes.find((node) => node.id === 'b')
		expect(a.x).toBe(200)
		expect(a.y).toBe(300)
		expect(Number.isFinite(b.x)).toBe(true)
		expect(b.y).toBeGreaterThan(300)
		expect(store.dirty).toBe(false)
	})

	it('still lets autoSort refuse a locked graph — the button is an edit', () => {
		const store = storeHolding({
			lifecycleStatus: 'published',
			nodes: [{ id: 'a', type: 't', x: 10, y: 10 }],
		})
		store.open('flow-1')

		store.autoSort()

		expect(store.lifecycleRefusal).toEqual({
			reason: 'version-immutable',
			lifecycleStatus: 'published',
		})
		const a = store.nodes.find((node) => node.id === 'a')
		expect(a.x).toBe(10)
	})

	it('autoSort on a draft still lays out, marks dirty and can be undone', () => {
		const store = storeHolding({
			nodes: [
				{ id: 'a', type: 't', x: 500, y: 500 },
				{ id: 'b', type: 't', x: 500, y: 700 },
			],
			edges: [{ from: 'a', to: 'b' }],
		})
		store.open('flow-1')

		store.autoSort()

		expect(store.dirty).toBe(true)
		expect(store.undoStack.length).toBeGreaterThan(0)
		const a = store.nodes.find((node) => node.id === 'a')
		expect(a.x).not.toBe(500)
	})
})
