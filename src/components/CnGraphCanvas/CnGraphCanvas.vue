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
connection, then `c` on another node to complete it (`Escape` cancels).

Where a node has SEVERAL exits — a routing node draws one out-port per branch —
pressing `c` again on the source steps through them, and the armed port is
ringed and marked `aria-pressed`. Dragging picks a branch by pointing at it;
without this the keyboard could only ever reach the first, so every other branch
was mouse-only. On a node with one exit nothing changes: the repeat runs off the
end and cancels, as it always did.

A canvas must not be a consumer's only authoring surface.

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
			<!--
				The grid is painted on its own layer under the world rather than
				ON the world, because the world is viewport-sized: a background
				there would stop at the original viewport's edge and leave blank
				space the moment the graph was panned. This layer stays still
				and moves its PATTERN instead, so it covers everything visible
				at every pan and zoom.
			-->
			<div v-if="showGrid"
				class="cn-graph-canvas__grid"
				:style="gridStyle"
				aria-hidden="true" />

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

					<!--
						The resize grip. Only when the consumer asks for it: a
						canvas whose nodes are a fixed size by design should not
						grow a handle nobody can use meaningfully.

						`mousedown.stop` so gripping the corner resizes rather
						than dragging the node — the grip sits inside the node,
						so without it both gestures would start at once.
					-->
					<button v-if="resizable && !readOnly"
						class="cn-graph-canvas__resize"
						type="button"
						:aria-label="`Resize ${node.label || node.id}`"
						@mousedown.stop="onResizeMouseDown(node, $event)"
						@click.stop
						@keydown="onResizeKeydown(node, $event)" />

					<!--
						Connection ports. A node declares them (`node.ports`) and
						gets exactly those; a node that declares none keeps the
						single right-hand out-port, so no existing consumer
						changes behaviour.

						Ports sit ON the border, not beside it: each is centred
						on its edge with `translate(-50%, -50%)`, so a line
						drawn to a port's centre meets the card exactly where the
						eye expects. Offsetting them outward (the old
						`right: -8px`) left a visible gap that read as a
						disconnected line.

						`top` is where a LOOP puts its body ports — the nodes a
						loop repeats hang off the top edge as a visible sub-list,
						kept clear of the left-to-right flow of the main chain.
					-->
					<button v-for="port in portsFor(node)"
						:key="port.id"
						class="cn-graph-canvas__handle"
						:class="[
							`cn-graph-canvas__handle--${port.side}`,
							`cn-graph-canvas__handle--${port.kind}`,
							{ 'cn-graph-canvas__handle--armed': isArmedPort(node, port) },
						]"
						:aria-pressed="isArmedPort(node, port) ? 'true' : undefined"
						:style="portStyle(node, port)"
						:aria-label="portLabel(node, port)"
						:disabled="port.kind === 'in'"
						@mousedown.stop="onConnectionStart(node, $event, port)"
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
/** The smallest a node may be resized to, so it can never be lost to a stray drag. */
const MIN_NODE_SIZE = 40

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
		 * Whether to draw a dot grid behind the graph.
		 *
		 * The dots are painted on the WORLD, so they pan and zoom with the
		 * content: a grid that stayed still while the graph moved would say
		 * nothing about where anything sits, which is the one thing a grid is
		 * for. Off by default — a canvas used as a diagram surface does not
		 * always want one.
		 */
		showGrid: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whether nodes carry a corner grip that resizes them.
		 *
		 * The size lands on the node as `width`/`height` through
		 * `@node-resize`; the canvas never mutates `nodes` itself, exactly as
		 * it never mutates positions.
		 */
		resizable: {
			type: Boolean,
			default: false,
		},
		/**
		 * The spacing between grid dots, in canvas units.
		 */
		gridSize: {
			type: Number,
			default: 24,
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

	emits: ['canvas-click', 'canvas-drop', 'connect', 'edge-select', 'node-move', 'node-resize', 'node-select', 'update:zoom'],

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
			/** @type {?object} The node being resized, and the size it started at. */
			resizingNode: null,
			/** @type {{x: number, y: number}} Pan gesture origin. */
			panStart: { x: 0, y: 0 },
			/** @type {string|null} Source node id of a keyboard connection in progress. */
			pendingConnectSource: null,
			/**
			 * @type {number} Which of the armed node's out-ports the next `c`
			 * connects FROM. Only meaningful while `pendingConnectSource` is set.
			 * A node with one exit never leaves 0.
			 */
			pendingConnectPortIndex: 0,
		}
	},

	computed: {
		/**
		 * The dot grid, aligned to the world.
		 *
		 * The pattern is scaled by the zoom and offset by the pan, which is
		 * what keeps a dot on the same canvas coordinate as the graph moves —
		 * the layer itself never transforms, so it always fills the viewport
		 * however far the author has panned.
		 *
		 * @return {object} The style bindings.
		 */
		gridStyle() {
			const spacing = Math.max(2, this.gridSize * this.zoom)

			return {
				backgroundSize: `${spacing}px ${spacing}px`,
				backgroundPosition: `${this.panOffset.x}px ${this.panOffset.y}px`,
			}
		},
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
			// A node's OWN size wins over the canvas default, so one long note
			// or one wide card can be given room without every node growing.
			// The default is unchanged for a node that declares none, so no
			// existing consumer moves.
			const width = (Number(node.width) > 0 ? Number(node.width) : this.nodeWidth)
			const height = (Number(node.height) > 0 ? Number(node.height) : this.nodeHeight)

			return {
				left: `${node.x}px`,
				top: `${node.y}px`,
				width: `${width}px`,
				minHeight: `${height}px`,
			}
		},

		/**
		 * Resize a node from the keyboard.
		 *
		 * A grip is a pointer gesture, and a pointer gesture cannot be the only
		 * way to perform an action (WCAG 2.1 AA 2.1.1). Arrow keys on the
		 * focused grip resize in the same steps the arrows move a node by, so
		 * the two gestures are learned once.
		 *
		 * @param {object}        node  The node.
		 * @param {KeyboardEvent} event The key event.
		 * @return {void}
		 */
		onResizeKeydown(node, event) {
			if (this.readOnly) return
			const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
			if (keys.includes(event.key) === false) return

			event.preventDefault()
			event.stopPropagation()
			const step = event.shiftKey ? KEY_STEP_COARSE : KEY_STEP
			const dx = (event.key === 'ArrowLeft' ? -step : 0) + (event.key === 'ArrowRight' ? step : 0)
			const dy = (event.key === 'ArrowUp' ? -step : 0) + (event.key === 'ArrowDown' ? step : 0)
			const width = (Number(node.width) > 0 ? Number(node.width) : this.nodeWidth)
			const height = (Number(node.height) > 0 ? Number(node.height) : this.nodeHeight)

			this.$emit('node-resize', {
				id: node.id,
				width: Math.max(MIN_NODE_SIZE, width + dx),
				height: Math.max(MIN_NODE_SIZE, height + dy),
			})
		},

		/**
		 * Begin resizing a node from its corner grip.
		 *
		 * @param {object}     node  The node.
		 * @param {MouseEvent} event The mousedown event.
		 * @return {void}
		 */
		onResizeMouseDown(node, event) {
			if (this.readOnly) return
			const point = this.toCanvasPoint(event)
			this.resizingNode = {
				id: node.id,
				startX: point.x,
				startY: point.y,
				width: (Number(node.width) > 0 ? Number(node.width) : this.nodeWidth),
				height: (Number(node.height) > 0 ? Number(node.height) : this.nodeHeight),
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
		 * The ports a node renders.
		 *
		 * A node MAY declare `ports: [{id, side, kind, label}]`. One that does
		 * not gets the historical single right-hand out-port, so every existing
		 * consumer keeps its behaviour — this is additive.
		 *
		 * `side` is `left` | `right` | `top`. `top` is where a loop node puts
		 * its body ports: the nodes a loop repeats hang off the top edge as a
		 * visible sub-list, clear of the left-to-right flow of the main chain.
		 * Pagination is the case that motivates it — the loop yields a page of
		 * objects and re-enters until the source is exhausted, and the steps
		 * that run per page are legible as a group rather than as a detour in
		 * the middle of the line.
		 *
		 * @param {object} node The node.
		 * @return {Array<object>} Its ports, in render order.
		 */
		portsFor(node) {
			if (this.connectable === false || this.readOnly === true) {
				return []
			}

			const declared = Array.isArray(node.ports) ? node.ports : null
			if (declared === null) {
				return [{ id: 'out', side: 'right', kind: 'out', label: null }]
			}

			return declared.map((port, index) => ({
				id: (port.id ?? `port-${index}`),
				side: (port.side ?? 'right'),
				// A left port receives and cannot originate a connection; every
				// other side is an origin unless it says otherwise.
				kind: (port.kind ?? (port.side === 'left' ? 'in' : 'out')),
				label: (port.label ?? null),
			}))
		},

		/**
		 * Position one port ON its border, spread evenly when a side has several.
		 *
		 * Several ports on one side is the branching case: a node with three
		 * exits shows three origins, so which branch a line leaves from is
		 * readable without opening the node's configuration. They are spread at
		 * `(i + 1) / (n + 1)` so the set stays centred and symmetric whatever
		 * `n` is, rather than bunching at one end.
		 *
		 * Siblings are that NODE's ports on that side — never a list shared
		 * across nodes. Grouping globally would position a node's single port by
		 * its index among every port in the graph, so one node gaining a branch
		 * would move the ports of every other node.
		 *
		 * @param {object} node The node the port belongs to.
		 * @param {object} port The port.
		 * @return {object} The style object.
		 */
		portStyle(node, port) {
			const siblings = this.portsFor(node).filter((candidate) => candidate.side === port.side)
			const index = Math.max(0, siblings.findIndex((candidate) => candidate.id === port.id))
			const offset = `${((index + 1) / (siblings.length + 1)) * 100}%`

			if (port.side === 'top') {
				return { left: offset, top: '0%' }
			}

			if (port.side === 'left') {
				return { left: '0%', top: offset }
			}

			return { left: '100%', top: offset }
		},

		/**
		 * Accessible name for a port.
		 *
		 * A branch port names its branch, because "drag to connect" on three
		 * identical buttons tells a keyboard or screen-reader user nothing about
		 * which one they are on.
		 *
		 * @param {object} node The node.
		 * @param {object} port The port.
		 * @return {string} The label.
		 */
		portLabel(node, port) {
			if (port.label) {
				return port.label
			}

			if (port.kind === 'in') {
				return t('nextcloud-vue', 'Incoming connections')
			}

			return t('nextcloud-vue', 'Drag to connect, or press c to connect with the keyboard')
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
				// `sourcePort` is OMITTED, not set to null, when the drag came
				// from a node using the default port. Adding a key changes the
				// payload's shape for every existing consumer — an equality
				// assertion on `{source, target}` fails on the extra key alone,
				// which is how this was caught. Absent means "no port involved".
				const connection = { source: this.drawingConnection.source, target: node.id }
				if (this.drawingConnection.sourcePort) {
					connection.sourcePort = this.drawingConnection.sourcePort
				}

				/**
				 * @event connect A connection was drawn between two nodes.
				 * `sourcePort` names the port it left from, when the source node
				 * declares ports — that is what tells a consumer WHICH branch was
				 * drawn. Absent for a node using the default port, so a consumer
				 * that ignores it keeps working.
				 * @type {{source: string, target: string, sourcePort: ?string}}
				 */
				this.$emit('connect', connection)
			}
			this.drawingConnection = null
			this.draggingNode = null
			this.resizingNode = null
		},

		/**
		 * Start drawing a connection from one of a node's ports.
		 *
		 * @param {object} node The source node.
		 * @param {MouseEvent} event The mousedown event.
		 * @param {object|null} port The port dragged from, or null for a node
		 *                           using the default single out-port.
		 * @return {void}
		 */
		onConnectionStart(node, event, port = null) {
			if (this.readOnly) return
			// An `in` port receives; it never originates. Without this a user
			// could drag backwards out of an inbound port and create an edge
			// pointing the wrong way, which reads on the canvas as the flow
			// running in reverse.
			if (port !== null && port.kind === 'in') return

			// The draft line starts AT THE PORT, not at the node's centre, so
			// what the user drags is anchored where they grabbed. Starting from
			// the centre made the line appear to emerge from under the card.
			const start = (port === null) ? this.nodeCentre(node) : this.portPoint(node, port)
			const point = this.toCanvasPoint(event)
			this.drawingConnection = {
				source: node.id,
				sourcePort: (port === null ? null : port.id),
				startX: start.x,
				startY: start.y,
				currentX: point.x,
				currentY: point.y,
			}
		},

		/**
		 * A port's position in canvas space.
		 *
		 * The same arithmetic as `portStyle()`, in canvas units rather than
		 * percentages, so an edge drawn to a port and the port itself land on
		 * the same pixel. Consumers use it to route lines port-to-port instead
		 * of centre-to-centre.
		 *
		 * @param {object} node The node.
		 * @param {object} port The port.
		 * @return {{x: number, y: number}} The port's centre.
		 */
		portPoint(node, port) {
			const siblings = this.portsFor(node).filter((candidate) => candidate.side === port.side)
			const index = Math.max(0, siblings.findIndex((candidate) => candidate.id === port.id))
			const fraction = (index + 1) / (siblings.length + 1)

			if (port.side === 'top') {
				return { x: node.x + (this.nodeWidth * fraction), y: node.y }
			}

			if (port.side === 'left') {
				return { x: node.x, y: node.y + (this.nodeHeight * fraction) }
			}

			return { x: node.x + this.nodeWidth, y: node.y + (this.nodeHeight * fraction) }
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
			if (this.resizingNode) {
				const point = this.toCanvasPoint(event)
				/**
				 * @event node-resize A node was resized. Sizes are owned by the
				 * consumer exactly as positions are: the canvas reports intent
				 * and never mutates `nodes`.
				 * @type {{id: string, width: number, height: number}}
				 */
				this.$emit('node-resize', {
					id: this.resizingNode.id,
					width: Math.max(MIN_NODE_SIZE, this.resizingNode.width + (point.x - this.resizingNode.startX)),
					height: Math.max(MIN_NODE_SIZE, this.resizingNode.height + (point.y - this.resizingNode.startY)),
				})
			} else if (this.draggingNode) {
				const point = this.toCanvasPoint(event)
				/**
				 * @event node-move A node was dragged. Positions are owned by the
				 * consumer: the canvas reports intent and does not mutate `nodes`.
				 * @type {{id: string, x: number, y: number}}
				 */
				// NOT clamped to the origin. A graph has no top-left corner: the
				// author decides where the drawing sits, and pinning it to
				// (0,0) means nothing can ever be placed ABOVE or LEFT of
				// whatever is currently highest — so adding a trigger to a
				// finished flow was impossible without dragging every other
				// node down first.
				//
				// Negative coordinates are reachable: the world is panned, so
				// the origin is not an edge of anything.
				this.$emit('node-move', {
					id: this.draggingNode.id,
					x: point.x - this.draggingNode.offsetX,
					y: point.y - this.draggingNode.offsetY,
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
			// Unclamped for the same reason as the drag: the keyboard must be
			// able to reach every position the pointer can (WCAG 2.1 AA 2.1.1),
			// and a clamp here would make "above the flow" mouse-only if the
			// drag allowed it and the keyboard did not.
			this.$emit('node-move', {
				id: node.id,
				x: node.x + dx,
				y: node.y + dy,
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
				this.pendingConnectPortIndex = 0
				return
			}

			// Pressing `c` again on the SOURCE steps through its exits.
			//
			// A routing node has one out-port per branch, and dragging picks the
			// branch by pointing at it. The keyboard had no equivalent: it armed
			// the node and connected from whichever port happened to be first,
			// so every branch after the first was mouse-only (WCAG 2.1.1).
			//
			// One key still does it. On a node with a single exit the behaviour
			// is unchanged — the first repeat runs off the end and cancels, as
			// it always did. On a node with three branches the repeats walk
			// them, and the armed port is highlighted so the choice is visible
			// rather than remembered.
			if (this.pendingConnectSource === node.id) {
				const exits = this.outPortsFor(node)
				if (this.pendingConnectPortIndex + 1 < exits.length) {
					this.pendingConnectPortIndex += 1
					return
				}

				this.pendingConnectSource = null
				this.pendingConnectPortIndex = 0
				return
			}

			const source = this.nodes.find((candidate) => candidate.id === this.pendingConnectSource)
			const exits = source ? this.outPortsFor(source) : []
			const port = exits[this.pendingConnectPortIndex]

			const connection = { source: this.pendingConnectSource, target: node.id }

			// Match the MOUSE payload exactly: `sourcePort` is omitted, not set,
			// when the source declares no ports. `portsFor` synthesises an `out`
			// port for such a node so it still has something to draw and arm —
			// so reading the armed port here would attach a `sourcePort: 'out'`
			// the mouse path never sends, and the two input methods would emit
			// different payloads for the same action. A consumer asserting on
			// `{source, target}` fails on the extra key alone.
			if (Array.isArray(source?.ports) && port && port.id) {
				connection.sourcePort = port.id
			}

			/**
			 * @event connect A connection was drawn between two nodes.
			 */
			this.$emit('connect', connection)

			this.pendingConnectSource = null
			this.pendingConnectPortIndex = 0
		},

		/**
		 * The ports a node can originate a connection FROM.
		 *
		 * @param {object} node The node.
		 * @return {Array<object>} Its out-ports, in render order.
		 */
		outPortsFor(node) {
			return this.portsFor(node).filter((port) => port.kind !== 'in')
		},

		/**
		 * Whether this port is the one a keyboard connection would leave from.
		 *
		 * @param {object} node The node the port belongs to.
		 * @param {object} port The port.
		 * @return {boolean} True when it is armed.
		 */
		isArmedPort(node, port) {
			if (this.pendingConnectSource !== node.id) {
				return false
			}

			return this.outPortsFor(node)[this.pendingConnectPortIndex]?.id === port.id
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

.cn-graph-canvas__resize {
	position: absolute;
	right: 0;
	bottom: 0;
	width: 14px;
	height: 14px;
	padding: 0;
	border: none;
	background: transparent;
	cursor: nwse-resize;
	/* The diagonal is drawn rather than iconed: two hairlines read as a grip at
	   14px where a glyph would be mush. */
	background-image: linear-gradient(
		135deg,
		transparent 0 45%,
		var(--color-border-dark) 45% 55%,
		transparent 55% 100%
	);
	opacity: 0;
}

/* Revealed on hover or focus: a grip on every node at all times is visual
   noise on a graph of thirty. It stays keyboard-reachable because focus shows
   it (WCAG 2.1 AA 2.4.7). */
.cn-graph-canvas__node:hover .cn-graph-canvas__resize,
.cn-graph-canvas__resize:focus-visible {
	opacity: 1;
}

.cn-graph-canvas__resize:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 1px;
}

.cn-graph-canvas__grid {
	position: absolute;
	inset: 0;
	/* Decoration only: it must never take a click meant for the canvas. */
	pointer-events: none;
	/* One dot per cell, in the theme's border colour so it reads as texture
	   rather than as content. `--color-border` is the lightest structural line
	   NC defines, which is what a grid should be. */
	background-image: radial-gradient(circle, var(--color-border) 1px, transparent 1px);
	background-repeat: repeat;
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

/* The port a keyboard connection would leave FROM. On a routing node `c`
   steps through the branches, and without this the author would have to
   remember which one is armed. Ringed AND exposed as aria-pressed, so the
   state is available to a screen reader too — this whole affordance exists
   because branch connections were otherwise mouse-only (WCAG 2.1.1). */
.cn-graph-canvas__handle--armed {
	box-shadow: 0 0 0 3px var(--color-primary-element);
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

/* A port sits ON the border, centred on it.
 *
 * `left`/`top` are supplied inline per port and are the point on the edge;
 * the translate centres the port over that point, so half of it sits inside
 * the card and half outside. Offsetting outward instead (the old
 * `right: -8px`) parked the port BESIDE the border with a gap, and a line
 * drawn to it appeared not to touch the node.
 *
 * The explicit `min-*`/`max-*` are not redundant. Nextcloud gives every
 * `<button>` a minimum clickable height, which silently overrode `height` —
 * a port declared 16x16 measured 16x34 on a live instance, rendering as a bar
 * rather than a dot and, once several ports share one side, overlapping its
 * neighbours. */
.cn-graph-canvas__handle {
	position: absolute;
	transform: translate(-50%, -50%);
	width: 12px;
	height: 12px;
	min-width: 12px;
	min-height: 12px;
	max-width: 12px;
	max-height: 12px;
	padding: 0;
	border: 2px solid var(--color-main-background);
	border-radius: 3px;
	background-color: var(--color-primary-element);
	cursor: crosshair;
}

/* An inbound port is an indicator, not a grab handle: it is where lines LAND.
   Rendered as a bar along the border rather than a square, so entry and exit
   are distinguishable by shape and not only by which side they are on. */
.cn-graph-canvas__handle--in {
	width: 4px;
	min-width: 4px;
	max-width: 4px;
	height: 22px;
	min-height: 22px;
	max-height: 22px;
	border-radius: 2px;
	cursor: default;
	background-color: var(--color-border-dark);
}

/* Loop ports leave from the top edge, where the repeated sub-list hangs. */
.cn-graph-canvas__handle--top {
	cursor: crosshair;
}

.cn-graph-canvas__handle:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}
</style>
