<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<!-- `cn-graph-canvas__node` IS A COMPATIBILITY ALIAS, NOT A SECOND NAME
	     THIS COMPONENT USES.

	     Up to 2.11.1 the canvas was a bespoke SVG implementation in
	     CnGraphCanvas.vue and a node was `.cn-graph-canvas__node`. 2.15.0
	     rewrote it on Vue Flow and moved the node into this component under
	     `.cn-flow-node`. Nothing announced that: the old class still appears in
	     the shipped CSS and source maps, so it looked like it was still there,
	     and consumers pin a range (`^2.8.0`) that allowed the move silently.

	     Three apps broke on it at once — openregister#2815, integriq#1548 and
	     pipelinq#1411 all select `.cn-graph-canvas__node` to assert the canvas
	     rendered, and against 2.15.0 that locator matches nothing. The canvas
	     was drawing correctly; the assertion was pointed at a name that had
	     moved. See nextcloud-vue#749.

	     Keeping the old class here makes the rewrite a drop-in for anything
	     written against the old contract, at the cost of one class. Style it
	     never: the styling belongs to `cn-flow-node`. -->
	<div
		class="cn-flow-node cn-graph-canvas__node"
		:class="{
			'cn-flow-node--selected': selected,
			'cn-flow-node--arming': armedPortIndex !== null,
		}"
		tabindex="0"
		role="button"
		:aria-label="ariaLabel"
		:aria-pressed="selected ? 'true' : 'false'"
		@keydown="onKeydown">
		<!-- Resize handles, when the host allows it. `@vue-flow/node-resizer`
		     draws the pointer affordance; the keyboard path is `r` + arrows in
		     onKeydown below, because the resizer itself is pointer-only and the
		     canvas this replaces could be resized from the keyboard. -->
		<NodeResizer v-if="resizable" :min-width="80" :min-height="40" />

		<!-- Inbound port. Vue Flow draws the connection; the handle is what it
		     attaches to. -->
		<Handle
			v-if="hasTarget"
			type="target"
			:position="Position.Top"
			class="cn-flow-node__handle" />

		<div class="cn-flow-node__body">
			<slot :node="{ id, data, selected }">
				<span class="cn-flow-node__label">{{ label }}</span>
			</slot>
		</div>

		<!-- One out-port per exit. A routing node has several, and EVERY one of
		     them has to be reachable without a mouse — see onKeydown. -->
		<Handle
			v-for="(port, index) in ports"
			:id="port.id"
			:key="port.id"
			type="source"
			:position="Position.Bottom"
			class="cn-flow-node__handle cn-flow-node__handle--source"
			:class="{ 'cn-flow-node__handle--armed': armedPortIndex === index }"
			:style="portStyle(index)"
			:aria-label="portLabel(port)"
			:aria-pressed="armedPortIndex === index ? 'true' : undefined" />
	</div>
</template>

<script>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'

/**
 * The default node component, and the home of the canvas's keyboard contract.
 *
 * WHY THE KEYBOARD CODE LIVES HERE AND NOT IN THE CANVAS
 * ------------------------------------------------------
 * Vue Flow renders nodes through a component the host supplies, and that
 * component owns its own DOM. Focus, ARIA state and key handling therefore have
 * to live in the node, not in the canvas wrapper — the canvas never sees the
 * element that a user tabs to.
 *
 * ⚠️ THIS IS A CARRY-OVER, NOT A NEW FEATURE. The hand-rolled canvas this
 * replaces was keyboard-operable by deliberate design, and its docblock said
 * why: "A drag-only canvas is not keyboard-operable (WCAG 2.1 AA 2.1.1)."
 * Vue Flow is pointer-first, so adopting it without re-implementing this would
 * have been a straight accessibility regression dressed up as a dependency
 * upgrade.
 *
 * THE MULTI-EXIT CASE IS THE ONE THAT MATTERS
 * -------------------------------------------
 * Where a node has several exits — a routing node draws one out-port per branch
 * — pressing `c` again steps through them, and the armed port is ringed and
 * marked `aria-pressed`. A mouse picks a branch by pointing at it. Without this
 * the keyboard could only ever reach the first, so every other branch would be
 * mouse-only. That is not a rough edge; it is the feature the canvas exists for
 * being unavailable to half its users.
 */
export default {
	name: 'CnFlowNode',

	components: { Handle, NodeResizer },

	// Vue Flow passes a node's whole internal record down — `zindex`, `events`,
	// `dimensions`, `position` and more. Without this they fall through onto the
	// root element as DOM attributes (`events="[object Object]"`), which is
	// invalid markup, noise in every snapshot, and a needless surface for a
	// screen reader to read out. The bindings this component actually uses are
	// declared as props below.
	inheritAttrs: false,

	props: {
		/** Vue Flow's node id. */
		id: {
			type: String,
			required: true,
		},
		/** Vue Flow's per-node data bag. */
		data: {
			type: Object,
			default: () => ({}),
		},
		/** Whether Vue Flow considers this node selected. */
		selected: {
			type: Boolean,
			default: false,
		},
		/** How far one arrow-key press moves the node, in canvas units. */
		step: {
			type: Number,
			default: 8,
		},
		/** How far a Shift+arrow press moves it. */
		coarseStep: {
			type: Number,
			default: 40,
		},
		/** Whether this node may be resized. */
		resizable: {
			type: Boolean,
			default: false,
		},
	},

	setup() {
		// `connectionStartNode` is module-level state shared by every node
		// instance, because a keyboard connection spans TWO nodes: the one that
		// started it and the one that completes it. Vue Flow's own connection
		// state is pointer-driven and does not cover this path.
		const { updateNodePositions, findNode, addEdges } = useVueFlow()

		return { updateNodePositions, findNode, addEdges, Position }
	},

	data() {
		return {
			/** Which out-port is armed for a keyboard connection, or null. */
			armedPortIndex: null,
			/** While true, arrow keys RESIZE instead of moving. */
			resizing: false,
		}
	},

	computed: {
		/**
		 * @return {string} The node's visible label.
		 */
		label() {
			return this.data?.label || this.data?.name || this.id
		},

		/**
		 * @return {boolean} Whether this node accepts inbound connections.
		 */
		hasTarget() {
			return this.data?.hasTarget !== false
		},

		/**
		 * The node's exits. A node with none still gets one default port, so an
		 * ordinary step behaves exactly as it did before.
		 *
		 * @return {Array<object>} The out-ports.
		 */
		ports() {
			const declared = this.data?.ports
			if (Array.isArray(declared) === true && declared.length > 0) {
				return declared.map((port, index) => ({
					id: String(port.id ?? `out-${index}`),
					label: port.label ?? port.id ?? `Exit ${index + 1}`,
				}))
			}

			return [{ id: 'out', label: 'Exit' }]
		},

		/**
		 * @return {string} The label a screen reader announces for the node.
		 */
		ariaLabel() {
			const kind = this.data?.type ? ` (${this.data.type})` : ''
			return `${this.label}${kind}`
		},
	},

	methods: {
		/**
		 * Spread several out-ports along the node's bottom edge.
		 *
		 * @param {number} index The port's index.
		 * @return {object} A style binding.
		 */
		portStyle(index) {
			const count = this.ports.length
			if (count <= 1) {
				return {}
			}

			return { left: `${((index + 1) / (count + 1)) * 100}%` }
		},

		/**
		 * @param {object} port The port.
		 * @return {string} Its accessible label.
		 */
		portLabel(port) {
			return `${this.label}: ${port.label}`
		},

		/**
		 * The keyboard contract.
		 *
		 * Arrow keys move; `c` arms an exit and, on a second node, completes the
		 * connection; `Escape` cancels. Repeated `c` on the SAME node steps
		 * through its exits rather than re-arming the first — the behaviour a
		 * mouse gets for free by pointing.
		 *
		 * @param {KeyboardEvent} event The key event.
		 * @return {void}
		 */
		onKeydown(event) {
			const distance = event.shiftKey === true ? this.coarseStep : this.step
			const moves = {
				ArrowUp: { x: 0, y: -distance },
				ArrowDown: { x: 0, y: distance },
				ArrowLeft: { x: -distance, y: 0 },
				ArrowRight: { x: distance, y: 0 },
			}

			if (moves[event.key] !== undefined) {
				event.preventDefault()
				if (this.resizing === true) {
					this.resize(moves[event.key])
					return
				}

				this.move(moves[event.key])
				return
			}

			// `r` toggles resize mode, so the SAME arrow keys serve both without
			// a second key family to learn. The pointer affordance is
			// NodeResizer's; this is the keyboard equivalent, which the canvas
			// this replaces also had and which the resizer does not provide.
			if ((event.key === 'r' || event.key === 'R') && this.resizable === true) {
				event.preventDefault()
				this.resizing = this.resizing === false
				return
			}

			if (event.key === 'Escape') {
				this.resizing = false
				this.cancelConnection()
				return
			}

			if (event.key === 'c' || event.key === 'C') {
				event.preventDefault()
				this.onConnectKey()
			}
		},

		/**
		 * Move this node, through Vue Flow, so the change reaches the host as a
		 * normal node change rather than a direct mutation.
		 *
		 * @param {object} delta The x/y delta.
		 * @return {void}
		 */
		move(delta) {
			const node = this.findNode(this.id)
			if (node === undefined || node === null) {
				return
			}

			this.updateNodePositions(
				[{ id: this.id, position: { x: node.position.x + delta.x, y: node.position.y + delta.y } }],
				true,
				false,
			)
		},

		/**
		 * Resize this node from the keyboard.
		 *
		 * @param {object} delta The width/height delta.
		 * @return {void}
		 */
		resize(delta) {
			const node = this.findNode(this.id)
			if (node === undefined || node === null) {
				return
			}

			const width = Math.max(80, (node.dimensions?.width || 140) + delta.x)
			const height = Math.max(40, (node.dimensions?.height || 60) + delta.y)
			node.style = { ...(node.style || {}), width: `${width}px`, height: `${height}px` }
		},

		/**
		 * `c` pressed: arm the next exit, or complete a pending connection.
		 *
		 * @return {void}
		 */
		onConnectKey() {
			const pending = this.$root?.$cnFlowPendingConnection ?? null

			// A connection is already in flight and it did not start here, so
			// this press completes it.
			if (pending !== null && pending.nodeId !== this.id) {
				this.addEdges([
					{
						id: `${pending.nodeId}:${pending.portId}->${this.id}`,
						source: pending.nodeId,
						sourceHandle: pending.portId,
						target: this.id,
					},
				])
				this.clearPending()
				return
			}

			// Otherwise step through this node's own exits. Running off the end
			// cancels, which is what a single-exit node does on the second press
			// — unchanged from the previous canvas.
			const next = this.armedPortIndex === null ? 0 : this.armedPortIndex + 1
			if (next >= this.ports.length) {
				this.cancelConnection()
				return
			}

			this.armedPortIndex = next
			this.setPending({ nodeId: this.id, portId: this.ports[next].id })
		},

		/**
		 * @param {object} pending The pending connection.
		 * @return {void}
		 */
		setPending(pending) {
			if (this.$root !== undefined && this.$root !== null) {
				this.$root.$cnFlowPendingConnection = pending
			}
		},

		/**
		 * @return {void}
		 */
		clearPending() {
			this.armedPortIndex = null
			if (this.$root !== undefined && this.$root !== null) {
				this.$root.$cnFlowPendingConnection = null
			}
		},

		/**
		 * @return {void}
		 */
		cancelConnection() {
			this.clearPending()
		},
	},
}
</script>

<style scoped>
.cn-flow-node {
	position: relative;
	min-width: 140px;
	padding: 8px 12px;
	border: 2px solid var(--color-border, #d0d0d0);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-main-background, #fff);
	color: var(--color-main-text, #222);
}

.cn-flow-node:focus-visible {
	outline: 2px solid var(--color-primary-element, #0082c9);
	outline-offset: 2px;
}

.cn-flow-node--selected {
	border-color: var(--color-primary-element, #0082c9);
}

.cn-flow-node__label {
	font-weight: 600;
}

.cn-flow-node__handle {
	width: 10px;
	height: 10px;
	background: var(--color-primary-element, #0082c9);
}

/* The armed port is RINGED, not merely coloured: colour alone is not an
   accessible state indicator, and this is the cue that tells a keyboard user
   which branch the next `c` will connect. */
.cn-flow-node__handle--armed {
	outline: 3px solid var(--color-warning, #c28900);
	outline-offset: 2px;
}
</style>
