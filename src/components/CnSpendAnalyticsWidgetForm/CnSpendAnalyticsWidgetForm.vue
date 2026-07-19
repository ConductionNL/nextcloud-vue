<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-spend-analytics-widget-form">
		<NcSelect
			:model-value="viewMode"
			:options="viewModeOptions"
			:input-label="t('nextcloud-vue', 'View mode')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('viewMode', $event)" />

		<NcSelect
			:model-value="period"
			:options="periodOptions"
			:input-label="t('nextcloud-vue', 'Period')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('period', $event)" />

		<NcTextField
			:model-value="categoryIdsString"
			:label="t('nextcloud-vue', 'Category filter (comma separated CPV / category ids)')"
			:placeholder="t('nextcloud-vue', 'e.g. 30190000, 48000000')"
			@update:model-value="updateListField('categoryIds', $event)" />

		<NcTextField
			:model-value="departmentIdsString"
			:label="t('nextcloud-vue', 'Department filter (comma separated cost-centre ids)')"
			@update:model-value="updateListField('departmentIds', $event)" />

		<NcTextField
			:model-value="vendorIdsString"
			:label="t('nextcloud-vue', 'Vendor filter (comma separated supplier ids)')"
			@update:model-value="updateListField('vendorIds', $event)" />

		<NcSelect
			:model-value="drillThroughTarget"
			:options="drillThroughOptions"
			:input-label="t('nextcloud-vue', 'Drill-through behaviour')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('drillThroughTarget', $event)" />

		<label class="cn-spend-analytics-widget-form__toggle">
			<input
				type="checkbox"
				:checked="attachEvidence"
				@change="updateField('attachEvidence', $event.target.checked)">
			{{ t('nextcloud-vue', 'Surface attached evidence documents') }}
		</label>

		<label class="cn-spend-analytics-widget-form__toggle">
			<input
				type="checkbox"
				:checked="aiInsightsEnabled"
				@change="updateAiInsights($event.target.checked)">
			{{ t('nextcloud-vue', 'Show AI-generated narrative (via local LLM)') }}
		</label>
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const VIEW_MODES = Object.freeze(['summary', 'trend', 'top-vendors', 'top-categories'])
const PERIODS = Object.freeze(['month', 'quarter', 'ytd', 'fy'])
const DRILL_TARGETS = Object.freeze(['detail-page', 'sibling-app'])

const DEFAULT_CONTENT = Object.freeze({
	viewMode: 'summary',
	period: 'quarter',
	filters: { categoryIds: [], departmentIds: [], vendorIds: [] },
	drillThroughTarget: 'detail-page',
	attachEvidence: true,
	aiInsights: { enabled: false },
})

/**
 * CnSpendAnalyticsWidgetForm — the `CnAddWidgetModal` sub-form for the
 * `spend-analytics` widget type. Persists `viewMode`, `period`, `filters`
 * (categoryIds / departmentIds / vendorIds), `drillThroughTarget`,
 * `attachEvidence`, and `aiInsights.enabled`. `validate()` rejects an
 * out-of-enum viewMode / period so the modal keeps Add/Save disabled.
 */
export default {
	name: 'CnSpendAnalyticsWidgetForm',

	components: {
		NcTextField,
		NcSelect,
	},

	props: {
		/** The placement being edited, or `null` in create mode. */
		editingWidget: {
			type: Object,
			default: null,
		},
		/** Initial content values when not editing (registry defaults). */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		const filters = initial.filters && typeof initial.filters === 'object' ? initial.filters : {}
		return {
			viewMode: VIEW_MODES.includes(initial.viewMode) ? initial.viewMode : DEFAULT_CONTENT.viewMode,
			period: PERIODS.includes(initial.period) ? initial.period : DEFAULT_CONTENT.period,
			categoryIds: this.coerceList(filters.categoryIds),
			departmentIds: this.coerceList(filters.departmentIds),
			vendorIds: this.coerceList(filters.vendorIds),
			drillThroughTarget: DRILL_TARGETS.includes(initial.drillThroughTarget) ? initial.drillThroughTarget : DEFAULT_CONTENT.drillThroughTarget,
			attachEvidence: typeof initial.attachEvidence === 'boolean' ? initial.attachEvidence : DEFAULT_CONTENT.attachEvidence,
			aiInsightsEnabled: initial.aiInsights?.enabled === true,
		}
	},

	computed: {
		/** View-mode select options. */
		viewModeOptions() {
			return [
				{ value: 'summary', label: t('nextcloud-vue', 'Summary') },
				{ value: 'trend', label: t('nextcloud-vue', 'Trend') },
				{ value: 'top-vendors', label: t('nextcloud-vue', 'Top vendors') },
				{ value: 'top-categories', label: t('nextcloud-vue', 'Top categories') },
			]
		},

		/** Period select options. */
		periodOptions() {
			return [
				{ value: 'month', label: t('nextcloud-vue', 'This month') },
				{ value: 'quarter', label: t('nextcloud-vue', 'This quarter') },
				{ value: 'ytd', label: t('nextcloud-vue', 'Year to date') },
				{ value: 'fy', label: t('nextcloud-vue', 'Fiscal year') },
			]
		},

		/** Drill-through select options. */
		drillThroughOptions() {
			return [
				{ value: 'detail-page', label: t('nextcloud-vue', 'Open detail panel inside the dashboard') },
				{ value: 'sibling-app', label: t('nextcloud-vue', 'Deep-link to the owning app') },
			]
		},

		/** Comma-joined category ids for the text input. */
		categoryIdsString() {
			return this.categoryIds.join(', ')
		},

		/** Comma-joined department ids for the text input. */
		departmentIdsString() {
			return this.departmentIds.join(', ')
		},

		/** Comma-joined vendor ids for the text input. */
		vendorIdsString() {
			return this.vendorIds.join(', ')
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				viewMode: this.viewMode,
				period: this.period,
				filters: {
					categoryIds: [...this.categoryIds],
					departmentIds: [...this.departmentIds],
					vendorIds: [...this.vendorIds],
				},
				drillThroughTarget: this.drillThroughTarget,
				attachEvidence: this.attachEvidence,
				aiInsights: { enabled: this.aiInsightsEnabled },
			}
		},
	},

	methods: {
		t,

		/**
		 * Filter a raw value to a clean string array.
		 *
		 * @param {*} raw the raw value.
		 * @return {string[]} the cleaned list.
		 */
		coerceList(raw) {
			if (!Array.isArray(raw)) {
				return []
			}
			return raw.filter((entry) => typeof entry === 'string' && entry.trim() !== '')
		},

		/**
		 * Set a field and notify the parent.
		 *
		 * @param {string} field the reactive key.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Parse a comma-separated list field and notify the parent.
		 *
		 * @param {string} field the reactive key.
		 * @param {string} value the textbox value.
		 * @return {void}
		 */
		updateListField(field, value) {
			const raw = String(value || '')
			this[field] = raw
				.split(',')
				.map((entry) => entry.trim())
				.filter((entry) => entry !== '')
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Toggle the AI narrative flag and notify the parent.
		 *
		 * @param {boolean} enabled the new value.
		 * @return {void}
		 */
		updateAiInsights(enabled) {
			this.aiInsightsEnabled = enabled === true
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []
			if (!VIEW_MODES.includes(this.viewMode)) {
				errors.push(t('nextcloud-vue', 'Invalid view mode'))
			}
			if (!PERIODS.includes(this.period)) {
				errors.push(t('nextcloud-vue', 'Invalid period'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-spend-analytics-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-spend-analytics-widget-form__toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
}
</style>
