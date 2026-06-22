<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-calendar-widget-form">
		<NcSelect
			:value="viewMode"
			:options="viewModeOptions"
			:input-label="t('nextcloud-vue', 'View mode')"
			:clearable="false"
			@input="updateField('viewMode', $event)" />

		<label class="cn-calendar-widget-form__field">
			<span class="cn-calendar-widget-form__label">{{ t('nextcloud-vue', 'Internal calendars (one principal URI per line)') }}</span>
			<textarea
				class="cn-calendar-widget-form__textarea"
				:value="internalCalendarsText"
				rows="3"
				@input="updateMulti('internalCalendars', $event.target.value)" />
		</label>

		<label class="cn-calendar-widget-form__field">
			<span class="cn-calendar-widget-form__label">{{ t('nextcloud-vue', 'External ICS URLs (one per line)') }}</span>
			<textarea
				class="cn-calendar-widget-form__textarea"
				:value="externalIcsUrlsText"
				rows="3"
				placeholder="https://example.com/cal.ics"
				@input="updateMulti('externalIcsUrls', $event.target.value)" />
		</label>

		<NcTextField
			:value="String(daysAhead)"
			:label="t('nextcloud-vue', 'Days ahead')"
			placeholder="14"
			@update:value="updateNumber('daysAhead', $event)" />

		<NcCheckboxRadioSwitch
			:checked="colorByCalendar"
			@update:checked="updateField('colorByCalendar', $event)">
			{{ t('nextcloud-vue', 'Color by calendar') }}
		</NcCheckboxRadioSwitch>
	</div>
</template>

<script>
import { NcTextField, NcSelect, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const VIEW_MODES = ['month', 'week', 'agenda']

const DEFAULT_CONTENT = Object.freeze({
	internalCalendars: [],
	externalIcsUrls: [],
	viewMode: 'agenda',
	daysAhead: 14,
	colorByCalendar: true,
})

/**
 * CnCalendarWidgetForm — the `CnAddWidgetModal` sub-form for the `calendar`
 * widget type. Captures internal NC calendar principals, external ICS URLs,
 * the view mode, the days-ahead agenda window, and the color-by-calendar
 * toggle. `validate()` requires at least one calendar source and that every
 * external URL is `https://` (so it never reaches the backend SSRF guard).
 */
export default {
	name: 'CnCalendarWidgetForm',

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
		return {
			internalCalendars: Array.isArray(initial.internalCalendars)
				? [...initial.internalCalendars]
				: [],
			externalIcsUrls: Array.isArray(initial.externalIcsUrls)
				? [...initial.externalIcsUrls]
				: [],
			viewMode: VIEW_MODES.includes(initial.viewMode) ? initial.viewMode : DEFAULT_CONTENT.viewMode,
			daysAhead: this.coerceNumber(initial.daysAhead, DEFAULT_CONTENT.daysAhead),
			colorByCalendar: initial.colorByCalendar !== false,
		}
	},

	computed: {
		/** Available view modes. */
		viewModeOptions() {
			return VIEW_MODES
		},

		/** Newline-joined internal calendars for the textarea. */
		internalCalendarsText() {
			return this.internalCalendars.join('\n')
		},

		/** Newline-joined external ICS URLs for the textarea. */
		externalIcsUrlsText() {
			return this.externalIcsUrls.join('\n')
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				internalCalendars: [...this.internalCalendars],
				externalIcsUrls: [...this.externalIcsUrls],
				viewMode: this.viewMode,
				daysAhead: this.daysAhead,
				colorByCalendar: this.colorByCalendar,
			}
		},
	},

	methods: {
		t,

		/**
		 * Coerce a value to a positive integer, falling back when invalid.
		 *
		 * @param {string|number} value the raw value.
		 * @param {number} fallback the default.
		 * @return {number} the coerced number.
		 */
		coerceNumber(value, fallback) {
			const num = parseInt(value, 10)
			return Number.isFinite(num) && num > 0 ? num : fallback
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
		 * Set a numeric field (coerced) and notify the parent.
		 *
		 * @param {string} field the reactive key.
		 * @param {string|number} value the new value.
		 * @return {void}
		 */
		updateNumber(field, value) {
			this[field] = this.coerceNumber(value, DEFAULT_CONTENT[field])
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Set a newline-delimited multi-value field and notify the parent.
		 *
		 * @param {string} field the reactive key.
		 * @param {string} raw the textarea value.
		 * @return {void}
		 */
		updateMulti(field, raw) {
			const lines = String(raw || '')
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line !== '')
			this[field] = lines
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []

			if (this.internalCalendars.length === 0 && this.externalIcsUrls.length === 0) {
				errors.push(t('nextcloud-vue', 'At least one calendar source is required'))
			}

			for (const url of this.externalIcsUrls) {
				if (!/^https:\/\/[^\s/]+/i.test(url)) {
					errors.push(t('nextcloud-vue', 'External ICS URLs must start with https://'))
					break
				}
			}

			return errors
		},
	},
}
</script>

<style scoped>
.cn-calendar-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-calendar-widget-form__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 14px;
}

.cn-calendar-widget-form__label {
	font-weight: 500;
}

.cn-calendar-widget-form__textarea {
	width: 100%;
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-family: inherit;
	font-size: 13px;
	resize: vertical;
}
</style>
