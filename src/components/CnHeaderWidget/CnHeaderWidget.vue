<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-header-widget" :style="wrapperStyle">
		<div
			v-if="hasOverlay"
			class="cn-header-widget__overlay"
			:style="overlayStyle"
			aria-hidden="true" />
		<div class="cn-header-widget__content" :style="contentStyle">
			<h2 v-if="hasTitle" class="cn-header-widget__title" :style="textStyle">
				{{ title }}
			</h2>
			<p v-if="hasSubtitle" class="cn-header-widget__subtitle" :style="textStyle">
				{{ subtitle }}
			</p>
			<a
				v-if="hasCta"
				:href="ctaUrl"
				:class="ctaClasses"
				:target="ctaTarget"
				:rel="ctaRel"
				:aria-label="ctaAriaLabel">
				{{ ctaLabel }}
			</a>
		</div>
		<img
			v-if="hasBackgroundImage"
			class="cn-header-widget__probe"
			:src="backgroundImageUrl"
			alt=""
			aria-hidden="true"
			@error="onImageError">
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { resolveImageUrl } from '../../utils/resolveImageUrl.js'

const ALLOWED_OVERLAY_MODES = ['none', 'tint', 'gradient-bottom']
const ALLOWED_HEIGHTS = ['small', 'medium', 'large', 'xlarge']
const ALLOWED_TEXT_ALIGN = ['left', 'center', 'right']
const ALLOWED_VERTICAL_ALIGN = ['top', 'middle', 'bottom']
const ALLOWED_CTA_STYLES = ['primary', 'secondary', 'ghost']

const HEIGHT_PIXELS = Object.freeze({
	small: 120,
	medium: 200,
	large: 320,
	xlarge: 480,
})

const VERTICAL_ALIGN_FLEX = Object.freeze({
	top: 'flex-start',
	middle: 'center',
	bottom: 'flex-end',
})

/**
 * CnHeaderWidget — full-width banner widget for dashboards. Renders a
 * configurable header with title, optional subtitle, optional background
 * image, optional colour overlay, and optional call-to-action button.
 *
 * Image source precedence: `backgroundImageFileId` takes priority over
 * `backgroundImageUrl` (resolved via the Nextcloud core preview route). When
 * the image fails to load the renderer silently falls back to the solid
 * `backgroundColor`; no error UI is shown.
 *
 * Height presets map to fixed pixels: small=120, medium=200, large=320,
 * xlarge=480. Title is `<h2>`, subtitle `<p>`, CTA `<a>` — all semantic HTML.
 * External CTA URLs (http/https) open in a new tab with
 * `rel="noopener noreferrer"`; relative / anchor URLs stay in the current tab.
 *
 * Registered as the `header` dashboard widget type via the renderer's
 * `index.js`.
 */
export default {
	name: 'CnHeaderWidget',

	props: {
		/**
		 * Persisted widget content: `{title, subtitle, backgroundImageUrl,
		 * backgroundImageFileId, backgroundColor, overlayMode, overlayColor,
		 * overlayOpacity, textColor, textAlign, verticalAlign, height, cta}`.
		 * All fields are optional except `title`; unknown enum values collapse
		 * to documented defaults and the renderer never throws.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Placement entity — reserved to match the renderer contract.
		 *
		 * @type {object}
		 */
		placement: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			// Set true once the background image fires a DOM `error` so
			// subsequent renders fall back to `backgroundColor` only. The
			// probe `<img>` is invisible — its only job is load-failure
			// detection for the CSS background.
			imageFailed: false,
		}
	},

	computed: {
		/** The header title, or '' when absent. */
		title() {
			const value = this.content && this.content.title
			return typeof value === 'string' ? value : ''
		},

		/** The header subtitle, or '' when absent. */
		subtitle() {
			const value = this.content && this.content.subtitle
			return typeof value === 'string' ? value : ''
		},

		/** Whether a non-empty title is set. */
		hasTitle() {
			return this.title !== ''
		},

		/** Whether a non-empty subtitle is set. */
		hasSubtitle() {
			return this.subtitle !== ''
		},

		/** Resolved background image URL (file id wins over URL). */
		backgroundImageUrl() {
			const fileId = this.content && this.content.backgroundImageFileId
			if (typeof fileId === 'number' && Number.isFinite(fileId) && fileId > 0) {
				return `/index.php/core/preview?fileId=${fileId}&x=1024&y=512&a=1`
			}
			const url = this.content && this.content.backgroundImageUrl
			// Accept http(s) plus uploaded/same-origin sources: data: and blob:
			// (from the form's upload) and root-relative paths (NC files/preview).
			// External http(s) images may still be blocked by the instance CSP —
			// uploading is the reliable, same-origin path. resolveImageUrl() adds
			// the webroot + /index.php to `/apps/...` resource paths so they load
			// on index.php-routed instances (other shapes pass through).
			if (typeof url === 'string' && /^(https?:\/\/|data:|blob:|\/)/i.test(url)) {
				return resolveImageUrl(url)
			}
			return ''
		},

		/** Whether a usable, non-errored background image is present. */
		hasBackgroundImage() {
			return this.backgroundImageUrl !== '' && this.imageFailed === false
		},

		/** Resolved background colour (default theme primary). */
		backgroundColor() {
			const value = this.content && this.content.backgroundColor
			if (typeof value === 'string' && value !== '') {
				return value
			}
			return 'var(--color-primary, #0070c0)'
		},

		/** Resolved overlay mode (`tint` when an image is present, else `none`). */
		overlayMode() {
			const declared = this.content && this.content.overlayMode
			if (typeof declared === 'string' && ALLOWED_OVERLAY_MODES.includes(declared)) {
				return declared
			}
			return this.hasBackgroundImage ? 'tint' : 'none'
		},

		/** Whether an overlay should render. */
		hasOverlay() {
			return this.overlayMode !== 'none'
		},

		/** Resolved overlay colour. */
		overlayColor() {
			const value = this.content && this.content.overlayColor
			if (typeof value === 'string' && value !== '') {
				return value
			}
			const bg = this.content && this.content.backgroundColor
			return (typeof bg === 'string' && bg !== '') ? bg : '#000000'
		},

		/** Resolved overlay opacity, clamped to 0..1 (default 0.4). */
		overlayOpacity() {
			const raw = this.content && this.content.overlayOpacity
			const value = typeof raw === 'number' ? raw : Number.parseFloat(raw)
			if (Number.isFinite(value) === false) {
				return 0.4
			}
			if (value < 0) {
				return 0
			}
			if (value > 1) {
				return 1
			}
			return value
		},

		/** Resolved height preset key (default `medium`). */
		height() {
			const declared = this.content && this.content.height
			if (typeof declared === 'string' && ALLOWED_HEIGHTS.includes(declared)) {
				return declared
			}
			return 'medium'
		},

		/** The pixel height for the active preset. */
		heightPixels() {
			return HEIGHT_PIXELS[this.height]
		},

		/** Resolved text alignment (default `center`). */
		textAlign() {
			const declared = this.content && this.content.textAlign
			if (typeof declared === 'string' && ALLOWED_TEXT_ALIGN.includes(declared)) {
				return declared
			}
			return 'center'
		},

		/** Resolved vertical alignment (default `middle`). */
		verticalAlign() {
			const declared = this.content && this.content.verticalAlign
			if (typeof declared === 'string' && ALLOWED_VERTICAL_ALIGN.includes(declared)) {
				return declared
			}
			return 'middle'
		},

		/** Resolved text colour with an auto-contrast fallback. */
		textColor() {
			const value = this.content && this.content.textColor
			if (typeof value === 'string' && value !== '') {
				return value
			}
			if (this.hasBackgroundImage) {
				return '#ffffff'
			}
			return this.isLightColor(this.backgroundColor) ? '#000000' : '#ffffff'
		},

		/** Inline style for the banner wrapper. */
		wrapperStyle() {
			const style = {
				position: 'relative',
				width: '100%',
				// Fill the dashboard grid cell so the banner resizes with the
				// widget. A fixed pixel height ignored the cell, which made the
				// banner un-resizable and made it overflow/scroll inside a
				// smaller cell. The grid controls the size now.
				height: '100%',
				overflow: 'hidden',
				'background-color': this.backgroundColor,
			}
			if (this.hasBackgroundImage) {
				style['background-image'] = `url("${this.backgroundImageUrl}")`
				style['background-size'] = 'cover'
				style['background-position'] = 'center center'
				style['background-repeat'] = 'no-repeat'
			}
			return style
		},

		/** Inline style for the overlay layer. */
		overlayStyle() {
			if (this.overlayMode === 'gradient-bottom') {
				return {
					position: 'absolute',
					inset: 0,
					'background-image': `linear-gradient(to bottom, transparent 50%, ${this.overlayColor} 100%)`,
					'pointer-events': 'none',
				}
			}
			return {
				position: 'absolute',
				inset: 0,
				'background-color': this.overlayColor,
				opacity: String(this.overlayOpacity),
				'pointer-events': 'none',
			}
		},

		/** Inline style for the content flex container. */
		contentStyle() {
			return {
				position: 'relative',
				'z-index': 1,
				width: '100%',
				height: '100%',
				display: 'flex',
				'flex-direction': 'column',
				'align-items': this.flexAlignFromTextAlign,
				'justify-content': VERTICAL_ALIGN_FLEX[this.verticalAlign],
				padding: '16px 24px',
				'box-sizing': 'border-box',
				gap: '8px',
				'text-align': this.textAlign,
			}
		},

		/** Flex cross-axis alignment derived from the text alignment. */
		flexAlignFromTextAlign() {
			if (this.textAlign === 'left') {
				return 'flex-start'
			}
			if (this.textAlign === 'right') {
				return 'flex-end'
			}
			return 'center'
		},

		/** Inline style applying the resolved text colour. */
		textStyle() {
			return {
				color: this.textColor,
				margin: 0,
			}
		},

		/** The validated CTA object, or null when incomplete. */
		cta() {
			const raw = this.content && this.content.cta
			if (raw === null || typeof raw !== 'object') {
				return null
			}
			const label = typeof raw.label === 'string' ? raw.label.trim() : ''
			const url = typeof raw.url === 'string' ? raw.url.trim() : ''
			if (label === '' || url === '') {
				return null
			}
			let style = raw.style
			if (typeof style !== 'string' || ALLOWED_CTA_STYLES.includes(style) === false) {
				style = 'primary'
			}
			return { label, url, style }
		},

		/** Whether a complete CTA is present. */
		hasCta() {
			return this.cta !== null
		},

		/** The CTA label. */
		ctaLabel() {
			return this.hasCta ? this.cta.label : ''
		},

		/** The CTA URL. */
		ctaUrl() {
			return this.hasCta ? this.cta.url : ''
		},

		/** Whether the CTA URL is an external http(s) link. */
		ctaIsExternal() {
			return this.hasCta && /^https?:\/\//i.test(this.ctaUrl)
		},

		/** The CTA anchor target (`_blank` for external links). */
		ctaTarget() {
			return this.ctaIsExternal ? '_blank' : null
		},

		/** The CTA anchor rel for external links. */
		ctaRel() {
			return this.ctaIsExternal ? 'noopener noreferrer' : null
		},

		/** The accessible CTA label, annotating external links. */
		ctaAriaLabel() {
			if (this.hasCta === false) {
				return null
			}
			if (this.ctaIsExternal) {
				return `${this.ctaLabel} (${t('nextcloud-vue', 'opens in new tab')})`
			}
			return this.ctaLabel
		},

		/** The CTA class list (base + style modifier). */
		ctaClasses() {
			if (this.hasCta === false) {
				return []
			}
			return [
				'cn-header-widget__cta',
				`cn-header-widget__cta--${this.cta.style}`,
			]
		},
	},

	watch: {
		backgroundImageUrl() {
			// Re-arm the probe so a previously failing URL can recover when
			// the user edits the placement.
			this.imageFailed = false
		},
	},

	methods: {
		/**
		 * Mark the background image as broken so the renderer falls back to
		 * the solid colour.
		 *
		 * @return {void}
		 */
		onImageError() {
			this.imageFailed = true
		},

		/**
		 * Quick perceived-luminance check on a CSS hex colour. Returns true
		 * for "light" (white text would be illegible). Non-hex colours
		 * collapse to false (assume dark) — the safer default.
		 *
		 * @param {string} color the CSS colour value.
		 * @return {boolean} true when the colour is perceived as light.
		 */
		isLightColor(color) {
			if (typeof color !== 'string') {
				return false
			}
			const match = color.trim().match(/^#([0-9a-f]{6})$/i)
			if (!match) {
				return false
			}
			const hex = match[1]
			const r = Number.parseInt(hex.slice(0, 2), 16)
			const g = Number.parseInt(hex.slice(2, 4), 16)
			const b = Number.parseInt(hex.slice(4, 6), 16)
			const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
			return luma > 0.6
		},
	},
}
</script>

<style scoped>
.cn-header-widget {
	width: 100%;
	height: 100%;
	min-height: 120px;
	border-radius: var(--border-radius-large, 8px);
	overflow: hidden;
}

.cn-header-widget__overlay {
	position: absolute;
	inset: 0;
}

.cn-header-widget__content {
	position: relative;
	z-index: 1;
}

.cn-header-widget__title {
	font-size: 28px;
	font-weight: 700;
	line-height: 1.2;
	margin: 0;
}

.cn-header-widget__subtitle {
	font-size: 16px;
	line-height: 1.4;
	margin: 0;
	opacity: 0.95;
}

.cn-header-widget__cta {
	display: inline-block;
	margin-top: 8px;
	padding: 10px 18px;
	border-radius: var(--border-radius, 4px);
	font-size: 14px;
	font-weight: 600;
	text-decoration: none;
	cursor: pointer;
	transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.cn-header-widget__cta:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.cn-header-widget__cta--primary {
	background-color: var(--color-primary, #0070c0);
	color: var(--color-primary-text, #ffffff);
	border: 1px solid var(--color-primary, #0070c0);
}

.cn-header-widget__cta--secondary {
	background-color: var(--color-background-hover, rgba(255, 255, 255, 0.85));
	color: var(--color-main-text, #000000);
	border: 1px solid var(--color-border, #cccccc);
}

.cn-header-widget__cta--ghost {
	background-color: transparent;
	color: inherit;
	border: 1px solid currentColor;
}

.cn-header-widget__probe {
	position: absolute;
	width: 1px;
	height: 1px;
	opacity: 0;
	pointer-events: none;
	left: -9999px;
	top: -9999px;
}

@media print {
	.cn-header-widget {
		print-color-adjust: exact;
		-webkit-print-color-adjust: exact;
	}
}
</style>
