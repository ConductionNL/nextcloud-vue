<!--
  CnFlowStepLog — log lines of a flow run, or of one step across runs:
  an outcome pill, the time and what happened, one line each.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-flow-step-log" data-testid="flow-step-log">
		<p v-if="lines.length === 0" class="cn-flow-step-log__empty">
			{{ emptyText || t('nextcloud-vue', 'Nothing logged yet.') }}
		</p>
		<ol v-else class="cn-flow-step-log__lines">
			<li v-for="line in lines"
				:key="line.key"
				class="cn-flow-step-log__line"
				data-testid="flow-step-log-line">
				<CnStatusBadge :label="levelLabel(line.level)"
					:variant="levelVariant(line.level)"
					size="small" />
				<time v-if="line.at"
					class="cn-flow-step-log__time"
					:datetime="line.at.toISOString()">{{ timeText(line.at) }}</time>
				<span class="cn-flow-step-log__message">{{ line.message }}</span>
			</li>
		</ol>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { formatRelativeDate } from '../../utils/boardDate.js'
import { flowOutcomeLevels } from '../../utils/flowRunLog.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

/**
 * A list of flow log lines, as `flowRunLogLines()` returns them.
 */
export default {
	name: 'CnFlowStepLog',

	components: { CnStatusBadge },

	props: {
		/**
		 * The lines: `{ key, level, at, message }`, `level` one of
		 * `success`, `warning`, `error`, `info`.
		 */
		lines: {
			type: Array,
			default: () => [],
		},

		/**
		 * Shown when there are no lines.
		 */
		emptyText: {
			type: String,
			default: '',
		},

		/**
		 * Show the day before the time ("today 08:41"), for lines that span
		 * several runs. A single run's lines show the time to the millisecond.
		 */
		withDay: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return { levels: flowOutcomeLevels() }
	},

	methods: {
		t,

		/**
		 * @param {string} level The line's level.
		 * @return {string} The pill label.
		 */
		levelLabel(level) {
			return (this.levels[level] && this.levels[level].label) || level
		},

		/**
		 * @param {string} level The line's level.
		 * @return {string} The pill variant.
		 */
		levelVariant(level) {
			return (this.levels[level] && this.levels[level].variant) || 'default'
		},

		/**
		 * @param {Date} at The moment.
		 * @return {string} The time as this list shows it.
		 */
		timeText(at) {
			if (this.withDay) {
				return formatRelativeDate(at, { withTime: true })
			}
			const pad = (value, size = 2) => String(value).padStart(size, '0')
			return `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}.${pad(at.getMilliseconds(), 3)}`
		},
	},
}
</script>

<style scoped>
.cn-flow-step-log__empty {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-flow-step-log__lines {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-flow-step-log__line {
	display: grid;
	grid-template-columns: auto auto 1fr;
	gap: 4px 8px;
	align-items: baseline;
}

.cn-flow-step-log__time {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	font-variant-numeric: tabular-nums;
}

.cn-flow-step-log__message {
	grid-column: 1 / -1;
	overflow-wrap: anywhere;
}
</style>
