<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-notepad-widget-form">
		<NcTextField
			:modelValue="title"
			:label="t('nextcloud-vue', 'Title')"
			@update:modelValue="updateField('title', $event)" />
		<NcTextField
			:modelValue="height"
			:label="t('nextcloud-vue', 'Height')"
			placeholder="160px"
			@update:modelValue="updateField('height', $event)" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcTextField } from '@nextcloud/vue'

const DEFAULT_CONTENT = Object.freeze({ title: '', height: '' })

/**
 * CnNotepadWidgetForm — the `CnAddWidgetModal` sub-form for a `notepad`
 * placement: a title and a height. The note itself is never part of the
 * placement; it lives in the reader's preferences.
 */
export default {
	name: 'CnNotepadWidgetForm',

	components: { NcTextField },

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
			default: () => ({ ...DEFAULT_CONTENT }),
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
			title: initial.title ?? DEFAULT_CONTENT.title,
			height: initial.height ?? DEFAULT_CONTENT.height,
		}
	},

	computed: {
		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return { title: this.title, height: this.height }
		},
	},

	methods: {
		t,

		/**
		 * Set a field and notify the parent via `update:content`.
		 *
		 * @param {string} field One of: title, height.
		 * @param {string} value The new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; a notepad needs no configuration, so it is always valid.
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
.cn-notepad-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
</style>
