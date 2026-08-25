/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * AUTO-LAYOUT MUST NOT PARK A NODE UNDER THE TOOLBAR.
 *
 * The toolbar floats over the canvas (position: absolute, top 12px, ~52px
 * tall). A node laid out beneath it is not merely ugly — it is UNREACHABLE:
 * the toolbar swallows the pointer, so the node cannot be clicked,
 * double-clicked to edit, or dragged out from under itself.
 *
 * Observed live on a three-node flow: the middle node sat wholly behind the
 * toolbar and Playwright reported
 * `cn-flow-detail__toolbar subtree intercepts pointer events`.
 */
import { useFlowStore } from '../../src/composables/useFlowStore.js'

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

/** The toolbar's own footprint: 12px offset plus roughly 52px of controls. */
const TOOLBAR_BOTTOM = 64

describe('useFlowStore.autoSort', () => {
	it('places every node clear of the floating toolbar', () => {
		const store = useFlowStore()
		store.flow = {
			name: 'layout',
			nodes: [
				{ id: 'a', type: 'openregister.trigger-manual', config: {}, start: true },
				{ id: 'b', type: 'openconnector.synchronization-run', config: {} },
				{ id: 'c', type: 'openregister.end', config: {} },
			],
			edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
		}

		store.autoSort()

		expect(store.nodes).toHaveLength(3)
		for (const node of store.nodes) {
			expect(node.y).toBeGreaterThan(TOOLBAR_BOTTOM)
		}
	})

	it('still lays the chain out left to right, one column per hop', () => {
		const store = useFlowStore()
		store.flow = {
			name: 'layout',
			nodes: [
				{ id: 'a', type: 'openregister.trigger-manual', config: {}, start: true },
				{ id: 'b', type: 'openregister.end', config: {} },
			],
			edges: [{ from: 'a', to: 'b' }],
		}

		store.autoSort()

		const [a, b] = store.nodes
		expect(b.x).toBeGreaterThan(a.x)
		// Same row — the clearance shifts the whole layout down, not apart.
		expect(a.y).toBe(b.y)
	})
})

describe('useFlowStore — laying out a flow that carries no positions', () => {
	/**
	 * THE FLOW THAT OPENED AS A PILE.
	 *
	 * Generated and imported flows carry no coordinates. A 76-node flow
	 * measured on a live instance had 73 nodes with no position, and every one
	 * of them landed on the same point — which looks exactly like an empty
	 * canvas, because the other 75 are underneath the first.
	 *
	 * autoSort() already knew how to place them. Nothing called it.
	 */
	it('lays out a loaded flow when NO node has a position', () => {
		const store = useFlowStore()

		store.flow = {
			nodes: [
				{ id: 'a', type: 'openregister.trigger-manual' },
				{ id: 'b', type: 'openregister.set-fields' },
				{ id: 'c', type: 'openregister.end' },
			],
			edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
		}

		expect(store.nodes.some(store.hasPosition)).toBe(false)
		store.autoSort()

		const points = store.nodes.map((n) => `${n.x},${n.y}`)
		expect(new Set(points).size).toBe(3)
		expect(store.nodes.every(store.hasPosition)).toBe(true)
	})

	/**
	 * The other half, and the more important one: a flow somebody ARRANGED is
	 * never rearranged behind their back.
	 */
	it('treats a flow with even one placed node as arranged', () => {
		const store = useFlowStore()

		store.flow = {
			nodes: [
				{ id: 'a', type: 'openregister.trigger-manual', position: { x: 900, y: 40 } },
				{ id: 'b', type: 'openregister.end' },
			],
			edges: [],
		}

		expect(store.nodes.some(store.hasPosition)).toBe(true)
	})

	it('reads both spellings, so a persisted flow is not mistaken for an unplaced one', () => {
		const store = useFlowStore()

		expect(store.hasPosition({ id: 'a', position: { x: 10, y: 20 } })).toBe(true)
		expect(store.hasPosition({ id: 'a', x: 10, y: 20 })).toBe(true)
		expect(store.hasPosition({ id: 'a' })).toBe(false)
		// (0, 0) is somewhere, not nowhere — otherwise a flow whose author
		// parked a node at the origin would be relaid out on every load.
		expect(store.hasPosition({ id: 'a', position: { x: 0, y: 0 } })).toBe(true)
	})
})
