<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-video-form">
		<NcTextField
			:model-value="videoUrl"
			:label="t('nextcloud-vue', 'Video URL')"
			placeholder="https://www.youtube.com/watch?v=..."
			required
			@update:model-value="onUrlInput" />

		<div v-if="detectedSource" class="cn-video-form__hint">
			{{ detectedSourceLabel }}
		</div>
		<div v-else-if="hasUrl" class="cn-video-form__error" role="alert">
			{{ t('nextcloud-vue', 'Invalid video URL or domain not allowed.') }}
		</div>

		<NcTextField
			v-if="sourceType === 'nc-file'"
			:model-value="String(fileId || '')"
			:label="t('nextcloud-vue', 'Nextcloud File ID')"
			placeholder="12345"
			@update:model-value="onFileIdInput" />

		<NcSelect
			:model-value="aspectRatio"
			:options="aspectRatioOptions"
			:input-label="t('nextcloud-vue', 'Aspect Ratio')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@update:modelValue="updateField('aspectRatio', $event)" />

		<NcCheckboxRadioSwitch
			:model-value="autoplay"
			@update:model-value="onAutoplayToggle">
			{{ t('nextcloud-vue', 'Autoplay') }}
		</NcCheckboxRadioSwitch>
		<div v-if="autoplay" class="cn-video-form__hint">
			{{ t('nextcloud-vue', 'Autoplay requires muting') }}
		</div>

		<NcCheckboxRadioSwitch
			:model-value="muted"
			:disabled="autoplay"
			@update:model-value="updateField('muted', $event)">
			{{ t('nextcloud-vue', 'Muted') }}
		</NcCheckboxRadioSwitch>

		<NcCheckboxRadioSwitch
			:model-value="loop"
			@update:model-value="updateField('loop', $event)">
			{{ t('nextcloud-vue', 'Loop') }}
		</NcCheckboxRadioSwitch>

		<NcCheckboxRadioSwitch
			:model-value="controls"
			@update:model-value="updateField('controls', $event)">
			{{ t('nextcloud-vue', 'Show controls') }}
		</NcCheckboxRadioSwitch>

		<NcTextField
			:model-value="posterUrl"
			:label="t('nextcloud-vue', 'Poster Image URL (optional)')"
			placeholder="https://example.com/poster.jpg"
			@update:model-value="updateField('posterUrl', $event)" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcTextField, NcSelect, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { detectVideoSource, normalizeEmbedUrl } from '../CnVideoWidget/videoUrlParser.js'

const VALID_ASPECT_RATIOS = ['16:9', '4:3', '1:1', '9:16']

const DEFAULT_CONTENT = Object.freeze({
	sourceType: null,
	videoUrl: '',
	fileId: null,
	autoplay: false,
	muted: true,
	loop: false,
	controls: true,
	aspectRatio: '16:9',
	posterUrl: '',
})

/**
 * CnVideoWidgetForm — sub-form mounted inside the add-widget modal when the
 * user is creating or editing a `video` placement.
 *
 * Detects the platform (YouTube, Vimeo, PeerTube, Nextcloud Files) from the
 * URL and pre-computes the canonical embed URL. `validate()` returns errors
 * when the URL is empty or does not parse to a known source.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnVideoWidgetForm',

	components: {
		NcTextField,
		NcSelect,
		NcCheckboxRadioSwitch,
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
		const initial = (this.editingWidget && this.editingWidget.content) || this.value || {}
		return {
			videoUrl: typeof initial.videoUrl === 'string' ? initial.videoUrl : DEFAULT_CONTENT.videoUrl,
			sourceType: typeof initial.sourceType === 'string' ? initial.sourceType : DEFAULT_CONTENT.sourceType,
			fileId: typeof initial.fileId === 'number' ? initial.fileId : DEFAULT_CONTENT.fileId,
			autoplay: typeof initial.autoplay === 'boolean' ? initial.autoplay : DEFAULT_CONTENT.autoplay,
			muted: typeof initial.muted === 'boolean' ? initial.muted : DEFAULT_CONTENT.muted,
			loop: typeof initial.loop === 'boolean' ? initial.loop : DEFAULT_CONTENT.loop,
			controls: typeof initial.controls === 'boolean' ? initial.controls : DEFAULT_CONTENT.controls,
			aspectRatio: VALID_ASPECT_RATIOS.includes(initial.aspectRatio)
				? initial.aspectRatio
				: DEFAULT_CONTENT.aspectRatio,
			posterUrl: typeof initial.posterUrl === 'string' ? initial.posterUrl : DEFAULT_CONTENT.posterUrl,
		}
	},

	computed: {
		/**
		 * Whether a non-empty URL has been entered.
		 *
		 * @return {boolean} true when `videoUrl` is non-empty.
		 */
		hasUrl() {
			return typeof this.videoUrl === 'string' && this.videoUrl.trim() !== ''
		},

		/**
		 * The detected source type for the current URL.
		 *
		 * @return {string|null} the detected source, or `null`.
		 */
		detectedSource() {
			if (!this.hasUrl) {
				return null
			}
			return detectVideoSource(this.videoUrl)
		},

		/**
		 * The localised "Detected: X" hint label.
		 *
		 * @return {string} the detection hint.
		 */
		detectedSourceLabel() {
			switch (this.detectedSource) {
			case 'youtube':
				return t('nextcloud-vue', 'Detected: YouTube')
			case 'vimeo':
				return t('nextcloud-vue', 'Detected: Vimeo')
			case 'peertube':
				return t('nextcloud-vue', 'Detected: PeerTube')
			case 'nc-file':
				return t('nextcloud-vue', 'Detected: Nextcloud File')
			default:
				return ''
			}
		},

		/**
		 * The aspect-ratio dropdown options.
		 *
		 * @return {Array<{value: string, label: string}>} the options.
		 */
		aspectRatioOptions() {
			return [
				{ value: '16:9', label: '16:9' },
				{ value: '4:3', label: '4:3' },
				{ value: '1:1', label: '1:1' },
				{ value: '9:16', label: '9:16' },
			]
		},

		/**
		 * The assembled `content` payload emitted to the parent.
		 *
		 * @return {object} the content blob.
		 */
		assembledContent() {
			return {
				sourceType: this.sourceType,
				videoUrl: this.normalizedVideoUrl,
				fileId: this.fileId,
				autoplay: this.autoplay,
				// Autoplay forces muted.
				muted: this.autoplay ? true : this.muted,
				loop: this.loop,
				controls: this.controls,
				aspectRatio: this.aspectRatio,
				posterUrl: this.posterUrl,
			}
		},

		/**
		 * The canonical embed URL emitted upward (raw for nc-file inputs).
		 *
		 * @return {string} the embed URL.
		 */
		normalizedVideoUrl() {
			if (!this.detectedSource || this.detectedSource === 'nc-file') {
				return this.videoUrl
			}
			return normalizeEmbedUrl(this.videoUrl, this.detectedSource) || this.videoUrl
		},
	},

	methods: {
		/**
		 * Set a field and emit `update:content`.
		 *
		 * @param {string} field the field name.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * URL change handler — drives source-type detection and emits.
		 *
		 * @param {string} value the new URL.
		 * @return {void}
		 */
		onUrlInput(value) {
			this.videoUrl = value
			const detected = detectVideoSource(value)
			this.sourceType = detected
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * File-id change handler for `nc-file` sources.
		 *
		 * @param {string} value the raw input value.
		 * @return {void}
		 */
		onFileIdInput(value) {
			const parsed = parseInt(String(value).trim(), 10)
			this.fileId = Number.isFinite(parsed) ? parsed : null
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Autoplay toggle handler — coerces muted=true while autoplay is on.
		 *
		 * @param {boolean} checked the autoplay checkbox value.
		 * @return {void}
		 */
		onAutoplayToggle(checked) {
			this.autoplay = checked
			if (checked) {
				this.muted = true
			}
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form. Requires a URL plus a recognised source.
		 *
		 * @return {string[]} the validation errors (empty when valid).
		 */
		validate() {
			const errors = []
			if (!this.hasUrl) {
				errors.push(t('nextcloud-vue', 'Video URL is required'))
				return errors
			}
			if (this.detectedSource === null) {
				errors.push(t('nextcloud-vue', 'Invalid video URL or domain not allowed.'))
				return errors
			}
			if (this.detectedSource === 'nc-file' && this.fileId === null) {
				errors.push(t('nextcloud-vue', 'Nextcloud file ID is required'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-video-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-video-form__hint {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-video-form__error {
	color: var(--color-error);
	font-size: 13px;
}
</style>
