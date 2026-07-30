/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnGraphCanvas — the generic node/edge canvas extracted from
 * procest's live WorkflowEditor per ADR-065. These cover the geometry the
 * component owns (centres, coordinate conversion under pan/zoom, edge
 * resolution) and the interaction contract (drag, connect, keyboard), not
 * any domain meaning — the canvas has none.
 */
import { mount } from '@vue/test-utils'

import CnGraphCanvas from '../../src/components/CnGraphCanvas/CnGraphCanvas.vue'

const NODES = [
	{ id: 'a', x: 100, y: 100, label: 'Draft' },
	{ id: 'b', x: 400, y: 300, label: 'Approved' },
]

const EDGES = [{ id: 'e1', source: 'a', target: 'b' }]

/**
 * Mount the canvas with a stubbed viewport rect, since jsdom reports zeros for
 * getBoundingClientRect and every coordinate conversion depends on it.
 *
 * @param {object} propsData Props to pass.
 * @param {{left: number, top: number}} rect The faked viewport origin.
 * @return {object} The wrapper.
 */
function mountCanvas(propsData = {}, rect = { left: 0, top: 0 }) {
	const wrapper = mount(CnGraphCanvas, {
		propsData: { nodes: NODES, edges: EDGES, ...propsData },
	})
	wrapper.vm.$refs.canvas.getBoundingClientRect = () => ({ left: rect.left, top: rect.top, width: 1000, height: 800 })
	return wrapper
}

describe('CnGraphCanvas', () => {
	describe('nodes without stored coordinates', () => {
		// A node document is not obliged to carry x/y — a hand-written, imported or
		// agent-generated graph routinely has none. Reading node.x straight off such
		// a node gave `undefined`, and `undefined + nodeWidth / 2` is NaN, so every
		// edge rendered as `d="M NaN NaN L NaN NaN"` (invisible, one console error
		// per edge per render) and every node got `left: undefinedpx`, an invalid
		// declaration the browser drops — collapsing the canvas into the static
		// flow. A coordinate-less graph did not degrade, it broke.
		const BARE = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

		it('lays them out on a grid instead of producing NaN', () => {
			const wrapper = mountCanvas({ nodes: BARE, edges: [{ id: 'e', source: 'a', target: 'b' }] })
			wrapper.vm.positionedNodes.forEach((node) => {
				expect(Number.isFinite(node.x)).toBe(true)
				expect(Number.isFinite(node.y)).toBe(true)
			})
		})

		it('spaces them apart rather than stacking them at the origin', () => {
			const wrapper = mountCanvas({ nodes: BARE, edges: [] })
			const [first, second] = wrapper.vm.positionedNodes
			expect(second.x).toBeGreaterThan(first.x)
		})

		it('resolves edge endpoints to finite centres', () => {
			const wrapper = mountCanvas({ nodes: BARE, edges: [{ id: 'e', source: 'a', target: 'b' }] })
			const [edge] = wrapper.vm.resolvedEdges
			expect(Number.isFinite(edge.from.x)).toBe(true)
			expect(Number.isFinite(edge.to.y)).toBe(true)
		})

		it('leaves a stored position untouched', () => {
			const wrapper = mountCanvas({ nodes: [{ id: 'a', x: 42, y: 7 }], edges: [] })
			expect(wrapper.vm.positionedNodes[0]).toMatchObject({ x: 42, y: 7 })
		})

		it('fills in only the missing axis', () => {
			const wrapper = mountCanvas({ nodes: [{ id: 'a', x: 42 }], edges: [] })
			const node = wrapper.vm.positionedNodes[0]
			expect(node.x).toBe(42)
			expect(Number.isFinite(node.y)).toBe(true)
		})
	})

	describe('geometry', () => {
		it('a node centre accounts for the configured node size', () => {
			const wrapper = mountCanvas({ nodeWidth: 200, nodeHeight: 80 })
			// 100 + 200/2, 100 + 80/2
			expect(wrapper.vm.nodeCentre({ x: 100, y: 100 })).toEqual({ x: 200, y: 140 })
		})

		it('node size is a prop, not the 200x80 the source editor hardcoded', () => {
			const wrapper = mountCanvas({ nodeWidth: 120, nodeHeight: 40 })
			expect(wrapper.vm.nodeCentre({ x: 0, y: 0 })).toEqual({ x: 60, y: 20 })
		})

		it('resolves each edge to its endpoint centres', () => {
			const wrapper = mountCanvas()
			expect(wrapper.vm.resolvedEdges).toHaveLength(1)
			expect(wrapper.vm.resolvedEdges[0].from).toEqual({ x: 200, y: 140 })
			expect(wrapper.vm.resolvedEdges[0].to).toEqual({ x: 500, y: 340 })
		})

		it('drops an edge whose endpoint does not resolve instead of drawing it at the origin', () => {
			const wrapper = mountCanvas({ edges: [{ id: 'dangling', source: 'a', target: 'nope' }] })
			// A dangling edge drawn to 0,0 reads as a rendering bug rather than bad data.
			expect(wrapper.vm.resolvedEdges).toEqual([])
		})

		it('converts screen coordinates to canvas space, undoing pan and zoom', () => {
			const wrapper = mountCanvas({ zoom: 2 })
			wrapper.setData({ panOffset: { x: 50, y: 20 } })
			// (300 - 0 - 50) / 2 = 125 ; (220 - 0 - 20) / 2 = 100
			expect(wrapper.vm.toCanvasPoint({ clientX: 300, clientY: 220 })).toEqual({ x: 125, y: 100 })
		})

		it('accounts for the viewport offset when converting coordinates', () => {
			const wrapper = mountCanvas({ zoom: 1 }, { left: 30, top: 10 })
			expect(wrapper.vm.toCanvasPoint({ clientX: 130, clientY: 110 })).toEqual({ x: 100, y: 100 })
		})
	})

	describe('node dragging', () => {
		it('emits node-move rather than mutating the nodes prop', async () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeMouseDown(NODES[0], { clientX: 100, clientY: 100 })
			wrapper.vm.onCanvasMouseMove({ clientX: 150, clientY: 130 })

			// Positions are the consumer's to own; the canvas only reports intent.
			expect(wrapper.emitted('node-move')).toBeTruthy()
			expect(wrapper.emitted('node-move')[0][0]).toEqual({ id: 'a', x: 150, y: 130 })
			expect(NODES[0]).toEqual({ id: 'a', x: 100, y: 100, label: 'Draft' })
		})

		it('preserves the grab offset so a node does not jump to the cursor', () => {
			const wrapper = mountCanvas()
			// Grab node 'a' (at 100,100) 20px in from its corner.
			wrapper.vm.onNodeMouseDown(NODES[0], { clientX: 120, clientY: 120 })
			wrapper.vm.onCanvasMouseMove({ clientX: 220, clientY: 220 })
			// Moved +100/+100 from the grab point, so the node lands at 200,200 — not 220,220.
			expect(wrapper.emitted('node-move')[0][0]).toEqual({ id: 'a', x: 200, y: 200 })
		})

		it('clamps a node to the positive quadrant', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeMouseDown(NODES[0], { clientX: 100, clientY: 100 })
			wrapper.vm.onCanvasMouseMove({ clientX: -500, clientY: -500 })
			expect(wrapper.emitted('node-move')[0][0]).toEqual({ id: 'a', x: 0, y: 0 })
		})

		it('does not drag when read-only', () => {
			const wrapper = mountCanvas({ readOnly: true })
			wrapper.vm.onNodeMouseDown(NODES[0], { clientX: 100, clientY: 100 })
			wrapper.vm.onCanvasMouseMove({ clientX: 200, clientY: 200 })
			expect(wrapper.emitted('node-move')).toBeFalsy()
		})

		it('releasing the pointer outside the canvas ends the drag', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeMouseDown(NODES[0], { clientX: 100, clientY: 100 })
			// mouseleave is bound to the same handler, so the node cannot stay stuck to the pointer.
			wrapper.vm.onCanvasMouseUp()
			wrapper.vm.onCanvasMouseMove({ clientX: 900, clientY: 900 })
			expect(wrapper.emitted('node-move')).toBeFalsy()
		})
	})

	describe('connecting', () => {
		it('emits connect when a connection is released over another node', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onConnectionStart(NODES[0], { clientX: 200, clientY: 140 })
			wrapper.vm.onNodeMouseUp(NODES[1])
			expect(wrapper.emitted('connect')[0][0]).toEqual({ source: 'a', target: 'b' })
		})

		it('refuses to connect a node to itself', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onConnectionStart(NODES[0], { clientX: 200, clientY: 140 })
			wrapper.vm.onNodeMouseUp(NODES[0])
			expect(wrapper.emitted('connect')).toBeFalsy()
		})

		it('does not start a connection when read-only', () => {
			const wrapper = mountCanvas({ readOnly: true })
			wrapper.vm.onConnectionStart(NODES[0], { clientX: 200, clientY: 140 })
			expect(wrapper.vm.drawingConnection).toBeNull()
		})

		it('tracks the draft edge to the pointer while drawing', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onConnectionStart(NODES[0], { clientX: 200, clientY: 140 })
			wrapper.vm.onCanvasMouseMove({ clientX: 350, clientY: 250 })
			expect(wrapper.vm.drawingConnection.currentX).toBe(350)
			expect(wrapper.vm.drawingConnection.currentY).toBe(250)
			// The draft edge starts at the source node's centre, not the click point.
			expect(wrapper.vm.drawingConnection.startX).toBe(200)
		})
	})

	describe('zoom', () => {
		it('emits update:zoom within the configured bounds', () => {
			const wrapper = mountCanvas({ zoom: 1 })
			wrapper.vm.onCanvasWheel({ deltaY: -1, preventDefault() {} })
			expect(wrapper.emitted('update:zoom')[0][0]).toBeCloseTo(1.1)
		})

		it('clamps at maxZoom', () => {
			const wrapper = mountCanvas({ zoom: 2, maxZoom: 2 })
			wrapper.vm.onCanvasWheel({ deltaY: -1, preventDefault() {} })
			expect(wrapper.emitted('update:zoom')[0][0]).toBe(2)
		})

		it('clamps at minZoom', () => {
			const wrapper = mountCanvas({ zoom: 0.3, minZoom: 0.3 })
			wrapper.vm.onCanvasWheel({ deltaY: 1, preventDefault() {} })
			expect(wrapper.emitted('update:zoom')[0][0]).toBe(0.3)
		})
	})

	describe('keyboard connect', () => {
		// Drag-to-connect is mouse-only; a keyboard user needs a path too (WCAG 2.1.1).
		it('c on one node then c on another emits connect', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'c', preventDefault() {} })
			expect(wrapper.vm.pendingConnectSource).toBe('a')
			wrapper.vm.onNodeKeydown(NODES[1], { key: 'c', preventDefault() {} })
			expect(wrapper.emitted('connect')[0][0]).toEqual({ source: 'a', target: 'b' })
			// State clears so the next c starts fresh.
			expect(wrapper.vm.pendingConnectSource).toBeNull()
		})

		it('c twice on the same node cancels instead of self-connecting', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'c', preventDefault() {} })
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'c', preventDefault() {} })
			expect(wrapper.emitted('connect')).toBeFalsy()
			expect(wrapper.vm.pendingConnectSource).toBeNull()
		})

		it('Escape cancels a connection in progress', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'c', preventDefault() {} })
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'Escape', preventDefault() {} })
			expect(wrapper.vm.pendingConnectSource).toBeNull()
			wrapper.vm.onNodeKeydown(NODES[1], { key: 'c', preventDefault() {} })
			// After cancelling, c on b arms b — it does not complete a stale a→b.
			expect(wrapper.emitted('connect')).toBeFalsy()
			expect(wrapper.vm.pendingConnectSource).toBe('b')
		})

		it('does not connect when read-only', () => {
			const wrapper = mountCanvas({ readOnly: true })
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'c', preventDefault() {} })
			expect(wrapper.vm.pendingConnectSource).toBeNull()
		})

		it('does not connect when not connectable', () => {
			const wrapper = mountCanvas({ connectable: false })
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'c', preventDefault() {} })
			expect(wrapper.vm.pendingConnectSource).toBeNull()
		})

		it('the armed source node is visually marked', async () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'c', preventDefault() {} })
			await wrapper.vm.$nextTick()
			expect(wrapper.findAll('.cn-graph-canvas__node').at(0).classes())
				.toContain('cn-graph-canvas__node--connect-source')
		})
	})

	describe('palette drop', () => {
		it('emits canvas-drop with the point in canvas space', () => {
			const wrapper = mountCanvas({ zoom: 2 }, { left: 0, top: 0 })
			wrapper.setData({ panOffset: { x: 40, y: 20 } })
			const event = { clientX: 240, clientY: 120, preventDefault() {} }
			wrapper.vm.onDrop(event)
			// (240 - 0 - 40) / 2 = 100 ; (120 - 0 - 20) / 2 = 50
			const payload = wrapper.emitted('canvas-drop')[0][0]
			expect(payload).toMatchObject({ x: 100, y: 50 })
			// The native event is passed through so the consumer can read dataTransfer.
			expect(payload.event).toBe(event)
		})

		it('does not emit a drop when read-only', () => {
			const wrapper = mountCanvas({ readOnly: true })
			wrapper.vm.onDrop({ clientX: 100, clientY: 100, preventDefault() {} })
			expect(wrapper.emitted('canvas-drop')).toBeFalsy()
		})

		it('onDragOver prevents default only when editable', () => {
			const wrapper = mountCanvas()
			let prevented = false
			wrapper.vm.onDragOver({ preventDefault() { prevented = true } })
			expect(prevented).toBe(true)

			const ro = mountCanvas({ readOnly: true })
			let preventedRo = false
			ro.vm.onDragOver({ preventDefault() { preventedRo = true } })
			expect(preventedRo).toBe(false)
		})
	})

	describe('accessibility', () => {
		// A drag-only canvas is not keyboard-operable (WCAG 2.1 AA 2.1.1).
		it('moves a focused node with the arrow keys', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'ArrowRight', shiftKey: false, preventDefault() {} })
			expect(wrapper.emitted('node-move')[0][0]).toEqual({ id: 'a', x: 110, y: 100 })
		})

		it('shift gives a coarse step', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'ArrowDown', shiftKey: true, preventDefault() {} })
			expect(wrapper.emitted('node-move')[0][0]).toEqual({ id: 'a', x: 100, y: 150 })
		})

		it('keyboard movement is clamped to the positive quadrant too', () => {
			const wrapper = mountCanvas({ nodes: [{ id: 'a', x: 5, y: 5 }] })
			wrapper.vm.onNodeKeydown({ id: 'a', x: 5, y: 5 }, { key: 'ArrowLeft', shiftKey: false, preventDefault() {} })
			expect(wrapper.emitted('node-move')[0][0]).toEqual({ id: 'a', x: 0, y: 5 })
		})

		it('ignores non-arrow keys so typing in a node slot still works', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'a', shiftKey: false, preventDefault() {} })
			expect(wrapper.emitted('node-move')).toBeFalsy()
		})

		it('nodes are focusable and expose their selected state', () => {
			const wrapper = mountCanvas({ selectedNodeId: 'a' })
			const node = wrapper.find('.cn-graph-canvas__node')
			expect(node.attributes('tabindex')).toBe('0')
			expect(node.attributes('aria-pressed')).toBe('true')
			expect(node.attributes('aria-label')).toBe('Draft')
		})

		it('falls back to the node id when no label is given', () => {
			const wrapper = mountCanvas({ nodes: [{ id: 'bare', x: 0, y: 0 }], edges: [] })
			expect(wrapper.find('.cn-graph-canvas__node').attributes('aria-label')).toBe('bare')
		})
	})

	describe('slots', () => {
		it('renders the node slot with the node and its selected state', () => {
			const wrapper = mount(CnGraphCanvas, {
				propsData: { nodes: NODES, edges: EDGES, selectedNodeId: 'a' },
				scopedSlots: {
					node: '<span class="custom">{{ props.node.label }}:{{ props.selected }}</span>',
				},
			})
			const custom = wrapper.findAll('.custom')
			expect(custom.at(0).text()).toBe('Draft:true')
			expect(custom.at(1).text()).toBe('Approved:false')
		})

		it('renders a default edge line when no edge slot is supplied', () => {
			const wrapper = mountCanvas()
			expect(wrapper.find('.cn-graph-canvas__edge').exists()).toBe(true)
		})
	})
})
