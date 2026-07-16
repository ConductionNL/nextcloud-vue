<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-label-widget-form">
		<NcTextField
			:value="text"
			:label="t('nextcloud-vue', 'Label text')"
			:placeholder="t('nextcloud-vue', 'Label text')"
			required
			@update:value="updateField('text', $event)" />

		<NcTextField
			:value="fontSize"
			:label="t('nextcloud-vue', 'Font size')"
			placeholder="16px"
			@update:value="updateField('fontSize', $event)" />

		<label class="cn-label-widget-form__color-label">
			{{ t('nextcloud-vue', 'Color') }}
			<input
				type="color"
				:value="color || '#000000'"
				class="cn-label-widget-form__color"
				@input="updateField('color', $event.target.value)">
		</label>

		<label class="cn-label-widget-form__color-label">
			{{ t('nextcloud-vue', 'Background color') }}
			<input
				type="color"
				:value="backgroundColor || '#ffffff'"
				class="cn-label-widget-form__color"
				@input="updateField('backgroundColor', $event.target.value)">
		</label>

		<NcSelect
			:value="fontWeight"
			:options="fontWeightOptions"
			:input-label="t('nextcloud-vue', 'Font weight')"
			:clearable="false"
			@input="updateField('fontWeight', $event)" />

		<NcSelect
			:value="textAlign"
			:options="textAlignOptions"
			:input-label="t('nextcloud-vue', 'Alignment')"
			:clearable="false"
			@input="updateField('textAlign', $event)" />
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const DEFAULT_CONTENT = Object.freeze({
	text: '',
	fontSize: '16px',
	color: '',
	backgroundColor: '',
	fontWeight: 'bold',
	textAlign: 'center',
})

/**
 * CnLabelWidgetForm — the `CnAddWidgetModal` sub-form for creating or editing
 * a `label` widget placement.
 *
 * Exposes six controls and a `validate()` method returning
 * `[t('nextcloud-vue', 'Label text is required')]` when text is
 * empty / whitespace. Emits `update:content` with the assembled content blob
 * on every change and exposes `assembledContent` for the modal to read on
 * submit.
 */
export default {
	name: 'CnLabelWidgetForm',

	components: {
		NcTextField,
		NcSelect,
	},

	props: {
		/**
		 * The placement being edited, or `null` in create mode. Pre-fills
		 * every control from `editingWidget.content`.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},
		/**
		 * Initial content values — used when not editing and the parent
		 * supplies registry defaults.
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
			text: initial.text ?? DEFAULT_CONTENT.text,
			fontSize: initial.fontSize ?? DEFAULT_CONTENT.fontSize,
			color: initial.color ?? DEFAULT_CONTENT.color,
			backgroundColor: initial.backgroundColor ?? DEFAULT_CONTENT.backgroundColor,
			fontWeight: initial.fontWeight ?? DEFAULT_CONTENT.fontWeight,
			textAlign: initial.textAlign ?? DEFAULT_CONTENT.textAlign,
		}
	},

	computed: {
		/** Font-weight select options. */
		fontWeightOptions() {
			return ['normal', 'bold', '600', '700', '800']
		},

		/** Text-alignment select options. */
		textAlignOptions() {
			return ['left', 'center', 'right']
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				text: this.text,
				fontSize: this.fontSize,
				color: this.color,
				backgroundColor: this.backgroundColor,
				fontWeight: this.fontWeight,
				textAlign: this.textAlign,
			}
		},
	},

	methods: {
		t,

		/**
		 * Set a field and notify the parent via `update:content`.
		 *
		 * @param {string} field one of: text, fontSize, color, backgroundColor, fontWeight, textAlign.
		 * @param {string} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			if (typeof this.text !== 'string' || this.text.trim() === '') {
				return [t('nextcloud-vue', 'Label text is required')]
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-label-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-label-widget-form__color-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 14px;
}

.cn-label-widget-form__color {
	width: 48px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}
</style>
