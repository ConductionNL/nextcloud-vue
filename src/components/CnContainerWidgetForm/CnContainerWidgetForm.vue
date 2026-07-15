<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-container-form">
		<p class="cn-container-form__hint">
			{{ t('nextcloud-vue', 'A container holds a sub-grid of child widgets. Add child widgets via the container’s own grid once it is on the dashboard.') }}
		</p>

		<label class="cn-container-form__color-label">
			{{ t('nextcloud-vue', 'Background') }}
			<CnColorPicker
				:value="backgroundColor"
				clearable
				@input="updateField('backgroundColor', $event.hex)"
				@clear="updateField('backgroundColor', '')" />
		</label>

		<NcSelect
			:value="padding"
			:options="paddingOptions"
			:input-label="t('nextcloud-vue', 'Padding')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('padding', $event)" />

		<NcTextField
			:value="title"
			:label="t('nextcloud-vue', 'Title (optional)')"
			:placeholder="t('nextcloud-vue', 'Title (optional)')"
			@update:value="updateField('title', $event)" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcTextField, NcSelect } from '@nextcloud/vue'
import CnColorPicker from '../CnColorPicker/CnColorPicker.vue'

const PADDING_VALUES = Object.freeze(['none', 'small', 'medium', 'large'])

const DEFAULT_CONTENT = Object.freeze({
	placements: [],
	backgroundColor: 'transparent',
	padding: 'medium',
	title: '',
})

/**
 * CnContainerWidgetForm — sub-form for creating or editing a `container`
 * placement. Three optional controls: background colour, padding preset, and
 * an optional title. Children are managed via the container's own inner grid,
 * not this form, so `validate()` always returns an empty array.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnContainerWidgetForm',

	components: {
		NcTextField,
		NcSelect,
		CnColorPicker,
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
		return {
			placements: Array.isArray(initial.placements) ? initial.placements : [],
			backgroundColor: typeof initial.backgroundColor === 'string'
				? initial.backgroundColor
				: DEFAULT_CONTENT.backgroundColor,
			padding: PADDING_VALUES.includes(initial.padding)
				? initial.padding
				: DEFAULT_CONTENT.padding,
			title: typeof initial.title === 'string'
				? initial.title
				: DEFAULT_CONTENT.title,
		}
	},

	computed: {
		/**
		 * The padding dropdown options.
		 *
		 * @return {Array<{value: string, label: string}>} the options.
		 */
		paddingOptions() {
			return [
				{ value: 'none', label: t('nextcloud-vue', 'None') },
				{ value: 'small', label: t('nextcloud-vue', 'Small') },
				{ value: 'medium', label: t('nextcloud-vue', 'Medium') },
				{ value: 'large', label: t('nextcloud-vue', 'Large') },
			]
		},

		/**
		 * The assembled `content` payload emitted to the parent.
		 *
		 * @return {object} the content blob.
		 */
		assembledContent() {
			return {
				placements: this.placements,
				backgroundColor: this.backgroundColor,
				padding: this.padding,
				title: this.title,
			}
		},
	},

	methods: {
		/**
		 * Set a field and emit `update:content`.
		 *
		 * @param {string} field one of backgroundColor/padding/title.
		 * @param {string} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form. Every field is optional, so this is always empty.
		 *
		 * @return {string[]} the (always empty) validation errors.
		 */
		validate() {
			return []
		},
	},
}
</script>

<style scoped>
.cn-container-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-container-form__hint {
	margin: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-container-form__color-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 14px;
}

.cn-container-form__color {
	width: 48px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}
</style>
