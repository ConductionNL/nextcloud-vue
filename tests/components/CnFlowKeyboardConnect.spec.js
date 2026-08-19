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
	it('connects the focused source to the focused target on c, c', async () => {
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

		// The canvas renders one focusable wrapper per node; the keydown
		// handler lives on that wrapper, not on the card inside it.
		const canvasNodes = wrapper.findAll('.cn-graph-canvas__node')
		expect(canvasNodes).toHaveLength(2)

		await canvasNodes[0].trigger('keydown', { key: 'c' })
		await canvasNodes[1].trigger('keydown', { key: 'c' })
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
