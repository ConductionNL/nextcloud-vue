<!--
 - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 - SPDX-License-Identifier: EUPL-1.2
-->

<docs>
### CnFlowCanvas

Visual editor for a schema's `x-openregister-flows` — an array of
`{ name, trigger, actions[] }` object-automation flows. Renders each flow as a
**trigger** node followed by its **action** nodes on `CnGraphCanvas` (edges = the
execution order), with a drag-to-add palette and a per-node config panel.

`v-model` is the flows array; the component owns only the derived graph (node
positions are persisted back onto each flow's round-tripped `_layout` so a reload
restores the layout). It never talks to the API — the hosting modal loads/saves
through `GET`/`PATCH /apps/openregister/api/schemas/{id}` (see `CnFlowCanvasModal`).

```html
<CnFlowCanvas v-model="flows" :schema="schema" />
```
</docs>

<template>
	<div class="cn-flow-canvas">
		<!-- Palette: drag a trigger (starts a new flow) or an action onto the canvas. -->
		<div class="cn-flow-canvas__palette">
			<h4 class="cn-flow-canvas__palette-heading">{{ t('nextcloud-vue', 'Triggers') }}</h4>
			<div v-for="tr in triggerPalette"
				:key="tr.id"
				class="cn-flow-palette-item cn-flow-palette-item--trigger"
				draggable="true"
				:title="t('nextcloud-vue', 'Drag onto the canvas to start a new flow')"
				@dragstart="onPaletteDragStart($event, 'trigger', tr.id)">
				<FlashOutline :size="18" />
				<span>{{ tr.label }}</span>
			</div>

			<h4 class="cn-flow-canvas__palette-heading">{{ t('nextcloud-vue', 'Actions') }}</h4>
			<div v-for="ac in actionPalette"
				:key="ac.id"
				class="cn-flow-palette-item cn-flow-palette-item--action"
				draggable="true"
				:title="t('nextcloud-vue', 'Drag onto a flow to add this step')"
				@dragstart="onPaletteDragStart($event, 'action', ac.id)">
				<component :is="ac.icon" :size="18" />
				<span>{{ ac.label }}</span>
			</div>
		</div>

		<!-- Canvas -->
		<div class="cn-flow-canvas__stage">
			<CnGraphCanvas :nodes="nodes"
				:edges="edges"
				:node-width="nodeWidth"
				:node-height="nodeHeight"
				:selected-node-id="selectedNodeId"
				:connectable="false"
				@node-select="onNodeSelect"
				@node-move="onNodeMove"
				@canvas-drop="onCanvasDrop"
				@canvas-click="selectedNodeId = null">
				<template #node="{ node, selected }">
					<div class="cn-flow-node"
						:class="['cn-flow-node--' + node.data.kind, { 'cn-flow-node--selected': selected }]">
						<div class="cn-flow-node__icon">
							<component :is="nodeIcon(node)" :size="20" />
						</div>
						<div class="cn-flow-node__body">
							<div class="cn-flow-node__title">{{ nodeTitle(node) }}</div>
							<div class="cn-flow-node__subtitle">{{ nodeSubtitle(node) }}</div>
						</div>
					</div>
				</template>
			</CnGraphCanvas>

			<NcEmptyContent v-if="!nodes.length"
				class="cn-flow-canvas__empty"
				:name="t('nextcloud-vue', 'No flows yet')"
				:description="t('nextcloud-vue', 'Drag a trigger from the left to start automating this object.')">
				<template #icon>
					<Sitemap :size="20" />
				</template>
			</NcEmptyContent>
		</div>

		<!-- Config panel for the selected node -->
		<div v-if="selectedNode" class="cn-flow-canvas__config">
			<div class="cn-flow-canvas__config-header">
				<h4>{{ selectedNode.data.kind === 'trigger' ? t('nextcloud-vue', 'Trigger') : t('nextcloud-vue', 'Action') }}</h4>
				<NcButton type="tertiary" :aria-label="t('nextcloud-vue', 'Delete')" @click="deleteSelected">
					<template #icon><Delete :size="18" /></template>
				</NcButton>
			</div>

			<!-- Trigger config -->
			<template v-if="selectedNode.data.kind === 'trigger'">
				<NcTextField :label="t('nextcloud-vue', 'Flow name')"
					:model-value="flowOf(selectedNode).name"
					@update:modelValue="setFlowName(selectedNode.data.fi, $event)" />
				<NcSelect :options="triggerOptions"
					:model-value="triggerOption(flowOf(selectedNode).trigger)"
					:input-label="t('nextcloud-vue', 'When')"
					@update:model-value="setTrigger(selectedNode.data.fi, $event)" />
			</template>

			<!-- Action config -->
			<template v-else>
				<NcSelect :options="actionTypeOptions"
					:model-value="actionTypeOption(actionOf(selectedNode).type)"
					:input-label="t('nextcloud-vue', 'Action')"
					@update:model-value="setActionType(selectedNode.data.fi, selectedNode.data.ai, $event)" />
				<div v-for="field in fieldsFor(actionOf(selectedNode).type)" :key="field.key" class="cn-flow-canvas__field">
					<NcTextField :label="field.label"
						:model-value="String(actionOf(selectedNode)[field.key] || '')"
						@update:modelValue="setActionField(selectedNode.data.fi, selectedNode.data.ai, field.key, $event)" />
				</div>
				<p v-if="schemaFieldHint" class="cn-flow-canvas__hint">{{ schemaFieldHint }}</p>
			</template>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcTextField, NcSelect, NcEmptyContent } from '@nextcloud/vue'
import CnGraphCanvas from '../CnGraphCanvas/CnGraphCanvas.vue'
import FlashOutline from 'vue-material-design-icons/FlashOutline.vue'
import Email from 'vue-material-design-icons/Email.vue'
import CalendarPlus from 'vue-material-design-icons/CalendarPlus.vue'
import Robot from 'vue-material-design-icons/Robot.vue'
import ShareVariant from 'vue-material-design-icons/ShareVariant.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import PlusBox from 'vue-material-design-icons/PlusBox.vue'
import CallSplit from 'vue-material-design-icons/CallSplit.vue'

const DT_KEY = 'application/x-cn-flow-node'

/** Field descriptors per action type — the minimal set FlowActionService reads. */
const ACTION_FIELDS = {
	email: [
		{ key: 'to', label: 'To' },
		{ key: 'subject', label: 'Subject' },
		{ key: 'body', label: 'Body' },
	],
	'calendar-event': [
		{ key: 'title', label: 'Title' },
		{ key: 'start', label: 'Start' },
		{ key: 'end', label: 'End' },
	],
	agent: [
		{ key: 'agent', label: 'Agent' },
		{ key: 'prompt', label: 'Prompt' },
		{ key: 'resultField', label: 'Result field' },
	],
	'federate-share': [
		{ key: 'sharedWith', label: 'Shared with' },
		{ key: 'permissions', label: 'Permissions' },
	],
	'object.set-field': [
		{ key: 'field', label: 'Field' },
		{ key: 'value', label: 'Value' },
	],
	'object.create': [
		{ key: 'register', label: 'Register (slug or id)' },
		{ key: 'schema', label: 'Schema (slug or id)' },
		{ key: 'field', label: 'Field' },
		{ key: 'value', label: 'Value' },
	],
	'object.delete': [
		{ key: 'target', label: 'Target UUID (blank = this object)' },
	],
	condition: [
		{ key: 'field', label: 'Field' },
		{ key: 'operator', label: 'Operator (eq, ne, empty, notEmpty, contains)' },
		{ key: 'value', label: 'Value' },
	],
}

export default {
	name: 'CnFlowCanvas',

	components: {
		CnGraphCanvas, NcButton, NcTextField, NcSelect, NcEmptyContent,
		FlashOutline, Email, CalendarPlus, Robot, ShareVariant, Cog, Delete, Sitemap,
	},

	props: {
		/**
		 * The flows array (`v-model`) — `[{ name, trigger, actions[] }]`. Each flow
		 * MAY carry a `_layout` object of node positions, round-tripped by the
		 * serializer so a reload restores the canvas layout.
		 *
		 * @type {Array<object>}
		 */
		modelValue: {
			type: Array,
			default: () => [],
		},
		/**
		 * The selected schema (for the field-name hint only).
		 *
		 * @type {object}
		 */
		schema: {
			type: Object,
			default: null,
		},
		/**
		 * The trigger event catalog from `GET /api/flow/event-catalog`
		 * (`[{ id, label, group, legacy? }]`). When empty, the builder falls
		 * back to the three legacy object-CRUD triggers so it still works
		 * offline / against an older backend.
		 *
		 * @type {Array}
		 */
		eventCatalog: {
			type: Array,
			default: () => [],
		},
	},

	emits: ['update:modelValue'],

	data() {
		return {
			selectedNodeId: null,
			nodeWidth: 220,
			nodeHeight: 72,
		}
	},

	computed: {
		triggerPalette() {
			return this.triggerOptions
		},
		actionPalette() {
			return this.actionTypeOptions.map((o) => ({ ...o, icon: this.actionIcon(o.id) }))
		},
		triggerOptions() {
			if (Array.isArray(this.eventCatalog) && this.eventCatalog.length) {
				return this.eventCatalog.map((e) => ({
					id: e.id,
					label: e.label || e.id,
					group: e.group || '',
					legacy: e.legacy,
				}))
			}
			// Fallback: legacy object-CRUD triggers (offline / older backend).
			return [
				{ id: 'created', label: t('nextcloud-vue', 'An object is created') },
				{ id: 'updated', label: t('nextcloud-vue', 'An object is updated') },
				{ id: 'deleted', label: t('nextcloud-vue', 'An object is deleted') },
			]
		},
		actionTypeOptions() {
			return [
				{ id: 'email', label: t('nextcloud-vue', 'Send an email') },
				{ id: 'calendar-event', label: t('nextcloud-vue', 'Add a calendar event') },
				{ id: 'agent', label: t('nextcloud-vue', 'Run an AI agent') },
				{ id: 'federate-share', label: t('nextcloud-vue', 'Share with a federated user') },
				{ id: 'object.set-field', label: t('nextcloud-vue', 'Set a field on this object') },
				{ id: 'object.create', label: t('nextcloud-vue', 'Create an object') },
				{ id: 'object.delete', label: t('nextcloud-vue', 'Delete an object') },
				{ id: 'condition', label: t('nextcloud-vue', 'Only continue if…') },
			]
		},
		/** Derived graph nodes from the flows + persisted/auto layout. */
		nodes() {
			const out = []
			this.modelValue.forEach((flow, fi) => {
				const layout = (flow && flow._layout) || {}
				const baseY = 40 + fi * 170
				out.push({
					id: `f${fi}-t`,
					x: (layout.t && layout.t.x) ?? 40,
					y: (layout.t && layout.t.y) ?? baseY,
					data: { kind: 'trigger', fi },
				})
				;(Array.isArray(flow.actions) ? flow.actions : []).forEach((action, ai) => {
					const pos = (Array.isArray(layout.a) && layout.a[ai]) || null
					out.push({
						id: `f${fi}-a${ai}`,
						x: pos ? pos.x : (300 + ai * 250),
						y: pos ? pos.y : baseY,
						data: { kind: 'action', fi, ai },
					})
				})
			})
			return out
		},
		/** Chain edges: trigger → action0 → action1 … per flow. */
		edges() {
			const out = []
			this.modelValue.forEach((flow, fi) => {
				const actions = Array.isArray(flow.actions) ? flow.actions : []
				let prev = `f${fi}-t`
				actions.forEach((_, ai) => {
					const cur = `f${fi}-a${ai}`
					out.push({ id: `e-${prev}-${cur}`, source: prev, target: cur })
					prev = cur
				})
			})
			return out
		},
		selectedNode() {
			return this.nodes.find((n) => n.id === this.selectedNodeId) || null
		},
		schemaFieldHint() {
			const props = (this.schema && this.schema.properties && typeof this.schema.properties === 'object')
				? Object.keys(this.schema.properties) : []
			if (!props.length) return ''
			return t('nextcloud-vue', 'Available fields: {fields}', { fields: props.slice(0, 12).join(', ') })
		},
	},

	methods: {
		t,
		actionIcon(type) {
			return ({
				email: Email,
				'calendar-event': CalendarPlus,
				agent: Robot,
				'federate-share': ShareVariant,
				'object.set-field': Pencil,
				'object.create': PlusBox,
				'object.delete': Delete,
				condition: CallSplit,
			})[type] || Cog
		},
		nodeIcon(node) {
			return node.data.kind === 'trigger' ? FlashOutline : this.actionIcon(this.actionOf(node).type)
		},
		flowOf(node) {
			return this.modelValue[node.data.fi] || { name: '', trigger: 'created', actions: [] }
		},
		actionOf(node) {
			const flow = this.flowOf(node)
			return (Array.isArray(flow.actions) ? flow.actions[node.data.ai] : null) || { type: 'email' }
		},
		nodeTitle(node) {
			if (node.data.kind === 'trigger') return this.flowOf(node).name || t('nextcloud-vue', 'Flow')
			return (this.actionTypeOptions.find((o) => o.id === this.actionOf(node).type) || {}).label || this.actionOf(node).type
		},
		nodeSubtitle(node) {
			if (node.data.kind === 'trigger') return (this.triggerOption(this.flowOf(node).trigger) || {}).label || ''
			const a = this.actionOf(node)
			if (a.type === 'condition') {
				return [a.field, a.operator, a.value].filter(Boolean).join(' ')
			}
			if (a.type === 'object.set-field' || a.type === 'object.create') {
				return a.field ? `${a.field} = ${a.value || ''}` : (a.schema || '')
			}
			if (a.type === 'object.delete') return a.target || t('nextcloud-vue', 'this object')
			return a.to || a.title || a.prompt || a.sharedWith || ''
		},
		triggerOption(id) {
			const wanted = id || 'created'
			// Match the canonical id first, then a legacy alias so flows saved
			// as bare 'created'/'updated'/'deleted' still resolve to their
			// catalog entry (e.g. 'created' → the 'object.created' option).
			return this.triggerOptions.find((o) => o.id === wanted)
				|| this.triggerOptions.find((o) => o.legacy === wanted)
				|| this.triggerOptions[0]
		},
		actionTypeOption(type) {
			return this.actionTypeOptions.find((o) => o.id === type) || { id: type, label: type }
		},
		fieldsFor(type) {
			return (ACTION_FIELDS[type] || []).map((f) => ({ ...f, label: t('nextcloud-vue', f.label) }))
		},
		// --- mutation helpers: clone, mutate, emit ---
		clone() {
			return JSON.parse(JSON.stringify(this.modelValue))
		},
		/**
		 * Emit the mutated flow definition upward for `v-model`.
		 *
		 * @param {object} next The updated flow definition (a clone — the
		 *   original `modelValue` is never mutated in place).
		 * @return {void}
		 */
		emit(next) {
			/**
			 * @event update:modelValue Fired whenever the canvas mutates the
			 * flow (node add/remove/move, field edit), carrying the complete
			 * updated flow definition so the parent can `v-model` it.
			 * @type {object}
			 */
			this.$emit('update:modelValue', next)
		},
		onNodeSelect(id) {
			this.selectedNodeId = id
		},
		onNodeMove({ id, x, y }) {
			const next = this.clone()
			const [, fi, ai] = /f(\d+)-(?:t|a(\d+))/.exec(id) || []
			const flow = next[Number(fi)]
			if (!flow) return
			flow._layout = flow._layout || {}
			if (id.endsWith('-t')) {
				flow._layout.t = { x, y }
			} else {
				flow._layout.a = flow._layout.a || []
				flow._layout.a[Number(ai)] = { x, y }
			}
			this.emit(next)
		},
		onPaletteDragStart(event, kind, id) {
			event.dataTransfer.setData(DT_KEY, JSON.stringify({ kind, id }))
			event.dataTransfer.effectAllowed = 'copy'
		},
		onCanvasDrop({ x, y, event }) {
			let payload
			try {
				payload = JSON.parse(event.dataTransfer.getData(DT_KEY))
			} catch {
				return
			}
			if (!payload) return
			const next = this.clone()
			if (payload.kind === 'trigger') {
				// New flow at the drop point.
				const fi = next.length
				next.push({
					name: t('nextcloud-vue', 'Flow {n}', { n: fi + 1 }),
					trigger: payload.id,
					actions: [],
					_layout: { t: { x, y }, a: [] },
				})
				this.selectedNodeId = `f${fi}-t`
			} else {
				// Append an action to the nearest flow.
				const fi = this.nearestFlowIndex(x, y)
				if (fi === -1) return
				const flow = next[fi]
				flow.actions = Array.isArray(flow.actions) ? flow.actions : []
				const ai = flow.actions.length
				flow.actions.push(this.defaultAction(payload.id))
				flow._layout = flow._layout || {}
				flow._layout.a = flow._layout.a || []
				flow._layout.a[ai] = { x, y }
				this.selectedNodeId = `f${fi}-a${ai}`
			}
			this.emit(next)
		},
		nearestFlowIndex(x, y) {
			let best = -1
			let bestD = Infinity
			this.nodes.forEach((n) => {
				const d = Math.hypot(n.x - x, n.y - y)
				if (d < bestD) { bestD = d; best = n.data.fi }
			})
			return this.modelValue.length ? (best === -1 ? this.modelValue.length - 1 : best) : -1
		},
		defaultAction(type) {
			const base = { type }
			;(ACTION_FIELDS[type] || []).forEach((f) => { base[f.key] = '' })
			return base
		},
		setFlowName(fi, name) {
			const next = this.clone()
			if (next[fi]) next[fi].name = name
			this.emit(next)
		},
		setTrigger(fi, option) {
			const next = this.clone()
			if (next[fi] && option) next[fi].trigger = option.id
			this.emit(next)
		},
		setActionType(fi, ai, option) {
			if (!option) return
			const next = this.clone()
			const flow = next[fi]
			if (flow && Array.isArray(flow.actions) && flow.actions[ai]) {
				flow.actions[ai] = this.defaultAction(option.id)
			}
			this.emit(next)
		},
		setActionField(fi, ai, key, value) {
			const next = this.clone()
			const flow = next[fi]
			if (flow && Array.isArray(flow.actions) && flow.actions[ai]) {
				flow.actions[ai][key] = value
			}
			this.emit(next)
		},
		deleteSelected() {
			const node = this.selectedNode
			if (!node) return
			const next = this.clone()
			if (node.data.kind === 'trigger') {
				next.splice(node.data.fi, 1)
			} else {
				const flow = next[node.data.fi]
				if (flow && Array.isArray(flow.actions)) {
					flow.actions.splice(node.data.ai, 1)
					if (flow._layout && Array.isArray(flow._layout.a)) flow._layout.a.splice(node.data.ai, 1)
				}
			}
			this.selectedNodeId = null
			this.emit(next)
		},
	},
}
</script>

<style scoped>
.cn-flow-canvas {
	display: grid;
	grid-template-columns: 200px 1fr 280px;
	gap: 0;
	height: 60vh;
	min-height: 420px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	overflow: hidden;
}

.cn-flow-canvas__palette {
	border-right: 1px solid var(--color-border);
	padding: 12px;
	overflow-y: auto;
	background: var(--color-background-hover);
}

.cn-flow-canvas__palette-heading {
	font-size: 12px;
	text-transform: uppercase;
	color: var(--color-text-maxcontrast);
	margin: 12px 0 6px;
}
.cn-flow-canvas__palette-heading:first-child { margin-top: 0; }

.cn-flow-palette-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	margin-bottom: 6px;
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	cursor: grab;
	font-size: 13px;
}
.cn-flow-palette-item:hover { background: var(--color-background-dark); }
.cn-flow-palette-item--trigger { border-left: 3px solid var(--color-success, #46ba61); }
.cn-flow-palette-item--action { border-left: 3px solid var(--color-primary-element); }

.cn-flow-canvas__stage {
	position: relative;
	overflow: hidden;
	background:
		radial-gradient(circle, var(--color-border) 1px, transparent 1px) 0 0 / 24px 24px;
}

.cn-flow-canvas__empty {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.cn-flow-node {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	height: 100%;
	padding: 8px 12px;
	box-sizing: border-box;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.cn-flow-node--trigger { border-left: 4px solid var(--color-success, #46ba61); }
.cn-flow-node--action { border-left: 4px solid var(--color-primary-element); }
.cn-flow-node--selected { outline: 2px solid var(--color-primary-element); }

.cn-flow-node__icon { color: var(--color-text-maxcontrast); flex: 0 0 auto; }
.cn-flow-node__body { min-width: 0; }
.cn-flow-node__title {
	font-weight: 600;
	font-size: 13px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.cn-flow-node__subtitle {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-flow-canvas__config {
	border-left: 1px solid var(--color-border);
	padding: 12px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.cn-flow-canvas__config-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.cn-flow-canvas__hint {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
}
</style>
