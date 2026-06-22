<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-image-widget-form">
		<NcTextField
			:value="url"
			:label="t('nextcloud-vue', 'Image URL')"
			:placeholder="t('nextcloud-vue', 'Enter image URL')"
			required
			@update:value="updateField('url', $event)" />

		<div v-if="hasUrl" class="cn-image-widget-form__preview-wrap">
			<img
				class="cn-image-widget-form__preview"
				:src="url"
				:alt="alt || t('nextcloud-vue', 'Image')"
				@error="onPreviewError">
			<div v-if="previewError" class="cn-image-widget-form__preview-error">
				{{ t('nextcloud-vue', 'Image failed to load') }}
			</div>
		</div>

		<NcTextField
			:value="alt"
			:label="t('nextcloud-vue', 'Alt text')"
			@update:value="updateField('alt', $event)" />

		<NcTextField
			:value="link"
			:label="t('nextcloud-vue', 'Link (optional)')"
			placeholder="https://example.com"
			@update:value="updateField('link', $event)" />

		<NcSelect
			:value="fit"
			:options="fitOptions"
			:input-label="t('nextcloud-vue', 'Fit')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('fit', $event)" />
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const ALLOWED_FITS = Object.freeze(['cover', 'contain', 'fill', 'none'])

const DEFAULT_CONTENT = Object.freeze({
	url: '',
	alt: '',
	link: '',
	fit: 'cover',
})

/**
 * CnImageWidgetForm — the `CnAddWidgetModal` sub-form for creating or editing
 * an `image` widget placement (renderer: {@link CnImageWidget}).
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
		}
	},

	computed: {
		/** Whether a non-empty URL is set (drives the preview). */
		hasUrl() {
			return typeof this.url === 'string' && this.url.trim() !== ''
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

	methods: {
		t,

		/**
		 * Set a field and notify the parent via `update:content`.
		 *
		 * @param {string} field one of: url, alt, link, fit.
		 * @param {string} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
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
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			if (typeof this.url !== 'string' || this.url.trim() === '') {
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
