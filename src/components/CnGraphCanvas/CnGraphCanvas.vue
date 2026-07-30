<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
  -->

<docs>
CnGraphCanvas — a generic node/edge canvas: geometry and interaction only.

It owns pan, zoom, node dragging, and drag-to-connect, and nothing else. It has
no opinion about what a node *means*: no statuses, no steps, no guards, no
conditions, no persistence. Consumers supply `nodes` and `edges` as plain
geometry and render their own node/edge bodies through slots.

Per ADR-065 this is a shared **renderer**, not a shared flow builder. The
palette, property panels, condition editors, validators and persistence rules
that surround a real editor are app-specific and stay in the consuming app.

Extracted from procest's `WorkflowEditor.vue`, which is the only canvas in the
fleet that has ever worked in production. Deliberately *not* extracted from the
`@vue-flow` component procest also shipped: every `@vue-flow/core` release
declares a Vue 3 peer dependency, and this library is Vue 2.7.

### Coordinates

Nodes carry canvas-space `x`/`y` (their top-left corner); a node that has no
stored coordinates is placed on a deterministic grid so an imported or generated
graph still renders. Screen coordinates are
converted with `(clientX - rect.left - panOffset.x) / zoom`, so node positions
stay stable under pan and zoom. `nodeWidth`/`nodeHeight` exist so edges can find
a node's centre — set them to match what your node slot actually renders, or
edges will attach off-centre.

### Accessibility

A drag-only canvas is not keyboard-operable (WCAG 2.1 AA 2.1.1). Nodes are
focusable; arrow keys move a focused node (Shift = coarse step); and a
connection can be made without a mouse — press `c` on a focused node to start a
connection, then `c` on another node to complete it (`Escape` cancels). A
canvas must not be a consumer's only authoring surface.

### Adding nodes from a palette

Bind `@canvas-drop`: it fires on an HTML5 drop with the drop point already
converted to canvas space (undoing pan and zoom), plus the native event so you
can read `dataTransfer`. The consumer creates the node — the canvas never adds
one itself, mirroring how it never mutates positions.

```vue
<CnGraphCanvas
	:nodes="nodes"
	:edges="edges"
	:selected-node-id="selectedId"
	@node-move="onMove"
	@connect="onConnect"
	@node-select="selectedId = $event">
	<template #node="{ node, selected }">
		<MyStatusNode :status="node.data" :selected="selected" />
	</template>
</CnGraphCanvas>
```
</docs>

<template>
	<div class="cn-graph-canvas"
		:class="{ 'cn-graph-canvas--panning': panning }">
		<div ref="canvas"
			class="cn-graph-canvas__viewport"
			@mousedown="onCanvasMouseDown"
			@mousemove="onCanvasMouseMove"
			@mouseup="onCanvasMouseUp"
			@mouseleave="onCanvasMouseUp"
			@wheel="onCanvasWheel"
			@dragover="onDragOver"
			@drop="onDrop">
			<div class="cn-graph-canvas__world" :style="worldStyle">
				<!-- Edge layer. Sits under the nodes so node bodies stay clickable. -->
				<svg class="cn-graph-canvas__svg" :viewBox="viewBox">
					<defs>
						<marker id="cn-graph-canvas-arrow"
							viewBox="0 0 10 10"
							refX="9"
							refY="5"
							markerWidth="6"
							markerHeight="6"
							orient="auto-start-reverse">
							<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-border-dark)" />
						</marker>
					</defs>

					<g v-for="edge in resolvedEdges" :key="edge.id">
						<!--
							@slot edge Render one edge. Receives resolved endpoint
							centres so the consumer never recomputes geometry.
							@binding {object} edge The edge object.
							@binding {{x: number, y: number}} from Source node centre.
							@binding {{x: number, y: number}} to Target node centre.
							@binding {boolean} selected Whether this edge is selected.
						-->
						<slot name="edge"
							:edge="edge.edge"
							:from="edge.from"
							:to="edge.to"
							:selected="edge.edge.id === selectedEdgeId">
							<line class="cn-graph-canvas__edge"
								:class="{ 'cn-graph-canvas__edge--selected': edge.edge.id === selectedEdgeId }"
								:x1="edge.from.x"
								:y1="edge.from.y"
								:x2="edge.to.x"
								:y2="edge.to.y"
								marker-end="url(#cn-graph-canvas-arrow)"
								@click="onEdgeSelect(edge.edge.id)" />
						</slot>
					</g>

					<!-- The connection currently being dragged. -->
					<line v-if="drawingConnection"
						class="cn-graph-canvas__draft-edge"
						:x1="drawingConnection.startX"
						:y1="drawingConnection.startY"
						:x2="drawingConnection.currentX"
						:y2="drawingConnection.currentY" />
				</svg>

				<!-- Node layer. -->
				<div v-for="node in positionedNodes"
					:key="node.id"
					class="cn-graph-canvas__node"
					:class="{
						'cn-graph-canvas__node--selected': node.id === selectedNodeId,
						'cn-graph-canvas__node--connect-source': pendingConnectSource === node.id,
					}"
					:style="nodeStyle(node)"
					tabindex="0"
					role="button"
					:aria-label="nodeAriaLabel(node)"
					:aria-pressed="node.id === selectedNodeId ? 'true' : 'false'"
					@mousedown.stop="onNodeMouseDown(node, $event)"
					@mouseup.stop="onNodeMouseUp(node)"
					@click.stop="onNodeSelect(node.id)"
					@focus="onNodeSelect(node.id)"
					@keydown="onNodeKeydown(node, $event)">
					<!--
						@slot node Render one node's body. The canvas positions the
						wrapper; the slot fills it.
						@binding {object} node The node object.
						@binding {boolean} selected Whether this node is selected.
					-->
					<slot name="node" :node="node" :selected="node.id === selectedNodeId">
						<span class="cn-graph-canvas__node-fallback">{{ node.id }}</span>
					</slot>

					<!-- Connection handle. Hidden when the canvas is not connectable. -->
					<button v-if="connectable && !readOnly"
						class="cn-graph-canvas__handle"
						:aria-label="t('nextcloud-vue', 'Drag to connect, or press c to connect with the keyboard')"
						@mousedown.stop="onConnectionStart(node, $event)"
						@click.stop />
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/** Fine keyboard nudge, in canvas units. */
const KEY_STEP = 10
/** Coarse keyboard nudge (Shift), in canvas units. */
const KEY_STEP_COARSE = 50
/** Key that starts/completes a keyboard-driven connection. */
const CONNECT_KEY = 'c'
/** Columns used when laying out nodes that carry no stored position. */
const AUTO_LAYOUT_COLUMNS = 4
/** Gap between auto-laid-out nodes, in canvas units. */
const AUTO_LAYOUT_GAP = 60

/**
 * CnGraphCanvas — generic node/edge canvas (geometry + interaction only).
 * See the `<docs>` block above for scope and rationale (ADR-065).
 */
export default {
	name: 'CnGraphCanvas',

	props: {
		/**
		 * The nodes to render. Each needs a stable `id` and canvas-space `x`/`y`
		 * (top-left corner). Any other keys are passed back through the `node` slot
		 * untouched — put your domain object on `data`.
		 *
		 * A node MAY omit `x`/`y`: a hand-written, imported or generated graph
		 * often has no coordinates. Those nodes are laid out on a deterministic
		 * grid until something moves them, rather than collapsing the canvas.
		 *
		 * @type {Array<{id: string, x?: number, y?: number}>}
		 */
		nodes: {
			type: Array,
			required: true,
		},
		/**
		 * The edges to render. `source`/`target` are node ids. An edge whose
		 * endpoints do not resolve to a node is skipped rather than drawn at 0,0.
		 *
		 * @type {Array<{id: string, source: string, target: string}>}
		 */
		edges: {
			type: Array,
			default: () => [],
		},
		/**
		 * Rendered node width in canvas units. Used to find a node's centre for
		 * edge endpoints — set it to match what your node slot renders.
		 *
		 * @type {number}
		 */
		nodeWidth: {
			type: Number,
			default: 200,
		},
		/**
		 * Rendered node height in canvas units. See `nodeWidth`.
		 *
		 * @type {number}
		 */
		nodeHeight: {
			type: Number,
			default: 80,
		},
		/**
		 * Id of the selected node, or null. Selection is owned by the consumer;
		 * the canvas only reports intent via `node-select`.
		 *
		 * @type {string|null}
		 */
		selectedNodeId: {
			type: String,
			default: null,
		},
		/**
		 * Id of the selected edge, or null.
		 *
		 * @type {string|null}
		 */
		selectedEdgeId: {
			type: String,
			default: null,
		},
		/**
		 * Zoom factor. Supports `.sync` / `v-model:zoom` via `update:zoom`.
		 *
		 * @type {number}
		 */
		zoom: {
			type: Number,
			default: 1,
		},
		/**
		 * Minimum zoom factor.
		 *
		 * @type {number}
		 */
		minZoom: {
			type: Number,
			default: 0.3,
		},
		/**
		 * Maximum zoom factor.
		 *
		 * @type {number}
		 */
		maxZoom: {
			type: Number,
			default: 2,
		},
		/**
		 * Optional SVG viewBox for the edge layer.
		 *
		 * Leave this unset (the default). Nodes are positioned in CSS pixels
		 * (`left: node.x px`) inside the same transformed world, so the edge
		 * layer must use the SAME coordinate system. With no viewBox, one SVG
		 * user unit is one CSS pixel and edges land exactly on their nodes.
		 *
		 * Setting a fixed viewBox (this used to default to `0 0 2000 1500`)
		 * rescales user units to the canvas's rendered size, so edges drift
		 * away from their nodes by `canvasWidth / viewBoxWidth` — visibly wrong
		 * at any size other than the viewBox itself, and non-uniformly when the
		 * aspect ratios differ. Only set this if you are positioning nodes in
		 * the same viewBox units.
		 *
		 * @type {string|null}
		 */
		viewBox: {
			type: String,
			default: null,
		},
		/**
		 * When true, nodes cannot be moved and connections cannot be drawn.
		 * Pan and zoom stay available so a read-only graph is still explorable.
		 *
		 * @type {boolean}
		 */
		readOnly: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whether nodes expose a connection handle.
		 *
		 * @type {boolean}
		 */
		connectable: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['canvas-click', 'canvas-drop', 'connect', 'edge-select', 'node-move', 'node-select', 'update:zoom'],

	data() {
		return {
			/** @type {{id: string, offsetX: number, offsetY: number}|null} Node being dragged. */
			draggingNode: null,
			/** @type {object|null} The connection currently being drawn. */
			drawingConnection: null,
			/** @type {boolean} Whether the canvas is being panned. */
			panning: false,
			/** @type {{x: number, y: number}} Pan offset in screen pixels. */
			panOffset: { x: 0, y: 0 },
			/** @type {{x: number, y: number}} Pan gesture origin. */
			panStart: { x: 0, y: 0 },
			/** @type {string|null} Source node id of a keyboard connection in progress. */
			pendingConnectSource: null,
		}
	},

	computed: {
		/** Transform for the world layer (pan + zoom). */
		worldStyle() {
			return {
				transform: `translate(${this.panOffset.x}px, ${this.panOffset.y}px) scale(${this.zoom})`,
				transformOrigin: '0 0',
			}
		},
		/**
		 * The nodes with a usable position on every one of them.
		 *
		 * A node document is not obliged to carry coordinates — a graph written
		 * by hand, imported from another instance, or generated by an agent
		 * routinely has none. Reading `node.x` straight off such a node gave
		 * `undefined`, and `undefined + nodeWidth / 2` is NaN, so:
		 *
		 *   - every edge rendered as `d="M NaN NaN L NaN NaN"` (invisible, plus
		 *     one console error per edge per render), and
		 *   - every node got `left: undefinedpx`, an invalid declaration the
		 *     browser drops, collapsing the whole canvas into the static flow.
		 *
		 * So a graph without coordinates did not degrade — it broke, loudly in
		 * the console and silently on screen. Nodes missing a coordinate are
		 * laid out on a deterministic grid instead, which is readable and,
		 * because dragging emits the RESOLVED position, becomes a real stored
		 * position the first time someone moves it.
		 */
		positionedNodes() {
			const perRow = Math.max(1, AUTO_LAYOUT_COLUMNS)
			return this.nodes.map((node, index) => {
				const x = Number(node?.x)
				const y = Number(node?.y)
				if (Number.isFinite(x) === true && Number.isFinite(y) === true) {
					return node
				}
				const column = index % perRow
				const row = Math.floor(index / perRow)
				return {
					...node,
					x: Number.isFinite(x) ? x : (column * (this.nodeWidth + AUTO_LAYOUT_GAP)),
					y: Number.isFinite(y) ? y : (row * (this.nodeHeight + AUTO_LAYOUT_GAP)),
				}
			})
		},
		/** Node lookup by id, so edge resolution stays O(1) per edge. */
		nodeById() {
			const map = {}
			this.positionedNodes.forEach((n) => { map[n.id] = n })
			return map
		},
		/**
		 * Edges with their endpoint centres resolved. Edges referencing a missing
		 * node are dropped: drawing them at the origin produces phantom lines to
		 * the corner, which reads as a rendering bug rather than as bad data.
		 */
		resolvedEdges() {
			return this.edges
				.map((edge) => {
					const source = this.nodeById[edge.source]
					const target = this.nodeById[edge.target]
					if (!source || !target) return null
					return { id: edge.id, edge, from: this.nodeCentre(source), to: this.nodeCentre(target) }
				})
				.filter(Boolean)
		},
	},

	methods: {
		t,

		/**
		 * Report that a node was clicked or focused. Selection state is owned by
		 * the consumer, so this only announces intent.
		 *
		 * @param {string} id The node id.
		 * @return {void}
		 */
		onNodeSelect(id) {
			/**
			 * @event node-select A node was clicked or focused.
			 * @type {string}
			 */
			this.$emit('node-select', id)
		},

		/**
		 * Report that an edge was clicked. Only fires for the default edge
		 * rendering; a custom `edge` slot owns its own hit-testing.
		 *
		 * @param {string} id The edge id.
		 * @return {void}
		 */
		onEdgeSelect(id) {
			/**
			 * @event edge-select An edge was clicked.
			 * @type {string}
			 */
			this.$emit('edge-select', id)
		},

		/**
		 * The centre of a node in canvas space.
		 *
		 * @param {{x: number, y: number}} node The node.
		 * @return {{x: number, y: number}} Its centre point.
		 */
		nodeCentre(node) {
			return { x: node.x + (this.nodeWidth / 2), y: node.y + (this.nodeHeight / 2) }
		},

		/**
		 * Inline style positioning a node wrapper.
		 *
		 * @param {{x: number, y: number}} node The node.
		 * @return {object} The style object.
		 */
		nodeStyle(node) {
			return {
				left: `${node.x}px`,
				top: `${node.y}px`,
				width: `${this.nodeWidth}px`,
				minHeight: `${this.nodeHeight}px`,
			}
		},

		/**
		 * Accessible label for a node wrapper. Consumers that render richer node
		 * bodies should pass a meaningful `label` on the node.
		 *
		 * @param {{id: string, label: string}} node The node.
		 * @return {string} The aria-label.
		 */
		nodeAriaLabel(node) {
			return node.label || node.id
		},

		/**
		 * Convert a mouse event to canvas-space coordinates, undoing pan and zoom.
		 *
		 * @param {MouseEvent} event The mouse event.
		 * @return {{x: number, y: number}} Canvas-space point.
		 */
		toCanvasPoint(event) {
			const rect = this.$refs.canvas.getBoundingClientRect()
			return {
				x: (event.clientX - rect.left - this.panOffset.x) / this.zoom,
				y: (event.clientY - rect.top - this.panOffset.y) / this.zoom,
			}
		},

		/**
		 * Begin dragging a node.
		 *
		 * @param {object} node The node.
		 * @param {MouseEvent} event The mousedown event.
		 * @return {void}
		 */
		onNodeMouseDown(node, event) {
			if (this.readOnly) return
			const point = this.toCanvasPoint(event)
			this.draggingNode = { id: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y }
		},

		/**
		 * Complete a connection when the pointer is released over a node.
		 *
		 * @param {object} node The node released over.
		 * @return {void}
		 */
		onNodeMouseUp(node) {
			if (this.drawingConnection && this.drawingConnection.source !== node.id) {
				/**
				 * @event connect A connection was drawn between two nodes.
				 * @type {{source: string, target: string}}
				 */
				this.$emit('connect', { source: this.drawingConnection.source, target: node.id })
			}
			this.drawingConnection = null
			this.draggingNode = null
		},

		/**
		 * Start drawing a connection from a node's handle.
		 *
		 * @param {object} node The source node.
		 * @param {MouseEvent} event The mousedown event.
		 * @return {void}
		 */
		onConnectionStart(node, event) {
			if (this.readOnly) return
			const centre = this.nodeCentre(node)
			const point = this.toCanvasPoint(event)
			this.drawingConnection = {
				source: node.id,
				startX: centre.x,
				startY: centre.y,
				currentX: point.x,
				currentY: point.y,
			}
		},

		/**
		 * Pan the canvas when the drag starts on empty space.
		 *
		 * @param {MouseEvent} event The mousedown event.
		 * @return {void}
		 */
		onCanvasMouseDown(event) {
			const onEmptySpace = event.target === this.$refs.canvas
				|| event.target.classList.contains('cn-graph-canvas__world')
				|| event.target.classList.contains('cn-graph-canvas__svg')
			if (!onEmptySpace) return
			this.panning = true
			this.panStart = { x: event.clientX - this.panOffset.x, y: event.clientY - this.panOffset.y }
			/**
			 * @event canvas-click The empty canvas was clicked — consumers usually
			 * clear their selection.
			 */
			this.$emit('canvas-click')
		},

		/**
		 * Drive the active gesture: node drag, connection draw, or pan.
		 *
		 * @param {MouseEvent} event The mousemove event.
		 * @return {void}
		 */
		onCanvasMouseMove(event) {
			if (this.draggingNode) {
				const point = this.toCanvasPoint(event)
				/**
				 * @event node-move A node was dragged. Positions are owned by the
				 * consumer: the canvas reports intent and does not mutate `nodes`.
				 * @type {{id: string, x: number, y: number}}
				 */
				this.$emit('node-move', {
					id: this.draggingNode.id,
					x: Math.max(0, point.x - this.draggingNode.offsetX),
					y: Math.max(0, point.y - this.draggingNode.offsetY),
				})
			} else if (this.drawingConnection) {
				const point = this.toCanvasPoint(event)
				this.drawingConnection.currentX = point.x
				this.drawingConnection.currentY = point.y
			} else if (this.panning) {
				this.panOffset = { x: event.clientX - this.panStart.x, y: event.clientY - this.panStart.y }
			}
		},

		/**
		 * End any active gesture. Also bound to mouseleave so a drag released
		 * outside the canvas does not leave the node stuck to the pointer.
		 *
		 * @return {void}
		 */
		onCanvasMouseUp() {
			this.draggingNode = null
			this.drawingConnection = null
			this.panning = false
		},

		/**
		 * Zoom around the canvas origin.
		 *
		 * @param {WheelEvent} event The wheel event.
		 * @return {void}
		 */
		onCanvasWheel(event) {
			event.preventDefault()
			const delta = event.deltaY > 0 ? -0.1 : 0.1
			const next = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta))
			// Description goes ABOVE `@event`, not inline after it:
			// vue-docgen-api's event-name splitter stops at the first `:`, so
			// `@event update:zoom <description>` is read as one long event NAME
			// and the generated docs show an empty description.
			/**
			 * The zoom factor changed (supports `v-model:zoom`).
			 *
			 * @event update:zoom
			 * @type {number}
			 */
			this.$emit('update:zoom', next)
		},

		/**
		 * Move a focused node with the arrow keys. A drag-only canvas fails
		 * WCAG 2.1 AA 2.1.1, so this is the keyboard equivalent of dragging.
		 *
		 * @param {object} node The focused node.
		 * @param {KeyboardEvent} event The keydown event.
		 * @return {void}
		 */
		onNodeKeydown(node, event) {
			if (this.readOnly) return

			// Escape cancels a keyboard connection in progress.
			if (event.key === 'Escape' && this.pendingConnectSource !== null) {
				event.preventDefault()
				this.pendingConnectSource = null
				return
			}

			// `c` starts a connection from the focused node, or completes one
			// started earlier — the keyboard equivalent of dragging a handle, so
			// connecting is not mouse-only (WCAG 2.1 AA 2.1.1).
			if (event.key === CONNECT_KEY && this.connectable) {
				event.preventDefault()
				this.onConnectKey(node)
				return
			}

			const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
			if (!keys.includes(event.key)) return
			event.preventDefault()
			const step = event.shiftKey ? KEY_STEP_COARSE : KEY_STEP
			const dx = (event.key === 'ArrowLeft' ? -step : 0) + (event.key === 'ArrowRight' ? step : 0)
			const dy = (event.key === 'ArrowUp' ? -step : 0) + (event.key === 'ArrowDown' ? step : 0)
			this.$emit('node-move', {
				id: node.id,
				x: Math.max(0, node.x + dx),
				y: Math.max(0, node.y + dy),
			})
		},

		/**
		 * Handle the connect key on a focused node: arm a connection from it, or
		 * complete one already armed from a different node.
		 *
		 * @param {object} node The focused node.
		 * @return {void}
		 */
		onConnectKey(node) {
			if (this.pendingConnectSource === null) {
				this.pendingConnectSource = node.id
				return
			}
			if (this.pendingConnectSource !== node.id) {
				this.$emit('connect', { source: this.pendingConnectSource, target: node.id })
			}
			// Pressing `c` again on the source cancels; either way the pending
			// state clears so the next `c` starts fresh.
			this.pendingConnectSource = null
		},

		/**
		 * Allow a drop by preventing the default, which is what makes the viewport
		 * a valid HTML5 drop target for a palette drag.
		 *
		 * @param {DragEvent} event The dragover event.
		 * @return {void}
		 */
		onDragOver(event) {
			if (this.readOnly) return
			event.preventDefault()
		},

		/**
		 * Report a palette drop with the drop point in canvas space. The canvas
		 * does not add a node itself — it hands the consumer coordinates it could
		 * not compute alone (only the canvas knows its pan and zoom), mirroring how
		 * it never mutates positions.
		 *
		 * @param {DragEvent} event The drop event.
		 * @return {void}
		 */
		onDrop(event) {
			if (this.readOnly) return
			event.preventDefault()
			const point = this.toCanvasPoint(event)
			/**
			 * @event canvas-drop Something was dropped onto the canvas. The
			 * payload's `x`/`y` are in canvas space (pan and zoom undone); the
			 * native `event` carries `dataTransfer`.
			 * @type {{x: number, y: number, event: DragEvent}}
			 */
			this.$emit('canvas-drop', { x: point.x, y: point.y, event })
		},
	},
}
</script>

<style scoped>
.cn-graph-canvas {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background-color: var(--color-main-background);
}

.cn-graph-canvas__viewport {
	position: absolute;
	inset: 0;
	overflow: hidden;
	cursor: grab;
}

.cn-graph-canvas--panning .cn-graph-canvas__viewport {
	cursor: grabbing;
}

.cn-graph-canvas__world {
	position: absolute;
	inset: 0;
}

.cn-graph-canvas__svg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	overflow: visible;
	pointer-events: none;
}

/* Edges opt back into hit-testing; the layer itself stays transparent to clicks. */
.cn-graph-canvas__edge {
	pointer-events: stroke;
	cursor: pointer;
	stroke: var(--color-border-dark);
	stroke-width: 2;
}

.cn-graph-canvas__edge--selected {
	stroke: var(--color-primary-element);
	stroke-width: 3;
}

.cn-graph-canvas__draft-edge {
	stroke: var(--color-primary-element);
	stroke-width: 2;
	stroke-dasharray: 5, 5;
	pointer-events: none;
}

.cn-graph-canvas__node {
	position: absolute;
	cursor: move;
	border-radius: var(--border-radius-large);
	background-color: var(--color-main-background);
	border: 2px solid var(--color-border);
}

.cn-graph-canvas__node:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-graph-canvas__node--selected {
	border-color: var(--color-primary-element);
}

/* The armed source of a keyboard connection, so the pending state is visible. */
.cn-graph-canvas__node--connect-source {
	border-color: var(--color-primary-element);
	border-style: dashed;
}

.cn-graph-canvas__node-fallback {
	display: block;
	padding: var(--default-grid-baseline, 4px);
	color: var(--color-text-maxcontrast);
}

.cn-graph-canvas__handle {
	position: absolute;
	right: -8px;
	top: 50%;
	transform: translateY(-50%);
	width: 16px;
	height: 16px;
	padding: 0;
	border: 2px solid var(--color-main-background);
	border-radius: 50%;
	background-color: var(--color-primary-element);
	cursor: crosshair;
}

.cn-graph-canvas__handle:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}
</style>
