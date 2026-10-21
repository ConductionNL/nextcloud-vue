<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<component
		:is="hasLink ? 'a' : 'div'"
		class="cn-image-widget"
		:class="{ 'cn-image-widget--link': hasLink }"
		:style="wrapperStyle"
		:href="hasLink ? safeHref(link) : null"
		:target="hasLink ? '_blank' : null"
		:rel="hasLink ? 'noopener noreferrer' : null">
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
	</component>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import CnIcon from '../CnIcon/CnIcon.vue'
import { readPath } from '../../utils/readPath.js'
import { resolveImageUrl } from '../../utils/resolveImageUrl.js'
import { safeHref } from '../../utils/safeHref.js'

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
 * Click-through: when `link` is non-empty the cell is an `<a target="_blank"
 * rel="noopener noreferrer">` to it, so it can also be middle-clicked or
 * copied. An empty `link` renders a plain `<div>`.
 *
 * Registered as the `image` dashboard widget type via the renderer's
 * `index.js`.
 */
export default {
	name: 'CnImageWidget',

	components: {
		CnIcon,
	},

	inject: {
		cnObjectContext: { default: null },
	},

	props: {
		/**
		 * Persisted widget content blob: `{url, alt, link, fit}`. On a detail
		 * page `field` names the record's field holding the image (instead of
		 * `url`) and `altField` the one holding its text (instead of `alt`); a
		 * field value that is a Files path shows through Nextcloud's preview.
		 *
		 * @type {{url: string, alt: string, link: string, fit: string, field?: string, altField?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The detail page's record, which `content.field` and
		 * `content.altField` read. Without it the injected detail context's
		 * object is read.
		 *
		 * @type {object|null}
		 */
		objectData: {
			type: Object,
			default: null,
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
		record() {
			const ctx = this.cnObjectContext && 'value' in this.cnObjectContext ? this.cnObjectContext.value : this.cnObjectContext
			return this.objectData || (ctx && ctx.object) || null
		},

		url() {
			const field = this.content && this.content.field
			const value = typeof field === 'string' && field !== ''
				? readPath(this.record, field)
				: this.content && this.content.url
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
			const field = this.content && this.content.field
			const fromRecord = typeof field === 'string' && field !== ''
			if (fromRecord && this.url !== '' && !/^(https?:\/\/|app:|\/apps\/|data:)/i.test(this.url)) {
				return `${generateUrl('/core/preview.png')}?file=${encodeURIComponent(this.url)}&x=1200&y=630&a=1`
			}
			return resolveImageUrl(this.url)
		},

		/** The alt text, or '' when absent / non-string. */
		alt() {
			const field = this.content && this.content.altField
			const value = typeof field === 'string' && field !== ''
				? readPath(this.record, field)
				: this.content && this.content.alt
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
		safeHref,

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
	},
}
</script>

<style scoped>
.cn-image-widget {
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.cn-image-widget--link {
	display: block;
	color: inherit;
	text-decoration: none;
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
