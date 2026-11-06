<!--
  CnFlowViewSwitch — Canvas or List: the two views of one flow.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-flow-view-switch">
		<div class="cn-flow-view-switch__group"
			role="group"
			:aria-label="t('nextcloud-vue', 'View of the flow')"
			data-testid="flow-view-switch">
			<button v-for="view in views"
				:key="view.id"
				type="button"
				class="cn-flow-view-switch__option"
				:class="{ 'cn-flow-view-switch__option--active': view.id === modelValue }"
				:aria-pressed="view.id === modelValue ? 'true' : 'false'"
				:data-testid="`flow-view-${view.id}`"
				@click="$emit('update:modelValue', view.id)">
				<component :is="view.icon" :size="16" />
				{{ view.label }}
			</button>
		</div>
		<span v-if="note" class="cn-flow-view-switch__note" data-testid="flow-view-note">{{ noteText }}</span>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import VectorPolyline from 'vue-material-design-icons/VectorPolyline.vue'

/**
 * Switches a flow editor between its canvas and its list. Both edit the same
 * flow, so the switch only says which one is on screen (board OrFlowKop).
 */
export default {
	name: 'CnFlowViewSwitch',

	props: {
		/** The view on screen: `canvas` or `list`. */
		modelValue: {
			type: String,
			default: 'canvas',
		},

		/** Say beside the switch that both views are the same flow. */
		note: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['update:modelValue'],

	computed: {
		/** @return {Array<object>} The two views. */
		views() {
			return [
				{ id: 'canvas', label: t('nextcloud-vue', 'Canvas'), icon: VectorPolyline },
				{ id: 'list', label: t('nextcloud-vue', 'List'), icon: FormatListBulleted },
			]
		},

		/** @return {string} The line beside the switch. */
		noteText() {
			return this.modelValue === 'list'
				? t('nextcloud-vue', 'The same flow and the same steps as on the canvas; what you change here changes there too.')
				: t('nextcloud-vue', 'The same flow as a list: the trigger and the steps in order, for anyone who prefers no canvas.')
		},
	},

	methods: { t },
}
</script>

<style scoped>
.cn-flow-view-switch {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px;
}

.cn-flow-view-switch__group {
	display: inline-flex;
	padding: 3px;
	border-radius: 10px;
	background: var(--color-background-dark);
}

.cn-flow-view-switch__option {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-block-size: 34px;
	margin: 0;
	padding: 0 12px;
	border: 0;
	border-radius: 8px;
	background: transparent;
	color: var(--color-main-text);
	font-weight: 600;
	cursor: pointer;
}

.cn-flow-view-switch__option--active {
	background: var(--color-main-background);
	box-shadow: 0 1px 3px var(--color-box-shadow);
}

.cn-flow-view-switch__note {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}
</style>
