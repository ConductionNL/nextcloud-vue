<!--
  CnFlowDetail — the canvas half of the flow editor.

  Geometry and interaction (pan, zoom, drag, drag-to-connect) come from
  CnGraphCanvas; this component supplies typed node cards, directional edge
  routing, and the editor toolbar (Save / Run / Check / arrange / zoom) — the
  actions that concern the graph live ON the graph. The palette, node config
  and flow settings live in CnFlowSidebar. The two halves render in different
  parts of the tree (page body vs Nextcloud's app sidebar), so they share
  `useFlowStore` rather than passing props. Save and Run are EMITTED, not
  handled: only the host knows whether a freshly minted id needs a route swap.

  Ported from hermiq's GraphBuilder, with ONE behavioural fix carried through
  the port: every label and config pane keys on the CATALOGUE id
  (`openregister.set-fields`, `hermiq.agent-step`), never a bare id. hermiq's
  builder fed its palette from the catalogue but matched bare ids everywhere
  else, so a node placed from the palette had no config pane and was skipped at
  run time — with the run reporting success.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-flow-detail">
		<!-- The editor's controls, ON the canvas: the actions that concern the
		     graph live with the graph, the way every flow tool draws it. -->
		<div class="cn-flow-detail__toolbar" role="toolbar" :aria-label="t('nextcloud-vue', 'Flow editor')">
			<NcButton type="primary"
				:disabled="store.saving || !store.flow.name"
				@click="onSaveClick">
				<template #icon>
					<NcLoadingIcon v-if="store.saving" :size="20" />
					<ContentSave v-else :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Save') }}
			</NcButton>
			<NcButton :disabled="store.running || !store.flow.id"
				:title="store.flow.id ? null : t('nextcloud-vue', 'Save the flow before running it — the engine runs the stored flow, not the unsaved canvas.')"
				@click="onRunClick">
				<template #icon>
					<Play :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Run') }}
			</NcButton>
			<NcButton type="tertiary"
				:disabled="store.checking || !store.nodes.length"
				@click="store.check()">
				<template #icon>
					<NcLoadingIcon v-if="store.checking" :size="20" />
					<CheckDecagram v-else :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Check') }}
			</NcButton>
			<NcButton type="tertiary"
				:disabled="!store.nodes.length"
				:aria-label="t('nextcloud-vue', 'Arrange steps automatically')"
				:title="t('nextcloud-vue', 'Arrange steps automatically')"
				@click="store.autoSort()">
				<template #icon>
					<SortVariant :size="20" />
				</template>
			</NcButton>
			<!-- Undo has a BUTTON as well as Ctrl+Z. A shortcut nobody is told
			     about is a feature only its author has: the affordance is what
			     tells a user the canvas is safe to experiment on. -->
			<NcButton type="tertiary"
				:disabled="!store.canUndo"
				:aria-label="t('nextcloud-vue', 'Undo the last change')"
				:title="t('nextcloud-vue', 'Undo the last change')"
				@click="store.undo()">
				<template #icon>
					<UndoVariant :size="20" />
				</template>
			</NcButton>
			<div class="cn-flow-detail__toolbar-group">
				<NcButton type="tertiary"
					:disabled="zoom <= minZoom"
					:aria-label="t('nextcloud-vue', 'Zoom out')"
					@click="zoomBy(-0.1)">
					<template #icon>
						<Minus :size="20" />
					</template>
				</NcButton>
				<NcButton type="tertiary"
					:aria-label="t('nextcloud-vue', 'Reset zoom')"
					@click="zoom = 1">
					{{ Math.round(zoom * 100) }}%
				</NcButton>
				<NcButton type="tertiary"
					:disabled="zoom >= maxZoom"
					:aria-label="t('nextcloud-vue', 'Zoom in')"
					@click="zoomBy(0.1)">
					<template #icon>
						<Plus :size="20" />
					</template>
				</NcButton>
			</div>

			<!-- The way back to a closed sidebar has to live OUTSIDE it. -->
			<NcButton v-if="!store.sidebarOpen"
				type="tertiary"
				:aria-label="t('nextcloud-vue', 'Show the flow controls')"
				:title="t('nextcloud-vue', 'Show the flow controls')"
				@click="store.sidebarOpen = true">
				<template #icon>
					<DockRight :size="20" />
				</template>
			</NcButton>
		</div>

		<!-- A node type whose configuration IS another product surface gets
		     that surface as its editor (the registry); everything else gets
		     the generic form. Same draft contract either way. -->
		<component :is="nodeEditorComponent" v-if="store.editingNodeId !== null" />

		<!-- The engine's verdict on the canvas, from the Check button. -->
		<NcNoteCard v-if="store.checkResult"
			class="cn-flow-detail__check"
			:type="checkCardType">
			<p>{{ checkCardText }}</p>
			<ul v-if="checkCardItems.length" class="cn-flow-detail__check-items">
				<li v-for="(item, i) in checkCardItems" :key="i">
					{{ item }}
				</li>
			</ul>
		</NcNoteCard>

		<!-- Edges are Vue Flow's now. The hand-drawn `#edge` slot and its
		     orthogonal `edgePath()` are gone: Vue Flow routes and arrows edges
		     itself, and it measures the rendered node instead of being told a
		     `nodeWidth`/`nodeHeight` to guess the centre from. -->
		<!-- Steps the run log names that are NOT on this canvas any more: the
		     flow was edited since the run. They are skipped and SAID, never
		     guessed onto the nearest card — a replay that remaps a deleted
		     node's step would draw a walk the engine never took. -->
		<NcNoteCard v-if="skippedRunTransitions.length"
			class="cn-flow-detail__run-skipped"
			type="warning">
			<p>{{ t('nextcloud-vue', 'Some steps of this run belong to nodes that are no longer on the canvas, so they were skipped: {nodes}', { nodes: skippedRunTransitions.join(', ') }) }}</p>
		</NcNoteCard>

		<!-- Run state travels ON the edge records, through the canvas's
		     existing `edges` prop: Vue Flow applies an edge's `class` to the
		     line it draws, so the canvas itself stays a geometry-only renderer
		     with no status concept (ADR-065). -->
		<CnGraphCanvas
			:nodes="canvasNodes"
			:edges="canvasEdgesWithRunState"
			:min-zoom="minZoom"
			:max-zoom="maxZoom"
			@node-select="onNodeSelect"
			@edge-select="onEdgeSelect"
			@edge-label-click="onEdgeLabelClick"
			@edge-label-context="onEdgeLabelContext"
			@edge-label-move="onEdgeLabelMove"
			@canvas-click="onCanvasClick"
			@nodes-change="onNodesChange"
			@node-remove="store.removeNode($event)"
			@connect="store.connect($event)"
			@canvas-drop="onCanvasDrop">
			<!-- The step's own chrome. `node.data` carries the flow node, because
			     Vue Flow's `type` selects a COMPONENT while the flow's own type
			     is domain data — conflating the two would make every new step
			     type need a registered component before it could render at all. -->
			<template #node="{ node }">
				<div
					class="cn-flow-detail__node"
					:class="[
						`cn-flow-detail__node--${typeSlug(node.data.stepType)}`,
						`cn-flow-detail__node--role-${store.roleOfNodeType(node.data.stepType)}`,
						{ 'cn-flow-detail__node--unknown': isUnknown(node.data.stepType) },
						runStateOf(node.id) ? `cn-flow-detail__node--run-${runStateOf(node.id)}` : null,
					]"
					@dblclick.stop="store.editingNodeId = node.id">
					<span class="cn-flow-detail__node-type">{{ typeLabel(node.data.stepType) }}</span>
					<span class="cn-flow-detail__node-label">{{ node.data.label }}</span>
					<span
						v-if="isUnknown(node.data.stepType)"
						class="cn-flow-detail__node-warning"
						:title="t('nextcloud-vue', 'The engine does not know this node type, so this step will fail when the flow runs.')">
						{{ t('nextcloud-vue', 'Unknown step') }}
					</span>
					<!-- The run state IN WORDS, next to the colour. A state told
					     by colour alone is invisible to anyone who cannot tell
					     the colours apart (WCAG 1.4.1), so every coloured node
					     also says what it is. -->
					<span
						v-if="runStateOf(node.id)"
						class="cn-flow-detail__node-run"
						:class="`cn-flow-detail__node-run--${runStateOf(node.id)}`">
						{{ runStateLabel(runStateOf(node.id)) }}
					</span>
				</div>
			</template>

			<!-- A connection's own name, on the connection.

			     Rendered only when the author gave the line one: CnFlowEdge
			     gates the label control on what this slot RENDERS, not on
			     whether it exists, so an unnamed line draws no empty chip. -->
			<template #edge-label="{ edge }">
				<template v-if="edge.data && edge.data.label">
					{{ edge.data.label }}
				</template>
			</template>
		</CnGraphCanvas>

		<!-- The step's own actions, at the step. Selecting a node used to only
		     fill the sidebar, so Edit / Copy / Delete lived in another panel —
		     or nowhere, for Copy. The canvas is where the graph is manipulated,
		     so the actions on a step belong on the step. -->
		<CnContextMenu
			v-model:open="nodeMenuOpen"
			:actions="nodeMenuActions"
			:target-item="nodeMenuTarget"
			@close="closeNodeMenu" />

		<!-- The line's own actions, at the line. A connection was the one thing
		     on this canvas that could be drawn and then never touched again:
		     selecting it did nothing at all, so there was no way to rename it,
		     re-route it, or remove it short of deleting a step. -->
		<CnContextMenu
			v-model:open="edgeMenuOpen"
			:actions="edgeMenuActions"
			:target-item="edgeMenuTarget"
			@close="closeEdgeMenu" />

		<CnFlowEdgeEditModal v-if="store.editingEdge !== null" />

		<NcEmptyContent
			v-if="store.nodes.length === 0"
			class="cn-flow-detail__empty"
			:name="t('nextcloud-vue', 'No steps yet')"
			:description="t('nextcloud-vue', 'Add a step from the sidebar to start building this flow.')">
			<template #icon>
				<Sitemap :size="20" />
			</template>
		</NcEmptyContent>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CheckDecagram from 'vue-material-design-icons/CheckDecagram.vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import DockRight from 'vue-material-design-icons/DockRight.vue'
import Minus from 'vue-material-design-icons/Minus.vue'
import Play from 'vue-material-design-icons/Play.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import SortVariant from 'vue-material-design-icons/SortVariant.vue'
import UndoVariant from 'vue-material-design-icons/UndoVariant.vue'
import VectorCurve from 'vue-material-design-icons/VectorCurve.vue'
import VectorLine from 'vue-material-design-icons/VectorLine.vue'
import VectorPolyline from 'vue-material-design-icons/VectorPolyline.vue'
import ContentPaste from 'vue-material-design-icons/ContentPaste.vue'
import CnFlowEdgeEditModal from '../../dialogs/CnFlowEdgeEditModal.vue'
import CnFlowNodeEditModal from '../../dialogs/CnFlowNodeEditModal.vue'
import CnContextMenu from '../CnContextMenu/CnContextMenu.vue'
import CnGraphCanvas from '../CnGraphCanvas/CnGraphCanvas.vue'
import { resolveFlowNodeEditor } from '../../composables/useFlowNodeEditors.js'
import { DEFAULT_EDGE_LINE_TYPE, EDGE_LINE_TYPES } from '../../composables/useFlowEdgeStyles.js'
import { useContextMenu } from '../../composables/useContextMenu.js'
import { useFlowStore } from '../../composables/useFlowStore.js'

/**
 * Which glyph stands for which router, in menu order.
 *
 * Components rather than CnIcon names: a line's shape has no ADR-077 semantic
 * concept behind it, and inventing one for three drawing options would put a
 * private entry into a fleet-wide vocabulary. Edit / Copy / Delete DO have
 * concepts, so those stay named — see `nodeMenuActions`.
 */
const LINE_TYPE_ICONS = {
	smoothstep: VectorPolyline,
	straight: VectorLine,
	default: VectorCurve,
}

/**
 * The catch-up pace for a live watch, per hop.
 *
 * The engine persists the log once per worker pass, so one poll can deliver
 * five steps at once. Draining them at ~320ms a hop makes a burst read as
 * five quick hops — not a teleport, and not a fabricated slow-motion "live"
 * feed the data does not contain.
 */
const RUN_CATCH_UP_HOP_MS = 320

/**
 * Replay pacing bounds. Replay timing is scaled from each step's REAL
 * `durationMs` — the only timing the log carries — and clamped so a
 * 40-minute wait step does not freeze the replay and a 3ms step is still
 * visible. Scaling real durations is presentation; inventing durations would
 * be fabrication — the clamp is the line between them.
 */
const REPLAY_HOP_MIN_MS = 200
const REPLAY_HOP_MAX_MS = 1500

export default {
	name: 'CnFlowDetail',

	components: {
		CheckDecagram,
		CnFlowEdgeEditModal,
		CnFlowNodeEditModal,
		CnContextMenu,
		CnGraphCanvas,
		ContentSave,
		DockRight,
		Minus,
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		NcNoteCard,
		Play,
		Plus,
		Sitemap,
		SortVariant,
		UndoVariant,
	},

	props: {
		/**
		 * Flow uuid from the route. The literal `new` starts a blank flow, so
		 * creating and editing share one page.
		 */
		id: {
			type: String,
			default: null,
		},

		/**
		 * The owning app id to scope to, and to stamp on a new flow.
		 */
		app: {
			type: String,
			default: null,
		},
	},

	emits: ['save', 'run'],

	setup() {
		const {
			isOpen: nodeMenuOpen,
			targetItem: nodeMenuTarget,
			open: openNodeMenu,
			close: closeNodeMenu,
		} = useContextMenu()

		// A SECOND instance, not a shared one. Both menus position themselves by
		// writing cursor coordinates onto the document, and a single instance
		// re-targeted between a node and a line would carry the previous
		// target's actions for as long as the reopen took.
		const {
			isOpen: edgeMenuOpen,
			targetItem: edgeMenuTarget,
			open: openEdgeMenu,
			close: closeEdgeMenu,
		} = useContextMenu()

		return {
			store: useFlowStore(),
			nodeMenuOpen,
			nodeMenuTarget,
			openNodeMenu,
			closeNodeMenu,
			edgeMenuOpen,
			edgeMenuTarget,
			openEdgeMenu,
			closeEdgeMenu,
		}
	},

	data() {
		return {
			// Zoom is owned here, not by the canvas: a consumer that does not
			// bind it pins the canvas at 1 and silently kills the wheel gesture.
			zoom: 1,
			minZoom: 0.3,
			maxZoom: 2,

			// The run animator: everything about HOW the watched or replayed
			// run paints onto the canvas. The store exposes facts (the run,
			// its ordered steps, which are new); the timeline lives here, the
			// only place that knows what a hop looks like.
			//
			// Derived per-node/per-edge classes come out of `runNodeStates`
			// and `canvasEdgesWithRunState`; this object is the cursor those
			// computeds derive from.
			runAnimation: {
				// 'watch', 'replay', or null while no run is on the canvas.
				mode: null,

				// Steps delivered but not yet animated. The engine persists
				// the log once per worker pass, so steps arrive in BURSTS;
				// the queue drains strictly in log order at a bounded pace —
				// never interpolated fake timing to look "live".
				queue: [],

				// How many steps have been animated. Zero with an active run
				// is the anticipation state: the start nodes pulse, because
				// pretending a specific step is executing would be a lie.
				playedCount: 0,

				// The node whose step is being animated right now (halo), and
				// the last node a step matched (the run's frontier).
				currentNodeId: null,
				lastNodeId: null,

				// The drawn line being traced this hop, and the lines already
				// walked (they keep a quiet success stroke).
				traceLineId: null,
				tracedLineIds: [],

				// Residue: nodes whose steps completed, failed, or suspended.
				doneNodeIds: [],
				failedNodeIds: [],
				holdNodeIds: [],

				// Transitions the log names that match NO canvas node — the
				// flow was edited since the run. Skipped and surfaced, never
				// remapped onto the nearest card.
				skippedTransitions: [],

				// The hop timer. One at a time: a hop schedules the next.
				timer: null,
			},

			// How many of `store.watchedSteps` this animator has consumed.
			// Index-diffing on the consumer side too, so a poll that delivers
			// nothing new enqueues nothing twice.
			runConsumed: 0,
		}
	},

	computed: {
		/**
		 * What can be done to a step, as CnContextMenu's action list.
		 *
		 * Built as a computed rather than a constant because the labels are
		 * translated, and `t()` must run after the locale is available.
		 *
		 * @return {Array<object>} The actions.
		 */
		nodeMenuActions() {
			return [
				{
					// ⚠️ THE VOCABULARY'S NAME, NOT THE GLYPH'S.
					//
					// `CnIcon` resolves a string against the ADR-077 semantic
					// vocabulary and falls back to a help-circle when it finds
					// nothing — SILENTLY, because an unknown name is
					// indistinguishable from a name nobody registered. This menu
					// asked for `Pencil` and `Delete`; the vocabulary publishes
					// `PencilOutline` and `DeleteOutline`. So two of the three
					// entries rendered a question mark, and `Copy` — whose name
					// happened to be right — rendered correctly, which is
					// exactly what made it read as a styling quirk rather than
					// as a lookup that failed.
					//
					// Named rather than imported so these stay tied to the
					// vocabulary: the point of ADR-077 is that Edit is the same
					// glyph in every app, and an import here would be a private
					// copy of that decision. Guarded by
					// tests/components/CnFlowMenuIcons.spec.js, which resolves
					// every name this menu uses and fails on the fallback.
					label: t('nextcloud-vue', 'Edit'),
					icon: 'PencilOutline',
					handler: (id) => {
						this.store.editingNodeId = id
					},
				},
				{
					label: t('nextcloud-vue', 'Copy'),
					icon: 'ContentCopy',
					handler: (id) => {
						this.store.copyNode(id)
					},
				},
				{
					label: t('nextcloud-vue', 'Delete'),
					icon: 'DeleteOutline',
					destructive: true,
					handler: (id) => {
						this.store.removeNode(id)
					},
				},
			]
		},
		/**
		 * What can be done to a connection, as CnContextMenu's action list.
		 *
		 * The three routers are FLAT entries rather than a submenu: CnContextMenu
		 * has a custom-panel path, and it has no consumer anywhere in this
		 * library — shipping a context menu on an untested code path to save
		 * two rows is a poor trade. The router the line already uses is
		 * disabled, with a `title` saying why, so the menu states the current
		 * value instead of hiding it behind a click.
		 *
		 * `targetItem` is `{source, target}` — see `useFlowStore.editingEdge`
		 * for why a line is identified by its endpoints and never by its id.
		 *
		 * @return {Array<object>} The actions.
		 */
		edgeMenuActions() {
			const styleActions = EDGE_LINE_TYPES.map((style) => ({
				label: style.label(),
				icon: LINE_TYPE_ICONS[style.id],
				disabled: (line) => this.lineTypeOf(line) === style.id,
				title: (line) => (
					this.lineTypeOf(line) === style.id
						? t('nextcloud-vue', 'This line is already drawn this way.')
						: null
				),
				handler: (line) => {
					this.store.setEdgeFields({
						source: line.source,
						target: line.target,
						fields: { lineType: style.id },
					})
				},
			}))

			return [
				{
					label: t('nextcloud-vue', 'Edit label'),
					icon: 'PencilOutline',
					handler: (line) => {
						this.store.editingEdge = { source: line.source, target: line.target }
					},
				},
				...styleActions,
				{
					// A connection has no useful DUPLICATE — two records with the
					// same endpoints draw on top of each other and `connect()`
					// refuses the second — so Copy takes the part of a line that
					// IS worth repeating: its label and its router.
					label: t('nextcloud-vue', 'Copy'),
					icon: 'ContentCopy',
					handler: (line) => {
						this.store.copyEdgeStyle({ source: line.source, target: line.target })
					},
				},
				{
					label: t('nextcloud-vue', 'Paste style'),
					icon: ContentPaste,
					visible: () => this.store.edgeStyleClipboard !== null,
					handler: (line) => {
						this.store.pasteEdgeStyle({ source: line.source, target: line.target })
					},
				},
				{
					label: t('nextcloud-vue', 'Delete'),
					icon: 'DeleteOutline',
					destructive: true,
					handler: (line) => {
						this.store.removeEdge({ source: line.source, target: line.target })
					},
				},
			]
		},

		/**
		 * The flow's steps in Vue Flow's node shape.
		 *
		 * The mapping lives here rather than in the store because the store owns
		 * the FLOW DOCUMENT — the thing that gets saved — and a canvas library's
		 * node shape is a rendering concern. Pushing `position` into the store
		 * would make the persisted document carry a dependency's vocabulary.
		 *
		 * `type` is pinned to `'default'` so every step renders through
		 * CnFlowNode, and the flow's own type travels in `data.stepType`. Vue
		 * Flow's `type` selects a COMPONENT; conflating it with the domain type
		 * would mean a new step type could not render at all until someone
		 * registered a component for it — exactly the "unknown step" case this
		 * component exists to display gracefully.
		 *
		 * @return {Array<object>} Vue Flow nodes.
		 */
		canvasNodes() {
			// WHICH STEPS A LINE ACTUALLY TOUCHES, measured once per render
			// rather than once per node: `canvasEdges` expands the document's
			// list dialects (`{from: 'a', to: ['b','c']}`) into one line per
			// pair, and re-walking it inside the map below would be quadratic on
			// a graph large enough to care.
			const targeted = new Set()
			const sourced = new Set()
			for (const line of this.store.canvasEdges) {
				targeted.add(line.target)
				sourced.add(line.source)
			}

			return (this.store.nodes || []).map((node) => ({
				id: node.id,
				type: 'default',
				// BOTH SPELLINGS, for the same reason removeNode() reads both
				// edge spellings: `position: {x, y}` is what the SERVER stores,
				// and flat `x`/`y` is what addNode()/moveNode() write in memory.
				//
				// Reading only `node.x` meant `Number(undefined) || 0` for every
				// node of every PERSISTED flow — so a saved flow reloaded with
				// all of its nodes stacked at the origin, on top of each other.
				// A new flow looked fine because its nodes had never been
				// through the server. Measured on a live instance: of 100 stored
				// flows sampled, NOT ONE had a flat `x`/`y` node; a 76-node flow
				// reloaded with all 76 at (0, 0).
				//
				// The pile is invisible rather than obviously wrong, which is
				// why this read as "the canvas renders nothing" instead of "the
				// layout is lost".
				position: {
					x: Number(node.x ?? node.position?.x) || 0,
					y: Number(node.y ?? node.position?.y) || 0,
				},
				data: {
					stepType: node.type,
					label: this.nodeLabel(node),
					ports: this.store.portsOfNode ? this.store.portsOfNode(node) : undefined,

					// A PORT THAT CANNOT BE CONNECTED IS NOT DRAWN.
					//
					// A run STARTS at a trigger, so an entry on one is an
					// affordance the engine will never honour; a run STOPS at an
					// end step, so an exit on one is the same lie in the other
					// direction. Both were being drawn on every node regardless
					// of role, which made the canvas claim a graph shape the
					// engine would refuse.
					//
					// Keyed on the CATALOGUE's role, like the accent colours
					// below — never on graph position, which once painted
					// unconnected steps green.
					hasTarget: this.store.roleOfNodeType(node.type) !== 'trigger',
					hasSource: this.store.roleOfNodeType(node.type) !== 'end',

					// Whether anything is actually wired to those ports. The
					// node paints an unconnected one as a warning, which is the
					// same finding `check()` returns — but at the port, where the
					// author can act on it, rather than as a node id in a card
					// on the other side of the screen.
					hasIncoming: targeted.has(node.id),
					hasOutgoing: sourced.has(node.id),
				},
			}))
		},

		/**
		 * The editor for the node being edited: an app-registered one for its
		 * type when there is one, the generic dialog otherwise.
		 *
		 * @return {object} The component.
		 */
		nodeEditorComponent() {
			const type = this.store.editingNode?.type
			return (type && resolveFlowNodeEditor(type)) || CnFlowNodeEditModal
		},

		/**
		 * @return {string} The note-card type for the check verdict.
		 */
		checkCardType() {
			const result = this.store.checkResult
			if (!result) {
				return 'success'
			}
			if (result.valid === false) {
				return 'error'
			}

			return (result.warnings || []).length ? 'warning' : 'success'
		},

		/**
		 * @return {string} The one-line verdict.
		 */
		checkCardText() {
			const result = this.store.checkResult
			if (!result) {
				return ''
			}
			if (result.valid === false) {
				return result.message || this.t('nextcloud-vue', 'This flow cannot run yet.')
			}
			if ((result.warnings || []).length) {
				return this.t('nextcloud-vue', 'This flow can run, with warnings.')
			}

			return this.t('nextcloud-vue', 'This flow looks runnable.')
		},

		/**
		 * @return {Array<string>} The individual findings, readable.
		 */
		checkCardItems() {
			const result = this.store.checkResult
			if (!result) {
				return []
			}

			const describe = (finding) => {
				if (typeof finding === 'string') {
					return finding
				}

				const parts = [finding.message || finding.reason || '']
				if (finding.node) {
					parts.push(`(${finding.node})`)
				}

				return parts.filter(Boolean).join(' ')
			}

			return [
				...(result.blocking || []).map(describe),
				...(result.warnings || []).map(describe),
			].filter(Boolean)
		},

		/**
		 * What the run painted on each node, derived — never stored — from
		 * the animator's cursor and residue.
		 *
		 * Precedence: a failure is never painted over (`failed` wins), a hold
		 * is a state the user must notice (`hold` next), then the halo on the
		 * step being animated (`active`), then the quiet success accent on
		 * what completed (`done`).
		 *
		 * @return {{[key: string]: string}} Node id to run state.
		 */
		runNodeStates() {
			const anim = this.runAnimation
			if (anim.mode === null) {
				return {}
			}

			const states = {}

			for (const id of anim.doneNodeIds) {
				states[id] = 'done'
			}

			// The hold state: the last suspended step's node — and, when the
			// log lags behind a run that reports `suspended`, the marking's
			// places, which are node ids in the engine's workflow.
			const holdIds = [...anim.holdNodeIds]
			const run = this.store.watchedRun
			if (holdIds.length === 0
				&& anim.mode === 'watch'
				&& run?.status === 'suspended'
				&& run.marking !== null
				&& typeof run.marking === 'object') {
				for (const place of Object.keys(run.marking)) {
					if (this.store.nodes.some((node) => node.id === place)) {
						holdIds.push(place)
					}
				}
			}
			for (const id of holdIds) {
				states[id] = 'hold'
			}

			for (const id of anim.failedNodeIds) {
				states[id] = 'failed'
			}

			// The halo: the step being animated — or, on a live watch with the
			// queue drained, the run's frontier (its furthest logged node).
			// That frontier is what "where is my case" actually asks for.
			const suspended = anim.mode === 'watch' && run?.status === 'suspended'
			const current = anim.currentNodeId
				|| ((anim.mode === 'watch' && this.store.watchedRunActive && suspended === false)
					? anim.lastNodeId
					: null)
			if (current !== null && states[current] !== 'failed' && states[current] !== 'hold') {
				states[current] = 'active'
			}

			// Anticipation: the run says `running` (or `queued`) and the log
			// is still empty — a mid-pass poll returns exactly this. The start
			// nodes pulse; pretending a specific step is executing would
			// fabricate liveness the data does not contain.
			if (anim.mode === 'watch'
				&& this.store.watchedRunActive
				&& suspended === false
				&& anim.playedCount === 0
				&& anim.queue.length === 0) {
				for (const id of this.store.startNodeIds) {
					if (states[id] === undefined) {
						states[id] = 'active'
					}
				}
			}

			return states
		},

		/**
		 * The canvas edges with the run's classes on them.
		 *
		 * Vue Flow applies an edge record's `class` to the `<g>` it draws, so
		 * run state reaches the lines through the canvas's EXISTING `edges`
		 * prop — no prop, event or slot of CnGraphCanvas changes, and the
		 * canvas itself keeps knowing nothing about statuses (ADR-065).
		 *
		 * @return {Array<object>} The drawable lines, some carrying a class.
		 */
		canvasEdgesWithRunState() {
			const anim = this.runAnimation
			if (anim.mode === null) {
				return this.store.canvasEdges
			}

			return this.store.canvasEdges.map((line) => {
				if (line.id === anim.traceLineId) {
					return { ...line, class: 'cn-flow-detail__edge--run-tracing' }
				}
				if (anim.tracedLineIds.includes(line.id)) {
					return { ...line, class: 'cn-flow-detail__edge--run-traced' }
				}

				return line
			})
		},

		/**
		 * The transitions the run log named that match no canvas node, once
		 * each, for the warning card.
		 *
		 * @return {Array<string>} The unmatched transition names.
		 */
		skippedRunTransitions() {
			return [...new Set(this.runAnimation.skippedTransitions)]
		},
	},

	watch: {
		/**
		 * Reload when the route names a different flow.
		 *
		 * `mounted` alone was not enough, and the gap was not cosmetic. Vue
		 * reuses this component instance when only the route PARAM changes —
		 * `/flows/:id` -> `/flows/new` and `/flows/a` -> `/flows/b` are the same
		 * route record — so `mounted` does not fire again and the store keeps
		 * the flow it already had.
		 *
		 * That left the canvas showing the previous flow AND the store still
		 * holding its id, on a page the user believes is a different flow.
		 * `save()` picks PUT over POST from `flow.id`, so pressing Save on what
		 * looks like a blank "new flow" issued a PUT against the flow the user
		 * had open a moment earlier — overwriting a real flow with a graph
		 * meant for a new one.
		 *
		 * Reproduced on openregister 2026-08-05: opening "Hydra label
		 * transition", then moving to /flows/new, left the Name field reading
		 * "Hydra label transition" with that flow's nodes on the canvas.
		 *
		 * The first load stays in `mounted` rather than moving here behind
		 * `immediate: true`: an immediate watcher fires before the component is
		 * mounted, and this one awaits a network call whose result the canvas
		 * renders. Guarding on `next === prev` keeps the two from racing.
		 *
		 * @param {string} next The incoming flow id, or 'new'.
		 * @param {string} prev The outgoing one.
		 * @return {Promise<void>}
		 */
		async id(next, prev) {
			if (next === prev) {
				return
			}

			await this.store.load({ app: this.app, id: next })
		},

		/**
		 * A new watch replaces whatever run was on the canvas: the animator
		 * resets and the store's steps start flowing into the fresh queue.
		 *
		 * @param {string|null} next The newly watched run's uuid.
		 * @return {void}
		 */
		'store.watchedRunUuid'(next) {
			if (next === null) {
				return
			}

			this.startRunAnimation('watch')
		},

		/**
		 * Steps arrived from a poll. Index-diffed on this side too — only the
		 * entries beyond what was already consumed are queued, so a poll that
		 * delivered nothing new enqueues nothing twice, and a resumed run's
		 * appended entries queue without replaying the ones before them.
		 *
		 * @param {Array<object>} steps The watched run's log so far.
		 * @return {void}
		 */
		'store.watchedSteps'(steps) {
			if (this.runAnimation.mode !== 'watch') {
				return
			}

			if (steps.length <= this.runConsumed) {
				return
			}

			this.runAnimation.queue.push(...steps.slice(this.runConsumed))
			this.runConsumed = steps.length
			this.drainRunQueue()
		},

		/**
		 * The sidebar asked for a replay of the inspected run. The stored log
		 * plays through the same animator, in log order, paced from each
		 * step's real `durationMs`. Starting another replay cancels the one
		 * in progress — the reset is the cancellation.
		 *
		 * @return {void}
		 */
		'store.replayToken'() {
			this.startRunAnimation('replay')
			this.runAnimation.queue.push(...this.store.steps)
			this.drainRunQueue()
		},

		/**
		 * A graph edit tears the run picture down. The log names node ids of
		 * the graph AS IT RAN; painting it over an edited graph would show a
		 * walk the engine never took over these nodes.
		 *
		 * @param {boolean} next Whether the flow now has unsaved changes.
		 * @return {void}
		 */
		'store.dirty'(next) {
			if (next === true) {
				this.cancelRunAnimation()
			}
		},
	},

	async mounted() {
		document.addEventListener('keydown', this.onDocumentKeydown)
		await this.store.load({ app: this.app, id: this.id })
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onDocumentKeydown)

		// The animator's timer must not outlive the canvas, and neither may
		// the store's poll loop outlive the surface that watches it — no
		// polling survives navigating away.
		this.cancelRunAnimation()
		this.store.stopWatching()
	},

	methods: {
		/**
		 * Ctrl+Z / Cmd+Z steps the GRAPH back one edit.
		 *
		 * Bound on `document` rather than the canvas element: the shortcut has
		 * to work after clicking anywhere in the editor, and the canvas is not
		 * what holds focus for most of a session.
		 *
		 * ⚠️ WHICH IS EXACTLY WHY IT HAS TO STAND DOWN. A document listener sees
		 * every Ctrl+Z on the page, including the one a user presses to undo
		 * TYPING in a step's name or its JSON config. Reverting the whole graph
		 * because someone fixed a typo would be a far worse bug than having no
		 * undo at all, so a keystroke aimed at editable text is left to the
		 * browser's own undo. The open-editor check is a second guard for the
		 * same reason: while a node's dialog is up, the user is editing that
		 * node, not the graph.
		 *
		 * Shift+Ctrl+Z is deliberately NOT claimed — that is redo, and there is
		 * no redo stack yet. Claiming it would swallow the key and do nothing.
		 *
		 * @param {KeyboardEvent} event The key event.
		 * @return {void}
		 */
		onDocumentKeydown(event) {
			if (event.key !== 'z' && event.key !== 'Z') {
				return
			}

			if ((event.ctrlKey || event.metaKey) === false || event.shiftKey === true || event.altKey === true) {
				return
			}

			const target = event.target
			const tag = String(target?.tagName || '').toLowerCase()
			if (tag === 'input' || tag === 'textarea' || target?.isContentEditable === true) {
				return
			}

			if (this.store.editingNodeId !== null) {
				return
			}

			if (this.store.canUndo === false) {
				return
			}

			event.preventDefault()
			this.store.undo()
		},

		/**
		 * Persist a node move that Vue Flow reports.
		 *
		 * Vue Flow emits ONE change stream for drags, keyboard moves and
		 * programmatic updates alike, so this replaces the old `@node-move`.
		 * Only `position` changes with a settled position are persisted:
		 * intermediate drag frames arrive with `dragging: true` and writing
		 * those would put a store commit on every animation frame.
		 *
		 * @param {Array<object>} changes Vue Flow's node changes.
		 * @return {void}
		 */
		onNodesChange(changes) {
			for (const change of (changes || [])) {
				if (change.type !== 'position' || change.dragging === true) {
					continue
				}

				if (change.position === undefined || change.position === null) {
					continue
				}

				this.store.moveNode({ id: change.id, x: change.position.x, y: change.position.y })
			}
		},

		/**
		 * @param {object|null} line The menu's target line.
		 * @return {string} The router it is drawn with.
		 */
		lineTypeOf(line) {
			return line?.lineType || DEFAULT_EDGE_LINE_TYPE
		},

		/**
		 * A line was clicked: open its actions where the pointer is.
		 *
		 * Vue Flow reports `{ edge, event }`, and `edge.data.edge` is the STORED
		 * record — but the menu is keyed on the endpoint pair rather than on
		 * that record, because one stored record can draw several lines and only
		 * the pair says which one was clicked.
		 *
		 * @param {object} event Vue Flow's edge-click event.
		 * @return {void}
		 */
		onEdgeSelect(event) {
			const edge = event?.edge ?? event
			const mouse = event?.event

			this.openEdgeMenuFor(edge, mouse)
		},

		/**
		 * The label is a control in its own right, so activating it opens the
		 * same menu the line does — a user who aims at the name of a connection
		 * means the connection.
		 *
		 * @param {string} id The drawn line's id.
		 * @return {void}
		 */
		onEdgeLabelClick(id) {
			const line = this.store.canvasEdges.find((candidate) => candidate.id === id)
			if (line === undefined) {
				return
			}

			this.store.editingEdge = { source: line.source, target: line.target }
		},

		/**
		 * @param {object}     payload       A right-click on a line's label.
		 * @param {string}     payload.id    The drawn line's id.
		 * @param {MouseEvent} payload.event The pointer event.
		 * @return {void}
		 */
		onEdgeLabelContext({ id, event }) {
			const line = this.store.canvasEdges.find((candidate) => candidate.id === id)
			if (line === undefined) {
				return
			}

			this.openEdgeMenuFor(line, event)
		},

		/**
		 * Persist a label slid along its line.
		 *
		 * REPORTED, then stored — CnFlowEdge never writes the edge itself, the
		 * same rule node positions follow.
		 *
		 * @param {object} payload        The move.
		 * @param {string} payload.id     The drawn line's id.
		 * @param {number} payload.labelT Its new fraction along the line.
		 * @return {void}
		 */
		onEdgeLabelMove({ id, labelT }) {
			const line = this.store.canvasEdges.find((candidate) => candidate.id === id)
			if (line === undefined) {
				return
			}

			this.store.setEdgeFields({ source: line.source, target: line.target, fields: { labelT } })
		},

		/**
		 * Open the line menu, if the click carried a pointer position.
		 *
		 * A keyboard-activated selection has no coordinates, and a menu placed at
		 * (0, 0) is worse than no menu — so the selection stands and nothing
		 * pops. The dialog remains reachable from the label control, which IS
		 * focusable.
		 *
		 * @param {object}      line  The drawn line, or Vue Flow's edge record.
		 * @param {MouseEvent=} mouse The pointer event, when there was one.
		 * @return {void}
		 */
		openEdgeMenuFor(line, mouse) {
			if (line?.source === undefined || mouse?.clientX === undefined) {
				return
			}

			this.openEdgeMenu({
				item: {
					source: line.source,
					target: line.target,
					lineType: line.data?.lineType,
				},
				event: mouse,
			})
		},

		/**
		 * Clicking the empty pane clears BOTH selections.
		 *
		 * @return {void}
		 */
		onCanvasClick() {
			this.store.selectedNodeId = null
		},

		/**
		 * Vue Flow hands back `{ node }`; the store tracks a bare id.
		 *
		 * @param {object} event The node-click event.
		 * @return {void}
		 */
		onNodeSelect(event) {
			const id = event?.node?.id ?? event?.id ?? null
			this.store.selectedNodeId = id

			// Selection still happens — the sidebar keeps following the canvas —
			// and the menu opens ON TOP of it. They are not alternatives: one is
			// "which step am I looking at", the other is "what can I do to it".
			if (id === null) {
				return
			}

			const mouse = event?.event
			if (mouse?.clientX === undefined) {
				return
			}

			this.openNodeMenu({ item: id, event: mouse })
		},

		/**
		 * Place a palette node where it was dropped.
		 *
		 * @param {object} drop            The drop payload.
		 * @param {object} drop.position   The point, already in canvas space.
		 * @return {void}
		 */
		onCanvasDrop({ position }) {
			if (!this.store.paletteDragType) {
				return
			}

			// `position` is already canvas space — Vue Flow's `project()` undid
			// pan and zoom in the canvas, same contract as before, different
			// arithmetic.
			this.store.addNode(this.store.paletteDragType, position.x, position.y)
			this.store.paletteDragType = null
		},

		/**
		 * @return {void}
		 */
		onSaveClick() {
			/**
			 * @event save The Save button was pressed. The host persists via
			 *   `useFlowStore().save()` and, for a new flow, swaps the route to
			 *   the minted id — only the host knows whether one is needed.
			 */
			this.$emit('save')
		},

		/**
		 * @return {void}
		 */
		onRunClick() {
			/**
			 * @event run The Run button was pressed. The host queues a run via
			 *   `useFlowStore().run()`.
			 */
			this.$emit('run')
		},

		/**
		 * Reset the animator for a fresh run — a new watch or a replay.
		 *
		 * The reset IS the cancellation: a replay in progress, a previous
		 * watch's residue, and any pending hop timer all go.
		 *
		 * @param {string} mode `watch` or `replay`.
		 * @return {void}
		 */
		startRunAnimation(mode) {
			this.cancelRunAnimation()
			this.runAnimation.mode = mode
		},

		/**
		 * Tear the run picture down: clear the timer, the queue, the residue.
		 *
		 * Called on unmount, on a graph edit, and by `startRunAnimation` when
		 * a new run takes the canvas.
		 *
		 * @return {void}
		 */
		cancelRunAnimation() {
			const anim = this.runAnimation
			if (anim.timer !== null) {
				clearTimeout(anim.timer)
			}

			this.runAnimation = {
				mode: null,
				queue: [],
				playedCount: 0,
				currentNodeId: null,
				lastNodeId: null,
				traceLineId: null,
				tracedLineIds: [],
				doneNodeIds: [],
				failedNodeIds: [],
				holdNodeIds: [],
				skippedTransitions: [],
				timer: null,
			}
			this.runConsumed = 0
		},

		/**
		 * Play the next queued step, if a hop is not already in flight.
		 *
		 * Steps whose `transition` matches no canvas node are skipped HERE,
		 * without spending a hop on them, and their names surfaced — the flow
		 * was edited since the run, and remapping the step onto a different
		 * card would draw a walk the engine never took. Subsequent steps
		 * continue on their own nodes.
		 *
		 * @return {void}
		 */
		drainRunQueue() {
			const anim = this.runAnimation
			if (anim.timer !== null) {
				return
			}

			while (anim.queue.length > 0) {
				const transition = String(anim.queue[0].transition || '')
				if (this.store.nodes.some((node) => node.id === transition)) {
					break
				}

				anim.queue.shift()
				anim.skippedTransitions.push(transition)
			}

			if (anim.queue.length === 0) {
				// Drained. The halo hands over to the derived frontier state
				// (see `runNodeStates`); the trace does not linger on a line
				// whose hop is over.
				anim.currentNodeId = null
				anim.traceLineId = null
				return
			}

			this.playRunStep(anim.queue.shift())
		},

		/**
		 * One hop: paint one step onto its node and the edge that led there.
		 *
		 * @param {object} step The engine's log entry, as delivered.
		 * @return {void}
		 */
		playRunStep(step) {
			const anim = this.runAnimation
			const nodeId = String(step.transition)
			const previous = anim.lastNodeId

			anim.currentNodeId = nodeId
			anim.lastNodeId = nodeId
			anim.playedCount += 1

			// The edge just executed: the drawn line from the previously
			// animated node to this one, resolved through `canvasEdges` —
			// which already normalises `{from, to}` and list endpoints.
			anim.traceLineId = null
			if (previous !== null && previous !== nodeId) {
				const line = this.store.canvasEdges.find(
					(candidate) => candidate.source === previous && candidate.target === nodeId,
				)
				if (line !== undefined) {
					anim.traceLineId = line.id
					if (anim.tracedLineIds.includes(line.id) === false) {
						anim.tracedLineIds.push(line.id)
					}
				}
			}

			// Residue, from the engine's own closed status set. A failure —
			// or a stop that carries an error — stays red for the rest of the
			// run; completed and pinned keep the quiet success accent; a
			// suspended step holds until the watcher reports the run moved on.
			const failed = step.status === 'failed'
				|| (step.status === 'stopped' && Boolean(step.error))
			if (failed === true) {
				if (anim.failedNodeIds.includes(nodeId) === false) {
					anim.failedNodeIds.push(nodeId)
				}
			} else if (step.status === 'completed' || step.status === 'pinned') {
				if (anim.doneNodeIds.includes(nodeId) === false) {
					anim.doneNodeIds.push(nodeId)
				}
			}
			anim.holdNodeIds = step.status === 'suspended' ? [nodeId] : []

			const hop = this.runHopMs(step)
			if (hop <= 0) {
				// Reduced motion: no dwell, no travel — the whole queue drains
				// into static state colouring in one pass.
				this.drainRunQueue()
				return
			}

			anim.timer = setTimeout(() => {
				anim.timer = null
				this.drainRunQueue()
			}, hop)
		},

		/**
		 * How long one hop dwells.
		 *
		 * A live watch catches up at the bounded pace; a replay is paced from
		 * the step's REAL `durationMs`, clamped to a watchable window. Under
		 * reduced motion there is no dwell at all — the states paint
		 * statically.
		 *
		 * @param {object} step The step being played.
		 * @return {number} Milliseconds.
		 */
		runHopMs(step) {
			if (this.prefersReducedMotion() === true) {
				return 0
			}

			if (this.runAnimation.mode === 'replay') {
				const real = Number(step.durationMs)
				const ms = Number.isFinite(real) ? real : REPLAY_HOP_MIN_MS

				return Math.min(REPLAY_HOP_MAX_MS, Math.max(REPLAY_HOP_MIN_MS, ms))
			}

			return RUN_CATCH_UP_HOP_MS
		},

		/**
		 * Whether the reader asked for reduced motion.
		 *
		 * The CSS side is handled by the media query on the animations; this
		 * is the JS side, which skips the sequential reveal — hopping node to
		 * node is itself motion.
		 *
		 * @return {boolean} True when motion should not play.
		 */
		prefersReducedMotion() {
			if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
				return false
			}

			return window.matchMedia('(prefers-reduced-motion: reduce)').matches === true
		},

		/**
		 * @param {string} id The node id.
		 * @return {string|null} Its run state, or null outside a run.
		 */
		runStateOf(id) {
			return this.runNodeStates[id] || null
		},

		/**
		 * The run state in words, for the chip beside the colour.
		 *
		 * @param {string} state The run state.
		 * @return {string} The label.
		 */
		runStateLabel(state) {
			const labels = {
				active: this.t('nextcloud-vue', 'Running'),
				done: this.t('nextcloud-vue', 'Done'),
				failed: this.t('nextcloud-vue', 'Failed'),
				hold: this.t('nextcloud-vue', 'Waiting'),
			}

			return labels[state] || state
		},

		/**
		 * Step the zoom, rounded so repeated presses do not drift on floats.
		 *
		 * @param {number} delta The step, e.g. ±0.1.
		 * @return {void}
		 */
		zoomBy(delta) {
			const next = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta))
			this.zoom = Math.round(next * 100) / 100
		},

		/**
		 * Whether the engine knows this node type.
		 *
		 * Shown on the card rather than hidden. A node the catalogue cannot
		 * explain WILL fail its step, and a flow that looks fine on the canvas
		 * and dies at run time is the exact failure this component's ancestor
		 * shipped.
		 *
		 * @param {string} type The node type.
		 * @return {boolean} True when the catalogue does not know it.
		 */
		isUnknown(type) {
			// An empty catalogue means it could not be loaded, not that every
			// node is unknown — flagging all of them then would be noise.
			if (!this.store.nodeCatalog.length) {
				return false
			}

			return this.store.catalogEntry(type) === null
		},

		/**
		 * Human label for a node type, from the catalogue.
		 *
		 * No local name table: a type the catalogue cannot explain is shown as
		 * its raw id rather than guessed at from a list that may not match the
		 * engine.
		 *
		 * @param {string} type The node type.
		 * @return {string} The label.
		 */
		typeLabel(type) {
			const entry = this.store.catalogEntry(type)

			return entry ? (entry.displayName || entry.id) : (type || '—')
		},

		/**
		 * A node type turned into a usable CSS class suffix.
		 *
		 * Engine ids are namespaced (`hermiq.agent-step`), and a dot in the
		 * middle of a class name is a compound selector rather than a name — so
		 * a per-type accent silently matched nothing for every catalogue type.
		 *
		 * @param {string} type The node type.
		 * @return {string} The slug.
		 */
		typeSlug(type) {
			return String(type || '').replace(/[^a-zA-Z0-9]+/g, '-')
		},

		/**
		 * Short summary of a node's configuration, shown on the card.
		 *
		 * Deliberately GENERIC. The version this was ported from switched on a
		 * hard-coded list of bare node ids, so it described exactly the four
		 * types one app knew about and said nothing about any other app's
		 * nodes — including the ones its own palette offered. Summarising the
		 * config that is actually set describes every node type, present and
		 * future, without the builder having to know any of them.
		 *
		 * @param {object} node The node.
		 * @return {string} The label.
		 */
		nodeLabel(node) {
			// A name the author gave the step beats a derived summary.
			if (node.name) {
				return node.name
			}

			const config = (node.config || {})
			const keys = Object.keys(config).filter((k) => config[k] !== '' && config[k] !== null)

			if (!keys.length) {
				return this.t('nextcloud-vue', 'not configured')
			}

			const first = keys[0]
			const value = config[first]
			const shown = (typeof value === 'object') ? '…' : String(value)

			if (keys.length === 1) {
				return `${first}: ${shown}`
			}

			return `${first}: ${shown} +${keys.length - 1}`
		},
	},
}
</script>

<style scoped>
.cn-flow-detail {
	position: relative;
	block-size: 100%;
	inline-size: 100%;
	/* The dotted grid every flow tool draws: it says "canvas", and it makes
	   drag alignment visible without a snapping feature. */
	background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
	background-size: 20px 20px;
}

/* The canvas paints an opaque main-background of its own, which sat exactly
   on top of the grid above. Cleared here, for flow editors only — other
   CnGraphCanvas consumers keep their solid ground. */
.cn-flow-detail :deep(.cn-graph-canvas) {
	background: transparent;
}

.cn-flow-detail__toolbar {
	position: absolute;
	inset-block-start: 12px;
	inset-inline-end: 12px;
	z-index: 10;
	display: flex;
	gap: 4px;
	align-items: center;
	padding: 4px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	background: var(--color-main-background);
	box-shadow: 0 1px 4px var(--color-box-shadow);
}

.cn-flow-detail__toolbar-group {
	display: flex;
	align-items: center;
	margin-inline-start: 4px;
	padding-inline-start: 8px;
	border-inline-start: 1px solid var(--color-border);
}

.cn-flow-detail__check {
	position: absolute;
	inset-block-start: 64px;
	inset-inline-end: 12px;
	z-index: 10;
	max-inline-size: 360px;
}

.cn-flow-detail__check-items {
	margin-block-start: 4px;
	padding-inline-start: 20px;
	list-style: disc;
}

/* ONE container, not a card in a card: the canvas wrapper draws the box —
   border, radius, background, selection — and this card only fills it. Its
   earlier own border/background rendered as a visible nested box.

   ⚠️ THE NO-BOX IS DECLARED, NOT LEFT OUT, AND IT IS SCOPED THROUGH THE PARENT
   ON PURPOSE. Removing the border by simply deleting the declaration looked
   like it worked here and did not work in a browser: several installed apps
   still bundle an OLDER build of this component, Vue's scoped hash for it is
   the same in both (`data-v-…` hashes the file, not its contents), and their
   stale `.cn-flow-detail__node` rule therefore lands in the same page. Nothing
   in the current build declared `border` at all, so the old declaration was
   the only one in the cascade and simply won — the nested box came back on a
   page whose own copy of the library was already fixed.

   So the rule states the absence, and `.cn-flow-detail` in front of it raises
   the specificity above any same-name copy, which makes this independent of
   which bundle a page happens to inject last. */
.cn-flow-detail .cn-flow-detail__node {
	display: flex;
	flex-direction: column;
	gap: 2px;
	justify-content: center;
	block-size: 100%;
	/* No padding at all: `.cn-flow-node` already pads the box, and the role
	   accent moved OFF this element onto the node's own border below — the 8px
	   left inset that used to clear it was the second half of the nested-box
	   effect, holding the body away from an edge it no longer meets. */
	padding: 0;
	border: 0;
	border-radius: inherit;
	background: none;
	overflow: hidden;

	/* ⚠️ THE ACCENT'S ABSENCE HAS TO BE DECLARED, NOT MERELY LEFT OUT — AND A
	   LIVE INSTANCE IS THE ONLY PLACE THAT SHOWS WHY.

	   Moving the role accent onto `.cn-flow-node` below meant deleting the
	   `box-shadow` from the three `--role-*` rules that used to sit on THIS
	   element. That is enough in this repository's own harness, where exactly
	   one build of this component exists.

	   It is not enough in a Nextcloud page. Measured on a live instance
	   (dossiq, /apps/dossiq/flows/…): THREE stale copies of
	   `.cn-flow-detail__node--role-trigger[data-v-65800ae2]` were injected by
	   other apps' bundles alongside the current one, all carrying the old inset
	   shadow. Vue's scoped hash is identical in every copy because it hashes the
	   FILE PATH, not the contents — so an older build's rule lands in the same
	   cascade under the same attribute, and with nothing in the current build
	   declaring `box-shadow` for this element the stale rule simply won. The
	   accent painted on the wrapper AND on the body, and the card-in-card came
	   back on a page whose own copy of the library was already fixed.

	   The e2e cannot catch this: its harness has one build, so
	   `getComputedStyle(body).boxShadow === 'none'` passes there either way.
	   Only this declaration holds it, and only because
	   `.cn-flow-detail .cn-flow-detail__node` (0,3,0) outranks the stale
	   `.cn-flow-detail__node--role-trigger` (0,2,0).

	   The `border: 0` above is the same defence, written for the same reason
	   when the nested BORDER came back the same way. */
	box-shadow: none;
}

/* Unknown step -> error border on the NODE WRAPPER, so the whole node reads as
   wrong rather than just its body.

   This targeted `.cn-graph-canvas__node` until the Vue Flow migration renamed
   the wrapper to `.cn-flow-node`, and nothing caught it: a CSS rule whose
   selector stops matching does not warn, it just silently stops painting. The
   class kept appearing in the shipped stylesheet and source maps, so it read
   as present while unknown nodes quietly lost their error border. */
.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--unknown)) {
	border-color: var(--color-error);
}

/* Role accents, keyed on the CATALOGUE's role — never on graph position,
   which once painted unconnected steps green.

   ⚠️ ON THE NODE'S OWN BORDER, NOT ON THE BODY INSIDE IT. The accent used to be
   an inset shadow on `.cn-flow-detail__node`, which sits inside
   `.cn-flow-node`'s 2px border and 12px of padding — so the bar drew a second
   vertical edge a few pixels in from the first, and a node read as a card
   inside a card. Nothing had a border it should not have; the accent was simply
   painted on the wrong box.

   Still an inset box-shadow, per this repository's rule 8: `border-inline-start`
   would widen the node's left edge from 2px to 4px and shove every node's body
   sideways, which is a layout change rather than a fix for one. `:has()` is how
   a rule on the body reaches the wrapper — the same mechanism the unknown-step
   border below already uses. */
.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--role-trigger)) {
	box-shadow: inset 4px 0 0 0 var(--color-success);
}

.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--role-step)) {
	box-shadow: inset 4px 0 0 0 var(--color-primary-element);
}

.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--role-end)) {
	box-shadow: inset 4px 0 0 0 var(--color-error);
}

.cn-flow-detail__node-type {
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-flow-detail__node-label,
.cn-flow-detail__node-warning {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-flow-detail__node-warning {
	color: var(--color-error-text);
}

.cn-flow-detail__empty {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.cn-flow-detail__run-skipped {
	position: absolute;
	inset-block-end: 12px;
	inset-inline-end: 12px;
	z-index: 10;
	max-inline-size: 360px;
}

/* ---- Run state on the nodes ------------------------------------------- */

/* The FlowMock visual grammar in Nextcloud tokens: `--color-success` for the
   halo/trace/done (FlowMock's mint), `--color-error` for failed (its
   vermillion), `--color-warning` for the hold. No `--c-*` marketing tokens —
   semantic variables are what keep nldesign theming working.

   ON THE NODE'S OUTLINE, NOT ITS BOX-SHADOW. The role accents above already
   own `box-shadow` on the same `.cn-flow-node:has(...)` element, and a second
   rule setting it would silently erase whichever loses the cascade. `outline`
   is a separate channel: run state and role accent paint together. It also
   costs no layout — an outline never moves the node's body. */
.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--run-done)) {
	outline: 2px solid var(--color-success);
	outline-offset: 1px;
}

.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--run-active)) {
	outline: 3px solid var(--color-success);
	outline-offset: 1px;
	animation: cn-flow-detail-run-halo 1.1s ease-in-out infinite;
}

.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--run-failed)) {
	outline: 3px solid var(--color-error);
	outline-offset: 1px;
}

/* Visibly WAITING: dashed (a different shape from executing and from failed,
   so the states differ by more than hue) and pulsing slowly. */
.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--run-hold)) {
	outline: 3px dashed var(--color-warning);
	outline-offset: 1px;
	animation: cn-flow-detail-run-hold 2.4s ease-in-out infinite;
}

/* The halo: the outline breathes outwards and fades — a pulse with no layout
   cost, on the wrapper the role accents already reach through `:has()`. */
@keyframes cn-flow-detail-run-halo {
	0%,
	100% {
		outline-offset: 1px;
		outline-color: var(--color-success);
	}

	50% {
		outline-offset: 7px;
		outline-color: transparent;
	}
}

@keyframes cn-flow-detail-run-hold {
	0%,
	100% {
		outline-color: var(--color-warning);
	}

	50% {
		outline-color: transparent;
	}
}

/* The state in words — never colour alone (WCAG 1.4.1). */
.cn-flow-detail__node-run {
	font-size: 0.75em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--color-success-text, var(--color-success));
}

.cn-flow-detail__node-run--failed {
	color: var(--color-error-text, var(--color-error));
}

.cn-flow-detail__node-run--hold {
	color: var(--color-warning-text, var(--color-warning));
}

/* ---- Run state on the edges ------------------------------------------- */

/* Lines already walked keep a quiet success stroke for the rest of the run. */
.cn-flow-detail :deep(.vue-flow__edge.cn-flow-detail__edge--run-traced .vue-flow__edge-path),
.cn-flow-detail :deep(.vue-flow__edge.cn-flow-detail__edge--run-tracing .vue-flow__edge-path) {
	stroke: var(--color-success);
}

/* The trace: a success-coloured segment travelling the edge just executed,
   source to target — `stroke-dashoffset` walking a dash pattern forwards,
   FlowMock's own technique.

   IT RIDES THE EDGE'S SECOND PATH, NOT THE LINE ITSELF. CnFlowEdge already
   draws a direction pulse as a separate path over the same routed geometry,
   exactly so the base line can stay solid (a dashed connection means
   something else in every diagram convention). The trace re-styles that path
   for the hop being animated: denser, thicker, faster, and in the success
   colour. When the hop ends the class leaves and the pulse returns to its
   quiet self. */
.cn-flow-detail :deep(.vue-flow__edge.cn-flow-detail__edge--run-tracing .cn-flow-edge__pulse) {
	stroke: var(--color-success);
	stroke-width: 4;
	stroke-dasharray: 10 22;
	animation: cn-flow-detail-run-trace 0.4s linear infinite;
}

@keyframes cn-flow-detail-run-trace {
	from {
		stroke-dashoffset: 32;
	}

	to {
		stroke-dashoffset: 0;
	}
}

/* Reduced motion: the state COLOURS stay — done, failed, hold and current
   remain distinguishable — but nothing travels and nothing pulses. The
   sequential hop reveal is also skipped on the JS side (`runHopMs`), and
   CnFlowEdge already hides its pulse path entirely under this query, which
   takes the trace's travel with it. */
@media (prefers-reduced-motion: reduce) {
	.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--run-active)),
	.cn-flow-detail :deep(.cn-flow-node:has(.cn-flow-detail__node--run-hold)) {
		animation: none;
	}
}
</style>
