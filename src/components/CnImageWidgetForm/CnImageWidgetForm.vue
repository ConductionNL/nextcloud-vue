<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-image-widget-form">
		<!-- Pick an image file. Selection does NOT upload — the file is held
		     locally (with an object-URL preview) and only uploaded when the
		     host modal calls commit() on submit, so repeated picks or a
		     cancelled dialog never write orphaned files. The URL field below
		     stays for linking an external image instead. -->
		<div class="cn-image-widget-form__upload-row">
			<label class="cn-image-widget-form__upload-label">
				<input
					ref="fileInput"
					type="file"
					accept="image/*"
					class="cn-image-widget-form__file-input"
					:disabled="uploading"
					@change="handleFileSelect">
				<span class="cn-image-widget-form__upload-button">
					{{ pendingFile ? t('nextcloud-vue', 'Change image') : t('nextcloud-vue', 'Choose image') }}
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
		<p v-if="pendingFile" class="cn-image-widget-form__pending">
			{{ t('nextcloud-vue', 'Ready to upload on save: {name}', { name: pendingFile.name }) }}
		</p>
		<p v-if="uploadError" class="cn-image-widget-form__error" role="alert">
			{{ uploadError }}
		</p>

		<NcTextField
			:model-value="url"
			:label="t('nextcloud-vue', 'Image URL')"
			:placeholder="t('nextcloud-vue', 'Or paste an image URL')"
			:disabled="!!pendingFile"
			@update:model-value="updateField('url', $event)" />

		<div v-if="previewSrc" class="cn-image-widget-form__preview-wrap">
			<img
				class="cn-image-widget-form__preview"
				:src="previewSrc"
				:alt="alt || t('nextcloud-vue', 'Image')"
				@error="onPreviewError">
			<div v-if="previewError" class="cn-image-widget-form__preview-error">
				{{ t('nextcloud-vue', 'Image failed to load') }}
			</div>
		</div>

		<NcTextField
			:model-value="alt"
			:label="t('nextcloud-vue', 'Alt text')"
			@update:model-value="updateField('alt', $event)" />

		<NcTextField
			:model-value="link"
			:label="t('nextcloud-vue', 'Link (optional)')"
			placeholder="https://example.com"
			@update:model-value="updateField('link', $event)" />

		<NcSelect
			:model-value="fit"
			:options="fitOptions"
			:input-label="t('nextcloud-vue', 'Fit')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@update:modelValue="updateField('fit', $event)" />
	</div>
</template>

<script>
import { NcTextField, NcSelect, NcButton } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { resolveImageUrl } from '../../utils/resolveImageUrl.js'
import { extractTransportUrl, readFileAsDataUrl, embedAsDataUrl, warnUploadFnDeprecated } from '../../utils/widgetUpload.js'

const ALLOWED_FITS = Object.freeze(['cover', 'contain', 'fill', 'none'])

const DEFAULT_CONTENT = Object.freeze({
	url: '',
	alt: '',
	link: '',
	fit: 'cover',
})

/**
 * CnImageWidgetForm — the `CnAddWidgetModal` sub-form for creating or editing
 * an `image` widget placement (renderer: `CnImageWidget`).
 *
 * Exposes four controls — image URL, alt text, optional click-through link,
 * and an object-fit select (`cover | contain | fill | none`, default
 * `cover`) — plus a live preview thumbnail whenever `url` is non-empty.
 * Emits `update:content` with the assembled `{url, alt, link, fit}` blob on
 * every change and exposes `assembledContent` for the modal to read on
 * submit. `validate()` returns a single error when `url` is empty.
 */
export default {
	name: 'CnImageWidgetForm',

	components: {
		NcTextField,
		NcSelect,
		NcButton,
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
		/**
		 * Optional raw-file upload transport: `async (file: File) => ({ url })`.
		 * Deliberately named `fileUploadFn` (not `uploadFn`) to avoid colliding
		 * with the base64/data-URL `uploadFn` prop that other sub-forms (e.g.
		 * `CnHeaderWidgetForm`) declare. Called by `commit()` on submit (never on
		 * file selection) with the raw picked `File`; the returned hosted URL is
		 * stored. When omitted, the file is embedded as a data URL on commit
		 * instead — but only when the raw file is ≤ 1 MB (~1.37 MB once
		 * base64-encoded and stored), so the browser tab can't be frozen by a huge
		 * inline blob. Wire a transport for anything larger.
		 *
		 * @type {Function|null}
		 */
		fileUploadFn: {
			type: Function,
			default: null,
		},
		/**
		 * Legacy base64 upload transport, superseded by `fileUploadFn`.
		 *
		 * @deprecated Use `fileUploadFn` instead. Legacy base64 transport
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
		 * Emitted with the assembled `{url, alt, link, fit}` blob on every
		 * field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = (this.editingWidget && this.editingWidget.content) || this.value || {}
		return {
			url: typeof initial.url === 'string' ? initial.url : DEFAULT_CONTENT.url,
			alt: typeof initial.alt === 'string' ? initial.alt : DEFAULT_CONTENT.alt,
			link: typeof initial.link === 'string' ? initial.link : DEFAULT_CONTENT.link,
			fit: ALLOWED_FITS.includes(initial.fit) ? initial.fit : DEFAULT_CONTENT.fit,
			previewError: false,
			uploading: false,
			uploadError: '',
			// The picked-but-not-yet-uploaded file and its object-URL preview.
			// Upload is deferred to commit() so nothing is written on selection.
			pendingFile: null,
			pendingPreviewUrl: '',
		}
	},

	computed: {
		/** Whether a non-empty URL is set. */
		hasUrl() {
			return typeof this.url === 'string' && this.url.trim() !== ''
		},

		/**
		 * The image shown in the preview: the pending file's object URL, else the resolved URL field.
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		previewSrc() {
			return this.pendingPreviewUrl || (this.hasUrl ? resolveImageUrl(this.url) : '')
		},

		/** Object-fit select options. */
		fitOptions() {
			return [
				{ value: 'cover', label: t('nextcloud-vue', 'Cover') },
				{ value: 'contain', label: t('nextcloud-vue', 'Contain') },
				{ value: 'fill', label: t('nextcloud-vue', 'Fill') },
				{ value: 'none', label: t('nextcloud-vue', 'None') },
			]
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				url: this.url,
				alt: this.alt,
				link: this.link,
				fit: this.fit,
			}
		},
	},

	watch: {
		// Re-arm the preview when the URL changes so a previously broken URL
		// does not permanently mask a freshly entered good one.
		url() {
			this.previewError = false
		},
	},

	beforeUnmount() {
		this.revokePreview()
	},

	methods: {
		t,

		/**
		 * Set a field and notify the parent via `update:content`.
		 *
		 * @param {string} field one of: url, alt, link, fit.
		 * @param {string} value the new value.
		 * @return {void}
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
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
			this.revokePreview()
			this.pendingFile = null
			this.uploadError = ''
			this.resetFileInput()
		},

		/**
		 * Mark the preview thumbnail as broken so the inline error renders.
		 *
		 * @return {void}
		 */
		onPreviewError() {
			this.previewError = true
		},

		/**
		 * Hold the picked file for a deferred upload and show an instant
		 * object-URL preview. Does NOT upload — that happens in commit() when
		 * the host modal submits, so re-picking or cancelling writes nothing.
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
			this.previewError = false
			this.revokePreview()
			this.pendingFile = file
			this.pendingPreviewUrl = URL.createObjectURL(file)
			this.resetFileInput()
		},

		/**
		 * Upload the pending file (if any) and store the resulting URL. Called
		 * by the host modal on submit. A no-op when no file is pending, so
		 * editing a widget without changing the image keeps the existing URL.
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
					resolvedUrl = extractTransportUrl(await this.fileUploadFn(this.pendingFile))
				} else if (typeof this.uploadFn === 'function') {
					// Deprecated path: the legacy uploadFn expects a base64 data URL.
					warnUploadFnDeprecated('CnImageWidgetForm')
					const dataUrl = await readFileAsDataUrl(this.pendingFile)
					resolvedUrl = extractTransportUrl(await this.uploadFn(dataUrl))
				} else {
					resolvedUrl = await embedAsDataUrl(this.pendingFile)
				}
				this.revokePreview()
				this.pendingFile = null
				this.updateField('url', resolvedUrl)
			} catch (err) {
				this.uploadError = (err && err.message) || t('nextcloud-vue', 'Failed to upload image')
				console.error('Image upload failed:', err)
				throw err
			} finally {
				this.uploading = false
			}
		},

		/**
		 * Revoke the current object-URL preview (if any) to free memory.
		 *
		 * @return {void}
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		revokePreview() {
			if (this.pendingPreviewUrl) {
				URL.revokeObjectURL(this.pendingPreviewUrl)
				this.pendingPreviewUrl = ''
			}
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
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		validate() {
			const hasUrl = typeof this.url === 'string' && this.url.trim() !== ''
			if (!hasUrl && this.pendingFile === null) {
				return [t('nextcloud-vue', 'Image URL is required')]
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-image-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-image-widget-form__upload-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-image-widget-form__upload-label {
	display: inline-flex;
	cursor: pointer;
}

.cn-image-widget-form__file-input {
	display: none;
}

.cn-image-widget-form__upload-button {
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background-color: var(--color-background-hover);
	font-size: 14px;
	transition: background-color 0.2s;
}

.cn-image-widget-form__upload-label:hover .cn-image-widget-form__upload-button {
	background-color: var(--color-background-dark);
}

.cn-image-widget-form__pending {
	margin: 0;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-image-widget-form__error {
	margin: 0;
	font-size: 12px;
	color: var(--color-error);
}

.cn-image-widget-form__preview-wrap {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-image-widget-form__preview {
	max-width: 100%;
	max-height: 160px;
	object-fit: contain;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-dark);
}

.cn-image-widget-form__preview-error {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}
</style>
