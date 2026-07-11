<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-object-geo-form">
		<h4 class="cn-object-geo-form__section">
			{{ t('nextcloud-vue', 'Location map widget') }}
		</h4>

		<NcTextField
			:value="title"
			:label="t('nextcloud-vue', 'Title')"
			placeholder="Location"
			@update:value="updateField('title', $event)" />

		<NcCheckboxRadioSwitch :checked="editable" @update:checked="updateField('editable', $event)">
			{{ t('nextcloud-vue', 'Allow editing the location on the map') }}
		</NcCheckboxRadioSwitch>
		<p class="cn-object-geo-form__hint">
			{{ t('nextcloud-vue', 'When enabled, users can click the map to set this object’s location. Turn off for a read-only map.') }}
		</p>
	</div>
</template>

<script>
import { NcTextField, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const DEFAULT_CONTENT = Object.freeze({ title: '', editable: true })

/**
 * CnObjectGeoWidgetForm — the config sub-form for an `object-geo` widget
 * (`CnObjectGeoWidget`). Edits the widget title and whether the map is
 * editable. Emits `update:content` with `{ title, editable }`. Used by
 * `CnAddWidgetModal` and the per-widget cog editor.
 */
export default {
	name: 'CnObjectGeoWidgetForm',

	components: { NcTextField, NcCheckboxRadioSwitch },

	props: {
		/** The placement being edited (pre-fills from `editingWidget.content`), or null. @type {{content: object}|null} */
		editingWidget: { type: Object, default: null },
		/** Initial content values when not editing (registry defaults). @type {object} */
		value: { type: Object, default: () => ({ ...DEFAULT_CONTENT }) },
	},

	emits: [
		/* eslint-disable jsdoc/valid-types -- the colon in the event name is valid Vue but not a jsdoc namepath */
		/**
		 * Emitted with the assembled content blob on every field change.
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
		/* eslint-enable jsdoc/valid-types */
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			title: initial.title ?? '',
			editable: initial.editable !== false,
		}
	},

	computed: {
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return { title: this.title, editable: this.editable }
		},
	},

	methods: {
		t,
		/**
		 * Set a field and emit the assembled content.
		 *
		 * @param {string} field The field name (`title` | `editable`).
		 * @param {*} value The new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},
		/**
		 * Validate the form; an empty array means valid. The geo widget inherits
		 * its object from the page, so no field is required.
		 *
		 * @return {string[]} The validation errors.
		 */
		validate() {
			return []
		},
	},
}
</script>

<style scoped>
.cn-object-geo-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-object-geo-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-object-geo-form__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	margin: 0;
}
</style>
