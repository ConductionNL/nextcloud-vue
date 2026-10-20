<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-plan-row" :data-testid="`cn-plan-row-${item.key || item.uuid}`">
		<span class="cn-plan-row__name">{{ item.name }}</span>
		<span class="cn-plan-row__state" :data-state="item.state">{{ stateLabel(item.state) }}</span>
		<NcButton v-if="item.state === 'enabled' && item.discretionary"
			:disabled="busy"
			:data-testid="`cn-plan-enable-${item.key || item.uuid}`"
			@click="$emit('enable', item)">
			{{ t('nextcloud-vue', 'Start') }}
		</NcButton>
		<NcButton v-for="target in targets"
			:key="target"
			:disabled="busy"
			:data-testid="`cn-plan-${target}-${item.key || item.uuid}`"
			@click="$emit('transition', item, target)">
			{{ target === 'completed' ? t('nextcloud-vue', 'Complete') : t('nextcloud-vue', 'Stop') }}
		</NcButton>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { offeredTransitions } from '../../utils/planTree.js'

/**
 * One plan item in CnPlanWidget: its name, its state and the moves offered.
 */
export default {
	name: 'CnPlanWidgetRow',

	components: { NcButton },

	props: {
		/**
		 * The plan item (`uuid`, `key`, `name`, `state`, `type`, `discretionary`).
		 *
		 * @type {object}
		 */
		item: {
			type: Object,
			required: true,
		},

		/** A move is running. */
		busy: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['enable', 'transition'],

	computed: {
		/** @return {string[]} The moves offered. */
		targets() {
			return offeredTransitions(this.item)
		},
	},

	methods: {
		t,

		/**
		 * The word for a state.
		 *
		 * @param {string} state The state.
		 * @return {string}
		 */
		stateLabel(state) {
			const labels = {
				available: t('nextcloud-vue', 'Waiting'),
				enabled: t('nextcloud-vue', 'Can start'),
				active: t('nextcloud-vue', 'In progress'),
				completed: t('nextcloud-vue', 'Done'),
				terminated: t('nextcloud-vue', 'Stopped'),
				disabled: t('nextcloud-vue', 'Not needed'),
			}
			return labels[state] || String(state || '')
		},
	},
}
</script>

<style scoped>
.cn-plan-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	padding-block: 6px;
}

.cn-plan-row__name {
	flex: 1 1 auto;
	font-weight: 600;
}

.cn-plan-row__state {
	padding: 2px 10px;
	border-radius: 12px;
	background: var(--color-background-dark);
	font-size: 13px;
}

.cn-plan-row__state[data-state='active'] {
	background: var(--color-primary-element-light);
}

.cn-plan-row__state[data-state='completed'] {
	color: var(--color-success-text, var(--color-success));
}
</style>
