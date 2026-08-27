<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<!-- THE NODE IS `.cn-flow-node`. There is deliberately no alias.

	     Up to 2.11.1 the canvas was a bespoke SVG implementation in
	     CnGraphCanvas.vue and a node was `.cn-graph-canvas__node`. 2.15.0
	     rewrote it on Vue Flow and moved the node into this component.

	     2.15.0 briefly carried `cn-graph-canvas__node` alongside the new name
	     so the rewrite would be a drop-in (see #752). That alias is gone: the
	     migration to Vue Flow is a real migration, not a rename with the old
	     contract left running underneath. An alias kept every consumer's
	     selector working while quietly guaranteeing that two names for one
	     element would drift — which is the situation that produced the
	     original break.

	     Consumers select `.cn-flow-node` (and `--selected`, `--arming`,
	     `__handle`, `__body`). Migrated with this change: openregister's
	     flow-controls e2e and hermiq's FlowBuilder deep styles. -->
	<div
		class="cn-flow-node"
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

		<!-- WHERE A LINE ENTERS AND WHERE IT LEAVES, SAID BY THE PORT ITSELF.

		     Every node used to draw one entry on top and one exit underneath,
		     which contradicted the layout the editor actually produces:
		     `useFlowStore.autoSort()` lays a flow out LEFT TO RIGHT, one column
		     per depth. So the primary entry is on the LEFT and the primary exit
		     on the RIGHT — Vue Flow attaches a handle-less edge to the first
		     handle of each type, so DOM order here is what decides the default
		     shape of every line on the canvas. Top and bottom stay as secondary
		     attachment points for a graph the author routes by hand.

		     A trigger has no entry and an end step has no exit: a port that can
		     never be connected is not chrome, it is a lie about what the engine
		     will do. -->
		<Handle
			v-for="entry in entryHandles"
			:id="entry.id"
			:key="entry.id"
			type="target"
			:position="entry.position"
			class="cn-flow-node__handle cn-flow-node__handle--target"
			:class="[`cn-flow-node__handle--dir-${entry.direction}`, { 'cn-flow-node__handle--orphan': orphanEntry }]"
			:aria-label="entryLabel"
			:title="orphanEntry ? orphanEntryHint : undefined" />

		<div class="cn-flow-node__body">
			<slot :node="{ id, data, selected }">
				<span class="cn-flow-node__label">{{ label }}</span>
			</slot>
		</div>

		<!-- One out-port per exit. A routing node has several, and EVERY one of
		     them has to be reachable without a mouse — see onKeydown.

		     ⚠️ A HANDLE ID IS NOT A PORT ID. Two handles can serve one exit (a
		     single-exit step offers both the right and the bottom edge), and Vue
		     Flow keys handles by id, so they cannot share one. The side is
		     therefore encoded into the handle id and stripped straight back off
		     before a connection leaves this component — see `portIdOf`. The host
		     only ever sees the port it declared. -->
		<Handle
			v-for="exit in exitHandles"
			:id="exit.id"
			:key="exit.id"
			type="source"
			:position="exit.position"
			class="cn-flow-node__handle cn-flow-node__handle--source"
			:class="[
				`cn-flow-node__handle--dir-${exit.direction}`,
				{
					'cn-flow-node__handle--armed': exit.primary && armedPortIndex === exit.index,
					'cn-flow-node__handle--orphan': orphanExit,
				},
			]"
			:style="exit.style"
			:aria-label="portLabel(exit.port)"
			:title="orphanExit ? orphanExitHint : undefined"
			:aria-pressed="exit.primary && armedPortIndex === exit.index ? 'true' : undefined" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'

/**
 * What separates a port id from the side of the node its handle sits on.
 *
 * `__` rather than `-` or `.` because a port id is authored data — `out-2` and
 * `openregister.no` are both ordinary ids — and a separator that can occur
 * inside the thing it separates is not a separator. Read with `lastIndexOf`, so
 * even a port id that does contain `__` survives the round trip.
 *
 * ⚠️ AND IT HAS TO BE CSS-SAFE. Vue Flow writes a handle's id straight into a
 * class name (`vue-flow__handle-yes__right`), so a separator of `::` — the first
 * choice here — produced `vue-flow__handle-in::top`, a class that reads as a
 * pseudo-element the moment anyone tries to select it. Nothing targets these
 * classes today; the point is that the next person to try would find a selector
 * that silently matches nothing.
 *
 * Written in exactly one place — `exitHandles` — and read in exactly one place:
 * `portIdOf`.
 */
const HANDLE_SIDE_SEPARATOR = '__'

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
		/**
		 * Whether Delete/Backspace on this node emits `remove`. Defaults to
		 * true; a read-only canvas passes false so the key does nothing.
		 */
		deletable: {
			type: Boolean,
			default: true,
		},
	},

	emits: [
		/**
		 * @event connect A keyboard-completed connection. Carries Vue Flow's
		 *   `{ source, sourceHandle, target, targetHandle }` so the host cannot
		 *   tell a keyboard connection from a pointer one. CnGraphCanvas routes
		 *   it into the same `onConnect` the <VueFlow> pointer path uses.
		 */
		'connect',

		/**
		 * @event remove The focused node should be removed, by id. Emitted for
		 *   Delete and Backspace. The host decides what removal means — its
		 *   edges, its undo stack, its persistence — so nothing is removed here.
		 */
		'remove',
	],

	setup() {
		// `connectionStartNode` is module-level state shared by every node
		// instance, because a keyboard connection spans TWO nodes: the one that
		// started it and the one that completes it. Vue Flow's own connection
		// state is pointer-driven and does not cover this path.
		// `addEdges` is deliberately NOT pulled in. Writing an edge into Vue
		// Flow's internal graph is what silently dropped keyboard connections:
		// the host owns `edges` and this component must tell it, not mutate
		// around it. See onConnectKey().
		const { updateNodePositions, findNode } = useVueFlow()

		return { updateNodePositions, findNode, Position }
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
		 * @return {boolean} Whether this node accepts inbound connections. A
		 *   trigger does not: a run STARTS there, so an entry port on one is an
		 *   affordance the engine will never honour.
		 */
		hasTarget() {
			return this.data?.hasTarget !== false
		},

		/**
		 * @return {boolean} Whether this node offers outbound connections. An
		 *   end step does not — the flow stops there by definition.
		 */
		hasSource() {
			return this.data?.hasSource !== false
		},

		/**
		 * The entry ports, left first.
		 *
		 * LEFT IS PRIMARY, and that is a deliberate consequence of
		 * `useFlowStore.autoSort()` laying a flow out left to right: Vue Flow
		 * binds an edge that names no handle to the FIRST handle of its type, so
		 * this order is what a line does by default.
		 *
		 * @return {Array<object>} The handles to draw.
		 */
		entryHandles() {
			if (this.hasTarget === false) {
				return []
			}

			return [
				{ id: `in${HANDLE_SIDE_SEPARATOR}left`, position: this.Position.Left, direction: 'right' },
				{ id: `in${HANDLE_SIDE_SEPARATOR}top`, position: this.Position.Top, direction: 'down' },
			]
		},

		/**
		 * The exit ports.
		 *
		 * The first exit sits on the RIGHT, where the next column is. Any
		 * further exit — a routing step's branches — spreads along the bottom
		 * edge, which is the one side with room for several and the only
		 * arrangement that keeps a three-way branch readable.
		 *
		 * A step with a SINGLE exit gets a bottom handle as well, so a line may
		 * leave downwards without the author fighting the router. Both handles
		 * serve the same port; only the right-hand one is `primary`, so the
		 * armed-port ring and `aria-pressed` land on exactly one element per
		 * exit rather than two.
		 *
		 * @return {Array<object>} The handles to draw.
		 */
		exitHandles() {
			if (this.hasSource === false) {
				return []
			}

			const ports = this.ports
			const branches = ports.length - 1
			const handles = []

			ports.forEach((port, index) => {
				if (index === 0) {
					handles.push({
						id: `${port.id}${HANDLE_SIDE_SEPARATOR}right`,
						port,
						index,
						position: this.Position.Right,
						direction: 'right',
						primary: true,
						style: {},
					})

					return
				}

				handles.push({
					id: `${port.id}${HANDLE_SIDE_SEPARATOR}bottom`,
					port,
					index,
					position: this.Position.Bottom,
					direction: 'down',
					primary: true,
					style: { left: `${(index / (branches + 1)) * 100}%` },
				})
			})

			if (ports.length === 1) {
				handles.push({
					id: `${ports[0].id}${HANDLE_SIDE_SEPARATOR}bottom`,
					port: ports[0],
					index: 0,
					position: this.Position.Bottom,
					direction: 'down',
					primary: false,
					style: {},
				})
			}

			return handles
		},

		/**
		 * Whether this node draws an entry that nothing connects to.
		 *
		 * ⚠️ `=== false`, NOT falsy. A host that does not compute this at all
		 * leaves it undefined, and undefined means "not measured" — flagging
		 * every port on such a canvas would put a warning on a graph nobody
		 * claimed anything about.
		 *
		 * @return {boolean} True when the port is drawn and unreachable.
		 */
		orphanEntry() {
			return this.hasTarget === true && this.data?.hasIncoming === false
		},

		/**
		 * @return {boolean} True when this node draws an exit that no line
		 *   leaves from. Same "not measured" rule as `orphanEntry`.
		 */
		orphanExit() {
			return this.hasSource === true && this.data?.hasOutgoing === false
		},

		/**
		 * @return {string} The accessible name of an entry port.
		 */
		entryLabel() {
			if (this.orphanEntry === true) {
				return `${this.label}: ${this.orphanEntryHint}`
			}

			return t('nextcloud-vue', '{step}: entry', { step: this.label })
		},

		/**
		 * @return {string} Why an unconnected entry port is a problem, in the
		 *   terms the author cares about — what the ENGINE will do.
		 */
		orphanEntryHint() {
			return t('nextcloud-vue', 'Nothing connects to this step, so the flow will never reach it.')
		},

		/**
		 * @return {string} Why an unconnected exit port is a problem.
		 */
		orphanExitHint() {
			return t('nextcloud-vue', 'Nothing leaves this step, so the flow stops here.')
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
		 * Recover the PORT id a handle id was built from.
		 *
		 * The inverse of the encoding in `exitHandles`, and the reason a
		 * node can offer one exit on two sides without the host ever hearing
		 * about a port it did not declare. Exported through the component so
		 * CnGraphCanvas can apply it to Vue Flow's pointer connections too —
		 * both routes have to end at the same port id or a branch would be
		 * recorded under a name the engine has never seen.
		 *
		 * @param {string|null} handleId The handle id, or null.
		 * @return {string|null} The port id.
		 */
		portIdOf(handleId) {
			if (typeof handleId !== 'string') {
				return handleId ?? null
			}

			const cut = handleId.lastIndexOf(HANDLE_SIDE_SEPARATOR)

			return cut === -1 ? handleId : handleId.slice(0, cut)
		},

		/**
		 * @param {object} port The port.
		 * @return {string} Its accessible label. An unconnected exit says so
		 *   rather than merely being painted differently — colour alone is not
		 *   a state a screen reader can read.
		 */
		portLabel(port) {
			if (this.orphanExit === true) {
				return `${this.label}: ${this.orphanExitHint}`
			}

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
				return
			}

			// Delete and Backspace both, because which one removes a thing is a
			// platform habit rather than a preference: Backspace is the delete
			// key on a Mac keyboard, and a user who learned one does not think
			// of the other as an alternative.
			//
			// EMITTED, never acted on here. This component knows about Vue Flow
			// nodes; it does not know that removing one also has to drop the
			// edges pointing at it, or that the host keeps an undo stack. A node
			// that deleted itself would leave dangling edges behind — which is
			// the bug `useFlowStore.removeNode` exists to prevent.
			if (event.key === 'Delete' || event.key === 'Backspace') {
				if (this.deletable === false) {
					return
				}

				event.preventDefault()
				/**
				 * @event remove The focused node should be removed. Carries the
				 *   node id. The host owns what removal means — edges, undo,
				 *   persistence — so nothing is removed here.
				 * @type {string}
				 */
				this.$emit('remove', this.id)
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
				// EMIT, DO NOT `addEdges()`.
				//
				// `addEdges()` writes into Vue Flow's INTERNAL graph, and this
				// canvas does not own that graph: CnGraphCanvas binds
				// `:edges="edges"` from its prop, which CnFlowDetail fills from
				// `store.canvasEdges`. The edges are controlled by the host.
				//
				// So `addEdges()` drew the edge and told nobody. The host's model
				// never learned about it, the save serialised a flow with no
				// edge, and the server refused to run it — "node has no outgoing
				// edge and does not end the flow", naming a node rather than the
				// connection that was missing. The canvas and the model
				// disagreed, and the canvas is the one the user believes.
				//
				// Nothing caught it because the READ path was mapped and the
				// WRITE path was never written: a one-way adapter is invisible
				// until something writes through it.
				//
				// CnGraphCanvas already forwards pointer connections —
				// `@connect="onConnect"` on <VueFlow>, re-emitted to the host —
				// and its own docblock states the contract this restores:
				// "@event connect A new connection was made, by pointer OR by
				// keyboard." Emitting here puts the keyboard on that same path,
				// so both routes end at the host's model and the host remains the
				// single source of truth for edges.
				//
				// Vue Flow's connection shape, so the host cannot tell which
				// input produced it.
				this.$emit('connect', {
					source: pending.nodeId,
					sourceHandle: pending.portId,
					target: this.id,
					targetHandle: null,
				})
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
	/* 14px, not 10: a port now carries a direction arrow, and there is no room
	   to draw one legibly in 10. Sized against the 22px arrowhead an edge ends
	   in (see `useFlowStore.canvasEdges`) — the marker still has to clear the
	   handle it lands on. */
	width: 14px;
	height: 14px;
	background: var(--color-primary-element, #0082c9);
}

/* AN ARROW IN THE PORT, because a dot cannot say which way it faces.

   A canvas with four ports on a node is only readable if each one states
   whether it takes a line in or lets one out, and the port is the only place
   that can say it — a user reading the node has not yet followed the line.
   Every arrow points WITH the flow: an entry on the left and an exit on the
   right both point right, an entry on top and an exit on the bottom both point
   down. So the whole node reads as one direction rather than as four separate
   claims.

   Drawn with borders rather than an icon component: a port is 14px, it is
   rendered once per handle per node, and a triangle at that size is crisper
   from a border than from a scaled glyph. */
.cn-flow-node__handle::after {
	content: '';
	position: absolute;
	inset-block-start: 50%;
	inset-inline-start: 50%;
	inline-size: 0;
	block-size: 0;
	border: 3px solid transparent;
	pointer-events: none;
}

.cn-flow-node__handle--dir-right::after {
	border-inline-start-color: var(--color-primary-element-text, #fff);
	transform: translate(-30%, -50%);
}

.cn-flow-node__handle--dir-down::after {
	border-block-start-color: var(--color-primary-element-text, #fff);
	transform: translate(-50%, -30%);
}

/* The armed port is RINGED, not merely coloured: colour alone is not an
   accessible state indicator, and this is the cue that tells a keyboard user
   which branch the next `c` will connect. */
.cn-flow-node__handle--armed {
	outline: 3px solid var(--color-warning, #c28900);
	outline-offset: 2px;
}

/* A PORT NOTHING IS CONNECTED TO IS A BROKEN FLOW, SHOWN WHERE IT BREAKS.

   An entry with no line into it can never be reached; an exit with no line out
   of it stops the run. Both are things the engine will report at run time, and
   the port is where the author can act on it — the Check button's verdict is a
   list of node ids in a card somewhere else on the screen.

   ⚠️ NOT COLOUR ALONE. The ring changes the port's SHAPE as well as its fill,
   and every warning port carries a `title` naming the consequence plus an
   `aria-label` that says the same thing — see `orphanEntryHint`. A state a
   sighted user reads from a colour and nobody else can read at all is not a
   state, it is decoration. */
.cn-flow-node__handle--orphan {
	background: var(--color-warning, #c28900);
	box-shadow: 0 0 0 2px var(--color-main-background, #fff), 0 0 0 4px var(--color-warning, #c28900);
}

.cn-flow-node__handle--orphan::after {
	border-inline-start-color: var(--color-main-text, #222);
	border-block-start-color: transparent;
}

.cn-flow-node__handle--orphan.cn-flow-node__handle--dir-down::after {
	border-inline-start-color: transparent;
	border-block-start-color: var(--color-main-text, #222);
}
</style>
