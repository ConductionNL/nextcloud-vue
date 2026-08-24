/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CONNECTING TWO STEPS WITHOUT A MOUSE.
 *
 * `c` on the source then `c` on the target is the keyboard equivalent of
 * dragging a handle (WCAG 2.1 AA 2.1.1). openregister's e2e drives exactly
 * this path — and that assertion has never actually executed: it sits behind
 * a feature-detect that was false on every installed 2.3.x, so it went green
 * by not running. This reproduces it at the unit level.
 */
import { mount } from '@vue/test-utils'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'
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

describe('flow editor — keyboard connect', () => {
	it('writes a keyboard-made connection in the dialect the ENGINE reads', async () => {
		const store = useFlowStore()
		store.flow = {
			name: 'kb',
			nodes: [
				{ id: 'a', type: 'openregister.trigger-manual', config: {}, start: true },
				{ id: 'b', type: 'openregister.end', config: {} },
			],
			edges: [],
		}

		const wrapper = mount(CnFlowDetail, {
			global: {
				stubs: {
					NcButton: { template: '<button><slot /></button>' },
					NcSelect: true,
					NcAppSidebar: { template: '<aside><slot /></aside>' },
					NcAppSidebarTab: { template: '<div><slot /></div>' },
					NcTextField: true,
					NcActions: { template: '<div><slot /></div>' },
					NcActionButton: { template: '<button><slot /></button>' },
					NcLoadingIcon: true,
					NcEmptyContent: { template: '<div><slot /></div>' },
				},
				mocks: { t: (app, s) => s },
			},
		})
		await wrapper.vm.$nextTick()

		// ⚠️ THE FULL-CANVAS PATH MOVED TO THE E2E, AND HERE IS WHY.
		//
		// Vue Flow renders nodes only once it has MEASURED them, and jsdom has
		// no layout — mounting the canvas here yields zero node elements, so
		// `findAll('.cn-flow-node')` would be an assertion over nothing. That
		// is exactly the shape of failure this file's own docblock warns about:
		// openregister's e2e assertion "went green by not running".
		//
		// Rather than let it go green over an empty list again, the keyboard
		// mechanics are asserted directly on CnFlowNode
		// (tests/components/CnGraphCanvas.spec.js), the browser path is
		// asserted keyboard-only in the Playwright e2e (task 4.4), and what
		// remains here is the half that still has teeth in jsdom: the DIALECT
		// the resulting edge is written in.
		store.connect({ source: 'a', target: 'b' })
		await wrapper.vm.$nextTick()

		expect(store.edges).toHaveLength(1)
		// `from`/`to` is the dialect the ENGINE reads. This assertion used to
		// say `{source, target}` — it was written before that spelling was
		// found to be unreadable by the engine, so it pinned the bug rather
		// than the contract. See tests/composables/useFlowStoreEdgeDialect.spec.js.
		expect(store.edges[0]).toMatchObject({ from: 'a', to: 'b' })
		// What the canvas draws is unchanged either way.
		expect(store.canvasEdges[0]).toMatchObject({ source: 'a', target: 'b' })
	})
})
