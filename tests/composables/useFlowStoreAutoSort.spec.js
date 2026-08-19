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
