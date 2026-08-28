<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog size="small"
		:name="t('nextcloud-vue', 'Connection')"
		@closing="cancel">
		<div class="cn-flow-edge-edit">
			<p class="cn-flow-edge-edit__endpoints">
				{{ endpoints }}
			</p>

			<NcTextField :model-value="draft.title"
				:label="t('nextcloud-vue', 'Label')"
				:helper-text="t('nextcloud-vue', 'Shown on the line. A branch reads better named — “approved”, “over budget” — than as an unlabelled arrow.')"
				@update:model-value="draft.title = $event" />

			<NcSelect :model-value="selectedStyle"
				:options="styleOptions"
				label="label"
				:input-label="t('nextcloud-vue', 'Line style')"
				:clearable="false"
				@update:model-value="onStylePicked" />
		</div>

		<template #actions>
			<NcButton variant="error" @click="removeConnection">
				{{ t('nextcloud-vue', 'Remove connection') }}
			</NcButton>
			<NcButton @click="cancel">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton variant="primary" @click="done">
				{{ t('nextcloud-vue', 'Done') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcSelect, NcTextField } from '@nextcloud/vue'
import { useFlowStore } from '../composables/useFlowStore.js'
import { EDGE_LINE_TYPES } from '../composables/useFlowEdgeStyles.js'

/**
 * CnFlowEdgeEditModal — edit one connection between two steps.
 *
 * A line carries two authored things: what it is CALLED, and how it is DRAWN.
 * The label is the one that matters on a branching flow — an unlabelled arrow
 * out of a routing step says nothing about which branch it is — and the router
 * is the escape hatch for the one line an automatic layout puts through a node.
 *
 * ⚠️ KEYED ON THE ENDPOINT PAIR, NOT ON AN ID. A stored edge may draw several
 * lines (`{from: 'a', to: ['b','c']}`), so a drawn line's id is synthesised per
 * render and means nothing to the document; `{source, target}` is the only
 * identity both halves share. Setting a field on a line of a multi-line record
 * splits it out first — see `useFlowStore.setEdgeFields`.
 *
 * Edits land on a DRAFT: Done commits, Cancel discards — the same contract
 * CnFlowNodeEditModal holds. Opened by setting `useFlowStore().editingEdge` to
 * `{source, target}`; hosted by CnFlowDetail so it exists wherever the canvas
 * does.
 */
export default {
	name: 'CnFlowEdgeEditModal',

	components: {
		NcButton,
		NcDialog,
		NcSelect,
		NcTextField,
	},

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		const store = useFlowStore()
		const found = store.editingEdge ? store.locateEdge(store.editingEdge) : null
		const edge = found?.edge || {}

		return {
			draft: {
				title: edge.title ?? edge.label ?? '',
				lineType: edge.lineType || 'smoothstep',
			},
		}
	},

	computed: {
		/**
		 * @return {Array<object>} The routers a line may be drawn with, labelled
		 *   for a human rather than by Vue Flow's internal names.
		 */
		styleOptions() {
			return EDGE_LINE_TYPES.map((style) => ({ id: style.id, label: style.label() }))
		},

		/**
		 * @return {object|null} The option matching the draft's router.
		 */
		selectedStyle() {
			return this.styleOptions.find((option) => option.id === this.draft.lineType) || null
		},

		/**
		 * @return {string} Which two steps this line joins, by their labels —
		 *   the dialog is opened from a context menu on a line that may be one
		 *   of many, so it has to say which one it is.
		 */
		endpoints() {
			const pair = this.store.editingEdge
			if (pair === null) {
				return ''
			}

			return t('nextcloud-vue', '{from} → {to}', {
				from: this.nodeLabel(pair.source),
				to: this.nodeLabel(pair.target),
			})
		},
	},

	methods: {
		/**
		 * @param {string} id A node id.
		 * @return {string} Its authored name, or its id when it has none.
		 */
		nodeLabel(id) {
			const node = this.store.nodes.find((candidate) => candidate.id === id)

			return node?.name || node?.id || id
		},

		/**
		 * @param {object|null} option The picked style option.
		 * @return {void}
		 */
		onStylePicked(option) {
			if (option === null || option === undefined) {
				return
			}

			this.draft.lineType = option.id
		},

		/**
		 * Commit the draft as ONE change, so one Ctrl+Z reverses it.
		 *
		 * @return {void}
		 */
		done() {
			const pair = this.store.editingEdge
			if (pair !== null) {
				this.store.setEdgeFields({
					source: pair.source,
					target: pair.target,
					fields: { title: this.draft.title, lineType: this.draft.lineType },
				})
			}

			this.store.editingEdge = null
		},

		/**
		 * @return {void}
		 */
		removeConnection() {
			const pair = this.store.editingEdge
			if (pair !== null) {
				this.store.removeEdge(pair)
			}

			this.store.editingEdge = null
		},

		/**
		 * @return {void}
		 */
		cancel() {
			this.store.editingEdge = null
		},

		t,
	},
}
</script>

<style scoped>
.cn-flow-edge-edit {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-block-end: 8px;
}

.cn-flow-edge-edit__endpoints {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}
</style>
