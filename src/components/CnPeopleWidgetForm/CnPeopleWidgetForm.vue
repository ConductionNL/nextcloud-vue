<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-people-widget-form">
		<NcSelect
			:model-value="layout"
			:options="layoutOptions"
			:input-label="t('nextcloud-vue', 'Layout')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('layout', $event)" />

		<NcSelect
			:model-value="sortBy"
			:options="sortByOptions"
			:input-label="t('nextcloud-vue', 'Sort by')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('sortBy', $event)" />

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
			<span v-if="birthdayWindowError" class="cn-people-widget-form__error">
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
import { NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const DEFAULT_CONTENT = Object.freeze({
	layout: 'grid',
	selectionMode: 'filter',
	selectedUsers: [],
	filters: [],
	filterOperator: 'AND',
	excludeDisabled: true,
	showBirthdays: true,
	birthdayWindowDays: 7,
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
 * `update:content` on change and exposes `validate()` (birthday window 0..30).
 */
export default {
	name: 'CnPeopleWidgetForm',

	components: {
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
			sortBy: initial.sortBy ?? DEFAULT_CONTENT.sortBy,
			columns: typeof initial.columns === 'number'
				? initial.columns
				: DEFAULT_CONTENT.columns,
			showFields: { ...DEFAULT_CONTENT.showFields, ...(initial.showFields || {}) },
			groupFilterValues: groupFilter && Array.isArray(groupFilter.values)
				? [...groupFilter.values]
				: [],
			birthdayWindowError: '',
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
				sortBy: this.sortBy,
				columns: this.columns,
				showFields: this.showFields,
			}
		},
	},

	methods: {
		t,

		/**
		 * Set a field and notify the parent.
		 *
		 * @param {string} field one of the form's reactive keys.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
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
		 * Validate + clamp the birthday window to the 0..30 range, recording a
		 * localised inline error when out of range.
		 *
		 * @param {string|number} raw the input value.
		 * @return {void}
		 */
		updateBirthdayWindow(raw) {
			const numeric = Number(raw)
			if (!Number.isFinite(numeric) || numeric < 0 || numeric > 30) {
				this.birthdayWindowError = t('nextcloud-vue', 'Must be between 0 and 30')
				return
			}
			this.birthdayWindowError = ''
			this.birthdayWindowDays = Math.floor(numeric)
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []
			if (typeof this.birthdayWindowDays !== 'number'
				|| this.birthdayWindowDays < 0
				|| this.birthdayWindowDays > 30) {
				errors.push(t('nextcloud-vue', 'Birthday window must be between 0 and 30'))
			}
			if (!['card', 'grid', 'list'].includes(this.layout)) {
				errors.push(t('nextcloud-vue', 'Invalid layout'))
			}
			if (!['displayName', 'group'].includes(this.sortBy)) {
				errors.push(t('nextcloud-vue', 'Invalid sort key'))
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
