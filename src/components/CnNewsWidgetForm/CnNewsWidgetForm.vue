<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-news-form">
		<label class="cn-news-form__label">
			{{ t('nextcloud-vue', 'Feed URLs') }}
		</label>
		<div
			v-for="(url, index) in feedUrls"
			:key="`feed-${index}`"
			class="cn-news-form__feed-row">
			<NcTextField
				:model-value="url"
				:label="t('nextcloud-vue', 'Feed URL')"
				placeholder="https://example.com/feed.xml"
				@update:model-value="updateFeedUrl(index, $event)" />
			<button
				type="button"
				class="cn-news-form__feed-remove"
				:aria-label="t('nextcloud-vue', 'Remove feed')"
				@click="removeFeedUrl(index)">
				×
			</button>
		</div>
		<button
			type="button"
			class="cn-news-form__feed-add"
			@click="addFeedUrl">
			+ {{ t('nextcloud-vue', 'Add feed URL') }}
		</button>

		<NcSelect
			:model-value="layout"
			:options="layoutOptions"
			:input-label="t('nextcloud-vue', 'Layout')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('layout', $event)" />

		<NcTextField
			:model-value="String(itemLimit)"
			type="number"
			:label="t('nextcloud-vue', 'Item limit (1–50)')"
			@update:model-value="updateNumericField('itemLimit', $event, 1, 50)" />

		<NcCheckboxRadioSwitch
			:model-value="showThumbnails"
			@update:model-value="updateField('showThumbnails', $event)">
			{{ t('nextcloud-vue', 'Show thumbnails') }}
		</NcCheckboxRadioSwitch>

		<NcCheckboxRadioSwitch
			:model-value="showSummary"
			@update:model-value="updateField('showSummary', $event)">
			{{ t('nextcloud-vue', 'Show summary') }}
		</NcCheckboxRadioSwitch>

		<NcTextField
			:model-value="String(summaryMaxChars)"
			type="number"
			:label="t('nextcloud-vue', 'Summary max characters')"
			@update:model-value="updateNumericField('summaryMaxChars', $event, 0, 5000)" />

		<NcSelect
			:model-value="dateFormat"
			:options="dateFormatOptions"
			:input-label="t('nextcloud-vue', 'Date format')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('dateFormat', $event)" />

		<NcCheckboxRadioSwitch
			:model-value="metadataFilterEnabled"
			@update:model-value="toggleMetadataFilter">
			{{ t('nextcloud-vue', 'Filter by dashboard metadata') }}
		</NcCheckboxRadioSwitch>

		<div v-if="metadataFilterEnabled" class="cn-news-form__metadata">
			<NcTextField
				:model-value="metadataFieldKey"
				:label="t('nextcloud-vue', 'Metadata field key')"
				placeholder="department"
				@update:model-value="updateMetadataField('fieldKey', $event)" />
			<NcTextField
				:model-value="metadataValue"
				:label="t('nextcloud-vue', 'Metadata value to match')"
				placeholder="marketing"
				@update:model-value="updateMetadataField('value', $event)" />
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcTextField, NcSelect, NcCheckboxRadioSwitch } from '@nextcloud/vue'

const ALLOWED_LAYOUTS = Object.freeze(['list', 'grid', 'carousel'])

const DEFAULT_CONTENT = Object.freeze({
	feedUrls: [],
	layout: 'list',
	itemLimit: 10,
	showThumbnails: true,
	showSummary: true,
	summaryMaxChars: 200,
	dateFormat: 'relative',
	metadataFilter: null,
})

/**
 * CnNewsWidgetForm — sub-form for creating or editing a `news` placement.
 *
 * Manages the feed URL list, layout, item limit, thumbnail/summary toggles,
 * summary length, date format, and an optional `{fieldKey, value}` metadata
 * filter. Pre-fills from `editingWidget.content` and emits `update:content`
 * with the assembled payload on every change.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnNewsWidgetForm',

	components: {
		NcTextField,
		NcSelect,
		NcCheckboxRadioSwitch,
	},

	props: {
		/** The placement being edited, or `null` in create mode. */
		editingWidget: {
			type: Object,
			default: null,
		},
		/** Initial content values (registry defaults when not editing). */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted on every change with the assembled content payload.
		 *
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		const filter = initial.metadataFilter
		const hasFilter = filter !== null && typeof filter === 'object'
		return {
			feedUrls: Array.isArray(initial.feedUrls) ? [...initial.feedUrls] : [],
			layout: ALLOWED_LAYOUTS.includes(initial.layout) ? initial.layout : DEFAULT_CONTENT.layout,
			itemLimit: typeof initial.itemLimit === 'number' ? initial.itemLimit : DEFAULT_CONTENT.itemLimit,
			showThumbnails: initial.showThumbnails === undefined ? DEFAULT_CONTENT.showThumbnails : initial.showThumbnails === true,
			showSummary: initial.showSummary === undefined ? DEFAULT_CONTENT.showSummary : initial.showSummary === true,
			summaryMaxChars: typeof initial.summaryMaxChars === 'number' ? initial.summaryMaxChars : DEFAULT_CONTENT.summaryMaxChars,
			dateFormat: initial.dateFormat === 'absolute' ? 'absolute' : 'relative',
			metadataFilterEnabled: hasFilter,
			metadataFieldKey: hasFilter && typeof filter.fieldKey === 'string' ? filter.fieldKey : '',
			metadataValue: hasFilter && typeof filter.value === 'string' ? filter.value : '',
		}
	},

	computed: {
		/**
		 * The layout dropdown options.
		 *
		 * @return {Array<{value: string, label: string}>} the options.
		 */
		layoutOptions() {
			return [
				{ value: 'list', label: t('nextcloud-vue', 'List') },
				{ value: 'grid', label: t('nextcloud-vue', 'Grid') },
				{ value: 'carousel', label: t('nextcloud-vue', 'Carousel') },
			]
		},

		/**
		 * The date-format dropdown options.
		 *
		 * @return {Array<{value: string, label: string}>} the options.
		 */
		dateFormatOptions() {
			return [
				{ value: 'relative', label: t('nextcloud-vue', 'Relative (2 hours ago)') },
				{ value: 'absolute', label: t('nextcloud-vue', 'Absolute (2026-05-01 14:30)') },
			]
		},

		/**
		 * The assembled `content` payload emitted to the parent.
		 *
		 * @return {object} the content blob.
		 */
		assembledContent() {
			const filter = this.metadataFilterEnabled
				? { fieldKey: this.metadataFieldKey, value: this.metadataValue }
				: null
			return {
				feedUrls: [...this.feedUrls],
				layout: this.layout,
				itemLimit: this.itemLimit,
				showThumbnails: this.showThumbnails,
				showSummary: this.showSummary,
				summaryMaxChars: this.summaryMaxChars,
				dateFormat: this.dateFormat,
				metadataFilter: filter,
			}
		},
	},

	methods: {
		/**
		 * Emit `update:content` with the current assembled payload.
		 *
		 * @return {void}
		 */
		emitUpdate() {
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Set a field and emit.
		 *
		 * @param {string} field the field name.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.emitUpdate()
		},

		/**
		 * Parse, clamp, and set a numeric field, then emit.
		 *
		 * @param {string} field the field name.
		 * @param {string} value the raw input value.
		 * @param {number} min the lower bound.
		 * @param {number} max the upper bound.
		 * @return {void}
		 */
		updateNumericField(field, value, min, max) {
			const parsed = parseInt(value, 10)
			if (Number.isNaN(parsed)) {
				return
			}
			const clamped = Math.max(min, Math.min(max, parsed))
			this[field] = clamped
			this.emitUpdate()
		},

		/**
		 * Update a feed URL at an index, then emit.
		 *
		 * @param {number} index the feed index.
		 * @param {string} value the new URL.
		 * @return {void}
		 */
		updateFeedUrl(index, value) {
			this.feedUrls[index] = value
			this.emitUpdate()
		},

		/**
		 * Append an empty feed URL row, then emit.
		 *
		 * @return {void}
		 */
		addFeedUrl() {
			this.feedUrls.push('')
			this.emitUpdate()
		},

		/**
		 * Remove a feed URL at an index, then emit.
		 *
		 * @param {number} index the feed index.
		 * @return {void}
		 */
		removeFeedUrl(index) {
			this.feedUrls.splice(index, 1)
			this.emitUpdate()
		},

		/**
		 * Toggle the metadata filter, then emit.
		 *
		 * @param {boolean} enabled the new enabled state.
		 * @return {void}
		 */
		toggleMetadataFilter(enabled) {
			this.metadataFilterEnabled = enabled
			this.emitUpdate()
		},

		/**
		 * Update a metadata filter field, then emit.
		 *
		 * @param {string} field `'fieldKey'` or `'value'`.
		 * @param {string} value the new value.
		 * @return {void}
		 */
		updateMetadataField(field, value) {
			if (field === 'fieldKey') {
				this.metadataFieldKey = value
			} else if (field === 'value') {
				this.metadataValue = value
			}
			this.emitUpdate()
		},

		/**
		 * Validate that every feed URL is http(s). An empty list is allowed.
		 *
		 * @return {string[]} the validation errors (empty when valid).
		 */
		validate() {
			const errors = []
			for (const url of this.feedUrls) {
				if (typeof url !== 'string' || url.trim() === '') {
					errors.push(t('nextcloud-vue', 'Empty feed URL — remove it or fill it in'))
					continue
				}
				if (!/^https?:\/\//i.test(url.trim())) {
					errors.push(t('nextcloud-vue', 'Feed URL must start with http:// or https://'))
				}
			}
			if (this.metadataFilterEnabled) {
				if (this.metadataFieldKey.trim() === '') {
					errors.push(t('nextcloud-vue', 'Metadata field key is required when filter is enabled'))
				}
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-news-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-news-form__label {
	font-size: 13px;
	font-weight: 600;
}

.cn-news-form__feed-row {
	display: flex;
	align-items: flex-end;
	gap: 6px;
}

.cn-news-form__feed-remove {
	width: 32px;
	height: 32px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	cursor: pointer;
	font-size: 18px;
	line-height: 1;
}

.cn-news-form__feed-add {
	align-self: flex-start;
	padding: 6px 12px;
	border: 1px dashed var(--color-border);
	border-radius: var(--border-radius);
	background: transparent;
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 13px;
}

.cn-news-form__metadata {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding-left: 16px;
	border-left: 2px solid var(--color-border);
}
</style>
