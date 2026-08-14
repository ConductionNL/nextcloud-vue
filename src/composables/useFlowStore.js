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
		selectedNodeId: null,
		paletteDragType: null,

		// The node types the engine can actually execute. The catalogue is
		// AUTHORITATIVE: a builder that invents its own ids produces flows the
		// engine cannot run, which is exactly the defect this replaces.
		nodeCatalog: [],
		eventCatalog: [],

		// The runs of the flow being edited, and the per-node steps of the run
		// currently being inspected.
		runs: [],
		steps: [],
		inspectedRunUuid: null,

		loading: false,
		saving: false,
		running: false,
		dirty: false,
		error: null,
	}),

	getters: {
		nodes: (state) => state.flow.nodes || [],
		edges: (state) => state.flow.edges || [],

		selectedNode: (state) => {
			if (state.selectedNodeId === null) {
				return null
			}

			return (state.flow.nodes || []).find((n) => n.id === state.selectedNodeId) || null
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
			return state.nodeCatalog.find((entry) => entry.id === type) || null
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
			try {
				const response = await axios.get(generateUrl('/apps/openregister/api/flow/node-catalog'))
				this.nodeCatalog = response.data?.results || []
			} catch (error) {
				console.error('cn-flow: could not load the node catalogue', error)
				this.nodeCatalog = []
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
			this.runs = []
			this.steps = []
			this.inspectedRunUuid = null

			if (!id || id === 'new') {
				this.flow = { ...emptyFlow(), name: 'New flow', app: app || 'openregister' }
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

			this.loadRuns(id)
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
		addNode(type, x = null, y = null) {
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
		},

		moveNode({ id, x, y }) {
			this.flow.nodes = this.nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
			this.dirty = true
		},

		/**
		 * Connect two nodes (no duplicates, no self-edges).
		 *
		 * @param {object} payload        The connection.
		 * @param {string} payload.source Source node id.
		 * @param {string} payload.target Target node id.
		 * @return {void}
		 */
		connect({ source, target }) {
			if (!source || !target || source === target) {
				return
			}

			if (this.edges.some((edge) => edge.source === source && edge.target === target)) {
				return
			}

			this.flow.edges = [...this.edges, { source, target }]
			this.dirty = true
		},

		removeNode(id) {
			this.flow.nodes = this.nodes.filter((node) => node.id !== id)
			this.flow.edges = this.edges.filter((edge) => edge.source !== id && edge.target !== id)
			this.selectedNodeId = null
			this.dirty = true
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
			if (this.selectedNodeId === null) {
				return
			}

			this.flow.nodes = this.nodes.map((node) => (
				node.id === this.selectedNodeId ? { ...node, config: { ...config } } : node
			))
			this.dirty = true
		},

		setNodeConfig(key, value) {
			if (this.selectedNodeId === null) {
				return
			}

			this.flow.nodes = this.nodes.map((node) => (
				node.id === this.selectedNodeId
					? { ...node, config: { ...(node.config || {}), [key]: value } }
					: node
			))
			this.dirty = true
		},

		setFlowField(key, value) {
			this.flow = { ...this.flow, [key]: value }
			this.dirty = true
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
