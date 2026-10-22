<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<section class="cn-flow-dry-run" :aria-label="title" data-testid="flow-dry-run-result">
		<div class="cn-flow-dry-run__head">
			<h3 class="cn-flow-dry-run__title">
				{{ title }}
			</h3>
			<NcButton variant="tertiary" data-testid="flow-dry-run-close" @click="$emit('close')">
				{{ t('nextcloud-vue', 'Close') }}
			</NcButton>
		</div>
		<p class="cn-flow-dry-run__note" data-testid="flow-dry-run-note">
			{{ t('nextcloud-vue', 'Nothing was changed or sent.') }}
		</p>
		<p v-if="result.error"
			class="cn-flow-dry-run__error"
			role="alert"
			data-testid="flow-dry-run-error">
			{{ result.error }}
		</p>
		<ol class="cn-flow-dry-run__steps">
			<li v-for="(step, index) in steps"
				:key="`${index}-${step.nodeId}`"
				class="cn-flow-dry-run__step"
				data-testid="flow-dry-run-step">
				<span class="cn-flow-dry-run__step-name">{{ step.label || step.type || step.nodeId }}</span>
				<span v-if="summaryOf(step)" class="cn-flow-dry-run__summary">{{ summaryOf(step) }}</span>
				<ul v-if="changesOf(step).length > 0" class="cn-flow-dry-run__list">
					<li v-for="change in changesOf(step)" :key="change.field" data-testid="flow-dry-run-change">
						{{ change.field }}: {{ valueText(change.value) }}
					</li>
				</ul>
				<ul v-if="messagesOf(step).length > 0" class="cn-flow-dry-run__list">
					<li v-for="(message, m) in messagesOf(step)" :key="m" data-testid="flow-dry-run-message">
						{{ t('nextcloud-vue', 'To {recipients}', { recipients: (message.to || []).join(', ') }) }}<template v-if="message.subject">
							· {{ message.subject }}
						</template>
					</li>
				</ul>
			</li>
		</ol>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'

/**
 * CnFlowDryRunResult — what trying a flow with a record showed: every step
 * the flow reached, in order, what it did (a step without side effects) or
 * would do (any other step), the fields it would change and the messages it
 * would send. Drawn beside the canvas by CnFlowBoard (DqFlow "Testen met een
 * zaak"). Nothing was changed or sent, and the panel says so.
 *
 * @spec openspec/changes/flow-test-with-a-record/specs/flow-test-with-a-record/spec.md#requirement-the-result-shows-each-step-beside-the-canvas
 */
export default {
	name: 'CnFlowDryRunResult',

	components: { NcButton },

	props: {
		/**
		 * OpenRegister's dry-run answer: `{ status, error?, steps: [{ nodeId,
		 * type, label, status, preview: { performed, summary?, changes?,
		 * messages? } }] }`.
		 */
		result: {
			type: Object,
			required: true,
		},
	},

	emits: ['close'],

	computed: {
		/** @return {Array<object>} The steps reached, in order. */
		steps() {
			return Array.isArray(this.result.steps) ? this.result.steps : []
		},

		/** @return {string} The panel's heading. */
		title() {
			return t('nextcloud-vue', 'Test result')
		},
	},

	methods: {
		t,

		/**
		 * @param {object} step A step.
		 * @return {string} What it did or would do.
		 */
		summaryOf(step) {
			return (step.preview && step.preview.summary) || ''
		},

		/**
		 * @param {object} step A step.
		 * @return {Array<{field: string, value: unknown}>} The fields it would change.
		 */
		changesOf(step) {
			return step.preview && Array.isArray(step.preview.changes) ? step.preview.changes : []
		},

		/**
		 * @param {object} step A step.
		 * @return {Array<object>} The messages it would send.
		 */
		messagesOf(step) {
			return step.preview && Array.isArray(step.preview.messages) ? step.preview.messages : []
		},

		/**
		 * @param {unknown} value A field value.
		 * @return {string} It as text.
		 */
		valueText(value) {
			return value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
		},
	},
}
</script>

<style scoped>
.cn-flow-dry-run {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-flow-dry-run__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.cn-flow-dry-run__title {
	margin: 0;
	font-size: 15px;
	font-weight: 700;
}

.cn-flow-dry-run__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-flow-dry-run__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}

.cn-flow-dry-run__steps {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	padding-inline-start: 20px;
}

.cn-flow-dry-run__step {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-flow-dry-run__step-name {
	font-weight: 600;
}

.cn-flow-dry-run__summary,
.cn-flow-dry-run__list {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-flow-dry-run__list {
	margin: 0;
	padding-inline-start: 16px;
}
</style>
