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

	describe('resizing', () => {
		// The canvas reports intent and never mutates `nodes`, exactly as it
		// does for positions — so a resize is an EVENT, and a consumer that
		// ignores it sees no change.
		it('reports a new size from the corner grip without mutating the node', () => {
			const nodes = [{ id: 'a', x: 0, y: 0, width: 200, height: 100 }]
			const wrapper = mountCanvas({ nodes, resizable: true })

			wrapper.vm.onResizeMouseDown(nodes[0], { clientX: 0, clientY: 0 })
			wrapper.vm.onCanvasMouseMove({ clientX: 60, clientY: 40 })

			expect(wrapper.emitted('node-resize')[0][0]).toEqual({ id: 'a', width: 260, height: 140 })
			// The canvas must not mutate the node it was given.
			expect(nodes[0].width).toBe(200)
		})

		// A stray drag past the top-left must not leave a node too small to
		// grab again.
		it('never resizes below the minimum', () => {
			const nodes = [{ id: 'a', x: 0, y: 0, width: 200, height: 100 }]
			const wrapper = mountCanvas({ nodes, resizable: true })

			wrapper.vm.onResizeMouseDown(nodes[0], { clientX: 0, clientY: 0 })
			wrapper.vm.onCanvasMouseMove({ clientX: -9000, clientY: -9000 })

			const size = wrapper.emitted('node-resize')[0][0]
			expect(size.width).toBe(40)
			expect(size.height).toBe(40)
		})

		// A grip is a pointer gesture, and a pointer gesture cannot be the only
		// way to perform an action (WCAG 2.1 AA 2.1.1).
		it('resizes from the keyboard', () => {
			const nodes = [{ id: 'a', x: 0, y: 0, width: 200, height: 100 }]
			const wrapper = mountCanvas({ nodes, resizable: true })

			wrapper.vm.onResizeKeydown(nodes[0], {
				key: 'ArrowRight',
				shiftKey: false,
				preventDefault() {},
				stopPropagation() {},
			})

			expect(wrapper.emitted('node-resize')[0][0]).toEqual({ id: 'a', width: 210, height: 100 })
		})

		it('does not resize when read-only', () => {
			const nodes = [{ id: 'a', x: 0, y: 0, width: 200, height: 100 }]
			const wrapper = mountCanvas({ nodes, resizable: true, readOnly: true })

			wrapper.vm.onResizeMouseDown(nodes[0], { clientX: 0, clientY: 0 })
			wrapper.vm.onCanvasMouseMove({ clientX: 60, clientY: 40 })

			expect(wrapper.emitted('node-resize')).toBeFalsy()
		})
	})

	describe('the dot grid', () => {
		it('is absent unless asked for', () => {
			expect(mountCanvas().find('.cn-graph-canvas__grid').exists()).toBe(false)
			expect(mountCanvas({ showGrid: true }).find('.cn-graph-canvas__grid').exists()).toBe(true)
		})

		// The dots must sit on the same canvas coordinate as the graph at every
		// pan and zoom — a grid that stayed still while the content moved would
		// say nothing about where anything is, which is the only thing a grid
		// is for.
		it('scales with the zoom and follows the pan', () => {
			const wrapper = mountCanvas({ showGrid: true, gridSize: 20, zoom: 2 })
			wrapper.vm.panOffset = { x: 30, y: -15 }

			expect(wrapper.vm.gridStyle).toEqual({
				backgroundSize: '40px 40px',
				backgroundPosition: '30px -15px',
			})
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

		// A graph has no top-left corner. Clamping to (0,0) meant nothing could
		// ever be placed ABOVE or LEFT of whatever was currently highest, so
		// adding a trigger to a finished flow was impossible without first
		// dragging every other node down. Negative coordinates are reachable
		// because the world is panned — the origin is not an edge of anything.
		it('lets a node move above and left of the origin', () => {
			const wrapper = mountCanvas()
			wrapper.vm.onNodeMouseDown(NODES[0], { clientX: 100, clientY: 100 })
			wrapper.vm.onCanvasMouseMove({ clientX: -500, clientY: -500 })
			expect(wrapper.emitted('node-move')[0][0]).toEqual({ id: 'a', x: -500, y: -500 })
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
	})

	describe('keyboard connect chooses the origin port', () => {
		// A routing node has one out-port per branch, and the mouse picks the
		// branch by pointing at it. Without this the keyboard armed the node and
		// connected from whichever port was first, so every branch after the
		// first was mouse-only (WCAG 2.1.1).
		const BRANCHED = [
			{
				id: 'gate',
				x: 100,
				y: 100,
				label: 'Route',
				ports: [
					{ id: 'in', side: 'left', kind: 'in' },
					{ id: 'out:work', side: 'right', kind: 'out', label: 'work' },
					{ id: 'out:idle', side: 'right', kind: 'out', label: 'idle' },
				],
			},
			{ id: 'b', x: 400, y: 300, label: 'Approved' },
		]

		it('repeating c on the source steps to the NEXT branch', () => {
			const wrapper = mountCanvas({ nodes: BRANCHED })
			wrapper.vm.onNodeKeydown(BRANCHED[0], { key: 'c', preventDefault() {} })
			// The first repeat advances rather than cancelling, because this node
			// has a second branch to offer.
			wrapper.vm.onNodeKeydown(BRANCHED[0], { key: 'c', preventDefault() {} })
			expect(wrapper.vm.pendingConnectSource).toBe('gate')

			wrapper.vm.onNodeKeydown(BRANCHED[1], { key: 'c', preventDefault() {} })
			expect(wrapper.emitted('connect')[0][0]).toEqual({ source: 'gate', target: 'b', sourcePort: 'out:idle' })
		})

		it('without repeating, it leaves from the FIRST branch', () => {
			// The inverse of the test above. Without it, an implementation that
			// always armed the last port would satisfy the stepping assertion.
			const wrapper = mountCanvas({ nodes: BRANCHED })
			wrapper.vm.onNodeKeydown(BRANCHED[0], { key: 'c', preventDefault() {} })
			wrapper.vm.onNodeKeydown(BRANCHED[1], { key: 'c', preventDefault() {} })
			expect(wrapper.emitted('connect')[0][0]).toEqual({ source: 'gate', target: 'b', sourcePort: 'out:work' })
		})

		it('stepping past the LAST branch cancels, as one exit always did', () => {
			const wrapper = mountCanvas({ nodes: BRANCHED })
			wrapper.vm.onNodeKeydown(BRANCHED[0], { key: 'c', preventDefault() {} })
			wrapper.vm.onNodeKeydown(BRANCHED[0], { key: 'c', preventDefault() {} })
			wrapper.vm.onNodeKeydown(BRANCHED[0], { key: 'c', preventDefault() {} })
			expect(wrapper.vm.pendingConnectSource).toBeNull()
			expect(wrapper.emitted('connect')).toBeFalsy()
		})

		it('the in-port is never an origin', () => {
			// `in` is declared first. If out-ports were not filtered, the first
			// armed port would be the one that CANNOT originate a connection.
			const wrapper = mountCanvas({ nodes: BRANCHED })
			expect(wrapper.vm.outPortsFor(BRANCHED[0]).map((port) => port.id)).toEqual(['out:work', 'out:idle'])
		})

		it('a node declaring NO ports omits sourcePort, exactly as the mouse does', () => {
			// `portsFor` synthesises an `out` port for such a node so it still has
			// something to draw. Reading it here would send a `sourcePort` the
			// mouse path never sends, and the two inputs would disagree.
			const wrapper = mountCanvas()
			wrapper.vm.onNodeKeydown(NODES[0], { key: 'c', preventDefault() {} })
			wrapper.vm.onNodeKeydown(NODES[1], { key: 'c', preventDefault() {} })
			expect(wrapper.emitted('connect')[0][0]).toEqual({ source: 'a', target: 'b' })
		})

		it('the armed PORT is marked, not just the node', () => {
			// The choice has to be visible rather than remembered — otherwise the
			// only feedback for stepping is that nothing appears to happen.
			const wrapper = mountCanvas({ nodes: BRANCHED })
			wrapper.vm.onNodeKeydown(BRANCHED[0], { key: 'c', preventDefault() {} })
			expect(wrapper.vm.isArmedPort(BRANCHED[0], { id: 'out:work' })).toBe(true)
			expect(wrapper.vm.isArmedPort(BRANCHED[0], { id: 'out:idle' })).toBe(false)

			wrapper.vm.onNodeKeydown(BRANCHED[0], { key: 'c', preventDefault() {} })
			expect(wrapper.vm.isArmedPort(BRANCHED[0], { id: 'out:idle' })).toBe(true)
			expect(wrapper.vm.isArmedPort(BRANCHED[0], { id: 'out:work' })).toBe(false)
		})

		it('no port is armed on a node that is not the pending source', () => {
			const wrapper = mountCanvas({ nodes: BRANCHED })
			expect(wrapper.vm.isArmedPort(BRANCHED[0], { id: 'out:work' })).toBe(false)
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

		// The keyboard must reach every position the pointer can (WCAG 2.1 AA
		// 2.1.1), so it is unclamped for the same reason the drag is: a clamp
		// here alone would make "above the flow" mouse-only.
		it('keyboard movement reaches negative coordinates too', () => {
			const wrapper = mountCanvas({ nodes: [{ id: 'a', x: 5, y: 5 }] })
			wrapper.vm.onNodeKeydown({ id: 'a', x: 5, y: 5 }, { key: 'ArrowLeft', shiftKey: false, preventDefault() {} })
			expect(wrapper.emitted('node-move')[0][0]).toEqual({ id: 'a', x: -5, y: 5 })
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

	describe('ports', () => {
		// A node that declares no ports keeps the single right-hand handle it
		// has always had. This is the compatibility guarantee the whole port
		// feature rests on: every existing consumer renders unchanged.
		it('gives a node that declares no ports exactly one out-port', () => {
			const wrapper = mountCanvas()
			const ports = wrapper.findAll('.cn-graph-canvas__handle')
			expect(ports).toHaveLength(NODES.length)
		})

		it('renders exactly the ports a node declares', () => {
			const wrapper = mountCanvas({
				nodes: [{
					id: 'route',
					x: 0,
					y: 0,
					ports: [
						{ id: 'in', side: 'left' },
						{ id: 'high', side: 'right', label: 'High' },
						{ id: 'low', side: 'right', label: 'Low' },
					],
				}],
				edges: [],
			})

			expect(wrapper.findAll('.cn-graph-canvas__handle')).toHaveLength(3)
			expect(wrapper.findAll('.cn-graph-canvas__handle--right')).toHaveLength(2)
			expect(wrapper.find('.cn-graph-canvas__handle--in').exists()).toBe(true)
		})

		// Branch ports name their branch. Three identical "drag to connect"
		// buttons tell a keyboard or screen-reader user nothing about which one
		// they are on.
		it('names a branch port after its branch', () => {
			const wrapper = mountCanvas({
				nodes: [{ id: 'route', x: 0, y: 0, ports: [{ id: 'high', side: 'right', label: 'High' }] }],
				edges: [],
			})

			expect(wrapper.find('.cn-graph-canvas__handle').attributes('aria-label')).toBe('High')
		})

		// Ports are spread PER NODE. Grouping them globally would position a
		// node's single port by its index among every port in the graph, so one
		// node gaining a branch would move every other node's ports.
		it('spreads a side\'s ports independently for each node', () => {
			const wrapper = mountCanvas({
				nodes: [
					{ id: 'one', x: 0, y: 0, ports: [{ id: 'only', side: 'right' }] },
					{
						id: 'many',
						x: 400,
						y: 0,
						ports: [
							{ id: 'a', side: 'right' },
							{ id: 'b', side: 'right' },
							{ id: 'c', side: 'right' },
						],
					},
				],
				edges: [],
			})

			const single = wrapper.vm.portStyle(
				{ id: 'one', ports: [{ id: 'only', side: 'right' }] },
				{ id: 'only', side: 'right' },
			)
			// One port on the side sits at the midpoint, whatever other nodes do.
			expect(single.top).toBe('50%')
		})

		it('puts a loop node\'s body ports on the top edge', () => {
			const wrapper = mountCanvas({
				nodes: [{
					id: 'paginate',
					x: 0,
					y: 0,
					ports: [
						{ id: 'body-out', side: 'top', label: 'Repeat' },
						{ id: 'body-in', side: 'top', label: 'Return' },
					],
				}],
				edges: [],
			})

			const top = wrapper.findAll('.cn-graph-canvas__handle--top')
			expect(top).toHaveLength(2)
			// On the border, not beside it: the port's own edge is at 0%.
			expect(top[0].attributes('style')).toContain('top: 0%')
		})

		it('reports which port a connection left from', () => {
			const wrapper = mountCanvas({
				nodes: [
					{ id: 'route', x: 0, y: 0, ports: [{ id: 'high', side: 'right' }] },
					{ id: 'b', x: 400, y: 0 },
				],
				edges: [],
			})

			wrapper.vm.onConnectionStart(
				{ id: 'route', x: 0, y: 0, ports: [{ id: 'high', side: 'right' }] },
				{ clientX: 200, clientY: 140 },
				{ id: 'high', side: 'right', kind: 'out' },
			)
			wrapper.vm.onNodeMouseUp({ id: 'b' })

			expect(wrapper.emitted('connect')[0][0]).toEqual({
				source: 'route',
				target: 'b',
				sourcePort: 'high',
			})
		})

		// An in-port receives; it never originates. Without this a user could
		// drag backwards out of an inbound port and create an edge pointing the
		// wrong way, which reads on the canvas as the flow running in reverse.
		it('refuses to start a connection from an in-port', () => {
			const wrapper = mountCanvas()

			wrapper.vm.onConnectionStart(
				NODES[0],
				{ clientX: 200, clientY: 140 },
				{ id: 'in', side: 'left', kind: 'in' },
			)

			expect(wrapper.vm.drawingConnection).toBe(null)
		})
	})
})
