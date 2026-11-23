<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-app-tiles-widget-form">
		<NcTextField
			:modelValue="title"
			:label="t('nextcloud-vue', 'Title')"
			@update:modelValue="updateField('title', $event)" />
		<NcTextField
			:modelValue="pinned"
			:label="t('nextcloud-vue', 'Pinned apps (app ids, comma separated)')"
			placeholder="files, calendar"
			@update:modelValue="updateField('pinned', $event)" />
		<NcCheckboxRadioSwitch
			:modelValue="showFilter"
			type="switch"
			@update:modelValue="updateField('showFilter', $event)">
			{{ t('nextcloud-vue', 'Show the filter field') }}
		</NcCheckboxRadioSwitch>
		<NcCheckboxRadioSwitch
			:modelValue="showMostUsed"
			type="switch"
			@update:modelValue="updateField('showMostUsed', $event)">
			{{ t('nextcloud-vue', 'Show the most used apps') }}
		</NcCheckboxRadioSwitch>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch, NcTextField } from '@nextcloud/vue'

/**
 * CnAppTilesWidgetForm: the `CnAddWidgetModal` sub-form for an `app-tiles`
 * placement: its title, the apps pinned first, and whether the filter field
 * and the "Most used" row show. Without a list of apps the widget shows the
 * apps of Nextcloud's navigation, so nothing here is required.
 *
 * @spec openspec/changes/lpvandaag-start-page/specs/lpvandaag-start-page/spec.md#requirement-the-apps-a-person-can-open-are-tiles
 */
export default {
	name: 'CnAppTilesWidgetForm',

	components: { NcCheckboxRadioSwitch, NcTextField },

	props: {
		/**
		 * The placement being edited, or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},

		/**
		 * Initial content values when not editing.
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			title: initial.title ?? 'Apps',
			pinned: Array.isArray(initial.pinned) ? initial.pinned.join(', ') : '',
			showFilter: initial.showFilter !== false,
			showMostUsed: initial.showMostUsed !== false,
			rest: initial,
		}
	},

	computed: {
		/**
		 * The content blob from the fields, keeping the keys this form does
		 * not edit (`apps`, `exclude`, `status`, `mostUsedLimit`).
		 *
		 * @return {object}
		 */
		assembledContent() {
			return {
				...this.rest,
				title: this.title,
				pinned: this.pinned.split(',').map((id) => id.trim()).filter((id) => id !== ''),
				showFilter: this.showFilter,
				showMostUsed: this.showMostUsed,
			}
		},
	},

	methods: {
		t,

		/**
		 * Set a field and notify the parent via `update:content`.
		 *
		 * @param {string} field One of: title, pinned, showFilter, showMostUsed.
		 * @param {string|boolean} value The new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; every field is optional.
		 *
		 * @return {string[]} The validation errors (always empty).
		 */
		validate() {
			return []
		},
	},
}
</script>

<style scoped>
.cn-app-tiles-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
</style>
