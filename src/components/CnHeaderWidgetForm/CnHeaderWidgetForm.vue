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

		<!-- Pick a background image. Selection does NOT upload — the file is held
		     and only uploaded when the host modal calls commit() on submit, so
		     re-picking or cancelling writes nothing. Uploads are the reliable
		     path: external image URLs are often blocked by the Nextcloud
		     Content-Security-Policy, so only the background colour would show. -->
		<div class="cn-header-widget-form__upload-row">
			<label class="cn-header-widget-form__upload-label">
				<input
					ref="fileInput"
					type="file"
					accept="image/*"
					class="cn-header-widget-form__file-input"
					:disabled="uploading"
					@change="handleFileSelect">
				<span class="cn-header-widget-form__upload-button">
					{{ pendingFile ? t('nextcloud-vue', 'Change background image') : t('nextcloud-vue', 'Choose background image') }}
				</span>
			</label>
			<NcButton
				v-if="pendingFile"
				type="tertiary"
				:disabled="uploading"
				@click="clearPendingFile">
				{{ t('nextcloud-vue', 'Remove') }}
			</NcButton>
		</div>
		<p v-if="pendingFile" class="cn-header-widget-form__pending">
			{{ t('nextcloud-vue', 'Ready to upload on save: {name}', { name: pendingFile.name }) }}
		</p>
		<p v-if="uploadError" class="cn-header-widget-form__error" role="alert">
			{{ uploadError }}
		</p>

		<NcTextField
			:value="backgroundImageUrl"
			:label="t('nextcloud-vue', 'Background image URL')"
			placeholder="https://example.com/banner.jpg"
			:disabled="!!pendingFile"
			@update:value="updateField('backgroundImageUrl', $event)" />

		<label class="cn-header-widget-form__color-label">
			{{ t('nextcloud-vue', 'Background color') }}
			<CnColorPicker
				:value="backgroundColor"
				clearable
				@input="updateField('backgroundColor', $event.hex)"
				@clear="updateField('backgroundColor', '')" />
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
			<CnColorPicker
				:value="overlayColor"
				clearable
				@input="updateField('overlayColor', $event.hex)"
				@clear="updateField('overlayColor', '')" />
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
			<CnColorPicker
				:value="textColor"
				clearable
				@input="updateField('textColor', $event.hex)"
				@clear="updateField('textColor', '')" />
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

		<!-- The banner fills its dashboard grid cell, so a fixed Height preset
		     no longer changes anything — resize the widget on the grid instead.
		     (The `height` field is kept in the saved content for back-compat
		     but is no longer surfaced as a control.) -->

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
import { NcTextField, NcSelect, NcButton } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnColorPicker from '../CnColorPicker/CnColorPicker.vue'
import { validateUrl } from '../../utils/widgetUrl.js'

// Cap for the no-transport fallback only: without a fileUploadFn the file must
// be embedded as a data URL, and a large one can freeze the browser tab, so we
// refuse anything bigger. Gated on the RAW file size (a cheap pre-check that
// avoids base64-encoding a huge file at all); the stored data URL is ~1.37×
// this once base64-encoded.
const FALLBACK_MAX_BYTES = (1024 * 1024)

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
		NcButton,
		CnColorPicker,
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
		/**
		 * Optional raw-file upload transport: `async (file: File) => ({ url })`.
		 * Named `fileUploadFn` (not `uploadFn`) to match `CnAddWidgetModal`'s
		 * File-typed sub-form transport. Called by `commit()` on submit (never on
		 * file selection) with the raw picked `File`; the returned hosted URL is
		 * stored as `backgroundImageUrl`. When omitted, the file is embedded as a
		 * data URL on commit instead (same-origin, so it isn't blocked by the CSP
		 * the way external http(s) URLs are) — but only when the raw file is ≤ 1 MB
		 * (~1.37 MB once base64-encoded and stored) so a huge inline blob can't
		 * freeze the tab. Wire a transport for anything larger.
		 *
		 * @type {Function|null}
		 */
		fileUploadFn: {
			type: Function,
			default: null,
		},
		/**
		 * @deprecated Use {@link fileUploadFn} instead. Legacy base64 transport
		 * `async (dataUrl: string) => ({ url })`, kept for backward compatibility.
		 * When `fileUploadFn` is not set but this is, `commit()` reads the file to
		 * a data URL and hands that to this function (emitting a one-time
		 * console.warn). `fileUploadFn` takes precedence when both are provided.
		 *
		 * @type {Function|null}
		 */
		uploadFn: {
			type: Function,
			default: null,
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
			uploading: false,
			uploadError: '',
			// The picked-but-not-yet-uploaded file. Upload is deferred to commit()
			// so nothing is written on selection.
			pendingFile: null,
			// One-time guard for the deprecated uploadFn console.warn.
			uploadFnDeprecationWarned: false,
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
		 * Hold the picked file for a deferred upload. Does NOT upload — that
		 * happens in commit() when the host modal submits, so re-picking or
		 * cancelling writes nothing.
		 *
		 * @param {Event} event the file-input change event.
		 * @return {void}
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		handleFileSelect(event) {
			const file = event.target.files && event.target.files[0]
			if (!file) {
				return
			}
			this.uploadError = ''
			this.pendingFile = file
			this.resetFileInput()
		},

		/**
		 * Upload the pending file (if any) and store it as backgroundImageUrl.
		 * Called by the host modal on submit. A no-op when no file is pending, so
		 * editing without changing the image keeps the existing value.
		 *
		 * @return {Promise<void>} resolves once the URL is set.
		 * @throws {Error} when the upload fails, so the modal can block submit.
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		async commit() {
			if (this.pendingFile === null) {
				return
			}
			this.uploadError = ''
			this.uploading = true
			try {
				let resolvedUrl
				if (typeof this.fileUploadFn === 'function') {
					resolvedUrl = this.extractTransportUrl(await this.fileUploadFn(this.pendingFile))
				} else if (typeof this.uploadFn === 'function') {
					// Deprecated path: the legacy uploadFn expects a base64 data URL.
					this.warnUploadFnDeprecated()
					const dataUrl = await this.readFileAsDataUrl(this.pendingFile)
					resolvedUrl = this.extractTransportUrl(await this.uploadFn(dataUrl))
				} else {
					resolvedUrl = await this.embedAsDataUrl(this.pendingFile)
				}
				this.pendingFile = null
				this.updateField('backgroundImageUrl', resolvedUrl)
			} catch (err) {
				this.uploadError = (err && err.message) || t('nextcloud-vue', 'Failed to upload image')
				console.error('Header image upload failed:', err)
				throw err
			} finally {
				this.uploading = false
			}
		},

		/**
		 * Validate an upload transport's `{ url }` response and return the URL.
		 * Shared by the `fileUploadFn` and legacy `uploadFn` paths: rejects an
		 * empty/malformed shape and a hostile scheme (javascript:, data:, …) so a
		 * misbehaving/compromised transport can't write an unsafe URL into content
		 * (resource paths are `/`-relative, so they pass).
		 *
		 * @param {{url: string}} response the transport response.
		 * @return {string} the validated URL.
		 * @throws {Error} when the response has no URL or an unsafe scheme.
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		extractTransportUrl(response) {
			if (!response || typeof response.url !== 'string' || response.url === '') {
				throw new Error('Upload transport returned no URL')
			}
			if (validateUrl(response.url) === false) {
				throw new Error('Upload transport returned an unsafe URL')
			}
			return response.url
		},

		/**
		 * No-transport fallback: embed the file as a data URL, but only when the
		 * raw file is ≤ FALLBACK_MAX_BYTES (the encoded string stored in content
		 * is ~1.37× that) so a huge inline blob can't freeze the tab.
		 *
		 * @param {File} file the pending file.
		 * @return {Promise<string>} resolves to a `data:<mime>;base64,…` URL.
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		embedAsDataUrl(file) {
			if (file.size > FALLBACK_MAX_BYTES) {
				return Promise.reject(new Error(
					t('nextcloud-vue', 'Image is too large to embed. Configure an upload transport for larger files.'),
				))
			}
			return this.readFileAsDataUrl(file)
		},

		/**
		 * Read a file as a base64 data URL (uncapped). Used by the data-URL
		 * fallback (behind the size cap in {@link embedAsDataUrl}) and by the
		 * deprecated `uploadFn` path, which uploads to a server and so isn't
		 * size-capped.
		 *
		 * @param {File} file the file to read.
		 * @return {Promise<string>} resolves to a `data:<mime>;base64,…` URL.
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		readFileAsDataUrl(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = (e) => {
					const dataUrl = e.target.result
					if (typeof dataUrl === 'string') {
						resolve(dataUrl)
					} else {
						reject(new Error('FileReader did not return a data URL'))
					}
				}
				reader.onerror = () => reject(reader.error || new Error('FileReader failed'))
				reader.readAsDataURL(file)
			})
		},

		/**
		 * Emit the `uploadFn`-deprecation warning at most once per instance.
		 *
		 * @return {void}
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		warnUploadFnDeprecated() {
			if (this.uploadFnDeprecationWarned === true) {
				return
			}
			this.uploadFnDeprecationWarned = true
			// eslint-disable-next-line no-console
			console.warn('[CnHeaderWidgetForm] The `uploadFn` prop is deprecated; use `fileUploadFn`, which receives the raw File instead of a base64 data URL.')
		},

		/**
		 * Discard the pending file, re-enabling the URL field. Called by the
		 * Remove button.
		 *
		 * @return {void}
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		clearPendingFile() {
			this.pendingFile = null
			this.uploadError = ''
			this.resetFileInput()
		},

		/**
		 * Clear the native file input so re-selecting the same file re-fires.
		 *
		 * @return {void}
		 */
		resetFileInput() {
			if (this.$refs.fileInput) {
				this.$refs.fileInput.value = ''
			}
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
				&& /^(https?:\/\/|data:|blob:|\/)/i.test(this.backgroundImageUrl.trim()) === false) {
				errors.push(t('nextcloud-vue', 'Background image must be a URL or an uploaded image'))
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

.cn-header-widget-form__upload-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-header-widget-form__upload-label {
	display: inline-flex;
	cursor: pointer;
}

.cn-header-widget-form__pending {
	margin: 0;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-header-widget-form__file-input {
	display: none;
}

.cn-header-widget-form__upload-button {
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background-color: var(--color-background-hover);
	font-size: 14px;
}

.cn-header-widget-form__upload-label:hover .cn-header-widget-form__upload-button {
	background-color: var(--color-background-dark);
}

.cn-header-widget-form__error {
	margin: 0;
	font-size: 12px;
	color: var(--color-error);
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
