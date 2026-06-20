<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-header-widget-form">
		<NcTextField
			:value="title"
			:label="t('nextcloud-vue', 'Title')"
			:placeholder="t('nextcloud-vue', 'Header title')"
			required
			@update:value="updateField('title', $event)" />

		<NcTextField
			:value="subtitle"
			:label="t('nextcloud-vue', 'Subtitle (optional)')"
			:placeholder="t('nextcloud-vue', 'Optional subtitle')"
			@update:value="updateField('subtitle', $event)" />

		<NcTextField
			:value="backgroundImageUrl"
			:label="t('nextcloud-vue', 'Background image URL')"
			placeholder="https://example.com/banner.jpg"
			@update:value="updateField('backgroundImageUrl', $event)" />

		<label class="cn-header-widget-form__color-label">
			{{ t('nextcloud-vue', 'Background color') }}
			<input
				type="color"
				:value="backgroundColor || '#0070c0'"
				class="cn-header-widget-form__color"
				@input="updateField('backgroundColor', $event.target.value)">
		</label>

		<NcSelect
			:value="overlayMode"
			:options="overlayModeOptions"
			:input-label="t('nextcloud-vue', 'Overlay mode')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('overlayMode', $event)" />

		<label v-if="overlayMode !== 'none'" class="cn-header-widget-form__color-label">
			{{ t('nextcloud-vue', 'Overlay color') }}
			<input
				type="color"
				:value="overlayColor || '#000000'"
				class="cn-header-widget-form__color"
				@input="updateField('overlayColor', $event.target.value)">
		</label>

		<label v-if="overlayMode === 'tint'" class="cn-header-widget-form__field">
			<span class="cn-header-widget-form__label">
				{{ t('nextcloud-vue', 'Overlay opacity') }} ({{ overlayOpacity.toFixed(2) }})
			</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				:value="overlayOpacity"
				class="cn-header-widget-form__range"
				@input="updateField('overlayOpacity', parseFloat($event.target.value))">
		</label>

		<label class="cn-header-widget-form__color-label">
			{{ t('nextcloud-vue', 'Text color') }}
			<input
				type="color"
				:value="textColor || '#ffffff'"
				class="cn-header-widget-form__color"
				@input="updateField('textColor', $event.target.value)">
		</label>

		<NcSelect
			:value="textAlign"
			:options="textAlignOptions"
			:input-label="t('nextcloud-vue', 'Text alignment')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('textAlign', $event)" />

		<NcSelect
			:value="verticalAlign"
			:options="verticalAlignOptions"
			:input-label="t('nextcloud-vue', 'Vertical alignment')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('verticalAlign', $event)" />

		<NcSelect
			:value="height"
			:options="heightOptions"
			:input-label="t('nextcloud-vue', 'Height')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('height', $event)" />

		<fieldset class="cn-header-widget-form__fieldset">
			<legend class="cn-header-widget-form__legend">
				{{ t('nextcloud-vue', 'Call-to-action button (optional)') }}
			</legend>

			<NcTextField
				:value="ctaLabel"
				:label="t('nextcloud-vue', 'Button text')"
				:placeholder="t('nextcloud-vue', 'Sign up')"
				@update:value="updateCta('label', $event)" />

			<NcTextField
				:value="ctaUrl"
				:label="t('nextcloud-vue', 'Target URL')"
				placeholder="https://..."
				@update:value="updateCta('url', $event)" />

			<NcSelect
				:value="ctaStyle"
				:options="ctaStyleOptions"
				:input-label="t('nextcloud-vue', 'Button style')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@input="updateCta('style', $event)" />
		</fieldset>
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const ALLOWED_OVERLAY_MODES = ['none', 'tint', 'gradient-bottom']
const ALLOWED_HEIGHTS = ['small', 'medium', 'large', 'xlarge']
const ALLOWED_TEXT_ALIGN = ['left', 'center', 'right']
const ALLOWED_VERTICAL_ALIGN = ['top', 'middle', 'bottom']
const ALLOWED_CTA_STYLES = ['primary', 'secondary', 'ghost']

const DEFAULT_CONTENT = Object.freeze({
	title: '',
	subtitle: '',
	backgroundImageUrl: '',
	backgroundImageFileId: null,
	backgroundColor: '',
	overlayMode: 'none',
	overlayColor: '',
	overlayOpacity: 0.4,
	textColor: '',
	textAlign: 'center',
	verticalAlign: 'middle',
	height: 'medium',
	cta: null,
})

/**
 * CnHeaderWidgetForm — the `CnAddWidgetModal` sub-form for creating or editing
 * a `header` widget placement (renderer: {@link CnHeaderWidget}).
 *
 * Controls cover every persisted field: title, subtitle, background image URL,
 * background colour, overlay mode/colour/opacity, text colour/alignment/
 * vertical alignment, height preset, and an optional call-to-action with
 * label, URL, and style. `validate()` requires `title`, requires any provided
 * `backgroundImageUrl` to be http(s), and flags a half-filled CTA (label XOR
 * url). Emits `update:content` with the assembled blob on change.
 */
export default {
	name: 'CnHeaderWidgetForm',

	components: {
		NcTextField,
		NcSelect,
	},

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
		const initial = (this.editingWidget && this.editingWidget.content) || this.value || {}
		const cta = (initial.cta && typeof initial.cta === 'object') ? initial.cta : null
		return {
			title: typeof initial.title === 'string' ? initial.title : DEFAULT_CONTENT.title,
			subtitle: typeof initial.subtitle === 'string' ? initial.subtitle : DEFAULT_CONTENT.subtitle,
			backgroundImageUrl: typeof initial.backgroundImageUrl === 'string'
				? initial.backgroundImageUrl
				: DEFAULT_CONTENT.backgroundImageUrl,
			backgroundImageFileId: (typeof initial.backgroundImageFileId === 'number')
				? initial.backgroundImageFileId
				: DEFAULT_CONTENT.backgroundImageFileId,
			backgroundColor: typeof initial.backgroundColor === 'string'
				? initial.backgroundColor
				: DEFAULT_CONTENT.backgroundColor,
			overlayMode: ALLOWED_OVERLAY_MODES.includes(initial.overlayMode)
				? initial.overlayMode
				: DEFAULT_CONTENT.overlayMode,
			overlayColor: typeof initial.overlayColor === 'string'
				? initial.overlayColor
				: DEFAULT_CONTENT.overlayColor,
			overlayOpacity: typeof initial.overlayOpacity === 'number'
				? initial.overlayOpacity
				: DEFAULT_CONTENT.overlayOpacity,
			textColor: typeof initial.textColor === 'string'
				? initial.textColor
				: DEFAULT_CONTENT.textColor,
			textAlign: ALLOWED_TEXT_ALIGN.includes(initial.textAlign)
				? initial.textAlign
				: DEFAULT_CONTENT.textAlign,
			verticalAlign: ALLOWED_VERTICAL_ALIGN.includes(initial.verticalAlign)
				? initial.verticalAlign
				: DEFAULT_CONTENT.verticalAlign,
			height: ALLOWED_HEIGHTS.includes(initial.height)
				? initial.height
				: DEFAULT_CONTENT.height,
			ctaLabel: cta && typeof cta.label === 'string' ? cta.label : '',
			ctaUrl: cta && typeof cta.url === 'string' ? cta.url : '',
			ctaStyle: (cta && ALLOWED_CTA_STYLES.includes(cta.style)) ? cta.style : 'primary',
		}
	},

	computed: {
		/** Overlay-mode select options. */
		overlayModeOptions() {
			return [
				{ value: 'none', label: t('nextcloud-vue', 'None') },
				{ value: 'tint', label: t('nextcloud-vue', 'Tinted overlay') },
				{ value: 'gradient-bottom', label: t('nextcloud-vue', 'Gradient bottom') },
			]
		},

		/** Text-alignment select options. */
		textAlignOptions() {
			return [
				{ value: 'left', label: t('nextcloud-vue', 'Left') },
				{ value: 'center', label: t('nextcloud-vue', 'Center') },
				{ value: 'right', label: t('nextcloud-vue', 'Right') },
			]
		},

		/** Vertical-alignment select options. */
		verticalAlignOptions() {
			return [
				{ value: 'top', label: t('nextcloud-vue', 'Top') },
				{ value: 'middle', label: t('nextcloud-vue', 'Middle') },
				{ value: 'bottom', label: t('nextcloud-vue', 'Bottom') },
			]
		},

		/** Height-preset select options. */
		heightOptions() {
			return [
				{ value: 'small', label: t('nextcloud-vue', 'Small (120px)') },
				{ value: 'medium', label: t('nextcloud-vue', 'Medium (200px)') },
				{ value: 'large', label: t('nextcloud-vue', 'Large (320px)') },
				{ value: 'xlarge', label: t('nextcloud-vue', 'Extra large (480px)') },
			]
		},

		/** CTA-style select options. */
		ctaStyleOptions() {
			return [
				{ value: 'primary', label: t('nextcloud-vue', 'Primary') },
				{ value: 'secondary', label: t('nextcloud-vue', 'Secondary') },
				{ value: 'ghost', label: t('nextcloud-vue', 'Ghost') },
			]
		},

		/** The assembled CTA object, or null when both fields are empty. */
		ctaPayload() {
			const label = typeof this.ctaLabel === 'string' ? this.ctaLabel.trim() : ''
			const url = typeof this.ctaUrl === 'string' ? this.ctaUrl.trim() : ''
			if (label === '' && url === '') {
				return null
			}
			return {
				label,
				url,
				style: this.ctaStyle,
			}
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				title: this.title,
				subtitle: this.subtitle,
				backgroundImageUrl: this.backgroundImageUrl,
				backgroundImageFileId: this.backgroundImageFileId,
				backgroundColor: this.backgroundColor,
				overlayMode: this.overlayMode,
				overlayColor: this.overlayColor,
				overlayOpacity: this.overlayOpacity,
				textColor: this.textColor,
				textAlign: this.textAlign,
				verticalAlign: this.verticalAlign,
				height: this.height,
				cta: this.ctaPayload,
			}
		},
	},

	methods: {
		t,

		/**
		 * Set a top-level field and re-emit the assembled payload.
		 *
		 * @param {string} field one of the top-level content keys.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Set a CTA sub-field (label, url, style) and re-emit.
		 *
		 * @param {string} field one of: label, url, style.
		 * @param {string} value the new value.
		 * @return {void}
		 */
		updateCta(field, value) {
			if (field === 'label') {
				this.ctaLabel = value
			} else if (field === 'url') {
				this.ctaUrl = value
			} else if (field === 'style') {
				this.ctaStyle = value
			}
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid. Requires a title,
		 * an http(s) background image URL when provided, and a complete CTA
		 * when either CTA field is filled.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []
			if (typeof this.title !== 'string' || this.title.trim() === '') {
				errors.push(t('nextcloud-vue', 'Title is required'))
			}
			if (typeof this.backgroundImageUrl === 'string'
				&& this.backgroundImageUrl.trim() !== ''
				&& /^https?:\/\//i.test(this.backgroundImageUrl.trim()) === false) {
				errors.push(t('nextcloud-vue', 'Background image URL must be HTTP or HTTPS'))
			}
			const labelEmpty = typeof this.ctaLabel !== 'string' || this.ctaLabel.trim() === ''
			const urlEmpty = typeof this.ctaUrl !== 'string' || this.ctaUrl.trim() === ''
			if (labelEmpty !== urlEmpty) {
				errors.push(t('nextcloud-vue', 'Call-to-action requires both label and URL'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-header-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-header-widget-form__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 14px;
}

.cn-header-widget-form__label {
	font-weight: 500;
}

.cn-header-widget-form__color-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 14px;
}

.cn-header-widget-form__color {
	width: 48px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}

.cn-header-widget-form__range {
	width: 100%;
}

.cn-header-widget-form__fieldset {
	display: flex;
	flex-direction: column;
	gap: 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 12px;
}

.cn-header-widget-form__legend {
	font-size: 13px;
	font-weight: 600;
	padding: 0 4px;
}
</style>
