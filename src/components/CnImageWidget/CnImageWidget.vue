<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-image-widget"
		:style="wrapperStyle"
		@click="onClick">
		<img
			v-if="showImage"
			class="cn-image-widget__img"
			:src="imageSrc"
			:alt="alt"
			:style="imgStyle"
			@error="onImageError">
		<div v-else class="cn-image-widget__placeholder" :style="placeholderStyle">
			<CnIcon name="Camera" :size="48" />
			<span class="cn-image-widget__placeholder-label">{{ placeholderLabel }}</span>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnIcon from '../CnIcon/CnIcon.vue'
import { resolveImageUrl } from '../../utils/resolveImageUrl.js'

const ALLOWED_FITS = ['cover', 'contain', 'fill', 'none']
const DEFAULT_FIT = 'cover'

/**
 * CnImageWidget — renders a single image inside a dashboard cell. The
 * persisted shape is `{url, alt, link, fit}` with `fit` restricted to
 * `'cover' | 'contain' | 'fill' | 'none'` and defaulting to `'cover'`.
 *
 * Render branches: a non-empty, non-errored `url` renders an `<img>` with
 * `object-fit: <fit>`; an empty `url` renders a camera placeholder; a failed
 * `<img>` load swaps to the placeholder with an "Image failed to load" label.
 *
 * Click-through: when `link` is non-empty the cell sets `cursor: pointer` and
 * a click opens the link via `window.open(link, '_blank',
 * 'noopener,noreferrer')`. An empty `link` keeps the default cursor and clicks
 * are no-ops.
 *
 * Registered as the `image` dashboard widget type via the renderer's
 * `index.js`.
 */
export default {
	name: 'CnImageWidget',

	components: {
		CnIcon,
	},

	props: {
		/**
		 * Persisted widget content blob: `{url, alt, link, fit}`.
		 *
		 * @type {{url: string, alt: string, link: string, fit: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Optional `object-fit` override; restricted to the four supported CSS
		 * values. An unknown value falls back to `'cover'`.
		 *
		 * @type {'cover'|'contain'|'fill'|'none'|undefined}
		 */
		fit: {
			type: String,
			default: undefined,
			validator(value) {
				if (value === undefined || value === null) {
					return true
				}
				return ALLOWED_FITS.includes(value)
			},
		},
	},

	data() {
		return {
			// Set true once the `<img>` fires a DOM `error` event so
			// subsequent renders show the placeholder + the "Image failed to
			// load" annotation.
			loadFailed: false,
		}
	},

	computed: {
		/** The image URL, or '' when absent / non-string. */
		url() {
			const value = this.content && this.content.url
			return typeof value === 'string' ? value : ''
		},

		/**
		 * The `<img src>` value: the stored URL resolved for the current
		 * instance's routing (app-relative resource paths gain the webroot +
		 * `/index.php`; external/data URLs pass through).
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		imageSrc() {
			return resolveImageUrl(this.url)
		},

		/** The alt text, or '' when absent / non-string. */
		alt() {
			const value = this.content && this.content.alt
			return typeof value === 'string' ? value : ''
		},

		/** The click-through link, or '' when absent / non-string. */
		link() {
			const value = this.content && this.content.link
			return typeof value === 'string' ? value : ''
		},

		/** Whether a non-empty URL is set. */
		hasUrl() {
			return this.url.trim() !== ''
		},

		/** Whether a non-empty click-through link is set. */
		hasLink() {
			return this.link.trim() !== ''
		},

		/** Whether the `<img>` should render (URL present and not errored). */
		showImage() {
			return this.hasUrl && this.loadFailed === false
		},

		/** Resolved `object-fit`, preferring the prop then `content.fit`. */
		resolvedFit() {
			let candidate = this.fit
			if (candidate === undefined || candidate === null) {
				candidate = this.content && this.content.fit
			}
			if (typeof candidate !== 'string' || ALLOWED_FITS.includes(candidate) === false) {
				return DEFAULT_FIT
			}
			return candidate
		},

		/** The placeholder label (empty vs failed load). */
		placeholderLabel() {
			return this.loadFailed
				? t('nextcloud-vue', 'Image failed to load')
				: t('nextcloud-vue', 'No image')
		},

		/** Inline style for the cell wrapper. */
		wrapperStyle() {
			return {
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				position: 'relative',
				cursor: this.hasLink ? 'pointer' : 'default',
			}
		},

		/** Inline style for the `<img>`. */
		imgStyle() {
			return {
				width: '100%',
				height: '100%',
				display: 'block',
				'object-fit': this.resolvedFit,
			}
		},

		/** Inline style for the placeholder. */
		placeholderStyle() {
			return {
				width: '100%',
				height: '100%',
				display: 'flex',
				'flex-direction': 'column',
				'align-items': 'center',
				'justify-content': 'center',
				gap: '8px',
				color: 'var(--color-text-maxcontrast)',
			}
		},
	},

	watch: {
		// When the URL changes (e.g. the user edited the placement) re-arm
		// the `<img>` so a previously failed URL doesn't lock the cell into
		// the placeholder.
		url() {
			this.loadFailed = false
		},
	},

	methods: {
		/**
		 * Swap to the placeholder + "Image failed to load" annotation when
		 * the `<img>` reports an error. The event is swallowed so no exception
		 * bubbles up into the grid layer.
		 *
		 * @return {void}
		 */
		onImageError() {
			this.loadFailed = true
		},

		/**
		 * Open `link` in a new tab on click when non-empty, no-op otherwise.
		 * `noopener,noreferrer` prevents the opened page reaching back via
		 * `window.opener`.
		 *
		 * @return {void}
		 */
		onClick() {
			if (this.hasLink === false) {
				return
			}
			window.open(this.link, '_blank', 'noopener,noreferrer')
		},
	},
}
</script>

<style scoped>
.cn-image-widget {
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.cn-image-widget__img {
	display: block;
}

.cn-image-widget__placeholder {
	width: 100%;
	height: 100%;
}

.cn-image-widget__placeholder-label {
	font-size: 13px;
}
</style>
