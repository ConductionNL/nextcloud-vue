// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// Shared state for the flow editor.
//
// The canvas (CnFlowDetail) and the controls (CnFlowSidebar) render in two
// different places — the page body and Nextcloud's app sidebar — so they cannot
// pass props to one another. The flow being edited lives here instead.
//
// Ported from hermiq's `graphEditor` store, which was the fleet's only flow
// editor. Two things changed in the port:
//
//   1. Persistence is OpenRegister's ONE flow store (`/api/flows`), not an app's
//      own register. That is the whole point of the unification: hermiq kept
//      flows as `agentflow` objects, so every app that wanted flows needed its
//      own register, its own resolver and — in practice — its own executor.
//   2. Node types are the catalogue's ids, VERBATIM. hermiq's builder fed its
//      palette from the catalogue (namespaced: `openregister.set-fields`,
//      `hermiq.agent-step`) while its config panes and its executor matched
//      BARE ids (`set-fields`, `agent-step`). Every node placed from the palette
//      therefore had no config pane and was skipped at run time — silently, with
//      the run reporting success. Nothing here may reintroduce a second
//      vocabulary.

import { defineStore } from 'pinia'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/**
 * A blank flow definition.
 *
 * @return {object} The empty flow.
 */
function emptyFlow() {
	return {
		name: '',
		description: '',
		notes: '',
		app: 'openregister',
		triggerRegister: '',
		triggerSchema: '',
		trigger: 'object.updated',
		cron: '',
		executionMode: 'async',
		enabled: false,
		nodes: [],
		edges: [],
		limits: {},
		retentionDays: null,
		auditEnabled: null,
		oversightEnabled: null,
	}
}

export const useFlowStore = defineStore('cnFlow', {
	state: () => ({
		flow: emptyFlow(),
		flows: [],

		// Snapshots of `flow`, oldest first, for Ctrl+Z.
		//
		// A canvas is direct manipulation: a mis-drag or a mis-aimed Delete
		// destroys work with no dialog in between, and until this existed the
		// only way back was to reload and lose everything since the last save.
		// The stack is capped — see pushUndo() — because a flow document is
		// held whole in each entry.
		undoStack: [],
		selectedNodeId: null,
		paletteDragType: null,

		// The node whose edit dialog is open, or null. Lives here because the
		// dialog is hosted by the canvas while it is opened from the sidebar,
		// a node double-click, or a consumer.
		editingNodeId: null,

		// Whether the controls sidebar is shown. Lives here because the
		// re-open affordance sits on the canvas toolbar, in the other half of
		// the tree.
		sidebarOpen: true,

		// The node types the engine can actually execute. The catalogue is
		// AUTHORITATIVE: a builder that invents its own ids produces flows the
		// engine cannot run, which is exactly the defect this replaces.
		nodeCatalog: [],
		eventCatalog: [],

		// Whether the catalogue request is still in flight. Without this flag
		// the palette cannot tell "loading" from "failed": both are an empty
		// list, and the sidebar showed "Could not read the flow engine's node
		// types" on every fresh /flows/new while the request was mid-air.
		catalogLoading: false,

		// The runs of the flow being edited, and the per-node steps of the run
		// currently being inspected.
		runs: [],
		steps: [],
		inspectedRunUuid: null,

		loading: false,
		saving: false,
		running: false,
		checking: false,

		// The engine's verdict on the unsaved canvas, from `check()`. Cleared
		// by any edit that could change it, so a stale "looks runnable" never
		// outlives the graph it described.
		checkResult: null,

		dirty: false,
		error: null,
	}),

	getters: {
		nodes: (state) => state.flow.nodes || [],
		edges: (state) => state.flow.edges || [],

		/**
		 * Whether there is anything to undo. Drives the toolbar's disabled state.
		 *
		 * @param {object} state The store state.
		 * @return {boolean} True when the stack holds at least one snapshot.
		 */
		canUndo: (state) => state.undoStack.length > 0,

		selectedNode: (state) => {
			if (state.selectedNodeId === null) {
				return null
			}

			return (state.flow.nodes || []).find((n) => n.id === state.selectedNodeId) || null
		},

		/**
		 * The node whose edit dialog is open, or null.
		 *
		 * @param {object} state The store state.
		 * @return {object|null} The node.
		 */
		editingNode: (state) => {
			if (state.editingNodeId === null) {
				return null
			}

			return (state.flow.nodes || []).find((n) => n.id === state.editingNodeId) || null
		},

		/**
		 * The catalogue entry for a node type, or null when the engine does not
		 * know it.
		 *
		 * A null here is meaningful and must be SHOWN, not hidden: it means the
		 * flow carries a node the engine cannot resolve, which will fail its
		 * step at run time.
		 *
		 * @param {object} state The store state.
		 * @return {Function} (type) => entry|null
		 */
		catalogEntry: (state) => (type) => {
			return state.nodeCatalog.find((entry) => (
				entry.id === type || (entry.aliases || []).includes(type)
			)) || null
		},

		/**
		 * A node type's role — `trigger`, `step` or `end` — from the catalogue.
		 *
		 * Falls back to the id's naming convention only while the catalogue has
		 * not loaded, so the canvas is not colourless during the first paint.
		 *
		 * @return {Function} (type) => 'trigger'|'step'|'end'
		 */
		roleOfNodeType() {
			return (type) => {
				const entry = this.catalogEntry(type)
				if (entry?.role) {
					return entry.role
				}

				const id = String(type || '')
				if (id.includes('.trigger-')) {
					return 'trigger'
				}
				if (id.endsWith('.end') || id.endsWith('.stop')) {
					return 'end'
				}

				return 'step'
			}
		},

		/**
		 * The edges as the canvas draws them: one line per (source, target)
		 * pair, whatever dialect the stored flow speaks.
		 *
		 * This store writes `{from, to}` — the ONLY dialect the engine reads —
		 * but it must still DRAW `{source, target}`, which older documents and
		 * hermiq's flows carry. Each endpoint
		 * may be a LIST (several `from` = join, several `to` = split). Handing
		 * `flow.edges` to the canvas raw therefore rendered every one of those
		 * flows as unconnected cards: real graphs, silently drawn wrong.
		 *
		 * @param {object} state The store state.
		 * @return {Array<object>} Drawable `{id, source, target, edge}` lines.
		 */
		canvasEdges: (state) => {
			const toList = (value) => {
				if (Array.isArray(value)) {
					return value.filter((v) => v !== null && v !== undefined && v !== '')
				}

				return (value === null || value === undefined || value === '') ? [] : [value]
			}

			const lines = []
			for (const [index, edge] of (state.flow.edges || []).entries()) {
				const sources = toList(edge.source ?? edge.from)
				const targets = toList(edge.target ?? edge.to)
				const edgeId = edge.id || `edge-${index}`

				for (const source of sources) {
					for (const target of targets) {
						// The line id must not be the edge id: a split renders
						// one edge as several lines, and v-for keys collide.
						lines.push({
							id: `${edgeId}:${source}:${target}`,
							source,
							target,

							// LET VUE FLOW ROUTE THE LINE.
							//
							// These carried no `type`, so every line fell back
							// to Vue Flow's default bezier — which crosses
							// nodes and doubles back on itself as soon as a
							// graph stops being a straight chain. That read as
							// "our lines are disorderly", and the instinct was
							// to lay the graph out ourselves to compensate.
							//
							// `smoothstep` is orthogonal routing with rounded
							// corners: it is what the hand-drawn canvas was
							// imitating, and the flow-builder's own dead `#edge`
							// slot described the goal as "orthogonal routing
							// plus an explicit arrowhead". Both are Vue Flow
							// options we had simply never set.
							//
							// PER EDGE, and the document wins. `edge.lineType`
							// is stored on the connection, so a single awkward
							// line can be switched to `step`, `straight` or
							// `default` without moving a node — the seam an
							// edge-level control hangs off.
							//
							// ⚠️ THE ROUTER TRAVELS IN `data`, NOT IN `type`.
							// It sat in `type` when the router was the only
							// thing an edge carried, and that quietly ruled out
							// everything else: Vue Flow reads `type` to choose
							// the COMPONENT that draws the line, so naming a
							// router there means the built-in edge answers and
							// no label, marker control or payload affordance
							// can ever be attached. `default` selects
							// CnFlowEdge, which reads the router back out of
							// `data`. Same distinction the node side already
							// records — `type` is a component, and a domain
							// value put there is a component that does not
							// exist.
							type: 'default',

							// ⚠️ SIZED, BECAUSE THE DEFAULT ARROWHEAD WAS DRAWN
							// UNDERNEATH THE PORT HANDLE.
							//
							// `'arrowclosed'` on its own renders a 12.5px arrow
							// at the path's end — which is exactly where the
							// target node's handle sits, and that handle is an
							// 18px filled circle in a layer Vue Flow paints
							// ABOVE the edges. So the arrow was there the whole
							// time, measurably, and no user could see it: the
							// canvas read as a set of undirected lines.
							//
							// 22px is chosen against the handle, not for looks
							// — the arrow has to extend beyond it to read as an
							// arrow at all. Colour is deliberately NOT set here:
							// Vue Flow writes it as an inline style on the
							// polyline, so it is themed in CSS instead (see
							// `.vue-flow__arrowhead` in CnGraphCanvas) and
							// follows dark mode.
							markerEnd: edge.markerEnd || { type: 'arrowclosed', width: 22, height: 22 },
							data: {
								lineType: edge.lineType || 'smoothstep',
								labelT: edge.labelT,
								label: edge.title || edge.label || '',
								edge,
							},
						})
					}
				}
			}

			return lines
		},

		/**
		 * The nodes a run enters through, decided the way the engine decides.
		 *
		 * @return {Array<string>} Their ids.
		 */
		startNodeIds() {
			const nodes = this.nodes
			const explicit = nodes.filter((n) => n.start === true || n.initial === true).map((n) => n.id)
			if (explicit.length) {
				return explicit
			}

			const targeted = new Set(this.canvasEdges.map((line) => line.target))
			const sources = nodes.filter((n) => !targeted.has(n.id)).map((n) => n.id)
			if (sources.length) {
				return sources
			}

			return nodes.length ? [nodes[0].id] : []
		},

		/**
		 * What stops this flow from ever finishing, by node ROLE.
		 *
		 * An empty flow reports nothing — there is no point telling the author
		 * a blank canvas is incomplete.
		 *
		 * @return {{trigger: boolean, end: boolean}} The missing roles.
		 */
		missingEnds() {
			if (!this.nodes.length) {
				return { trigger: false, end: false }
			}

			const roles = this.nodes.map((n) => this.roleOfNodeType(n.type))

			return {
				trigger: !roles.includes('trigger'),
				end: !roles.includes('end'),
			}
		},

		/**
		 * The flow as the engine would run it.
		 *
		 * @param {object} state The store state.
		 * @return {object} The runnable document.
		 */
		flowForRun: (state) => ({
			...state.flow,
			nodes: state.flow.nodes || [],
			edges: state.flow.edges || [],
		}),
	},

	actions: {
		/**
		 * Load the flows this surface is scoped to, plus both catalogues.
		 *
		 * @param {object}      options     Load options.
		 * @param {string|null} options.app Restrict to one owning app id.
		 * @param {string|null} options.id  The flow to open, or 'new'.
		 * @return {Promise<void>}
		 */
		async load({ app = null, id = null } = {}) {
			// A BLANK flow is initialised BEFORE the network, and this ordering
			// is the fix for #607 rather than a tidy-up.
			//
			// `emptyFlow()` has `name: ''`, and only `open('new')` supplies the
			// default name. `open()` used to run at the tail of this method,
			// behind `await GET /api/flows` — a flow LIST that starting a blank
			// flow does not need. Meanwhile the sidebar is already rendered and
			// Save already enabled, because `nodeCatalog` was populated by the
			// index page's own `load()` and this store is a singleton that
			// survives the route change.
			//
			// So there was a window in which the editor invited a Save of a flow
			// with no name, which `FlowController::create()` answers 400 "A flow
			// needs a name." — measured at 9 of 10 attempts against a fresh
			// instance. The same late `open('new')` also reset `this.flow`, so a
			// step placed during the window was wiped, and a save landing after
			// it stored `nodes: []`.
			//
			// Nothing about a blank flow depends on the server, so it is set up
			// first, and NOT re-opened at the tail — re-opening is what threw the
			// user's work away.
			//
			// `id === 'new'` ONLY, never `id === null`. `save()` calls this
			// method as `load({ app })` to refresh the list, and a null id has
			// always meant "reload the list, leave the open flow alone". Treating
			// that as blank would reset the flow immediately after storing it,
			// discarding the id the server had just returned.
			const isBlank = (id === 'new')
			if (isBlank === true) {
				this.open('new', app)
			}

			this.loading = true
			this.error = null
			try {
				const params = app ? { app } : {}
				const response = await axios.get(generateUrl('/apps/openregister/api/flows'), { params })
				this.flows = response.data?.results || []
			} catch (error) {
				// Surfaced, not swallowed: an empty list with no trace of why is
				// indistinguishable from "this instance has no flows".
				console.error('cn-flow: could not load flows', error)
				this.flows = []
				this.error = error
			} finally {
				this.loading = false
			}

			// Both catalogues are kept OFF the critical path: the canvas is
			// usable while they resolve, and a failure costs the palette and the
			// trigger list rather than the editor.
			this.loadNodeCatalog()
			this.loadEventCatalog()

			// A blank flow was already opened above, before the network. Opening
			// it again here is what used to wipe a step the user had placed in
			// the meantime, so only a STORED flow is opened at this point — it
			// genuinely needs `this.flows`, which the request above just filled.
			if (id !== null && isBlank === false) {
				this.open(id, app)
			}
		},

		async loadNodeCatalog() {
			this.catalogLoading = true
			try {
				const response = await axios.get(generateUrl('/apps/openregister/api/flow/node-catalog'))
				this.nodeCatalog = response.data?.results || []
			} catch (error) {
				console.error('cn-flow: could not load the node catalogue', error)
				this.nodeCatalog = []
			} finally {
				this.catalogLoading = false
			}
		},

		async loadEventCatalog() {
			try {
				const response = await axios.get(generateUrl('/apps/openregister/api/flow/event-catalog'))
				this.eventCatalog = response.data?.results || []
			} catch (error) {
				console.error('cn-flow: could not load the event catalogue', error)
				this.eventCatalog = []
			}
		},

		/**
		 * Put the flow named by the route onto the canvas.
		 *
		 * @param {string}      id  The flow uuid, or 'new'.
		 * @param {string|null} app The owning app for a new flow.
		 * @return {void}
		 */
		open(id, app = null) {
			this.selectedNodeId = null
			this.editingNodeId = null
			this.runs = []
			this.steps = []
			this.inspectedRunUuid = null
			this.checkResult = null

			if (!id || id === 'new') {
				// A new flow is runnable on demand until its author picks a real
				// trigger, so the flow-level trigger and the seeded start node
				// say the same thing.
				this.flow = { ...emptyFlow(), name: 'New flow', app: app || 'openregister', trigger: 'manual' }
				this.seedStartNode()
				this.dirty = false
				return
			}

			const match = this.flows.find((flow) => String(flow.id) === String(id))
			if (!match) {
				return
			}

			this.flow = {
				...emptyFlow(),
				...match,
				// Deep-copied so an edit on the canvas does not mutate the list
				// row behind it — otherwise cancelling an edit leaves the list
				// showing changes that were never saved.
				nodes: Array.isArray(match.nodes) ? JSON.parse(JSON.stringify(match.nodes)) : [],
				edges: Array.isArray(match.edges) ? JSON.parse(JSON.stringify(match.edges)) : [],
			}
			this.dirty = false

			// A flow nobody has ever laid out opens as a PILE, not as a graph.
			//
			// Generated and imported flows carry no coordinates at all — a
			// 76-node flow measured on a live instance had 73 nodes with no
			// position — and every one of those lands on the same point. The
			// result is indistinguishable from an empty canvas: one node's
			// worth of pixels, with the rest underneath it.
			//
			// autoSort() already knows how to place them, and its own docblock
			// says unreachable nodes must go "never at the origin, where they
			// would hide under the entry points". This just calls it when the
			// document has nothing to preserve.
			//
			// Only when NO node has a position. A flow someone has arranged is
			// never rearranged behind their back, and a flow with even one
			// placed node is treated as arranged — rearranging that would throw
			// away a deliberate choice to make the other nodes tidier.
			//
			// `dirty` stays false: this is a rendering fallback for a document
			// that never carried positions, not an edit. Marking it dirty would
			// prompt to save a layout the author never asked for, and pressing
			// save would then write coordinates the flow did not have.
			if (this.nodes.length && !this.nodes.some(this.hasPosition)) {
				this.autoSort()
				this.dirty = false
			}

			this.loadRuns(id)
		},

		/**
		 * Put the one node every flow starts from onto a blank canvas.
		 *
		 * A new flow renders the SAME editor as an existing one, holding only a
		 * starting point — never an empty page that looks like a different
		 * surface. The id is hard-coded rather than read from the catalogue
		 * because the catalogue loads after `open('new')` returns; if an
		 * instance's engine really does not know it, the card wears the
		 * existing "Unknown step" warning instead of failing silently.
		 *
		 * @return {void}
		 */
		seedStartNode() {
			this.flow.nodes = [{
				id: `start-${Date.now().toString(36)}`,
				type: 'openregister.trigger-manual',
				x: 80,
				y: 60,
				config: {},
				start: true,
			}]
		},

		/**
		 * Add a node of `type`, at an explicit canvas point when dropped.
		 *
		 * `type` is the catalogue id verbatim. Default placement stacks a
		 * vertical chain near the left, with a gap about a card high so the
		 * arrowhead and the result badge on the connecting edge both have room.
		 *
		 * @param {string} type The catalogue node id.
		 * @param {number} x    Canvas x (optional).
		 * @param {number} y    Canvas y (optional).
		 * @return {void}
		 */
		/**
		 * Remember the current flow so the next edit can be undone.
		 *
		 * Called at the TOP of every mutating action, before the mutation — an
		 * undo stack that records the state AFTER a change can only ever return
		 * you to where you already are.
		 *
		 * Deep-cloned, not referenced. `flow` is mutated in place by several
		 * actions, so a stored reference would be rewritten by the very edit it
		 * exists to reverse and every entry would collapse to "now".
		 *
		 * Capped: each entry holds a whole flow document, and a canvas gets a
		 * lot of small edits. 50 is far past what anyone reaches for and still
		 * bounded.
		 *
		 * @return {void}
		 */
		pushUndo() {
			this.undoStack.push(JSON.stringify(this.flow))
			if (this.undoStack.length > 50) {
				this.undoStack.shift()
			}
		},

		/**
		 * Step back one edit.
		 *
		 * Entries that match the current state are DISCARDED rather than
		 * applied. Actions snapshot before they know whether they will change
		 * anything — `connect()` refuses a duplicate, `setNodeConfig()` may be
		 * handed the value already stored — so without this a user could press
		 * Ctrl+Z and watch nothing happen, which reads as "undo is broken"
		 * rather than "that edit was a no-op".
		 *
		 * @return {boolean} Whether anything was undone.
		 */
		undo() {
			const current = JSON.stringify(this.flow)

			while (this.undoStack.length > 0) {
				const previous = this.undoStack.pop()
				if (previous === current) {
					continue
				}

				this.flow = JSON.parse(previous)
				this.dirty = true

				// The verdict described the graph that was just replaced.
				this.checkResult = null

				// A node that no longer exists cannot stay selected, and an open
				// editor for it would render against nothing.
				if (this.nodes.some((node) => node.id === this.selectedNodeId) === false) {
					this.selectedNodeId = null
				}
				if (this.nodes.some((node) => node.id === this.editingNodeId) === false) {
					this.editingNodeId = null
				}

				return true
			}

			return false
		},

		addNode(type, x = null, y = null) {
			this.pushUndo()

			const index = this.nodes.length
			const node = {
				id: `${type}-${Date.now().toString(36)}-${index}`,
				type,
				x: x === null ? 80 : x,
				y: y === null ? (60 + index * 170) : y,
				config: {},
			}
			if (index === 0) {
				node.start = true
			}

			this.flow.nodes = [...this.nodes, node]
			this.selectedNodeId = node.id
			this.dirty = true
			this.checkResult = null
		},

		/**
		 * WRITES BOTH SPELLINGS, FOR THE SAME REASON connect() WRITES `from`/`to`.
		 *
		 * `position: {x, y}` is the shape the SERVER stores — measured on a live
		 * instance, not one of 100 persisted flows carried a flat `x`/`y` node.
		 * Writing only flat coordinates therefore meant a dragged node's new
		 * position never survived the save: it round-tripped back as no position
		 * at all, and the node reloaded at the origin.
		 *
		 * Flat `x`/`y` is kept alongside it because autoSort() and addNode()
		 * speak that spelling in memory, and dropping it here would make a moved
		 * node inconsistent with an unmoved one within the same session.
		 *
		 * @param {object} move   The move.
		 * @param {string} move.id The node that moved.
		 * @param {number} move.x  Its new x, in canvas units.
		 * @param {number} move.y  Its new y.
		 * @return {void}
		 */
		/**
		 * Duplicate a step, offset so the copy is visibly its own node.
		 *
		 * The config is deep-cloned. A shallow copy would leave both steps
		 * sharing one config object, so editing the duplicate would silently
		 * rewrite the original — the copy would look independent and not be.
		 *
		 * Edges are deliberately NOT copied. A duplicate wired exactly like its
		 * original would fan the flow in two at that point, which is a different
		 * graph from the one the author asked for; they connect the copy where
		 * they want it.
		 *
		 * `start` is not copied either: a flow has one starting point, and a
		 * second node claiming it makes the entry ambiguous.
		 *
		 * @param {string} id The node to copy.
		 * @return {string|null} The new node's id, or null when there was nothing to copy.
		 */
		copyNode(id) {
			const source = this.nodes.find((node) => node.id === id)
			if (source === undefined) {
				return null
			}

			this.pushUndo()

			const copy = {
				...source,
				id: `${source.type}-${Date.now().toString(36)}-${this.nodes.length}`,
				x: (source.x ?? 0) + 40,
				y: (source.y ?? 0) + 40,
				config: JSON.parse(JSON.stringify(source.config ?? {})),
			}
			copy.position = { x: copy.x, y: copy.y }
			delete copy.start
			delete copy.initial

			this.flow.nodes = [...this.nodes, copy]
			this.selectedNodeId = copy.id
			this.dirty = true
			this.checkResult = null

			return copy.id
		},

		moveNode({ id, x, y }) {
			this.pushUndo()

			this.flow.nodes = this.nodes.map(
				(node) => (node.id === id ? { ...node, x, y, position: { x, y } } : node),
			)
			this.dirty = true
		},

		/**
		 * Connect two nodes (no duplicates, no self-edges).
		 *
		 * WRITES `from`/`to`, WHICH IS THE DIALECT THE ENGINE READS.
		 *
		 * This used to store `{source, target}`. The canvas rendered it — the
		 * `canvasEdges` getter accepts either spelling — so the author saw the
		 * connection, and the save succeeded. But OpenRegister's flow engine
		 * only understands `from`/`to`, so every edge drawn in the editor was
		 * INVISIBLE to it: the saved flow validated with a `node-dead-end`
		 * warning and a run was refused outright with "node … has no outgoing
		 * edge and does not end the flow".
		 *
		 * The editor could therefore not produce a runnable multi-node flow at
		 * all, while looking like it had. Measured against a live instance:
		 * `edges: [{source, target}]` returns that warning, `[{from, to}]`
		 * returns clean.
		 *
		 * The duplicate check reads BOTH spellings, so a flow loaded from the
		 * server (which is `from`/`to`) is not re-connected into a duplicate.
		 *
		 * @param {object} payload        The connection.
		 * @param {string} payload.source Source node id.
		 * @param {string} payload.target Target node id.
		 * @return {void}
		 */
		connect({ source, target }) {
			this.pushUndo()

			if (!source || !target || source === target) {
				return
			}

			const exists = this.edges.some(
				(edge) => (edge.source ?? edge.from) === source && (edge.target ?? edge.to) === target,
			)
			if (exists) {
				return
			}

			this.flow.edges = [...this.edges, { from: source, to: target }]
			this.dirty = true
			this.checkResult = null
		},

		removeNode(id) {
			this.pushUndo()

			this.flow.nodes = this.nodes.filter((node) => node.id !== id)
			// BOTH spellings, or removing a node leaves its `from`/`to` edges
			// behind pointing at a node that no longer exists — and `from`/`to`
			// is exactly what the server stores, so every edge on a loaded flow
			// survived the deletion of the node it referenced.
			this.flow.edges = this.edges.filter(
				(edge) => (edge.source ?? edge.from) !== id && (edge.target ?? edge.to) !== id,
			)
			this.selectedNodeId = null
			this.dirty = true
			this.checkResult = null
		},

		/**
		 * Replace the selected node's whole config.
		 *
		 * The raw-config editor needs this: it edits the object as a document, so
		 * a per-key setter could never REMOVE a key, and a node type whose keys
		 * the builder does not know would accumulate stale ones.
		 *
		 * @param {object} config The new config object.
		 * @return {void}
		 */
		setNodeConfigAll(config) {
			this.pushUndo()

			if (this.selectedNodeId === null) {
				return
			}

			this.flow.nodes = this.nodes.map((node) => (
				node.id === this.selectedNodeId ? { ...node, config: { ...config } } : node
			))
			this.dirty = true
			this.checkResult = null
		},

		setNodeConfig(key, value) {
			this.pushUndo()

			if (this.selectedNodeId === null) {
				return
			}

			this.flow.nodes = this.nodes.map((node) => (
				node.id === this.selectedNodeId
					? { ...node, config: { ...(node.config || {}), [key]: value } }
					: node
			))
			this.dirty = true
			this.checkResult = null
		},

		setFlowField(key, value) {
			this.pushUndo()

			this.flow = { ...this.flow, [key]: value }
			this.dirty = true
		},

		/**
		 * Rename one node. The name is display only — the card's headline —
		 * so it does not invalidate a check verdict.
		 *
		 * @param {string} id   The node id.
		 * @param {string} name The new name; empty falls back to the type label.
		 * @return {void}
		 */
		setNodeName(id, name) {
			this.pushUndo()

			this.flow.nodes = this.nodes.map((node) => (
				node.id === id ? { ...node, name } : node
			))
			this.dirty = true
		},

		/**
		 * Replace one node's whole config, by id.
		 *
		 * The edit dialog needs this: it commits a DRAFT on Done, for whichever
		 * node it was opened on — which is not necessarily the selected one.
		 *
		 * @param {string} id     The node id.
		 * @param {object} config The new config object.
		 * @return {void}
		 */
		setNodeConfigById(id, config) {
			this.pushUndo()

			this.flow.nodes = this.nodes.map((node) => (
				node.id === id ? { ...node, config: { ...config } } : node
			))
			this.dirty = true
			this.checkResult = null
		},

		/**
		 * Whether a node carries a position of its own.
		 *
		 * BOTH SPELLINGS, because both are in circulation: the server stores
		 * `position: {x, y}` and the editor writes flat `x`/`y` in memory.
		 * Checking only one would read a positioned flow as unpositioned and
		 * rearrange it — the opposite of what load() wants.
		 *
		 * A node AT the origin counts as positioned. (0, 0) is a legitimate
		 * place to put something, and treating it as "no position" would keep
		 * relaying out a flow whose author had parked a node there.
		 *
		 * @param {object} node The node.
		 * @return {boolean} True when the node says where it goes.
		 */
		hasPosition(node) {
			return Number.isFinite(Number(node?.x))
				|| Number.isFinite(Number(node?.position?.x))
		},

		/**
		 * Lay the nodes out left-to-right by how the flow actually runs.
		 *
		 * Longest-path layering seeded from the start nodes, so a node sits one
		 * column past the furthest node that leads to it. Unreachable nodes go
		 * one column past everything — never at the origin, where they would
		 * hide under the entry points. Coordinates and NOTHING else change,
		 * which is what makes this safe to press on a working flow.
		 *
		 * @return {void}
		 */
		autoSort() {
			this.pushUndo()

			const nodes = this.nodes
			if (!nodes.length) {
				return
			}

			const columnWidth = 260
			const rowHeight = 170
			const margin = 60
			// The toolbar FLOATS over the canvas (position: absolute, top 12px,
			// ~52px tall) because the controls belong with the graph. A node
			// laid out at the old uniform 60px margin therefore landed UNDER
			// it, and an overlaid node is not merely ugly — it is unreachable:
			// the toolbar swallows the pointer, so it cannot be clicked,
			// double-clicked to edit, or dragged out from under itself.
			// Measured live on a three-node flow: the middle node sat wholly
			// behind the toolbar and Playwright reported
			// `cn-flow-detail__toolbar subtree intercepts pointer events`.
			const toolbarClearance = 96

			const outgoing = new Map()
			for (const line of this.canvasEdges) {
				if (!outgoing.has(line.source)) {
					outgoing.set(line.source, [])
				}
				outgoing.get(line.source).push(line.target)
			}

			const depth = new Map()
			const queue = this.startNodeIds.map((id) => ({ id, level: 0 }))
			// n² guard: a cycle must terminate the walk, not the browser.
			let budget = nodes.length * nodes.length
			while (queue.length && budget-- > 0) {
				const { id, level } = queue.shift()
				if ((depth.get(id) ?? -1) >= level) {
					continue
				}

				depth.set(id, level)
				for (const next of (outgoing.get(id) || [])) {
					queue.push({ id: next, level: level + 1 })
				}
			}

			const unreachableColumn = (Math.max(-1, ...depth.values()) + 1)
			const rows = new Map()
			this.flow.nodes = nodes.map((node) => {
				const column = depth.has(node.id) ? depth.get(node.id) : unreachableColumn
				const row = rows.get(column) || 0
				rows.set(column, row + 1)

				const x = margin + (column * columnWidth)
				const y = toolbarClearance + (row * rowHeight)

				// Both spellings — see moveNode(). Laying a flow out and saving
				// it has to survive the round trip, or the button appears to
				// work and the layout is gone on the next load.
				return { ...node, x, y, position: { x, y } }
			})
			this.dirty = true
		},

		/**
		 * Ask the engine whether the CANVAS is runnable, without saving it.
		 *
		 * `POST /api/flow/validate` preflights the document against the live
		 * node registry — the same check a save performs, minus the write. A
		 * refusal (400) still carries the preflight's own report, so it is kept
		 * as the result rather than treated as a transport failure: "this flow
		 * is not runnable, and here is why" is the answer the button asked for.
		 *
		 * @return {Promise<object|null>} `{valid, blocking, warnings, message?}`, or null.
		 */
		async check() {
			this.checking = true
			this.error = null
			try {
				const response = await axios.post(
					generateUrl('/apps/openregister/api/flow/validate'),
					{ flow: this.flowForRun },
				)
				this.checkResult = response.data || null
				return this.checkResult
			} catch (error) {
				const report = error?.response?.data
				if (report && typeof report === 'object' && 'valid' in report) {
					this.checkResult = report
					return this.checkResult
				}

				console.error('cn-flow: could not check the flow', error)
				this.error = error
				return null
			} finally {
				this.checking = false
			}
		},

		/**
		 * Create or update the flow.
		 *
		 * `owner` and `organisation` are never sent: the server stamps them, and
		 * a client-supplied owner would let an author mint a flow that RUNS as
		 * somebody else.
		 *
		 * @return {Promise<object|null>} The stored flow, or null on failure.
		 */
		async save() {
			this.saving = true
			this.error = null
			try {
				const payload = { ...this.flow }
				delete payload.owner
				delete payload.organisation

				const isNew = !payload.id
				const response = isNew
					? await axios.post(generateUrl('/apps/openregister/api/flows'), payload)
					: await axios.put(generateUrl(`/apps/openregister/api/flows/${payload.id}`), payload)

				const saved = response.data || null
				if (saved?.id) {
					this.flow = { ...this.flow, id: saved.id }
				}

				await this.load({ app: this.flow.app })
				this.dirty = false
				return saved
			} catch (error) {
				console.error('cn-flow: could not save the flow', error)
				this.error = error
				return null
			} finally {
				this.saving = false
			}
		},

		async remove(id) {
			await axios.delete(generateUrl(`/apps/openregister/api/flows/${id}`))
			await this.load({ app: this.flow.app })
		},

		/**
		 * Queue a run of the stored flow.
		 *
		 * A flow must be SAVED before it runs. The engine walks the stored
		 * document, so running unsaved canvas state would report on a graph that
		 * is not the one on screen.
		 *
		 * @param {object} subject `{uuid, register, schema}` of the subject.
		 * @return {Promise<object|null>} The queued run.
		 */
		async run(subject = {}) {
			if (!this.flow.id) {
				this.error = new Error('Save the flow before running it.')
				return null
			}

			this.running = true
			try {
				const response = await axios.post(
					generateUrl(`/apps/openregister/api/flows/${this.flow.id}/run`),
					{ subject },
				)
				await this.loadRuns(this.flow.id)
				return response.data || null
			} catch (error) {
				console.error('cn-flow: could not run the flow', error)
				this.error = error
				return null
			} finally {
				this.running = false
			}
		},

		async loadRuns(flowId) {
			try {
				const response = await axios.get(generateUrl('/apps/openregister/api/flow-runs'), {
					params: { flowId, limit: 25 },
				})
				this.runs = response.data?.results || []
			} catch (error) {
				console.error('cn-flow: could not load run history', error)
				this.runs = []
			}
		},

		/**
		 * Load one run's per-node steps.
		 *
		 * This is what the step table exists for — the run's aggregate log
		 * cannot answer "which node produced this" without being walked.
		 *
		 * @param {string} runUuid The run to inspect.
		 * @return {Promise<void>}
		 */
		async inspectRun(runUuid) {
			this.inspectedRunUuid = runUuid
			try {
				const response = await axios.get(
					generateUrl(`/apps/openregister/api/flow-runs/${runUuid}`),
				)
				this.steps = response.data?.log || []
			} catch (error) {
				console.error('cn-flow: could not load the run steps', error)
				this.steps = []
			}
		},
	},
})
