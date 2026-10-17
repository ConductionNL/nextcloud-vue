<!--
  CnFlowRunSummary — the card that says how one run went: its outcome, when
  it started, how long it took, what started it and how many steps ran, with
  the ways on from there.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section class="cn-flow-run-summary" data-testid="flow-run-summary">
		<header class="cn-flow-run-summary__head">
			<CnStatusBadge :label="statusLabel" :variant="statusVariant" />
			<h3 class="cn-flow-run-summary__title">
				{{ t('nextcloud-vue', 'Run {id}', { id: runLabel }) }}
			</h3>
		</header>
		<dl class="cn-flow-run-summary__facts">
			<div class="cn-flow-run-summary__fact">
				<dt>{{ t('nextcloud-vue', 'Started') }}</dt>
				<dd data-testid="flow-run-started">
					{{ startedText }}
				</dd>
			</div>
			<div class="cn-flow-run-summary__fact">
				<dt>{{ t('nextcloud-vue', 'Duration') }}</dt>
				<dd data-testid="flow-run-duration">
					{{ durationText || '—' }}
				</dd>
			</div>
			<div class="cn-flow-run-summary__fact">
				<dt>{{ t('nextcloud-vue', 'Started by') }}</dt>
				<dd data-testid="flow-run-trigger">
					{{ startedByText }}
				</dd>
			</div>
			<div class="cn-flow-run-summary__fact">
				<dt>{{ t('nextcloud-vue', 'Steps') }}</dt>
				<dd data-testid="flow-run-steps">
					{{ stepsText }}
				</dd>
			</div>
		</dl>
		<p v-if="run && run.error" class="cn-flow-run-summary__error" data-testid="flow-run-error">
			{{ run.error }}
		</p>
		<div class="cn-flow-run-summary__actions">
			<NcButton v-if="subjectHref"
				:href="subjectHref"
				data-testid="flow-run-open-subject">
				{{ t('nextcloud-vue', 'Open the subject') }}
			</NcButton>
			<NcButton v-if="canRetry"
				data-testid="flow-run-retry"
				@click="$emit('retry', run)">
				{{ t('nextcloud-vue', 'Run again') }}
			</NcButton>
			<NcButton variant="tertiary"
				data-testid="flow-run-back"
				@click="$emit('back')">
				{{ t('nextcloud-vue', 'Back to the flow') }}
			</NcButton>
		</div>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { formatRelativeDate } from '../../utils/boardDate.js'
import { flowRunDurationMs, flowRunName, flowRunSteps, formatFlowDuration } from '../../utils/flowRunLog.js'
import { flowRunStatuses } from '../../utils/flowRunStatus.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

/**
 * One run's outcome card, for the run view of the flow editor.
 */
export default {
	name: 'CnFlowRunSummary',

	components: { CnStatusBadge, NcButton },

	props: {
		/**
		 * The run, as `GET /api/flow-runs/{uuid}` returns it.
		 */
		run: {
			type: Object,
			default: null,
		},

		/**
		 * How many steps the flow has, for "5 of 8 steps run".
		 */
		stepsTotal: {
			type: Number,
			default: 0,
		},

		/**
		 * Where the run's subject opens, or '' to offer no link.
		 */
		subjectHref: {
			type: String,
			default: '',
		},

		/**
		 * Offer Run again. Off for a run that is still going.
		 */
		canRetry: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['back', 'retry'],

	computed: {
		/**
		 * @return {object|null} The status entry for the run.
		 */
		status() {
			return this.run ? (flowRunStatuses()[this.run.status] || null) : null
		},

		/**
		 * @return {string} The status pill label.
		 */
		statusLabel() {
			return (this.status && this.status.label) || String(this.run?.status || '')
		},

		/**
		 * @return {string} The status pill variant.
		 */
		statusVariant() {
			return (this.status && this.status.variant) || 'default'
		},

		/**
		 * @return {string} The run's name.
		 */
		runLabel() {
			return flowRunName(this.run)
		},

		/**
		 * @return {string} When the run started.
		 */
		startedText() {
			return formatRelativeDate(this.run?.created, { withTime: true }) || '—'
		},

		/**
		 * @return {string} How long it took.
		 */
		durationText() {
			return formatFlowDuration(flowRunDurationMs(this.run))
		},

		/**
		 * @return {string} What started the run: a person, or the trigger.
		 */
		startedByText() {
			if (this.run?.triggeredBy) {
				return String(this.run.triggeredBy)
			}
			const trigger = String(this.run?.trigger || '')
			if (trigger === 'schedule') {
				return t('nextcloud-vue', 'The schedule')
			}
			return trigger || '—'
		},

		/**
		 * @return {string} How many steps ran, of how many.
		 */
		stepsText() {
			const ran = new Set(flowRunSteps(this.run).map((step) => step.nodeId)).size
			return this.stepsTotal > 0
				? t('nextcloud-vue', '{ran} of {total} run', { ran, total: this.stepsTotal })
				: String(ran)
		},
	},

	methods: { t },
}
</script>

<style scoped>
.cn-flow-run-summary {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-flow-run-summary__head {
	display: flex;
	align-items: center;
	gap: 10px;
}

.cn-flow-run-summary__title {
	margin: 0;
	font-size: 16px;
	font-weight: 600;
}

.cn-flow-run-summary__facts {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: 8px 16px;
	margin: 0;
}

.cn-flow-run-summary__fact dt {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-flow-run-summary__fact dd {
	margin: 0;
	font-weight: 600;
}

.cn-flow-run-summary__error {
	margin: 0;
	color: var(--color-error-text);
}

.cn-flow-run-summary__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
</style>
