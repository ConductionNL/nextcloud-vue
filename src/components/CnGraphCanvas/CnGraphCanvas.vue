<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div class="cn-graph-canvas" @drop="onDrop" @dragover.prevent>
		<VueFlow
			:nodes="nodes"
			:edges="edges"
			:min-zoom="minZoom"
			:max-zoom="maxZoom"
			:fit-view-on-init="fitView"
			:snap-to-grid="snapToGrid"
			:snap-grid="snapGrid"
			:nodes-draggable="interactive"
			:nodes-connectable="interactive"
			:elements-selectable="interactive"
			:connection-mode="connectionMode"
			@nodes-change="onNodesChange"
			@edges-change="onEdgesChange"
			@connect="onConnect"
			@node-click="onNodeClick"
			@edge-click="onEdgeClick"
			@pane-click="onPaneClick">
			<!-- Per-type node components, Vue Flow's convention. A host that
			     registers `type: 'trigger'` gets `#node-trigger`; anything
			     unregistered falls back to CnFlowNode, which carries the
			     keyboard contract. -->
			<template #node-default="nodeProps">
				<!-- `@connect` routes a KEYBOARD-completed connection into the
				     same handler as a pointer one, so `onConnect` is the single
				     place a new edge leaves this component regardless of input.
				     Without it the keyboard path wrote into Vue Flow's internal
				     graph and the host never heard about it — the edge drew and
				     the save dropped it. -->
				<CnFlowNode
					v-bind="nodeProps"
					@connect="onConnect">
					<template #default="slotProps">
						<!-- @slot node The body of a step, rendered inside the
						     focusable node wrapper. Receives `{ node }` with the
						     node's `id`, `data` and `selected`. The wrapper — and
						     with it the keyboard contract and ARIA state — stays
						     the canvas's, so a host cannot accidentally replace a
						     focusable node with an inert div. -->
						<slot name="node" v-bind="slotProps" />
					</template>
				</CnFlowNode>
			</template>

			<!-- Per-type edge components, the same convention as nodes above.
			     Registered on `default` because that is the type an edge gets
			     when nothing else is asked for — which is every edge, now that
			     the ROUTER moved off `type` and into `data.lineType`.

			     That move is the edge half of the lesson the node slot records:
			     `type` selects a COMPONENT, and a router is not a component. So
			     long as `type` carried `smoothstep`, Vue Flow answered with its
			     own built-in edge and no consumer could add anything to a line
			     at all. -->
			<template #edge-default="edgeProps">
				<CnFlowEdge
					v-bind="edgeProps"
					:line-type="edgeProps.data && edgeProps.data.lineType"
					:label-aria-label="edgeProps.data && edgeProps.data.labelAriaLabel"
					@label-move="onEdgeLabelMove"
					@label-click="onEdgeLabelClick"
					@label-context="onEdgeLabelContext">
					<template #label="slotProps">
						<!-- @slot edge-label The chrome of a connection's
						     label. Receives `{ edge }` with the edge's `id`,
						     `data` and `selected`. Rendered inside a focusable
						     control the canvas owns, so render inert content:
						     the arrow keys, the focus ring and the ARIA name
						     are already handled. An edge whose host renders
						     nothing here draws no label control at all. -->
						<slot name="edge-label" v-bind="slotProps" />
					</template>

					<template #adornment="slotProps">
						<!-- @slot edge-adornment A host's own controls beside a
						     connection's label. Receives `{ edge }`. Unlike
						     `edge-label` this is NOT inside the label's button,
						     so what goes here may be interactive — a replay's
						     payload control is the case it exists for. -->
						<slot name="edge-adornment" v-bind="slotProps" />
					</template>
				</CnFlowEdge>
			</template>

			<Background v-if="showBackground" :gap="snapGrid[0]" />
			<MiniMap v-if="showMiniMap" />
		</VueFlow>

		<!-- OUR OWN CONTROLS, not `@vue-flow/controls`.
		     The library's control bar renders bare <button> elements with an
		     icon and no accessible name, which axe reports as `button-name` at
		     SERIOUS impact — caught by the e2e in this change, not by the unit
		     lane or the gates. Rather than ship a control bar a screen-reader
		     user cannot identify, the buttons are ours and carry real labels. -->
		<div v-if="showControls" class="cn-graph-canvas__controls">
			<button
				type="button"
				class="cn-graph-canvas__control"
				:aria-label="t('nextcloud-vue', 'Zoom in')"
				@click="zoomIn()">
				+
			</button>
			<button
				type="button"
				class="cn-graph-canvas__control"
				:aria-label="t('nextcloud-vue', 'Zoom out')"
				@click="zoomOut()">
				−
			</button>
			<button
				type="button"
				class="cn-graph-canvas__control"
				:aria-label="t('nextcloud-vue', 'Fit the whole flow in view')"
				@click="fitViewNow()">
				⤢
			</button>
		</div>
	</div>
</template>

<script>
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import CnFlowNode from './CnFlowNode.vue'
import CnFlowEdge from './CnFlowEdge.vue'

/**
 * A graph canvas built on Vue Flow — the library n8n runs.
 *
 * WHY THIS IS NOT A WRAPPER AROUND THE OLD API
 * --------------------------------------------
 * This component used to be ~1,300 hand-written lines re-implementing pan,
 * zoom, drag, connect, resize and hit-testing on a bare SVG, because the fleet
 * was on Vue 2.7 and every maintained canvas library is Vue-3-only (ADR-065
 * §5). ADR-081 removed that constraint and named this library as the reason for
 * the migration.
 *
 * The props therefore MOVED rather than being translated. The graph page was
 * not in production, so there was no consumer to protect, and a shim can only
 * ever expose what the old API could already express — `fitView`, `<MiniMap>`,
 * `connectionMode` and the node resizer would all have stayed unreachable
 * behind props designed for a hand-drawn SVG.
 *
 * `nodeWidth` / `nodeHeight` are gone entirely. They existed only so hand-drawn
 * edges could guess where a node's centre was, and the old docblock admitted
 * the failure mode: "set them to match what your node slot actually renders, or
 * edges will attach off-centre". Vue Flow measures the rendered node, so the
 * whole class of bug went with the props.
 *
 * ⚠️ THE CANVAS STILL NEVER MUTATES THE GRAPH. Vue Flow is perfectly willing to
 * own node positions internally; here it does not. Changes are emitted and the
 * host decides what to persist — the same rule the previous implementation
 * held, and the reason a canvas can be dropped into a read-only surface without
 * auditing it first.
 *
 * ⚠️ KEYBOARD OPERATION LIVES IN {@see CnFlowNode}. Vue Flow is pointer-first;
 * the focus/ARIA/key contract is re-implemented in the node component, not
 * inherited from the library. See that file for why the multi-exit case is the
 * one that matters.
 */
export default {
	name: 'CnGraphCanvas',

	components: { VueFlow, Background, MiniMap, CnFlowNode, CnFlowEdge },

	props: {
		/** Nodes in Vue Flow's shape: `{ id, type, position: {x,y}, data }`. */
		nodes: {
			type: Array,
			required: true,
		},
		/** Edges in Vue Flow's shape: `{ id, source, target }`. */
		edges: {
			type: Array,
			required: true,
		},
		/**
		 * When true, every interaction is refused — drag, connect AND select.
		 *
		 * Expressed as three Vue Flow flags below. Missing one produces a canvas
		 * that LOOKS locked and is not, so the three are set together and tested
		 * together.
		 */
		readOnly: {
			type: Boolean,
			default: false,
		},
		/** Frame the whole graph on first render. */
		fitView: {
			type: Boolean,
			default: true,
		},
		/** Snap dragged nodes to the grid. */
		snapToGrid: {
			type: Boolean,
			default: true,
		},
		/** Grid spacing, as Vue Flow's `[x, y]`. */
		snapGrid: {
			type: Array,
			default: () => [16, 16],
		},
		/** Minimum zoom. */
		minZoom: {
			type: Number,
			default: 0.2,
		},
		/** Maximum zoom. */
		maxZoom: {
			type: Number,
			default: 2,
		},
		/** Vue Flow's connection mode — `loose` or `strict`. */
		connectionMode: {
			type: String,
			default: 'loose',
		},
		/** Draw the dotted background. */
		showBackground: {
			type: Boolean,
			default: true,
		},
		/** Draw the zoom/fit controls. */
		showControls: {
			type: Boolean,
			default: true,
		},
		/** Draw the minimap. */
		showMiniMap: {
			type: Boolean,
			default: false,
		},
	},

	emits: [
		'nodes-change',
		'edges-change',
		'connect',
		'node-select',
		'edge-select',
		'edge-label-move',
		'edge-label-click',
		'edge-label-context',
		'canvas-click',
		'canvas-drop',
	],

	setup() {
		// ⚠️ ALIASED. `fitView` is already a BOOLEAN PROP on this component
		// (frame the graph on first render), and Vue Flow's composable exports a
		// FUNCTION of the same name. Returning both puts two `fitView` bindings
		// on the instance — eslint's `vue/no-dupe-keys` catches it, but the
		// symptom would have been a fit button that tries to call `true`.
		const { project, zoomIn, zoomOut, fitView: fitViewNow } = useVueFlow()

		return { project, zoomIn, zoomOut, fitViewNow }
	},

	computed: {
		/**
		 * @return {boolean} Whether the canvas accepts interaction at all.
		 */
		interactive() {
			return this.readOnly === false
		},
	},

	methods: {
		/**
		 * Forward Vue Flow's node changes.
		 *
		 * @param {Array<object>} changes The changes.
		 * @return {void}
		 */
		onNodesChange(changes) {
			/**
			 * @event nodes-change Vue Flow's node change stream — position,
			 *   selection, dimensions, removal. The canvas does NOT apply these;
			 *   the host decides what to persist. Drag frames arrive with
			 *   `dragging: true`, so a host that writes on every change writes
			 *   once per animation frame.
			 */
			this.$emit('nodes-change', changes)
		},

		/**
		 * Forward Vue Flow's edge changes.
		 *
		 * @param {Array<object>} changes The changes.
		 * @return {void}
		 */
		onEdgesChange(changes) {
			/**
			 * @event edges-change Vue Flow's edge change stream, same contract
			 *   as `nodes-change`: reported, never applied here.
			 */
			this.$emit('edges-change', changes)
		},

		/**
		 * Forward a new connection.
		 *
		 * @param {object} connection The connection.
		 * @return {void}
		 */
		onConnect(connection) {
			/**
			 * @event connect A new connection was made, by pointer OR by
			 *   keyboard. Carries Vue Flow's
			 *   `{ source, target, sourceHandle, targetHandle }`.
			 */
			this.$emit('connect', connection)
		},

		/**
		 * Forward a node click.
		 *
		 * @param {object} event Vue Flow's node event.
		 * @return {void}
		 */
		onNodeClick(event) {
			/**
			 * @event node-select A node was clicked. Payload is Vue Flow's
			 *   `{ node }`, so a host tracking bare ids reads `event.node.id`.
			 */
			this.$emit('node-select', event)
		},

		/**
		 * Forward an edge click.
		 *
		 * @param {object} event Vue Flow's edge event.
		 * @return {void}
		 */
		onEdgeClick(event) {
			/**
			 * @event edge-select An edge was clicked.
			 */
			this.$emit('edge-select', event)
		},

		/**
		 * Forward a label slid along its line.
		 *
		 * @param {{id: string, labelT: number}} payload The edge and its new
		 *   fraction, already clamped.
		 * @return {void}
		 */
		onEdgeLabelMove(payload) {
			/**
			 * @event edge-label-move A connection's label was moved, by pointer
			 *   or by keyboard. Carries `{ id, labelT }`. As everywhere else in
			 *   this component the change is REPORTED, not applied — the host
			 *   stores `labelT` and feeds it back down.
			 */
			this.$emit('edge-label-move', payload)
		},

		/**
		 * Forward an activated label.
		 *
		 * @param {string} id The edge id.
		 * @return {void}
		 */
		onEdgeLabelClick(id) {
			/**
			 * @event edge-label-click A connection's label was activated.
			 */
			this.$emit('edge-label-click', id)
		},

		/**
		 * Forward a right-click on a label.
		 *
		 * @param {{id: string, event: MouseEvent}} payload The edge and event.
		 * @return {void}
		 */
		onEdgeLabelContext(payload) {
			/**
			 * @event edge-label-context A connection's label was right-clicked.
			 *   Hosts open the same menu they open for the line itself.
			 */
			this.$emit('edge-label-context', payload)
		},

		/**
		 * Forward a click on the empty pane.
		 *
		 * @param {object} event The click event.
		 * @return {void}
		 */
		onPaneClick(event) {
			/**
			 * @event canvas-click The empty pane was clicked — hosts use this to
			 *   clear a selection.
			 */
			this.$emit('canvas-click', event)
		},

		/**
		 * A palette drop, with the point already converted to canvas space.
		 *
		 * Kept as a Conduction-level event because HTML5 drop plus coordinate
		 * projection is glue every consumer would otherwise write. The
		 * projection is Vue Flow's `project()` rather than the old hand-rolled
		 * `(clientX - rect.left - panOffset.x) / zoom`.
		 *
		 * The canvas does not create the node — the host does, mirroring the
		 * rule that it never mutates positions either.
		 *
		 * @param {DragEvent} event The drop event.
		 * @return {void}
		 */
		onDrop(event) {
			if (this.readOnly === true) {
				return
			}

			const bounds = this.$el.getBoundingClientRect()
			const position = this.project({
				x: event.clientX - bounds.left,
				y: event.clientY - bounds.top,
			})

			/**
			 * @event canvas-drop An HTML5 drop landed on the canvas, with
			 *   `position` already projected into canvas space and the native
			 *   `event` alongside so the host can read `dataTransfer`. The canvas
			 *   never creates the node itself.
			 */
			this.$emit('canvas-drop', { position, event })
		},
	},
}
</script>

<style>
/* Vue Flow's own stylesheet, themed through Nextcloud variables. Imported
   un-scoped because it styles elements Vue Flow renders outside this
   component's scope. */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

/* ⚠️ EVERY VUE FLOW PLUGIN SHIPS ITS OWN STYLESHEET, AND ONLY CORE'S WAS HERE.

   `@vue-flow/node-resizer` was the one that mattered: its stylesheet is what
   gives a resize control `position: absolute` and a 5px handle. Without it the
   handles CnFlowNode renders have no size and no position, so a node that is
   resizable looks exactly like a node that is not — the component was mounted
   and the affordance was invisible.

   The minimap's own sheet is small (a background colour and the grab cursors);
   its geometry comes from `.vue-flow__panel` in core, which was already here.
   Imported for the cursors, and before our own rules so the theme below still
   wins. */
@import '@vue-flow/node-resizer/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.cn-graph-canvas {
	position: relative;
	width: 100%;
	height: 100%;
	min-height: 320px;
}

/* ⚠️ VUE FLOW'S DEFAULT NODE DRAWS A BOX WE NEVER ASKED FOR.

   Every node this canvas renders goes through the `#node-default` slot, so
   Vue Flow wraps our CnFlowNode in `.vue-flow__node-default` — and
   `theme-default.css` gives that wrapper a 1px border, a white background and
   10px of padding. The result was a box around our box: the wrapper's border,
   then `.cn-flow-node`'s own. Nothing failed and nothing warned; a node just
   quietly had one more outline than it was designed to have.

   Stripped, not restyled: `.cn-flow-node` is the node's chrome, and it is the
   ONLY border a node draws. `width` stays 150px because Vue Flow measures the
   wrapper to route edges and place handles — dropping it would move every
   node's footprint, which is a layout change, not a fix for a stray border. */
.cn-graph-canvas .vue-flow__node-default {
	padding: 0;
	border: 0;
	border-radius: 0;
	background: none;

	/* The handle colour reaches `.cn-flow-node__handle` through this variable.
	   Vue Flow's own `.vue-flow__node-default .vue-flow__handle` rule outranks
	   our single-class one, so a themed handle lost to a hard-coded #1a192b on
	   every node — setting the variable themes it at the source instead of
	   fighting the specificity. */
	--vf-handle: var(--color-primary-element, #0082c9);
}

/* The selected/focus/hover states re-assert the border and shadow the rule
   above just removed, so they have to be stripped too — otherwise clicking a
   node brought the extra box back. Selection is shown by `.cn-flow-node--selected`,
   and focus by `.cn-flow-node:focus-visible`, both on the node itself. */
.cn-graph-canvas .vue-flow__node-default.selected,
.cn-graph-canvas .vue-flow__node-default.selected:hover,
.cn-graph-canvas .vue-flow__node-default.selectable:hover,
.cn-graph-canvas .vue-flow__node-default:focus,
.cn-graph-canvas .vue-flow__node-default:focus-visible {
	border: 0;
	box-shadow: none;
}

/* THEME, NOT OVERRIDE. Every colour comes from a Nextcloud variable with a
   fallback, so the canvas follows the user's theme — including dark — instead
   of being the one component that ignores it. */
.cn-graph-canvas .vue-flow__background {
	background: var(--color-main-background, #fff);
}

.cn-graph-canvas .vue-flow__edge-path {
	stroke: var(--color-border-dark, #888);
}

.cn-graph-canvas .vue-flow__edge.selected .vue-flow__edge-path {
	stroke: var(--color-primary-element, #0082c9);
}

.cn-graph-canvas__controls {
	position: absolute;
	bottom: 12px;
	left: 12px;
	display: flex;
	flex-direction: column;
	z-index: 5;
}

.cn-graph-canvas__control {
	width: 28px;
	height: 28px;
	border: 1px solid var(--color-border, #d0d0d0);
	background: var(--color-main-background, #fff);
	color: var(--color-main-text, #222);
	cursor: pointer;
}

.cn-graph-canvas__control:focus-visible {
	outline: 2px solid var(--color-primary-element, #0082c9);
	outline-offset: 1px;
}

.cn-graph-canvas .vue-flow__minimap {
	background: var(--color-background-dark, #ededed);
}
</style>
