<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-video-widget"
		:style="wrapperStyle">
		<div v-if="!hasSource" class="cn-video-widget__placeholder">
			<VideoIcon :size="48" :fill-color="placeholderColor" />
			<span class="cn-video-widget__placeholder-label">{{ t('nextcloud-vue', 'No video URL configured') }}</span>
		</div>
		<div v-else-if="hasError" class="cn-video-widget__placeholder">
			<VideoIcon :size="48" :fill-color="placeholderColor" />
			<span class="cn-video-widget__placeholder-label">{{ errorMessage }}</span>
		</div>
		<div
			v-else
			class="cn-video-widget__media"
			:style="mediaStyle">
			<iframe
				v-if="isIframeSource"
				class="cn-video-widget__iframe"
				:src="embedUrl"
				sandbox="allow-scripts allow-same-origin allow-presentation"
				allowfullscreen
				frameborder="0" />
			<video
				v-else-if="isFileSource"
				class="cn-video-widget__video"
				:src="fileStreamingUrl"
				:poster="posterUrl || null"
				:autoplay="effectiveAutoplay"
				:muted="effectiveMuted"
				:loop="loop"
				:controls="controls"
				@error="onVideoError" />
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import VideoIcon from 'vue-material-design-icons/Video.vue'

const VALID_SOURCE_TYPES = ['youtube', 'vimeo', 'peertube', 'nc-file']
const VALID_ASPECT_RATIOS = ['16:9', '4:3', '1:1', '9:16']
const DEFAULT_ASPECT_RATIO = '16:9'

/**
 * CnVideoWidget renders an embedded video inside a dashboard cell. It
 * dispatches on `content.sourceType` to one of three render branches:
 *
 *   - `youtube` / `vimeo` / `peertube` → sandboxed `<iframe>` whose `src` is
 *     the canonical embed URL stored in `content.videoUrl`.
 *   - `nc-file` → HTML5 `<video>` whose `src` is `content.fileStreamingUrl`
 *     (resolved upstream).
 *   - anything else / missing source / render error → a centered placeholder.
 *
 * Autoplay forces muted=true because browsers block autoplay of unmuted media.
 * Aspect ratio uses the CSS `aspect-ratio` property; `16:9`, `4:3`, `1:1`, and
 * `9:16` are supported and unknown values fall back to `16:9`.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnVideoWidget',

	components: {
		VideoIcon,
	},

	props: {
		/**
		 * Persisted content blob `{sourceType, videoUrl, fileId,
		 * fileStreamingUrl, autoplay, muted, loop, controls, aspectRatio,
		 * posterUrl, error}`. `videoUrl` is the canonical embed URL;
		 * `error` (when set) triggers the error placeholder.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/** The placement record (reserved — kept to match the renderer contract). */
		placement: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			// Set when the HTML5 <video> fires an error so subsequent renders
			// show the error placeholder rather than a broken element.
			videoLoadFailed: false,
		}
	},

	computed: {
		/**
		 * The validated source type, or `null` when unrecognised.
		 *
		 * @return {string|null} one of the supported source types.
		 */
		sourceType() {
			const raw = this.content && this.content.sourceType
			return VALID_SOURCE_TYPES.includes(raw) ? raw : null
		},

		/**
		 * The canonical embed URL string.
		 *
		 * @return {string} the embed URL, or `''`.
		 */
		videoUrl() {
			const value = this.content && this.content.videoUrl
			return typeof value === 'string' ? value : ''
		},

		/**
		 * The resolved streaming URL for `nc-file` sources.
		 *
		 * @return {string} the streaming URL, or `''`.
		 */
		fileStreamingUrl() {
			const value = this.content && this.content.fileStreamingUrl
			return typeof value === 'string' ? value : ''
		},

		/**
		 * The Nextcloud file id for `nc-file` sources.
		 *
		 * @return {number|null} the file id, or `null`.
		 */
		fileId() {
			const value = this.content && this.content.fileId
			return typeof value === 'number' && Number.isFinite(value) ? value : null
		},

		/**
		 * Whether autoplay is requested.
		 *
		 * @return {boolean} the autoplay flag.
		 */
		autoplay() {
			return Boolean(this.content && this.content.autoplay)
		},

		/**
		 * Whether the video is muted (defaults to true).
		 *
		 * @return {boolean} the muted flag.
		 */
		muted() {
			if (this.content && typeof this.content.muted === 'boolean') {
				return this.content.muted
			}
			return true
		},

		/**
		 * Whether the video loops.
		 *
		 * @return {boolean} the loop flag.
		 */
		loop() {
			return Boolean(this.content && this.content.loop)
		},

		/**
		 * Whether native controls are shown (defaults to true).
		 *
		 * @return {boolean} the controls flag.
		 */
		controls() {
			if (this.content && typeof this.content.controls === 'boolean') {
				return this.content.controls
			}
			return true
		},

		/**
		 * The validated aspect ratio (defaults to `16:9`).
		 *
		 * @return {string} one of the supported aspect ratios.
		 */
		aspectRatio() {
			const raw = this.content && this.content.aspectRatio
			if (typeof raw === 'string' && VALID_ASPECT_RATIOS.includes(raw)) {
				return raw
			}
			return DEFAULT_ASPECT_RATIO
		},

		/**
		 * The poster image URL for HTML5 video.
		 *
		 * @return {string} the poster URL, or `''`.
		 */
		posterUrl() {
			const value = this.content && this.content.posterUrl
			return typeof value === 'string' && value.trim() !== '' ? value : ''
		},

		/**
		 * Effective muted value — autoplay forces muted=true (browsers block
		 * autoplay of unmuted media).
		 *
		 * @return {boolean} the muted value passed to the media element.
		 */
		effectiveMuted() {
			return this.autoplay ? true : this.muted
		},

		/**
		 * Effective autoplay value — never autoplay when no source resolved.
		 *
		 * @return {boolean} the autoplay value passed to the media element.
		 */
		effectiveAutoplay() {
			return this.autoplay && this.hasSource
		},

		/**
		 * Whether a usable source is configured.
		 *
		 * @return {boolean} true when the widget has something to render.
		 */
		hasSource() {
			if (this.sourceType === null) {
				return false
			}
			if (this.sourceType === 'nc-file') {
				return this.fileId !== null
			}
			return this.videoUrl.trim() !== ''
		},

		/**
		 * Whether the current source renders in an iframe.
		 *
		 * @return {boolean} true for youtube/vimeo/peertube.
		 */
		isIframeSource() {
			return ['youtube', 'vimeo', 'peertube'].includes(this.sourceType)
		},

		/**
		 * Whether the current source renders in an HTML5 video element.
		 *
		 * @return {boolean} true for nc-file.
		 */
		isFileSource() {
			return this.sourceType === 'nc-file'
		},

		/**
		 * Whether the widget is in an error state.
		 *
		 * @return {boolean} true when an error placeholder should show.
		 */
		hasError() {
			if (this.content && typeof this.content.error === 'string' && this.content.error.trim() !== '') {
				return true
			}
			if (this.isFileSource && this.fileId !== null && this.fileStreamingUrl === '') {
				return true
			}
			return this.videoLoadFailed
		},

		/**
		 * The localised error message for the error placeholder.
		 *
		 * @return {string} the error message.
		 */
		errorMessage() {
			const raw = this.content && this.content.error
			if (typeof raw === 'string' && raw.trim() !== '') {
				return raw
			}
			if (this.isFileSource && this.fileId !== null && this.fileStreamingUrl === '') {
				return t('nextcloud-vue', 'Video not accessible')
			}
			if (this.videoLoadFailed) {
				return t('nextcloud-vue', 'Video failed to load')
			}
			return t('nextcloud-vue', 'Invalid video URL or domain not allowed.')
		},

		/**
		 * The iframe `src` with playback query params appended.
		 *
		 * @return {string} the iframe URL, or `''`.
		 */
		embedUrl() {
			if (!this.isIframeSource || this.videoUrl === '') {
				return ''
			}
			const params = []
			if (this.autoplay) {
				params.push('autoplay=1')
				params.push('mute=1')
			} else if (this.muted) {
				params.push('mute=1')
			}
			if (this.loop) {
				params.push('loop=1')
			}
			if (params.length === 0) {
				return this.videoUrl
			}
			const separator = this.videoUrl.includes('?') ? '&' : '?'
			return this.videoUrl + separator + params.join('&')
		},

		/**
		 * The placeholder icon colour (a theme variable).
		 *
		 * @return {string} the CSS colour.
		 */
		placeholderColor() {
			return 'var(--color-text-maxcontrast)'
		},

		/**
		 * Inline style for the widget wrapper.
		 *
		 * @return {object} the wrapper style.
		 */
		wrapperStyle() {
			return {
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				position: 'relative',
				display: 'flex',
				'align-items': 'center',
				'justify-content': 'center',
			}
		},

		/**
		 * Inline style for the media wrapper, enforcing the aspect ratio.
		 *
		 * @return {object} the media style.
		 */
		mediaStyle() {
			const [w, h] = this.aspectRatio.split(':')
			return {
				width: '100%',
				'max-width': '100%',
				'aspect-ratio': `${w} / ${h}`,
				display: 'flex',
				'align-items': 'center',
				'justify-content': 'center',
				background: 'var(--color-background-dark)',
			}
		},
	},

	watch: {
		// Re-arm the failure flag when the source changes so a previously
		// failed file does not permanently lock the cell.
		fileStreamingUrl() {
			this.videoLoadFailed = false
		},
		videoUrl() {
			this.videoLoadFailed = false
		},
	},

	methods: {
		/**
		 * HTML5 `<video>` error handler — swaps to the error placeholder. The
		 * event is swallowed so no exception bubbles into the grid layer.
		 *
		 * @return {void}
		 */
		onVideoError() {
			this.videoLoadFailed = true
		},
	},
}
</script>

<style scoped>
.cn-video-widget {
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.cn-video-widget__media {
	position: relative;
}

.cn-video-widget__iframe,
.cn-video-widget__video {
	width: 100%;
	height: 100%;
	border: 0;
	display: block;
	background: var(--color-background-dark);
}

.cn-video-widget__placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	color: var(--color-text-maxcontrast);
	padding: 16px;
	text-align: center;
}

.cn-video-widget__placeholder-label {
	font-size: 13px;
}
</style>
