<!--
  CnFlowStepOutcomes: who a send step reached, and who it did not, by name.

  A messaging step (send email, send notification, post to Talk) writes its
  per-recipient outcome onto its run-log entry as `report.messaging`: one
  bucket per outcome, each `{count, sample}`. Nothing rendered it, so the run
  log could not show that a person was skipped because they opted out, or
  because the opt-out check did not answer.

  Only buckets with someone in them are listed. A bucket this component does
  not know is still shown, under its own key made readable, so a new outcome
  on the server is never hidden by an older library.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="rows.length" class="cn-flow-step-outcomes" data-testid="flow-step-outcomes">
		<dl class="cn-flow-step-outcomes__list" :aria-label="t('nextcloud-vue', 'Who this step reached')">
			<div v-for="row in rows"
				:key="row.key"
				class="cn-flow-step-outcomes__row"
				:class="`cn-flow-step-outcomes__row--${row.tone}`"
				:data-testid="`flow-step-outcome-${row.key}`">
				<dt class="cn-flow-step-outcomes__name">
					{{ row.label }}
				</dt>
				<dd class="cn-flow-step-outcomes__value">
					<span class="cn-flow-step-outcomes__count">{{ row.count }}</span>
					<span v-if="row.sample.length" class="cn-flow-step-outcomes__sample"> · {{ row.sample.join(', ') }}</span>
				</dd>
			</div>
		</dl>
		<p v-if="report && report.truncated"
			class="cn-flow-step-outcomes__truncated"
			data-testid="flow-step-outcomes-truncated">
			{{ t('nextcloud-vue', 'Each list shows its first entries only.') }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * The buckets a messaging report carries, in reading order: who got it first,
 * then each reason someone did not. `tone` marks the row for styling only.
 */
const KNOWN_BUCKETS = [
	{ key: 'delivered', tone: 'success' },
	{ key: 'optedOut', tone: 'neutral' },
	{ key: 'authorityUnavailable', tone: 'warning' },
	{ key: 'skippedByPreference', tone: 'neutral' },
	{ key: 'skippedByKillSwitch', tone: 'neutral' },
	{ key: 'rateLimited', tone: 'warning' },
	{ key: 'refusedRecipients', tone: 'warning' },
	{ key: 'unknownRecipients', tone: 'warning' },
	{ key: 'failed', tone: 'error' },
]

/** Report keys that are facts about the send, not outcome buckets. */
const NOT_BUCKETS = ['channel', 'actor', 'recipients', 'truncated']

export default {
	name: 'CnFlowStepOutcomes',

	props: {
		/**
		 * A step's messaging report: the run-log entry's `report.messaging`.
		 * Each outcome bucket is `{count, sample}`; a `refusedRecipients`
		 * sample entry is `{recipient, reason}`. `null` renders nothing.
		 */
		report: {
			type: Object,
			default: null,
		},

		/**
		 * Names to use instead of the built-in ones, keyed by bucket
		 * (`{ optedOut: 'Unsubscribed' }`). Pass already-translated text.
		 */
		labels: {
			type: Object,
			default: () => ({}),
		},
	},

	computed: {
		/**
		 * The non-empty buckets, known ones first in reading order, then any
		 * bucket the server added that this component does not know.
		 *
		 * @return {Array<object>} One row per bucket: key, label, count, sample, tone.
		 */
		rows() {
			const report = this.report
			if (!report || typeof report !== 'object') {
				return []
			}

			const known = KNOWN_BUCKETS.map((bucket) => bucket.key)
			const extra = Object.keys(report).filter((key) => !known.includes(key) && !NOT_BUCKETS.includes(key))
			const ordered = [
				...KNOWN_BUCKETS,
				...extra.map((key) => ({ key, tone: 'neutral' })),
			]

			return ordered
				.map(({ key, tone }) => ({ key, tone, bucket: report[key] }))
				.filter(({ bucket }) => bucket && typeof bucket === 'object' && Number(bucket.count) > 0)
				.map(({ key, tone, bucket }) => ({
					key,
					tone,
					label: this.labelFor(key),
					count: Number(bucket.count),
					sample: (Array.isArray(bucket.sample) ? bucket.sample : []).map((entry) => this.describeEntry(entry)),
				}))
		},
	},

	methods: {
		t,

		/**
		 * The readable name of a bucket: the host's, then the built-in one,
		 * then the key itself (`heldForReview` reads "Held for review").
		 *
		 * @param {string} key The bucket key.
		 * @return {string} The name.
		 */
		labelFor(key) {
			if (this.labels && this.labels[key]) {
				return String(this.labels[key])
			}

			const builtIn = {
				delivered: t('nextcloud-vue', 'Delivered'),
				optedOut: t('nextcloud-vue', 'Opted out'),
				authorityUnavailable: t('nextcloud-vue', 'Not sent, the opt-out check did not answer'),
				skippedByPreference: t('nextcloud-vue', 'Skipped by their notification settings'),
				skippedByKillSwitch: t('nextcloud-vue', 'Skipped, sending is switched off'),
				rateLimited: t('nextcloud-vue', 'Held back by the send limit'),
				refusedRecipients: t('nextcloud-vue', 'Refused by the step’s address rule'),
				unknownRecipients: t('nextcloud-vue', 'Not a known user or group'),
				failed: t('nextcloud-vue', 'Failed'),
			}
			if (builtIn[key]) {
				return builtIn[key]
			}

			const words = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim().toLowerCase()

			return words.charAt(0).toUpperCase() + words.slice(1)
		},

		/**
		 * One sample entry as text. A refused address carries its reason.
		 *
		 * @param {string|object} entry The sample entry.
		 * @return {string} The text.
		 */
		describeEntry(entry) {
			if (entry && typeof entry === 'object') {
				const who = String(entry.recipient ?? entry.id ?? '')
				const reason = this.reasonFor(entry.reason)

				return reason ? `${who} (${reason})` : who
			}

			return String(entry)
		},

		/**
		 * Why the step's address rule refused an address, in words.
		 *
		 * @param {string} [code] The refusal code.
		 * @return {string} The reason, or the code when it is not known.
		 */
		reasonFor(code) {
			const reasons = {
				'external-recipients-off': t('nextcloud-vue', 'external recipients are off'),
				'not-on-item': t('nextcloud-vue', 'not on the item'),
				'invalid-address': t('nextcloud-vue', 'not a valid address'),
			}

			return code ? (reasons[code] || String(code)) : ''
		},
	},
}
</script>

<style scoped>
.cn-flow-step-outcomes {
	margin: 4px 0 0;
	font-size: 0.9em;
}

.cn-flow-step-outcomes__list {
	margin: 0;
	padding: 0;
}

.cn-flow-step-outcomes__row {
	display: flex;
	flex-wrap: wrap;
	gap: 0 8px;
	padding-inline-start: 8px;
	border-inline-start: 3px solid var(--color-border);
}

.cn-flow-step-outcomes__row--success {
	border-inline-start-color: var(--color-success);
}

.cn-flow-step-outcomes__row--warning {
	border-inline-start-color: var(--color-warning);
}

.cn-flow-step-outcomes__row--error {
	border-inline-start-color: var(--color-error);
}

.cn-flow-step-outcomes__name {
	font-weight: bold;
}

.cn-flow-step-outcomes__value {
	margin: 0;
	color: var(--color-main-text);
	overflow-wrap: anywhere;
}

.cn-flow-step-outcomes__truncated {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}
</style>
