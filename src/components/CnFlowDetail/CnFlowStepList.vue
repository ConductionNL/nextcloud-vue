<!--
  CnFlowStepList — a flow as a list: the trigger, then the steps in run order.

  The list view of the same flow the canvas draws (board OrFlowStappenlijst).
  It keeps no state of its own: the rows are read from the flow store and every
  button goes through a store action, so both views always show one document
  and Ctrl+Z undoes a change made here as well.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-flow-step-list" data-testid="flow-step-list">
		<section :aria-labelledby="`${uid}-when`" class="cn-flow-step-list__section">
			<h2 :id="`${uid}-when`" class="cn-flow-step-list__title">
				{{ t('nextcloud-vue', 'When') }}
			</h2>
			<div v-for="row in list.triggers"
				:key="row.id"
				class="cn-flow-step-list__row"
				:class="{ 'cn-flow-step-list__row--selected': isSelected(row) }"
				data-testid="flow-step-trigger">
				<span class="cn-flow-step-list__badge cn-flow-step-list__badge--trigger" aria-hidden="true">
					<LightningBolt :size="16" />
				</span>
				<div class="cn-flow-step-list__body">
					<span class="cn-flow-step-list__head">
						<strong>{{ titleOf(row.node) }}</strong>
						<CnStatusBadge :label="kindOf(row.node)" variant="success" size="small" />
					</span>
				</div>
				<CnStatusBadge v-if="stateOf(row)" :label="stateOf(row).label" :variant="stateOf(row).variant" />
				<NcButton v-if="editable"
					:aria-label="t('nextcloud-vue', 'Change trigger')"
					:title="t('nextcloud-vue', 'Change trigger')"
					data-testid="flow-step-edit"
					@click="$emit('edit', row.id)">
					<template #icon>
						<Pencil :size="18" />
					</template>
				</NcButton>
			</div>
			<p v-if="list.triggers.length === 0" class="cn-flow-step-list__empty" data-testid="flow-step-no-trigger">
				{{ t('nextcloud-vue', 'This flow has no trigger yet.') }}
			</p>
		</section>

		<section :aria-labelledby="`${uid}-then`" class="cn-flow-step-list__section">
			<h2 :id="`${uid}-then`" class="cn-flow-step-list__title">
				{{ t('nextcloud-vue', 'Then, in this order') }}
			</h2>
			<ol class="cn-flow-step-list__steps">
				<li v-for="row in list.steps"
					:key="row.id"
					class="cn-flow-step-list__row"
					:class="{ 'cn-flow-step-list__row--selected': isSelected(row), 'cn-flow-step-list__row--end': row.role === 'end' }"
					data-testid="flow-step-row">
					<span class="cn-flow-step-list__badge" aria-hidden="true">{{ row.n }}</span>
					<div class="cn-flow-step-list__body">
						<span v-if="row.when" class="cn-flow-step-list__when" data-testid="flow-step-when">
							<CallSplit :size="14" />
							{{ row.when }}
						</span>
						<span class="cn-flow-step-list__head">
							<strong>{{ titleOf(row.node) }}</strong>
							<CnStatusBadge :label="kindOf(row.node)" size="small" />
							<CnStatusBadge v-if="row.loose"
								:label="t('nextcloud-vue', 'Not connected')"
								variant="warning"
								size="small"
								data-testid="flow-step-loose" />
						</span>
						<span v-if="row.routes.length > 0" class="cn-flow-step-list__routes" data-testid="flow-step-routes">
							{{ t('nextcloud-vue', 'Routes:') }}
							<span v-for="route in row.routes" :key="route.id" class="cn-flow-step-list__route">
								{{ route.label }}
								<ArrowRight :size="14" />
								{{ route.to }}
							</span>
						</span>
					</div>
					<CnStatusBadge v-if="stateOf(row)" :label="stateOf(row).label" :variant="stateOf(row).variant" />
					<span v-if="editable"
						role="group"
						class="cn-flow-step-list__actions"
						:aria-label="t('nextcloud-vue', 'Actions for step {n}', { n: row.n })">
						<NcButton variant="tertiary"
							:aria-label="t('nextcloud-vue', 'Up')"
							:title="moveTitle(row.canMoveUp, t('nextcloud-vue', 'Up'))"
							:disabled="!row.canMoveUp"
							data-testid="flow-step-up"
							@click="store.moveStep({ id: row.id, by: -1 })">
							<template #icon>
								<ChevronUp :size="18" />
							</template>
						</NcButton>
						<NcButton variant="tertiary"
							:aria-label="t('nextcloud-vue', 'Down')"
							:title="moveTitle(row.canMoveDown, t('nextcloud-vue', 'Down'))"
							:disabled="!row.canMoveDown"
							data-testid="flow-step-down"
							@click="store.moveStep({ id: row.id, by: 1 })">
							<template #icon>
								<ChevronDown :size="18" />
							</template>
						</NcButton>
						<NcButton variant="tertiary"
							:aria-label="t('nextcloud-vue', 'Edit')"
							:title="t('nextcloud-vue', 'Edit')"
							:aria-pressed="isSelected(row) ? 'true' : 'false'"
							data-testid="flow-step-edit"
							@click="$emit('edit', row.id)">
							<template #icon>
								<Pencil :size="18" />
							</template>
						</NcButton>
						<NcButton variant="tertiary"
							:aria-label="t('nextcloud-vue', 'Delete')"
							:title="t('nextcloud-vue', 'Delete')"
							data-testid="flow-step-delete"
							@click="store.removeStep(row.id)">
							<template #icon>
								<Delete :size="18" />
							</template>
						</NcButton>
					</span>
				</li>
			</ol>
			<div v-if="editable" class="cn-flow-step-list__add">
				<NcButton data-testid="flow-step-add" @click="$emit('add')">
					<template #icon>
						<Plus :size="18" />
					</template>
					{{ t('nextcloud-vue', 'Add step') }}
				</NcButton>
				<span class="cn-flow-step-list__note">{{ t('nextcloud-vue', 'A new step goes at the bottom; use the arrows to put it in place.') }}</span>
			</div>
		</section>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import ArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import CallSplit from 'vue-material-design-icons/CallSplit.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import LightningBolt from 'vue-material-design-icons/LightningBolt.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { useFlowStore } from '../../composables/useFlowStore.js'
import { flowStepRows } from '../../utils/flowStepList.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

let uidCounter = 0

/**
 * The list view of a flow. CnFlowDetail renders it in place of the canvas when
 * its `view` is `list`, so the toolbar, messages and dialogs stay the same.
 */
export default {
	name: 'CnFlowStepList',

	components: { ArrowRight, CallSplit, ChevronDown, ChevronUp, CnStatusBadge, Delete, LightningBolt, NcButton, Pencil, Plus },

	props: {
		/**
		 * A step's outcome in the open run, `(id) => { label, variant } | null`.
		 */
		stepState: {
			type: Function,
			default: () => null,
		},
	},

	emits: ['add', 'edit'],

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		uidCounter += 1

		return { uid: `cn-flow-step-list-${uidCounter}` }
	},

	computed: {
		/** @return {{triggers: Array<object>, steps: Array<object>}} The rows. */
		list() {
			return flowStepRows(this.store.stepGraph, this.titleOf)
		},

		/** @return {boolean} Whether the flow can be changed from here. */
		editable() {
			return !this.store.graphLocked && !this.store.inRunView
		},
	},

	methods: {
		t,

		/**
		 * @param {object} node A flow node.
		 * @return {string} The name it goes by.
		 */
		titleOf(node) {
			return node.name || node.label || this.kindOf(node)
		},

		/**
		 * @param {object} node A flow node.
		 * @return {string} What kind of step it is, from the catalogue.
		 */
		kindOf(node) {
			const entry = this.store.catalogEntry(node.type)

			return entry?.displayName || node.type || node.id
		},

		/**
		 * @param {object} row A list row.
		 * @return {boolean} Whether it is the selected step.
		 */
		isSelected(row) {
			return this.store.selectedNodeId === row.id
		},

		/**
		 * @param {object} row A list row.
		 * @return {{label: string, variant: string}|null} Its outcome in the open run.
		 */
		stateOf(row) {
			return this.stepState(row.id)
		},

		/**
		 * @param {boolean} possible Whether the move can be made.
		 * @param {string} label The arrow's name.
		 * @return {string} The arrow's tooltip.
		 */
		moveTitle(possible, label) {
			return possible ? label : t('nextcloud-vue', 'Steps on a branch are moved on the canvas.')
		},
	},
}
</script>

<style scoped>
.cn-flow-step-list {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	gap: 14px;
	box-sizing: border-box;
	min-block-size: 0;
	padding: 12px;
	overflow-y: auto;
}

.cn-flow-step-list__section {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-flow-step-list__title {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.cn-flow-step-list__steps {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-flow-step-list__row {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 12px 14px;
	border: 1px solid var(--color-border);
	border-radius: 10px;
	background: var(--color-main-background);
}

.cn-flow-step-list__row--selected {
	border-color: var(--color-primary-element);
	box-shadow: 0 0 0 2px var(--color-primary-element);
}

.cn-flow-step-list__row--end {
	background: var(--color-background-hover);
}

.cn-flow-step-list__badge {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	inline-size: 34px;
	block-size: 34px;
	border-radius: 50%;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font-weight: 700;
}

.cn-flow-step-list__badge--trigger {
	background: var(--color-success);
	color: var(--color-success-text-on-success, var(--color-primary-element-text));
}

.cn-flow-step-list__body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 5px;
	min-inline-size: 0;
}

.cn-flow-step-list__head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-flow-step-list__when {
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	gap: 6px;
	padding: 2px 10px 2px 8px;
	border: 1px dashed currentcolor;
	border-radius: 10px;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-weight: 600;
}

.cn-flow-step-list__routes {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	font-size: 13px;
}

.cn-flow-step-list__route {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 1px 8px;
	border-radius: 10px;
	background: var(--color-background-dark);
	font-weight: 600;
}

.cn-flow-step-list__actions {
	display: inline-flex;
	flex: none;
	gap: 4px;
}

.cn-flow-step-list__add {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px;
	padding-block-start: 4px;
}

.cn-flow-step-list__note,
.cn-flow-step-list__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}
</style>
