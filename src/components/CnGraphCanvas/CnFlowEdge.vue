<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<!-- Vue Flow ROUTES the line. `getSmoothStepPath` / `getBezierPath` take the
	     handle positions the library measured off the rendered nodes and return
	     the `d`; nothing here computes geometry. That is the whole point of the
	     migration — the previous canvas guessed a node's centre from a
	     `nodeWidth`/`nodeHeight` prop, and edges attached off-centre whenever
	     the guess was wrong. -->
	<BaseEdge
		:id="id"
		:path="path"
		:marker-start="markerStart"
		:marker-end="markerEnd"
		:style="style" />

	<!-- WHICH WAY THE DATA GOES, SAID CONTINUOUSLY RATHER THAN ONCE.

	     The arrowhead states the direction at one end of the line. On a graph
	     with crossings and doubled-back routing that is the one place a reader
	     has to find before they can follow anything, and on a long line it is
	     the far end from where their eye already is. A slow travelling dash
	     says the same thing along the whole path.

	     A SECOND PATH, not a dash on the first: the line itself has to stay
	     solid — a dashed connection already means something in every diagram
	     convention there is — so the pulse rides on top of it.

	     ⚠️ IT MUST BE POSSIBLE TO TURN OFF, AND IT IS OFF FOR ANYONE WHO ASKED.
	     `prefers-reduced-motion` is honoured in CSS (see below), which covers
	     the accessibility obligation without the host having to know about it;
	     `data.animated === false` covers a host that wants a still canvas for
	     its own reasons — a print view, a screenshot, a read-only replay. -->
	<path
		v-if="animated"
		class="cn-flow-edge__pulse"
		:d="path"
		aria-hidden="true" />

	<!-- The label is HTML, not SVG.

	     `EdgeLabelRenderer` is Vue Flow's own portal: it lifts the label out of
	     the SVG layer into a DOM layer that carries the same pan/zoom transform.
	     That matters for more than convenience — the label this replaces was an
	     SVG `<g role="button" tabindex="0">`, and a focusable `<g>` is the kind
	     of element assistive technology treats inconsistently. Here it is a real
	     `<button>`.

	     THE WRAPPER OWNS THE KEYBOARD CONTRACT, the slot owns the chrome — the
	     same division CnFlowNode holds, and for the same reason: a host filling
	     a slot cannot accidentally replace a focusable control with an inert
	     div. -->
	<EdgeLabelRenderer v-if="hasLabel || hasAdornment">
		<div class="cn-flow-edge__layer" :style="labelStyle">
			<button
				v-if="hasLabel"
				type="button"
				class="cn-flow-edge__label"
				:class="{ 'cn-flow-edge__label--dragging': dragging }"
				:aria-label="labelAriaLabel"
				@click.stop="$emit('label-click', id)"
				@keydown="onKeydown"
				@mousedown.stop="onMouseDown"
				@contextmenu.prevent.stop="$emit('label-context', { id, event: $event })">
				<!-- @slot label The chrome of a connection's label. Receives
				     `{ edge }` with the edge's `id`, `data` and `selected`.
				     Render INERT content: the focus, the ARIA state and the
				     arrow keys belong to the wrapper. Anything the host needs
				     to be separately clickable goes in `adornment` instead. -->
				<slot name="label" :edge="{ id, data, selected }" />
			</button>

			<!-- @slot adornment A host's own controls, BESIDE the label rather
			     than inside it.

			     Separate from `label` because the label wrapper is a button and
			     a button cannot contain another one. A replay's payload control
			     — "open the JSON that passed along this connection" — has to be
			     activatable in its own right, so it cannot be part of the
			     label's chrome. -->
			<div v-if="hasAdornment" class="cn-flow-edge__adornment">
				<slot name="adornment" :edge="{ id, data, selected }" />
			</div>
		</div>
	</EdgeLabelRenderer>
</template>

<script>
import { Comment, Fragment, Text } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, getStraightPath } from '@vue-flow/core'
import { DEFAULT_EDGE_LINE_TYPE } from '../../composables/useFlowEdgeStyles.js'

/**
 * How far the label is kept from either end, as a fraction of the line.
 *
 * A label sitting ON a node is unreadable, unclickable, and hides the port
 * underneath it — so the fraction is clamped rather than allowed to reach 0
 * or 1.
 */
const LABEL_MIN_T = 0.08
const LABEL_MAX_T = 0.92

/** How far one arrow-key press slides the label, as a fraction of the line. */
const LABEL_KEY_STEP = 0.05

/**
 * A connection, drawn by Vue Flow, carrying its own label.
 *
 * WHY THIS COMPONENT EXISTS
 * -------------------------
 * Edges used to be hand-drawn by the HOST through an `#edge` slot: the canvas
 * handed out `from`/`to` points and the consumer returned SVG. That slot is
 * gone, and this replaces it.
 *
 * The difference is which side owns the geometry. Under the slot, every
 * consumer wrote its own orthogonal router, its own arrowhead marker and its
 * own midpoint arithmetic — hermiq's ran to some 200 lines — and each one had
 * to be told how big a node was, because SVG cannot ask. Vue Flow measures the
 * rendered node and routes the line itself, so the consumer is left with the
 * only part that was ever app-specific: what the label SAYS.
 *
 * ⚠️ THIS COMPONENT NEVER MUTATES THE EDGE. Moving a label emits `label-move`
 * with the new fraction; the host stores it and feeds it back down as
 * `data.labelT`. Same rule as node positions — see CnGraphCanvas.
 *
 * The label's position is stored as a FRACTION of the way along the line, never
 * as a pixel offset. A label nudged clear of a crossing line has to stay clear
 * after a pan, a zoom and an auto-sort, and only a fraction survives all three:
 * the pixel it sat on means something different after every one of them.
 */
export default {
	name: 'CnFlowEdge',

	components: { BaseEdge, EdgeLabelRenderer },

	// Vue Flow hands an edge its whole internal record. Without this the parts
	// this component does not declare fall through onto the root as DOM
	// attributes, which is invalid markup on an SVG element.
	inheritAttrs: false,

	props: {
		/** Vue Flow's edge id. */
		id: {
			type: String,
			required: true,
		},
		/** Source handle x, in canvas space, as measured by Vue Flow. */
		sourceX: {
			type: Number,
			default: 0,
		},
		/** Source handle y. */
		sourceY: {
			type: Number,
			default: 0,
		},
		/** Target handle x. */
		targetX: {
			type: Number,
			default: 0,
		},
		/** Target handle y. */
		targetY: {
			type: Number,
			default: 0,
		},
		/** Which side the line leaves the source from. */
		sourcePosition: {
			type: String,
			default: 'bottom',
		},
		/** Which side the line enters the target on. */
		targetPosition: {
			type: String,
			default: 'top',
		},
		/** Vue Flow's per-edge data bag. `labelT` is read from here. */
		data: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Router for this line — `smoothstep`, `straight`, or bezier by
		 * default. Named `lineType` rather than `type`, because `type` on an
		 * edge is what the ENGINE reads to decide what the flow does; a
		 * drawing choice must not be able to change behaviour.
		 */
		lineType: {
			type: String,
			default: DEFAULT_EDGE_LINE_TYPE,
		},
		/** Marker at the start of the line, in Vue Flow's shape. */
		markerStart: {
			type: [String, Object],
			default: undefined,
		},
		/** Marker at the end of the line. */
		markerEnd: {
			type: [String, Object],
			default: undefined,
		},
		/** Stroke style for the line. */
		style: {
			type: Object,
			default: () => ({}),
		},
		/** Whether Vue Flow considers this edge selected. */
		selected: {
			type: Boolean,
			default: false,
		},
		/** Accessible name for the label control. */
		labelAriaLabel: {
			type: String,
			default: '',
		},
		/**
		 * Whether a travelling pulse runs along this line to show the direction
		 * of flow. On by default; a host passes false for a still canvas.
		 * Motion is suppressed regardless for a reader who has asked for
		 * reduced motion.
		 */
		animated: {
			type: Boolean,
			default: true,
		},
	},

	emits: [
		/**
		 * @event label-move The label was slid along its line, by pointer or by
		 *   keyboard. Carries `{ id, labelT }` with the fraction already
		 *   clamped. The edge is NOT updated here — the host persists it.
		 */
		'label-move',
		/** @event label-click The label was activated. Carries the edge id. */
		'label-click',
		/**
		 * @event label-context The label was right-clicked. Carries
		 *   `{ id, event }`; hosts open the same menu as for the line itself.
		 */
		'label-context',
	],

	data() {
		return {
			/** Whether a pointer drag of the label is in flight. */
			dragging: false,
		}
	},

	computed: {
		/**
		 * Whether this edge has anything to show.
		 *
		 * ⚠️ TESTS WHAT THE SLOT RENDERS, NOT WHETHER IT EXISTS. A host fills
		 * the slot once, for every edge; most edges have no title. Gating on
		 * the slot's mere presence would therefore put an empty chip on every
		 * unnamed line — and an empty chip reads as a connection whose name is
		 * blank rather than one that never had a name, which is exactly how
		 * "No step type" came to be printed sixteen times on a migrated flow.
		 *
		 * @return {boolean} Whether to draw the label control.
		 */
		hasLabel() {
			if (typeof this.$slots.label !== 'function') {
				return false
			}

			return this.rendersContent(
				this.$slots.label({ edge: { id: this.id, data: this.data, selected: this.selected } }),
			)
		},

		/**
		 * @return {boolean} Whether the host renders any control beside the
		 *   label for this edge. Gated on rendered content for the same reason
		 *   `hasLabel` is: a replay marks a handful of connections out of many,
		 *   and the rest must not carry an empty affordance.
		 */
		hasAdornment() {
			if (typeof this.$slots.adornment !== 'function') {
				return false
			}

			return this.rendersContent(
				this.$slots.adornment({ edge: { id: this.id, data: this.data, selected: this.selected } }),
			)
		},

		/**
		 * The routed line, straight from Vue Flow.
		 *
		 * @return {string} The SVG path data.
		 */
		path() {
			const geometry = {
				sourceX: this.sourceX,
				sourceY: this.sourceY,
				targetX: this.targetX,
				targetY: this.targetY,
				sourcePosition: this.sourcePosition,
				targetPosition: this.targetPosition,
			}

			if (this.lineType === 'straight') {
				return getStraightPath(geometry)[0]
			}

			if (this.lineType === 'default' || this.lineType === 'bezier') {
				return getBezierPath(geometry)[0]
			}

			return getSmoothStepPath(geometry)[0]
		},

		/**
		 * @return {number} Where the label sits, as a clamped fraction.
		 */
		labelT() {
			return this.clampT(Number(this.data.labelT ?? 0.5))
		},

		/**
		 * Where to put the label, in canvas space.
		 *
		 * Measured ALONG THE ROUTED PATH rather than along the straight line
		 * between the endpoints, so a label on a smoothstep edge sits on the
		 * line it belongs to instead of floating across the corner it cuts.
		 *
		 * @return {{x: number, y: number}} The point.
		 */
		labelPoint() {
			return this.pointAt(this.path, this.labelT)
		},

		/**
		 * @return {object} Inline style placing the label at its point.
		 */
		labelStyle() {
			return {
				transform: `translate(-50%, -50%) translate(${this.labelPoint.x}px, ${this.labelPoint.y}px)`,
			}
		},
	},

	methods: {
		/**
		 * Whether a rendered slot amounts to anything visible.
		 *
		 * `v-if` that fails leaves a COMMENT vnode behind, and a slot holding
		 * only whitespace leaves an empty text node. Both are "the host chose
		 * to render nothing", and neither is caught by checking that the slot
		 * returned an array.
		 *
		 * @param {Array<object>} vnodes What the slot returned.
		 * @return {boolean} Whether any of it draws.
		 */
		rendersContent(vnodes) {
			if (Array.isArray(vnodes) === false) {
				return false
			}

			return vnodes.some((vnode) => {
				if (vnode === null || vnode === undefined || typeof vnode !== 'object') {
					return false
				}

				// A comment placeholder — the shape a failed `v-if` leaves.
				if (vnode.type === Comment) {
					return false
				}

				// A fragment stands for its children, so look through it.
				if (vnode.type === Fragment) {
					return this.rendersContent(vnode.children)
				}

				if (vnode.type === Text) {
					return String(vnode.children ?? '').trim() !== ''
				}

				return true
			})
		},

		/**
		 * Keep a fraction off both endpoints.
		 *
		 * @param {number} t The raw fraction.
		 * @return {number} The clamped fraction.
		 */
		clampT(t) {
			if (Number.isFinite(t) === false) {
				return 0.5
			}

			return Math.min(LABEL_MAX_T, Math.max(LABEL_MIN_T, t))
		},

		/**
		 * A point a fraction of the way along an SVG path.
		 *
		 * Uses the browser's own path measurement on a DETACHED element — no
		 * need to reach into what BaseEdge rendered, and no dependency on the
		 * line already being in the document.
		 *
		 * ⚠️ `getTotalLength` is one of the SVG geometry methods jsdom does not
		 * implement, so this falls back to interpolating between the endpoints.
		 * That keeps the component mountable in the unit lane; the fallback is
		 * the straight-line reading of the very same fraction, so a test can
		 * still assert that a label moved and in which direction.
		 *
		 * @param {string} d The path data.
		 * @param {number} t The fraction.
		 * @return {{x: number, y: number}} The point.
		 */
		pointAt(d, t) {
			try {
				const element = document.createElementNS('http://www.w3.org/2000/svg', 'path')

				element.setAttribute('d', d)

				const length = element.getTotalLength()

				if (length > 0) {
					const point = element.getPointAtLength(length * t)

					return { x: point.x, y: point.y }
				}
			} catch (error) {
				// Falls through to the straight-line reading below.
			}

			return {
				x: this.sourceX + (this.targetX - this.sourceX) * t,
				y: this.sourceY + (this.targetY - this.sourceY) * t,
			}
		},

		/**
		 * Slide the label with the arrow keys.
		 *
		 * A drag is a pointer gesture and cannot be the only route to an action
		 * (WCAG 2.1 AA 2.1.1), so the same move is on the keyboard. It lives
		 * here rather than in each consumer because every consumer would
		 * otherwise owe the same obligation and any one of them could forget.
		 *
		 * @param {KeyboardEvent} event The key event.
		 * @return {void}
		 */
		onKeydown(event) {
			const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key]

			if (direction === undefined) {
				return
			}

			event.preventDefault()
			event.stopPropagation()

			this.moveLabel(this.labelT + direction * LABEL_KEY_STEP)
		},

		/**
		 * Begin a pointer drag of the label.
		 *
		 * The fraction is taken by projecting the pointer onto the straight
		 * line between the endpoints — the label is then PLACED on the routed
		 * path at that fraction. On a curved or stepped line the two differ
		 * slightly, which is why the label follows the line rather than the
		 * cursor exactly.
		 *
		 * @param {MouseEvent} event The mousedown.
		 * @return {void}
		 */
		onMouseDown(event) {
			const pane = event.target.closest('.vue-flow__pane, .cn-graph-canvas')

			if (pane === null) {
				return
			}

			this.dragging = true

			const onMove = (moveEvent) => {
				this.moveLabel(this.fractionAt(moveEvent, pane))
			}

			const onUp = () => {
				this.dragging = false
				window.removeEventListener('mousemove', onMove)
				window.removeEventListener('mouseup', onUp)
			}

			window.addEventListener('mousemove', onMove)
			window.addEventListener('mouseup', onUp)
		},

		/**
		 * Where a pointer sits along this line, as a fraction.
		 *
		 * @param {MouseEvent} event The pointer event.
		 * @param {HTMLElement} pane The element the canvas transform applies to.
		 * @return {number} The fraction.
		 */
		fractionAt(event, pane) {
			const bounds = pane.getBoundingClientRect()
			const dx = this.targetX - this.sourceX
			const dy = this.targetY - this.sourceY
			const lengthSquared = dx * dx + dy * dy

			if (lengthSquared === 0) {
				return this.labelT
			}

			// The pane's box is in screen space and the endpoints are in canvas
			// space; the ratio between the two is the current zoom, which is
			// what `scale` recovers without having to read the transform.
			const scale = bounds.width === 0 ? 1 : pane.offsetWidth / bounds.width
			const x = (event.clientX - bounds.left) * scale
			const y = (event.clientY - bounds.top) * scale

			return ((x - this.sourceX) * dx + (y - this.sourceY) * dy) / lengthSquared
		},

		/**
		 * Report a new label position.
		 *
		 * @param {number} t The proposed fraction.
		 * @return {void}
		 */
		moveLabel(t) {
			this.$emit('label-move', { id: this.id, labelT: this.clampT(t) })
		},
	},
}
</script>

<style scoped>
/* `pointer-events` is OFF on the layer EdgeLabelRenderer creates, so that the
   layer does not swallow clicks meant for the canvas underneath. A control in
   it has to turn them back on for itself. */
.cn-flow-edge__layer {
	position: absolute;
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-flow-edge__adornment {
	pointer-events: all;
	display: flex;
	align-items: center;
	gap: 4px;
}

.cn-flow-edge__label {
	pointer-events: all;
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 10px;
	border: 1px solid var(--color-border, #d0d0d0);
	border-radius: 11px;
	background: var(--color-main-background, #fff);
	color: var(--color-main-text, #222);
	font-size: 11px;
	line-height: 18px;
	white-space: nowrap;
	cursor: grab;
}

.cn-flow-edge__label:focus-visible {
	outline: 2px solid var(--color-primary-element, #0082c9);
	outline-offset: 1px;
}

.cn-flow-edge__label--dragging {
	cursor: grabbing;
}

/* The travelling pulse. `stroke-dashoffset` walks from the dash period down to
   zero, which slides the pattern FORWARDS along the path — source to target,
   the same direction the arrowhead points. Running it the other way would give
   the canvas two direction cues that disagree.

   Deliberately slow and sparse: this sits behind whatever the user is actually
   doing, and a fast marching-ants line on every connection of a twenty-step
   flow is a distraction rather than information. */
.cn-flow-edge__pulse {
	fill: none;
	stroke: var(--color-primary-element, #0082c9);
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-dasharray: 1 16;
	pointer-events: none;
	animation: cn-flow-edge-pulse 1.6s linear infinite;
}

@keyframes cn-flow-edge-pulse {
	from {
		stroke-dashoffset: 17;
	}

	to {
		stroke-dashoffset: 0;
	}
}

/* ⚠️ HIDDEN, NOT MERELY STOPPED. A paused animation leaves the dash pattern
   frozen wherever it stood, so a still line would keep a row of dots on it that
   look like a second, dotted connection. WCAG 2.2 AA 2.3.3 asks for the motion
   to go; leaving its residue behind would be the letter without the point. */
@media (prefers-reduced-motion: reduce) {
	.cn-flow-edge__pulse {
		display: none;
	}
}
</style>
