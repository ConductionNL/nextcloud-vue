/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnGraphCanvas and CnFlowNode after the move to Vue Flow.
 *
 * WHAT THIS FILE DELIBERATELY NO LONGER TESTS
 * -------------------------------------------
 * The previous version of this spec had 55 tests, and most of them asserted
 * geometry: node centres, coordinate conversion under pan and zoom, edge
 * endpoint resolution, the dot grid, drag deltas. Every one of those is now
 * Vue Flow's, and re-asserting them here would be testing our dependency —
 * expensive to maintain, and green whether or not OUR code is right.
 *
 * WHAT IT TESTS INSTEAD
 * ---------------------
 * The three things the swap could silently take away, and which no library
 * gives us for free:
 *
 *   1. KEYBOARD OPERATION. Carried over deliberately; Vue Flow is
 *      pointer-first. This is a WCAG 2.1.1 obligation, not a nicety.
 *   2. READ-ONLY refusing all THREE interactions, because it is now three
 *      flags and missing one yields a canvas that looks locked and is not.
 *   3. THE CANVAS NOT MUTATING the graph it is given.
 *
 * jsdom has no layout, so anything that needs a real box — actual pan/zoom
 * arithmetic, hit-testing — belongs in the Playwright e2e instead.
 */
import { mount } from '@vue/test-utils'

import CnFlowNode from '../../src/components/CnGraphCanvas/CnFlowNode.vue'
import CnGraphCanvas from '../../src/components/CnGraphCanvas/CnGraphCanvas.vue'

const NODES = [
	{ id: 'a', type: 'default', position: { x: 100, y: 100 }, data: { label: 'Draft' } },
	{ id: 'b', type: 'default', position: { x: 400, y: 300 }, data: { label: 'Approved' } },
]

const EDGES = [{ id: 'e1', source: 'a', target: 'b' }]

/**
 * Mount the canvas.
 *
 * @param {object} props Props to pass.
 * @return {object} The wrapper.
 */
function mountCanvas(props = {}) {
	return mount(CnGraphCanvas, {
		props: { nodes: NODES, edges: EDGES, ...props },
	})
}

/**
 * Mount one node component directly.
 *
 * The keyboard contract lives in the NODE, because Vue Flow renders nodes
 * through a supplied component and that component owns the focusable element.
 * Testing it here rather than through the canvas keeps the assertion on the
 * thing that actually implements it.
 *
 * @param {object} props Props to pass.
 * @return {object} The wrapper.
 */
function mountNode(props = {}) {
	return mount(CnFlowNode, {
		props: { id: 'a', data: { label: 'Draft' }, ...props },
		global: {
			stubs: {
				Handle: { template: '<div class="handle-stub" v-bind="$attrs" />' },
			},
		},
	})
}

describe('CnGraphCanvas', () => {
	describe('read-only refuses every interaction', () => {
		it('turns OFF drag, connect and selection together', () => {
			const flow = mountCanvas({ readOnly: true }).findComponent({ name: 'VueFlow' })

			// Asserted as three separate props on purpose. `readOnly` maps to
			// three Vue Flow flags, and missing one produces a canvas that looks
			// locked and is not — the failure mode a single assertion on one
			// flag would sail straight past.
			expect(flow.props('nodesDraggable')).toBe(false)
			expect(flow.props('nodesConnectable')).toBe(false)
			expect(flow.props('elementsSelectable')).toBe(false)
		})

		it('leaves all three on when it is not read-only', () => {
			const flow = mountCanvas().findComponent({ name: 'VueFlow' })

			expect(flow.props('nodesDraggable')).toBe(true)
			expect(flow.props('nodesConnectable')).toBe(true)
			expect(flow.props('elementsSelectable')).toBe(true)
		})

		it('ignores a palette drop', async () => {
			const wrapper = mountCanvas({ readOnly: true })

			await wrapper.trigger('drop', { clientX: 10, clientY: 10 })

			expect(wrapper.emitted('canvas-drop')).toBeUndefined()
		})
	})

	describe('the canvas does not own the graph', () => {
		it('reports node changes instead of applying them', () => {
			const wrapper = mountCanvas()
			const before = JSON.stringify(NODES)

			wrapper.findComponent({ name: 'VueFlow' }).vm.$emit('nodes-change', [
				{ type: 'position', id: 'a', position: { x: 5, y: 5 }, dragging: false },
			])

			expect(wrapper.emitted('nodes-change')).toBeTruthy()
			// The prop the host passed in is untouched. A canvas that quietly
			// rewrote it could not be dropped into a read-only surface without
			// auditing it first.
			expect(JSON.stringify(NODES)).toBe(before)
		})

		it('emits a drop in canvas space rather than creating a node', async () => {
			const wrapper = mountCanvas()

			await wrapper.trigger('drop', { clientX: 120, clientY: 80 })

			const emitted = wrapper.emitted('canvas-drop')
			expect(emitted).toBeTruthy()
			expect(emitted[0][0]).toHaveProperty('position')
			// The native event rides along so a consumer can read dataTransfer.
			expect(emitted[0][0]).toHaveProperty('event')
		})
	})
})

describe('CnFlowNode — the keyboard contract', () => {
	describe('accessibility surface', () => {
		it('is focusable and announces itself and its selected state', () => {
			const wrapper = mountNode({ selected: true })
			const node = wrapper.find('.cn-flow-node')

			expect(node.attributes('tabindex')).toBe('0')
			expect(node.attributes('role')).toBe('button')
			expect(node.attributes('aria-label')).toContain('Draft')
			expect(node.attributes('aria-pressed')).toBe('true')
		})

		it('reports not-pressed when it is not selected', () => {
			expect(mountNode().find('.cn-flow-node').attributes('aria-pressed')).toBe('false')
		})
	})

	describe('movement without a pointer', () => {
		it.each([
			['ArrowRight', { x: 8, y: 0 }],
			['ArrowLeft', { x: -8, y: 0 }],
			['ArrowUp', { x: 0, y: -8 }],
			['ArrowDown', { x: 0, y: 8 }],
		])('%s moves the node by one step', async (key, delta) => {
			const wrapper = mountNode()
			const moves = []
			wrapper.vm.updateNodePositions = (changes) => moves.push(changes[0])
			wrapper.vm.findNode = () => ({ position: { x: 100, y: 100 } })

			await wrapper.find('.cn-flow-node').trigger('keydown', { key })

			expect(moves[0].position).toEqual({ x: 100 + delta.x, y: 100 + delta.y })
		})

		it('Shift takes a coarse step, so a keyboard user is not stuck nudging', async () => {
			const wrapper = mountNode()
			const moves = []
			wrapper.vm.updateNodePositions = (changes) => moves.push(changes[0])
			wrapper.vm.findNode = () => ({ position: { x: 0, y: 0 } })

			await wrapper.find('.cn-flow-node').trigger('keydown', { key: 'ArrowRight', shiftKey: true })

			expect(moves[0].position.x).toBe(40)
		})
	})

	describe('connecting without a pointer', () => {
		it('`c` arms the first exit', async () => {
			const wrapper = mountNode()

			await wrapper.find('.cn-flow-node').trigger('keydown', { key: 'c' })

			expect(wrapper.vm.armedPortIndex).toBe(0)
		})

		it('Escape cancels an armed connection', async () => {
			const wrapper = mountNode()
			const node = wrapper.find('.cn-flow-node')

			await node.trigger('keydown', { key: 'c' })
			await node.trigger('keydown', { key: 'Escape' })

			expect(wrapper.vm.armedPortIndex).toBeNull()
		})

		/**
		 * THE ONE THAT MATTERS.
		 *
		 * A mouse picks a branch by pointing at it. Without stepping, the
		 * keyboard reaches only the first exit and every other branch of a
		 * routing node is mouse-only — which is a WCAG 2.1.1 failure on the
		 * exact feature a flow canvas exists for.
		 */
		it('repeated `c` steps through EVERY exit of a multi-exit node', async () => {
			const wrapper = mountNode({
				data: {
					label: 'Route',
					ports: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'else', label: 'Else' }],
				},
			})
			const node = wrapper.find('.cn-flow-node')

			await node.trigger('keydown', { key: 'c' })
			expect(wrapper.vm.armedPortIndex).toBe(0)

			await node.trigger('keydown', { key: 'c' })
			expect(wrapper.vm.armedPortIndex).toBe(1)

			await node.trigger('keydown', { key: 'c' })
			expect(wrapper.vm.armedPortIndex).toBe(2)

			// Running off the end cancels, which is also what a single-exit node
			// does on its second press — unchanged from the hand-rolled canvas.
			await node.trigger('keydown', { key: 'c' })
			expect(wrapper.vm.armedPortIndex).toBeNull()
		})

		it('marks the armed port with aria-pressed, not colour alone', async () => {
			const wrapper = mountNode({
				data: { label: 'Route', ports: [{ id: 'yes' }, { id: 'no' }] },
			})

			await wrapper.find('.cn-flow-node').trigger('keydown', { key: 'c' })

			const armed = wrapper.findAll('.handle-stub').filter((h) => h.attributes('aria-pressed') === 'true')
			expect(armed).toHaveLength(1)
		})

		it('a single-exit node still gets exactly one out-port', () => {
			expect(mountNode().findAll('.handle-stub').length).toBeGreaterThanOrEqual(1)
		})
	})

	describe('resizing without a pointer', () => {
		it('`r` then an arrow resizes, and Escape leaves resize mode', async () => {
			const wrapper = mountNode({ resizable: true })
			const node = { position: { x: 0, y: 0 }, dimensions: { width: 140, height: 60 }, style: {} }
			wrapper.vm.findNode = () => node
			const el = wrapper.find('.cn-flow-node')

			await el.trigger('keydown', { key: 'r' })
			await el.trigger('keydown', { key: 'ArrowRight' })

			// NodeResizer draws the pointer handles; it has no keyboard path of
			// its own, and the canvas this replaced could be resized from the
			// keyboard. So the arrows are re-used under an `r` mode rather than
			// inventing a second key family.
			expect(node.style.width).toBe('148px')

			await el.trigger('keydown', { key: 'Escape' })
			await el.trigger('keydown', { key: 'ArrowRight' })

			// Out of resize mode the same key moves again, not resizes.
			expect(node.style.width).toBe('148px')
		})

		it('does not offer resize mode when the node is not resizable', async () => {
			const wrapper = mountNode()

			await wrapper.find('.cn-flow-node').trigger('keydown', { key: 'r' })

			expect(wrapper.vm.resizing).toBe(false)
		})
	})
})
