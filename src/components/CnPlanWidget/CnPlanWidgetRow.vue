<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-plan-row" :data-testid="`cn-plan-row-${item.key || item.uuid}`">
		<span class="cn-plan-row__text">
			<span class="cn-plan-row__name">{{ item.name }}</span>
			<span v-if="item.description" class="cn-plan-row__meta" data-testid="cn-plan-row-meta">{{ item.description }}</span>
		</span>
		<span class="cn-plan-row__state" :data-state="item.state">{{ stateLabel(item) }}</span>
		<!-- The moves OpenRegister offers sit in the row's menu, so a row reads
		     as its name, its line and its state (DqZaak "Zaakplan"). -->
		<NcActions v-if="hasMoves"
			:ariaLabel="t('nextcloud-vue', 'Actions for {name}', { name: item.name })"
			:disabled="busy"
			:data-testid="`cn-plan-menu-${item.key || item.uuid}`">
			<NcActionButton v-if="canStart"
				:disabled="busy"
				closeAfterClick
				:data-testid="`cn-plan-enable-${item.key || item.uuid}`"
				@click="$emit('enable', item)">
				{{ t('nextcloud-vue', 'Start') }}
			</NcActionButton>
			<NcActionButton v-for="target in targets"
				:key="target"
				:disabled="busy"
				closeAfterClick
				:data-testid="`cn-plan-${target}-${item.key || item.uuid}`"
				@click="$emit('transition', item, target)">
				{{ target === 'completed' ? t('nextcloud-vue', 'Complete') : t('nextcloud-vue', 'Stop') }}
			</NcActionButton>
		</NcActions>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActions } from '@nextcloud/vue'
import { offeredTransitions } from '../../utils/planTree.js'

/**
 * One plan item in CnPlanWidget: its name, its state and the moves offered.
 */
export default {
	name: 'CnPlanWidgetRow',

	components: { NcActionButton, NcActions },

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

		/**
		 * The word per state that replaces the default, already translated.
		 *
		 * @type {object}
		 */
		labels: {
			type: Object,
			default: () => ({}),
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

		/** @return {boolean} A discretionary item that may be started. */
		canStart() {
			return this.item.state === 'enabled' && Boolean(this.item.discretionary)
		},

		/** @return {boolean} Whether the row offers any move. */
		hasMoves() {
			return this.canStart || this.targets.length > 0
		},
	},

	methods: {
		t,

		/**
		 * The word for an item's state. A completed milestone is reached, and
		 * an optional item nobody has started reads as optional rather than
		 * waiting. `labels` replaces the word for a state.
		 *
		 * @param {object} item The plan item.
		 * @return {string}
		 */
		stateLabel(item) {
			const state = item.state
			if (typeof this.labels[state] === 'string' && this.labels[state] !== '') {
				return this.labels[state]
			}
			if (state === 'completed' && item.type === 'milestone') {
				return t('nextcloud-vue', 'Reached')
			}
			if (item.discretionary && (state === 'available' || state === 'enabled')) {
				return t('nextcloud-vue', 'Optional')
			}
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

.cn-plan-row__text {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-plan-row__name {
	font-weight: 600;
}

.cn-plan-row__meta {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
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
