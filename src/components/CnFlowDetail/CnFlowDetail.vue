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
		<CnGraphCanvas
			:nodes="canvasNodes"
			:edges="store.canvasEdges"
			:min-zoom="minZoom"
			:max-zoom="maxZoom"
			@node-select="onNodeSelect"
			@canvas-click="store.selectedNodeId = null"
			@nodes-change="onNodesChange"
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
				</div>
			</template>
		</CnGraphCanvas>

		<!-- Arrowhead marker, defined here so its colour and size are ours. -->
		<svg class="cn-flow-detail__defs" aria-hidden="true" focusable="false">
			<defs>
				<marker
					:id="arrowId"
					viewBox="0 0 10 10"
					refX="9"
					refY="5"
					markerWidth="5"
					markerHeight="5"
					orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" class="cn-flow-detail__arrowhead" />
				</marker>
			</defs>
		</svg>

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
import { NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CheckDecagram from 'vue-material-design-icons/CheckDecagram.vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import DockRight from 'vue-material-design-icons/DockRight.vue'
import Minus from 'vue-material-design-icons/Minus.vue'
import Play from 'vue-material-design-icons/Play.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import SortVariant from 'vue-material-design-icons/SortVariant.vue'
import CnFlowNodeEditModal from '../../dialogs/CnFlowNodeEditModal.vue'
import CnGraphCanvas from '../CnGraphCanvas/CnGraphCanvas.vue'
import { resolveFlowNodeEditor } from '../../composables/useFlowNodeEditors.js'
import { useFlowStore } from '../../composables/useFlowStore.js'

export default {
	name: 'CnFlowDetail',

	components: {
		CheckDecagram,
		CnFlowNodeEditModal,
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
		return { store: useFlowStore() }
	},

	data() {
		return {
			arrowId: 'cn-flow-detail-arrow',
			nodeWidth: 200,
			nodeHeight: 80,

			// Zoom is owned here, not by the canvas: a consumer that does not
			// bind it pins the canvas at 1 and silently kills the wheel gesture.
			zoom: 1,
			minZoom: 0.3,
			maxZoom: 2,
		}
	},

	computed: {
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
			return (this.store.nodes || []).map((node) => ({
				id: node.id,
				type: 'default',
				position: { x: Number(node.x) || 0, y: Number(node.y) || 0 },
				data: {
					stepType: node.type,
					label: this.nodeLabel(node),
					ports: this.store.portsOfNode ? this.store.portsOfNode(node) : undefined,
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
	},

	async mounted() {
		await this.store.load({ app: this.app, id: this.id })
	},

	methods: {
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
		 * Vue Flow hands back `{ node }`; the store tracks a bare id.
		 *
		 * @param {object} event The node-click event.
		 * @return {void}
		 */
		onNodeSelect(event) {
			this.store.selectedNodeId = event?.node?.id ?? event?.id ?? null
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

		/**
		 * The SVG `d` for one edge.
		 *
		 * @param {{x: number, y: number}} from Source centre.
		 * @param {{x: number, y: number}} to   Target centre.
		 * @return {string} The path.
		 */
		edgePath(from, to) {
			return this.edgeGeometry(from, to).d
		},

		/**
		 * Route one edge.
		 *
		 * Two decisions, in order:
		 *
		 * 1. Trim the endpoints from the node CENTRES (what the canvas hands the
		 *    slot) back to the node borders, plus a small gap. Drawn centre to
		 *    centre, the last stretch — arrowhead included — sits under the
		 *    target card, so the flow reads as an undirected line.
		 *
		 * 2. Bend only when a straight run would not fit. Bending on any
		 *    difference in centres produced a staircase for a modest offset and,
		 *    for a near-aligned pair, two corner arcs with a zero-length leg
		 *    between them — a wobble in place of a line. A corner should mean
		 *    "these nodes are not in line", not "these nodes are a few pixels
		 *    apart".
		 *
		 * @param {{x: number, y: number}} from Source centre.
		 * @param {{x: number, y: number}} to   Target centre.
		 * @return {{d: string, mid: {x: number, y: number}}} Path and midpoint.
		 */
		edgeGeometry(from, to) {
			const gap = 6
			const margin = 24
			const vertical = Math.abs(to.y - from.y) >= Math.abs(to.x - from.x)

			const [a, b] = vertical
				? this.trimOn('y', this.nodeHeight, gap, from, to)
				: this.trimOn('x', this.nodeWidth, gap, from, to)

			const across = vertical ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y)
			const span = vertical ? this.nodeWidth : this.nodeHeight
			if (across <= (span - margin)) {
				const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
				const [start, end] = vertical
					? [{ x: mid.x, y: a.y }, { x: mid.x, y: b.y }]
					: [{ x: a.x, y: mid.y }, { x: b.x, y: mid.y }]

				return { d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`, mid }
			}

			return this.elbow(a, b, vertical)
		},

		/**
		 * Pull both endpoints in along one axis by half a node plus a gap.
		 *
		 * @param {string} axis The axis, `'x'` or `'y'`.
		 * @param {number} size The node's extent on that axis.
		 * @param {number} gap  Clearance to leave beyond the border.
		 * @param {object} from Source centre.
		 * @param {object} to   Target centre.
		 * @return {Array<object>} Trimmed `[from, to]`.
		 */
		trimOn(axis, size, gap, from, to) {
			const delta = to[axis] - from[axis]
			const inset = Math.min((size / 2) + gap, Math.abs(delta) / 2)
			const step = Math.sign(delta) * inset

			return [
				{ ...from, [axis]: from[axis] + step },
				{ ...to, [axis]: to[axis] - step },
			]
		},

		/**
		 * Orthogonal path between two trimmed points, with rounded corners.
		 *
		 * @param {{x: number, y: number}} from     Trimmed source point.
		 * @param {{x: number, y: number}} to       Trimmed target point.
		 * @param {boolean}                vertical Whether the run is vertical.
		 * @return {{d: string, mid: {x: number, y: number}}} Path and midpoint.
		 */
		elbow(from, to, vertical) {
			const dx = to.x - from.x
			const dy = to.y - from.y
			// A corner radius must never eat more than half of either leg.
			const rad = Math.min(12, Math.abs(dx) / 2, Math.abs(dy) / 2)
			const sx = Math.sign(dx)
			const sy = Math.sign(dy)

			if (vertical) {
				const midY = from.y + (dy / 2)

				return {
					mid: { x: from.x + (dx / 2), y: midY },
					d: [
						`M ${from.x} ${from.y}`,
						`L ${from.x} ${midY - (rad * sy)}`,
						`Q ${from.x} ${midY} ${from.x + (rad * sx)} ${midY}`,
						`L ${to.x - (rad * sx)} ${midY}`,
						`Q ${to.x} ${midY} ${to.x} ${midY + (rad * sy)}`,
						`L ${to.x} ${to.y}`,
					].join(' '),
				}
			}

			const midX = from.x + (dx / 2)

			return {
				mid: { x: midX, y: from.y + (dy / 2) },
				d: [
					`M ${from.x} ${from.y}`,
					`L ${midX - (rad * sx)} ${from.y}`,
					`Q ${midX} ${from.y} ${midX} ${from.y + (rad * sy)}`,
					`L ${midX} ${to.y - (rad * sy)}`,
					`Q ${midX} ${to.y} ${midX + (rad * sx)} ${to.y}`,
					`L ${to.x} ${to.y}`,
				].join(' '),
			}
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

.cn-flow-detail__defs {
	position: absolute;
	inline-size: 0;
	block-size: 0;
}

.cn-flow-detail__edge {
	stroke: var(--color-border-dark);
	stroke-width: 2;
}

.cn-flow-detail__arrowhead {
	fill: var(--color-border-dark);
}

/* ONE container, not a card in a card: the canvas wrapper draws the box —
   border, radius, background, selection — and this card only fills it. Its
   earlier own border/background rendered as a visible nested box. */
.cn-flow-detail__node {
	display: flex;
	flex-direction: column;
	gap: 2px;
	justify-content: center;
	block-size: 100%;
	padding: 8px 12px;
	border-radius: inherit;
	overflow: hidden;
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
   which once painted unconnected steps green. Inset box-shadow rather than a
   border so the accent adds no layout width. */
.cn-flow-detail__node--role-trigger {
	box-shadow: inset 4px 0 0 0 var(--color-success);
}

.cn-flow-detail__node--role-step {
	box-shadow: inset 4px 0 0 0 var(--color-primary-element);
}

.cn-flow-detail__node--role-end {
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
</style>
