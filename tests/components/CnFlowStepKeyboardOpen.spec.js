/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * OPENING A STEP WITHOUT A MOUSE.
 *
 * A step's editor opened only on double-click, and its menu (Edit, Copy,
 * Delete) only on a click. Seen live: Enter on a focused step did nothing.
 * Enter or Space now opens the editor, Shift+F10 or the menu key opens the
 * menu at the step (WCAG 2.1.1).
 */
import { mount } from '@vue/test-utils'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'
import CnFlowNode from '../../src/components/CnGraphCanvas/CnFlowNode.vue'
import CnGraphCanvas from '../../src/components/CnGraphCanvas/CnGraphCanvas.vue'
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

/**
 * Mount one node.
 *
 * @return {object} The wrapper.
 */
function mountNode() {
	return mount(CnFlowNode, {
		props: { id: 'a', data: { label: 'Mail' } },
		global: { stubs: { Handle: { template: '<div class="handle-stub" />' } } },
	})
}

describe('CnFlowNode — opening from the keyboard', () => {
	it.each(['Enter', ' '])('%j asks to open the step', async (key) => {
		const wrapper = mountNode()
		await wrapper.find('.cn-flow-node').trigger('keydown', { key })
		expect(wrapper.emitted('activate')).toEqual([['a']])
	})

	it.each([
		[{ key: 'F10', shiftKey: true }],
		[{ key: 'ContextMenu' }],
	])('%j asks for the step menu, placed at the step', async (init) => {
		const wrapper = mountNode()
		await wrapper.find('.cn-flow-node').trigger('keydown', init)
		const [[payload]] = wrapper.emitted('menu')
		expect(payload.id).toBe('a')
		expect(typeof payload.clientX).toBe('number')
		expect(typeof payload.clientY).toBe('number')
	})

	it('a key from a port inside the step is left to the port', async () => {
		const wrapper = mount(CnFlowNode, {
			props: { id: 'a', data: { label: 'Mail' } },
			global: { stubs: { Handle: { template: '<button class="handle-stub" />' } } },
			attachTo: document.body,
		})
		await wrapper.find('.handle-stub').trigger('keydown', { key: 'Enter' })
		expect(wrapper.emitted('activate')).toBeUndefined()
		wrapper.unmount()
	})

	it('F10 without Shift does nothing', async () => {
		const wrapper = mountNode()
		await wrapper.find('.cn-flow-node').trigger('keydown', { key: 'F10' })
		expect(wrapper.emitted('menu')).toBeUndefined()
	})
})

describe('CnGraphCanvas — forwards the node requests', () => {
	it('re-emits activate and menu as node-activate and node-menu', () => {
		const wrapper = mount(CnGraphCanvas, { props: { nodes: [], edges: [] } })
		wrapper.vm.onNodeActivate('a')
		wrapper.vm.onNodeMenu({ id: 'a', clientX: 1, clientY: 2 })
		expect(wrapper.emitted('node-activate')).toEqual([['a']])
		expect(wrapper.emitted('node-menu')).toEqual([[{ id: 'a', clientX: 1, clientY: 2 }]])
	})

	it('a read-only canvas forwards neither', () => {
		const wrapper = mount(CnGraphCanvas, { props: { nodes: [], edges: [], readOnly: true } })
		wrapper.vm.onNodeActivate('a')
		wrapper.vm.onNodeMenu({ id: 'a', clientX: 1, clientY: 2 })
		expect(wrapper.emitted('node-activate')).toBeUndefined()
		expect(wrapper.emitted('node-menu')).toBeUndefined()
	})
})

describe('CnFlowDetail — acts on them', () => {
	/**
	 * Mount the editor on a two-step flow.
	 *
	 * @return {object} The wrapper and store.
	 */
	function mountDetail() {
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
		return { wrapper, store }
	}

	it('Enter on a step opens its editor', async () => {
		const { wrapper, store } = mountDetail()
		wrapper.findComponent(CnGraphCanvas).vm.$emit('node-activate', 'b')
		await wrapper.vm.$nextTick()
		expect(store.editingNodeId).toBe('b')
		expect(store.selectedNodeId).toBe('b')
	})

	it('Shift+F10 on a step opens its menu, on that step', async () => {
		const { wrapper, store } = mountDetail()
		wrapper.findComponent(CnGraphCanvas).vm.$emit('node-menu', { id: 'b', clientX: 10, clientY: 20 })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.nodeMenuOpen).toBe(true)
		expect(wrapper.vm.nodeMenuTarget).toBe('b')
		expect(store.selectedNodeId).toBe('b')
	})
})
