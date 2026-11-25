<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-people-widget-form">
		<NcSelect
			:modelValue="layout"
			:options="layoutOptions"
			:inputLabel="t('nextcloud-vue', 'Layout')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@update:modelValue="updateField('layout', $event)" />

		<!-- "New colleagues" is offered only when the source has a start date field. -->
		<NcSelect
			v-if="selectionOptions.length > 1"
			:modelValue="selectionMode"
			:options="selectionOptions"
			:inputLabel="t('nextcloud-vue', 'Selection')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			data-testid="cn-people-form-selection"
			@update:modelValue="updateField('selectionMode', $event)" />

		<template v-if="selectionMode === 'new'">
			<label class="cn-people-widget-form__field">
				{{ t('nextcloud-vue', 'Started in the last (days, 1–90)') }}
				<input
					type="number"
					class="cn-people-widget-form__input"
					min="1"
					max="90"
					data-testid="cn-people-form-new-since"
					:value="newSinceDays"
					@input="updateWindow('newSinceDays', $event.target.value, 1, 90)">
			</label>
			<label class="cn-people-widget-form__field">
				{{ t('nextcloud-vue', 'Starts within (days, 0–30)') }}
				<input
					type="number"
					class="cn-people-widget-form__input"
					min="0"
					max="30"
					data-testid="cn-people-form-new-until"
					:value="newUntilDays"
					@input="updateWindow('newUntilDays', $event.target.value, 0, 30)">
			</label>
			<span v-if="windowError" class="cn-people-widget-form__error" role="alert">
				{{ windowError }}
			</span>
		</template>

		<NcSelect
			:modelValue="sortBy"
			:options="sortByOptions"
			:inputLabel="t('nextcloud-vue', 'Sort by')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@update:modelValue="updateSortBy($event)" />
		<p v-if="sortByError" class="cn-people-widget-form__error" role="alert">
			{{ sortByError }}
		</p>

		<label class="cn-people-widget-form__field">
			{{ t('nextcloud-vue', 'Group filter (comma-separated, blank for all)') }}
			<input
				type="text"
				class="cn-people-widget-form__input"
				:value="groupFilterText"
				:placeholder="t('nextcloud-vue', 'e.g. management, product')"
				@input="updateGroupFilter($event.target.value)">
		</label>

		<label class="cn-people-widget-form__field cn-people-widget-form__field--inline">
			<input
				type="checkbox"
				:checked="excludeDisabled"
				@change="updateField('excludeDisabled', $event.target.checked)">
			{{ t('nextcloud-vue', 'Exclude disabled users') }}
		</label>

		<label class="cn-people-widget-form__field cn-people-widget-form__field--inline">
			<input
				type="checkbox"
				:checked="showBirthdays"
				@change="updateField('showBirthdays', $event.target.checked)">
			{{ t('nextcloud-vue', 'Show birthdays') }}
		</label>

		<label v-if="showBirthdays" class="cn-people-widget-form__field">
			{{ t('nextcloud-vue', 'Birthday window (days, 0–30)') }}
			<input
				type="number"
				class="cn-people-widget-form__input"
				min="0"
				max="30"
				:value="birthdayWindowDays"
				@input="updateBirthdayWindow($event.target.value)">
			<span v-if="birthdayWindowError" class="cn-people-widget-form__error" role="alert">
				{{ birthdayWindowError }}
			</span>
		</label>

		<label v-if="layout !== 'list'" class="cn-people-widget-form__field">
			{{ t('nextcloud-vue', 'Columns') }}
			<select
				:value="columns"
				class="cn-people-widget-form__input"
				@change="updateField('columns', Number($event.target.value))">
				<option :value="2">
					2
				</option>
				<option :value="3">
					3
				</option>
				<option :value="4">
					4
				</option>
			</select>
		</label>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect } from '@nextcloud/vue'

const SORT_KEYS = ['displayName', 'group']

const DEFAULT_CONTENT = Object.freeze({
	layout: 'grid',
	selectionMode: 'filter',
	selectedUsers: [],
	filters: [],
	filterOperator: 'AND',
	excludeDisabled: true,
	showBirthdays: true,
	birthdayWindowDays: 7,
	newSinceDays: 30,
	newUntilDays: 14,
	sortBy: 'displayName',
	columns: 3,
	showFields: {
		displayName: true,
		role: true,
		organisation: true,
		email: true,
		phone: true,
		avatar: true,
		birthdate: true,
	},
})

/**
 * CnPeopleWidgetForm — the `CnAddWidgetModal` sub-form for creating or editing
 * a `people` widget placement. Exposes layout, sort, group filter, exclude
 * disabled, show birthdays + window, and columns; less common keys
 * (selectionMode, selectedUsers, filterOperator, showFields) travel through
 * untouched from their defaults. Group filter persists as the canonical
 * `[{fieldName:'group', operator:'in', values:[...]}]` shape. Emits
 * `update:content` on change and exposes `validate()`: a birthday window
 * typed outside 0..30 keeps the form invalid until it is corrected, and a
 * stored unknown `sortBy` is shown as Display name with a message, keeping
 * the form invalid until a sort key is picked.
 */
export default {
	name: 'CnPeopleWidgetForm',

	components: {
		NcSelect,
	},

	inject: {
		/** The people source; `hasStartDateField()` decides whether New colleagues is offered. */
		cnPeopleSource: { default: null },
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
		const storedSortBy = initial.sortBy ?? DEFAULT_CONTENT.sortBy
		const sortByKnown = SORT_KEYS.includes(storedSortBy)
		const groupFilter = (initial.filters || [])
			.find((f) => f && f.fieldName === 'group')
		return {
			layout: initial.layout ?? DEFAULT_CONTENT.layout,
			selectionMode: initial.selectionMode ?? DEFAULT_CONTENT.selectionMode,
			selectedUsers: Array.isArray(initial.selectedUsers)
				? [...initial.selectedUsers]
				: [...DEFAULT_CONTENT.selectedUsers],

			filterOperator: initial.filterOperator ?? DEFAULT_CONTENT.filterOperator,
			excludeDisabled: typeof initial.excludeDisabled === 'boolean'
				? initial.excludeDisabled
				: DEFAULT_CONTENT.excludeDisabled,

			showBirthdays: typeof initial.showBirthdays === 'boolean'
				? initial.showBirthdays
				: DEFAULT_CONTENT.showBirthdays,

			birthdayWindowDays: typeof initial.birthdayWindowDays === 'number'
				? initial.birthdayWindowDays
				: DEFAULT_CONTENT.birthdayWindowDays,

			sortBy: sortByKnown ? storedSortBy : DEFAULT_CONTENT.sortBy,
			sortByError: sortByKnown
				? ''
				: t('nextcloud-vue', 'Unknown sort key "{key}". Display name is used instead.', { key: String(storedSortBy) }),

			columns: typeof initial.columns === 'number'
				? initial.columns
				: DEFAULT_CONTENT.columns,

			showFields: { ...DEFAULT_CONTENT.showFields, ...(initial.showFields || {}) },
			groupFilterValues: groupFilter && Array.isArray(groupFilter.values)
				? [...groupFilter.values]
				: [],

			birthdayWindowError: '',
			newSinceDays: typeof initial.newSinceDays === 'number' ? initial.newSinceDays : DEFAULT_CONTENT.newSinceDays,
			newUntilDays: typeof initial.newUntilDays === 'number' ? initial.newUntilDays : DEFAULT_CONTENT.newUntilDays,
			windowError: '',
			// Whether the source has a start date field; null until it answered.
			startDateField: null,
		}
	},

	computed: {
		/** Layout select options. */
		layoutOptions() {
			return [
				{ value: 'card', label: t('nextcloud-vue', 'Card') },
				{ value: 'grid', label: t('nextcloud-vue', 'Grid') },
				{ value: 'list', label: t('nextcloud-vue', 'List') },
			]
		},

		/**
		 * The selections: by filter, and New colleagues when the source has a
		 * start date field (or the placement already uses it).
		 *
		 * @spec openspec/changes/people-new-colleagues/specs/people-widget/spec.md#requirement-the-people-widget-lists-new-colleagues
		 * @return {Array<{value: string, label: string}>}
		 */
		selectionOptions() {
			const options = [{ value: 'filter', label: t('nextcloud-vue', 'People by filter') }]
			if (this.startDateField === true || this.selectionMode === 'new') {
				options.push({ value: 'new', label: t('nextcloud-vue', 'New colleagues') })
			}
			return options
		},

		/** Sort select options. */
		sortByOptions() {
			return [
				{ value: 'displayName', label: t('nextcloud-vue', 'Display name') },
				{ value: 'group', label: t('nextcloud-vue', 'Group') },
			]
		},

		/** Comma-joined group filter values for the text input. */
		groupFilterText() {
			return this.groupFilterValues.join(', ')
		},

		/** The canonical filters array assembled from the group input. */
		assembledFilters() {
			if (this.groupFilterValues.length === 0) {
				return []
			}
			return [{
				fieldName: 'group',
				operator: 'in',
				values: this.groupFilterValues,
			}]
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				layout: this.layout,
				selectionMode: this.selectionMode,
				selectedUsers: this.selectedUsers,
				filters: this.assembledFilters,
				filterOperator: this.filterOperator,
				excludeDisabled: this.excludeDisabled,
				showBirthdays: this.showBirthdays,
				birthdayWindowDays: this.birthdayWindowDays,
				newSinceDays: this.newSinceDays,
				newUntilDays: this.newUntilDays,
				sortBy: this.sortBy,
				columns: this.columns,
				showFields: this.showFields,
			}
		},
	},

	async mounted() {
		await this.loadStartDateField()
	},

	methods: {
		t,
		/**
		 * Ask the source whether a start date field exists; no answer offers none.
		 *
		 * @spec openspec/changes/people-new-colleagues/specs/people-widget/spec.md#requirement-the-people-widget-lists-new-colleagues
		 * @return {Promise<void>}
		 */
		async loadStartDateField() {
			const source = this.cnPeopleSource
			if (!source || typeof source.hasStartDateField !== 'function') {
				this.startDateField = false
				return
			}
			try {
				this.startDateField = (await source.hasStartDateField()) === true
			} catch {
				this.startDateField = false
			}
		},

		/**
		 * Set a new colleagues window in days; outside [min, max] keeps the last
		 * valid value and shows a message, which keeps `validate()` failing.
		 *
		 * @spec openspec/changes/people-new-colleagues/specs/people-widget/spec.md#requirement-the-people-widget-lists-new-colleagues
		 * @param {string} field `newSinceDays` or `newUntilDays`.
		 * @param {string|number} raw The input value.
		 * @param {number} min The lowest allowed.
		 * @param {number} max The highest allowed.
		 * @return {void}
		 */
		updateWindow(field, raw, min, max) {
			const numeric = Number(raw)
			if (raw === '' || !Number.isInteger(numeric) || numeric < min || numeric > max) {
				this.windowError = t('nextcloud-vue', 'Must be between {min} and {max}', { min, max })
				return
			}
			this.windowError = ''
			this.updateField(field, numeric)
		},

		/**
		 * Set a field and notify the parent.
		 *
		 * @param {string} field one of the form's reactive keys.
		 * @param {unknown} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Set the sort key; picking one confirms it and clears the
		 * unknown-key message.
		 *
		 * @param {string} value the chosen sort key.
		 * @return {void}
		 */
		updateSortBy(value) {
			this.sortByError = ''
			this.updateField('sortBy', value)
		},

		/**
		 * Parse the comma-separated group input into the canonical filters
		 * shape and re-emit the assembled content.
		 *
		 * @param {string} raw the textbox value.
		 * @return {void}
		 */
		updateGroupFilter(raw) {
			this.groupFilterValues = (raw || '')
				.split(',')
				.map((part) => part.trim())
				.filter((part) => part.length > 0)
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the birthday window against the 0..30 range. An out-of-range
		 * value records a localised inline error, which keeps `validate()`
		 * failing until a valid value is typed; the last valid value stays in
		 * the content.
		 *
		 * @param {string|number} raw the input value.
		 * @return {void}
		 */
		updateBirthdayWindow(raw) {
			const numeric = Number(raw)
			if (raw === '' || !Number.isFinite(numeric) || numeric < 0 || numeric > 30) {
				this.birthdayWindowError = t('nextcloud-vue', 'Must be between 0 and 30')
			} else {
				this.birthdayWindowError = ''
				this.birthdayWindowDays = Math.floor(numeric)
			}
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []
			if (this.sortByError) {
				errors.push(this.sortByError)
			}
			if (this.showBirthdays && this.birthdayWindowError) {
				errors.push(this.birthdayWindowError)
			}
			if (typeof this.birthdayWindowDays !== 'number'
				|| this.birthdayWindowDays < 0
				|| this.birthdayWindowDays > 30) {
				errors.push(t('nextcloud-vue', 'Birthday window must be between 0 and 30'))
			}
			if (!['card', 'grid', 'list'].includes(this.layout)) {
				errors.push(t('nextcloud-vue', 'Invalid layout'))
			}
			if (!SORT_KEYS.includes(this.sortBy)) {
				errors.push(t('nextcloud-vue', 'Invalid sort key'))
			}
			if (this.windowError) {
				errors.push(this.windowError)
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-people-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-people-widget-form__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 14px;
}

.cn-people-widget-form__field--inline {
	flex-direction: row;
	align-items: center;
	gap: 8px;
}

.cn-people-widget-form__input {
	padding: 6px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font: inherit;
}

.cn-people-widget-form__error {
	color: var(--color-error, #c00);
	font-size: 12px;
}
</style>
