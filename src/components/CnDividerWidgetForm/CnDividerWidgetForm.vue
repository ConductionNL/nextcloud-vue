<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-divider-widget-form">
		<p class="cn-divider-widget-form__hint">
			{{ t('nextcloud-vue', 'Pick a divider style to break dashboard sections into logical groups.') }}
		</p>

		<NcSelect
			:model-value="style"
			:options="styleOptions"
			:input-label="t('nextcloud-vue', 'Style')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('style', $event)" />

		<template v-if="style === 'line'">
			<label class="cn-divider-widget-form__color-label">
				{{ t('nextcloud-vue', 'Line color') }}
				<input
					type="color"
					:value="lineColor || '#cccccc'"
					class="cn-divider-widget-form__color"
					@input="updateField('lineColor', $event.target.value)">
			</label>

			<NcTextField
				type="number"
				:model-value="String(lineThickness)"
				:label="t('nextcloud-vue', 'Thickness (pixels)')"
				placeholder="1"
				:min="1"
				:max="8"
				@update:model-value="updateThickness($event)" />

			<NcSelect
				:model-value="lineStyle"
				:options="lineStyleOptions"
				:input-label="t('nextcloud-vue', 'Line style')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@input="updateField('lineStyle', $event)" />
		</template>

		<template v-if="style === 'whitespace'">
			<NcSelect
				:model-value="whitespaceSize"
				:options="whitespaceSizeOptions"
				:input-label="t('nextcloud-vue', 'Spacing size')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@input="updateField('whitespaceSize', $event)" />
		</template>

		<template v-if="style === 'heading-break'">
			<NcTextField
				:model-value="headingText"
				:label="t('nextcloud-vue', 'Heading text')"
				:placeholder="t('nextcloud-vue', 'Section heading')"
				required
				@update:model-value="updateField('headingText', $event)" />

			<label class="cn-divider-widget-form__color-label">
				{{ t('nextcloud-vue', 'Line color') }}
				<input
					type="color"
					:value="lineColor || '#cccccc'"
					class="cn-divider-widget-form__color"
					@input="updateField('lineColor', $event.target.value)">
			</label>

			<NcSelect
				:model-value="lineStyle"
				:options="lineStyleOptions"
				:input-label="t('nextcloud-vue', 'Line style')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@input="updateField('lineStyle', $event)" />
		</template>
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const STYLES = Object.freeze({
	LINE: 'line',
	WHITESPACE: 'whitespace',
	HEADING_BREAK: 'heading-break',
})

const DEFAULT_CONTENT = Object.freeze({
	style: STYLES.LINE,
	lineColor: '',
	lineThickness: 1,
	lineStyle: 'solid',
	whitespaceSize: 'medium',
	headingText: '',
})

/**
 * CnDividerWidgetForm — minimal `CnAddWidgetModal` sub-form for creating or
 * editing a `divider` placement.
 *
 * Visible fields depend on the selected style: line → colour, thickness
 * (1..8), line style; whitespace → size preset; heading-break → heading text
 * (required), colour, line style. `validate()` returns one error when
 * `style === 'heading-break'` and `headingText` is empty / whitespace.
 */
export default {
	name: 'CnDividerWidgetForm',

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
			style: initial.style ?? DEFAULT_CONTENT.style,
			lineColor: initial.lineColor ?? DEFAULT_CONTENT.lineColor,
			lineThickness: typeof initial.lineThickness === 'number'
				? initial.lineThickness
				: DEFAULT_CONTENT.lineThickness,
			lineStyle: initial.lineStyle ?? DEFAULT_CONTENT.lineStyle,
			whitespaceSize: initial.whitespaceSize ?? DEFAULT_CONTENT.whitespaceSize,
			headingText: initial.headingText ?? DEFAULT_CONTENT.headingText,
		}
	},

	computed: {
		/** Divider-style select options. */
		styleOptions() {
			return [
				{ value: STYLES.LINE, label: t('nextcloud-vue', 'Horizontal line') },
				{ value: STYLES.WHITESPACE, label: t('nextcloud-vue', 'Whitespace') },
				{ value: STYLES.HEADING_BREAK, label: t('nextcloud-vue', 'Heading with lines') },
			]
		},

		/** Line-style select options. */
		lineStyleOptions() {
			return [
				{ value: 'solid', label: t('nextcloud-vue', 'Solid') },
				{ value: 'dashed', label: t('nextcloud-vue', 'Dashed') },
				{ value: 'dotted', label: t('nextcloud-vue', 'Dotted') },
			]
		},

		/** Whitespace-size select options. */
		whitespaceSizeOptions() {
			return [
				{ value: 'small', label: t('nextcloud-vue', 'Small (16px)') },
				{ value: 'medium', label: t('nextcloud-vue', 'Medium (32px)') },
				{ value: 'large', label: t('nextcloud-vue', 'Large (64px)') },
				{ value: 'xlarge', label: t('nextcloud-vue', 'Extra Large (128px)') },
			]
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				style: this.style,
				lineColor: this.lineColor,
				lineThickness: this.lineThickness,
				lineStyle: this.lineStyle,
				whitespaceSize: this.whitespaceSize,
				headingText: this.headingText,
			}
		},
	},

	methods: {
		t,

		/**
		 * Set a field and notify the parent via `update:content`.
		 *
		 * @param {string} field one of: style, lineColor, lineThickness, lineStyle, whitespaceSize, headingText.
		 * @param {string|number} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Coerce the thickness number input string into a clamped integer
		 * (1..8) before pushing it through `updateField`.
		 *
		 * @param {string} raw the raw value from the number input.
		 * @return {void}
		 */
		updateThickness(raw) {
			const parsed = Number(raw)
			const clamped = Number.isFinite(parsed)
				? Math.min(8, Math.max(1, Math.floor(parsed)))
				: 1
			this.updateField('lineThickness', clamped)
		},

		/**
		 * Validate the form; an empty array means valid. Heading-break
		 * requires non-empty `headingText`.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			if (this.style === STYLES.HEADING_BREAK) {
				if (typeof this.headingText !== 'string' || this.headingText.trim() === '') {
					return [t('nextcloud-vue', 'Heading text is required')]
				}
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-divider-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-divider-widget-form__hint {
	margin: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-divider-widget-form__color-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 14px;
}

.cn-divider-widget-form__color {
	width: 48px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}
</style>
