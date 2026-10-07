<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-header-widget" :class="{ 'cn-header-widget--plain': isPlain, 'cn-header-widget--ground': isGround, 'cn-header-widget--with-views': viewOptions.length > 0, 'cn-header-widget--with-emblem': emblem !== null }" :style="wrapperStyle">
		<div
			v-if="hasOverlay"
			class="cn-header-widget__overlay"
			:style="overlayStyle"
			aria-hidden="true" />
		<!-- The emblem beside the greeting (`content.emblem`): a URL, or
		     `true` for the theme's emblem (--nldesign-emblem-url). Decoration. -->
		<img
			v-if="emblem && emblem !== true"
			class="cn-header-widget__emblem"
			:src="emblem"
			alt=""
			data-testid="cn-header-widget-emblem">
		<span
			v-else-if="emblem === true"
			class="cn-header-widget__emblem cn-header-widget__emblem--theme"
			aria-hidden="true"
			data-testid="cn-header-widget-emblem" />
		<div class="cn-header-widget__content" :style="contentStyle">
			<p
				v-if="dateLine"
				class="cn-header-widget__date"
				:style="dateStyle"
				data-testid="cn-header-widget-date">
				{{ dateLine }}
			</p>
			<h2 v-if="hasTitle" class="cn-header-widget__title" :style="textStyle">
				{{ headingText }}
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
		<!-- A view switch at the right of the heading (`content.views`): "My
		     work / My team" as a segmented control whose options are routes,
		     or views of the page the widget sits on (`option.view`); a view
		     option controls the page's view region. -->
		<div v-if="viewOptions.length > 0" class="cn-header-widget__views">
			<CnSegmentedControl
				:options="viewOptions"
				:modelValue="activeView"
				:ariaLabel="viewsLabel"
				:controls="viewsRegionId"
				data-testid="cn-header-widget-views"
				@update:modelValue="onViewChange" />
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
import { getCurrentUser } from '@nextcloud/auth'
import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'
import CnSegmentedControl from '../CnSegmentedControl/CnSegmentedControl.vue'
import { resolveImageUrl } from '../../utils/resolveImageUrl.js'

const ALLOWED_OVERLAY_MODES = ['none', 'tint', 'gradient-bottom']
const ALLOWED_HEIGHTS = ['small', 'medium', 'large', 'xlarge']
const ALLOWED_TEXT_ALIGN = ['left', 'center', 'right']
const ALLOWED_VERTICAL_ALIGN = ['top', 'middle', 'bottom']
const ALLOWED_CTA_STYLES = ['primary', 'secondary', 'ghost']

/** Marks a switch option that selects a page view rather than a route. */
const VIEW_OPTION_PREFIX = 'view:'

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
 * Optional greeting: `greeting: true` makes the heading greet the signed-in
 * user by time of day and first name ("Good afternoon, Pieter"; `"full"` uses
 * the whole display name), and `showDate: true` adds a line with today's
 * date above it. `plain: true` drops the coloured background and aligns the
 * text to the start, which is how a greeting usually sits on a dashboard.
 *
 * ```json
 * { "widgetKey": "header", "props": { "content": { "greeting": true, "showDate": true, "plain": true } } }
 * ```
 *
 * Registered as the `header` dashboard widget type via the renderer's
 * `index.js`.
 */
export default {
	name: 'CnHeaderWidget',

	components: { CnSegmentedControl },

	inject: {
		/**
		 * Host translate function provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). The
		 * manifest-authored `content.title` / `content.subtitle` / CTA label
		 * are run through it. Defaults to an identity function so an
		 * untranslated key renders as itself.
		 */
		cnTranslate: { default: () => (key) => key },
		/**
		 * The views of the page this widget sits on, provided by
		 * CnDashboardPage / CnDetailPage (`views`). An option with a `view`
		 * selects one of them. Null outside such a page.
		 */
		cnPageViews: { default: null },
	},

	props: {
		/**
		 * Persisted widget content: `{title, subtitle, backgroundImageUrl,
		 * backgroundImageFileId, backgroundColor, overlayMode, overlayColor,
		 * overlayOpacity, textColor, textAlign, verticalAlign, height, cta,
		 * greeting, showDate, kicker, emblem, plain, ground, views}`. All fields are optional except
		 * `title` (or `greeting`); unknown enum values collapse to documented
		 * defaults and the renderer never throws. `views` is
		 * `{ ariaLabel?, options: [{ label, route, params? } | { label, view }] }`:
		 * a segmented control at the right of the heading whose checked option
		 * is the current route; choosing another pushes its route. An option
		 * with `view` selects that view of the page the widget sits on (the
		 * page's `views`) instead, and the page then draws no switch of its
		 * own. `ground: true`
		 * draws the greeting on the page ground: the plain look with no
		 * padding, a 32px heading and the date line 6px above it (a dashboard
		 * also drops the widget's card for it). A ground greeting takes its
		 * own height rather than its grid cell's, so a view switch sits on
		 * the heading's line. `kicker` (an i18n key) prefixes the date line, as
		 * "Customer contact · Tuesday 6 October". `emblem` (a URL, or `true`
		 * for the theme's `--nldesign-emblem-url`) draws the emblem beside the
		 * date line and heading, 52px high (`--cn-header-emblem-size`).
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/* eslint-disable vue/no-unused-properties -- part of the widget contract: CnContainerChild and the dashboard pages bind :placement on every widget, so declaring it keeps it out of $attrs */
		/**
		 * Placement entity — reserved to match the renderer contract.
		 *
		 * @type {object}
		 */
		placement: {
			type: Object,
			default: null,
		},
		/* eslint-enable vue/no-unused-properties */

		/**
		 * The moment the greeting and the date line are computed for. Leave
		 * empty for the current time.
		 *
		 * @type {Date|null}
		 */
		now: {
			type: Date,
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
		/**
		 * Effective translate function: the injected `cnTranslate` (the host
		 * app's bound `t()`), identity by default.
		 *
		 * @return {(key: string) => string}
		 */
		effectiveTranslate() {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
		},

		/** The header title, translated, or '' when absent. */
		title() {
			const value = this.content && this.content.title
			return typeof value === 'string' && value !== '' ? this.effectiveTranslate(value) : ''
		},

		/** The header subtitle, translated, or '' when absent. */
		subtitle() {
			const value = this.content && this.content.subtitle
			return typeof value === 'string' && value !== '' ? this.effectiveTranslate(value) : ''
		},

		/** Whether a heading renders: a non-empty title or a greeting. */
		hasTitle() {
			return this.headingText !== ''
		},

		/**
		 * The moment the greeting and date line are computed for.
		 *
		 * @return {Date}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 */
		reference() {
			return this.now instanceof Date ? this.now : new Date()
		},

		/**
		 * The view switch's options from `content.views.options`: each
		 * `{ label, route, params? }` with a non-empty label and route becomes
		 * a segmented-control option keyed on its route name (the label goes
		 * through the host translate function). Empty without a router, so
		 * the switch cannot offer routes it cannot follow.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-greeting-header-switches-views
		 * @return {Array<{value: string, label: string}>}
		 */
		viewOptions() {
			const raw = this.content && this.content.views && this.content.views.options
			if (!Array.isArray(raw)) {
				return []
			}
			const pageViewIds = this.pageViewIds
			return raw
				.filter((o) => o && typeof o.label === 'string' && o.label !== '')
				.map((o) => {
					if (typeof o.view === 'string' && o.view !== '') {
						return pageViewIds.includes(o.view) ? { value: VIEW_OPTION_PREFIX + o.view, label: this.cnTranslate(o.label) } : null
					}
					if (typeof o.route === 'string' && o.route !== '' && this.$router) {
						return { value: o.route, label: this.cnTranslate(o.label) }
					}
					return null
				})
				.filter(Boolean)
		},

		/**
		 * The ids of the page's views, empty outside a page with views.
		 *
		 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-a-greeting-header-can-switch-the-pages-views
		 * @return {string[]}
		 */
		pageViewIds() {
			const views = this.cnPageViews && Array.isArray(this.cnPageViews.views) ? this.cnPageViews.views : []
			return views.map((view) => view.id)
		},

		/**
		 * The id of the page's view region when an option selects a view,
		 * for the options' `aria-controls`; '' otherwise.
		 *
		 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-the-view-switch-is-accessible
		 * @return {string}
		 */
		viewsRegionId() {
			const hasViewOption = this.viewOptions.some((o) => o.value.startsWith(VIEW_OPTION_PREFIX))
			return hasViewOption && this.cnPageViews ? (this.cnPageViews.regionId || '') : ''
		},

		/**
		 * The checked view: the option whose route is the current route, else
		 * the first option (a switch always has one checked option).
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-greeting-header-switches-views
		 * @return {string|null}
		 */
		activeView() {
			const options = this.viewOptions
			if (options.length === 0) {
				return null
			}
			const activeView = this.cnPageViews ? this.cnPageViews.activeId : null
			const viewMatch = activeView ? options.find((o) => o.value === VIEW_OPTION_PREFIX + activeView) : null
			if (viewMatch) {
				return viewMatch.value
			}
			const current = this.$route && this.$route.name
			const match = options.find((o) => o.value === current)
			return match ? match.value : options[0].value
		},

		/**
		 * Accessible name of the view switch: `content.views.ariaLabel`
		 * through the host translate function, else "View".
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-greeting-header-switches-views
		 * @return {string}
		 */
		viewsLabel() {
			const label = this.content && this.content.views && this.content.views.ariaLabel
			return label ? this.cnTranslate(label) : t('nextcloud-vue', 'Views')
		},

		/**
		 * Whether the plain presentation is on (no coloured background).
		 *
		 * @return {boolean}
		 */
		isPlain() {
			return Boolean(this.content && (this.content.plain === true || this.content.ground === true))
		},

		/**
		 * Whether the greeting sits on the page ground (`content.ground`):
		 * the plain look without the card padding, so the date line and the
		 * heading align with the page edge as the board draws them. Off by
		 * default.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-a-greeting-can-sit-on-the-page-ground
		 * @return {boolean}
		 */
		isGround() {
			return Boolean(this.content && this.content.ground === true)
		},

		/**
		 * The name the greeting uses: the first word of the display name, or
		 * the whole display name for `greeting: "full"`. '' when unknown.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 */
		greetingName() {
			let user
			try {
				user = getCurrentUser()
			} catch {
				user = null
			}
			const displayName = (user && typeof user.displayName === 'string') ? user.displayName.trim() : ''
			if (displayName === '') {
				return ''
			}
			return this.content.greeting === 'full' ? displayName : displayName.split(/\s+/)[0]
		},

		/**
		 * The greeting for the time of day, with the user's name when known,
		 * or '' when the greeting is off.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 */
		greetingText() {
			const greeting = this.content && this.content.greeting
			if (greeting !== true && greeting !== 'full' && greeting !== 'first') {
				return ''
			}
			const hour = this.reference.getHours()
			const name = this.greetingName
			if (hour < 12) {
				return name ? t('nextcloud-vue', 'Good morning, {name}', { name }) : t('nextcloud-vue', 'Good morning')
			}
			if (hour < 18) {
				return name ? t('nextcloud-vue', 'Good afternoon, {name}', { name }) : t('nextcloud-vue', 'Good afternoon')
			}
			return name ? t('nextcloud-vue', 'Good evening, {name}', { name }) : t('nextcloud-vue', 'Good evening')
		},

		/**
		 * The heading: the greeting when it is on, else the title.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 */
		headingText() {
			return this.greetingText || this.title
		},

		/**
		 * The kicker line above the heading: `content.kicker` (through the
		 * host translate function, e.g. "Customer contact") and today's date
		 * written out ("Monday 5 October 2026") when `showDate` is on, joined
		 * by " · ". '' when neither is set. Without `kicker` this is the date
		 * line as before.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 */
		dateLine() {
			const kicker = this.content && typeof this.content.kicker === 'string' && this.content.kicker !== ''
				? this.effectiveTranslate(this.content.kicker)
				: ''
			const date = this.dateText
			return [kicker, date].filter((part) => part !== '').join(' · ')
		},

		/**
		 * Today's date written out, or '' when `showDate` is off.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-greeting-kicker-can-carry-a-prefix
		 * @return {string}
		 */
		dateText() {
			if (!this.content || this.content.showDate !== true) {
				return ''
			}
			const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
			let locale
			try {
				locale = getCanonicalLocale()
			} catch {
				locale = undefined
			}
			try {
				return new Intl.DateTimeFormat(locale || undefined, options).format(this.reference)
			} catch {
				return new Intl.DateTimeFormat(undefined, options).format(this.reference)
			}
		},

		/**
		 * Inline style of the date line: the heading's colour, or the muted
		 * text colour on a plain header.
		 *
		 * @return {object}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 */
		dateStyle() {
			return {
				color: this.isPlain && !(this.content && this.content.textColor) ? 'var(--color-text-maxcontrast)' : this.textColor,
				margin: 0,
			}
		},

		/**
		 * The emblem beside the greeting: the URL `content.emblem` names,
		 * `true` for the theme's emblem, or null without the key.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-greeting-can-carry-the-emblem
		 * @return {string|true|null}
		 */
		emblem() {
			const value = this.content && this.content.emblem
			if (value === true) {
				return true
			}
			return typeof value === 'string' && value !== '' ? resolveImageUrl(value) : null
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

		/**
		 * Resolved background colour (default theme primary).
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 */
		backgroundColor() {
			const value = this.content && this.content.backgroundColor
			if (typeof value === 'string' && value !== '') {
				return value
			}
			if (this.isPlain) {
				return 'transparent'
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

		/**
		 * Resolved text alignment (default `center`).
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 */
		textAlign() {
			const declared = this.content && this.content.textAlign
			if (typeof declared === 'string' && ALLOWED_TEXT_ALIGN.includes(declared)) {
				return declared
			}
			return this.isPlain ? 'left' : 'center'
		},

		/** Resolved vertical alignment (default `middle`). */
		verticalAlign() {
			const declared = this.content && this.content.verticalAlign
			if (typeof declared === 'string' && ALLOWED_VERTICAL_ALIGN.includes(declared)) {
				return declared
			}
			return 'middle'
		},

		/**
		 * Resolved text colour with an auto-contrast fallback.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 */
		textColor() {
			const value = this.content && this.content.textColor
			if (typeof value === 'string' && value !== '') {
				return value
			}
			if (this.hasBackgroundImage) {
				return '#ffffff'
			}
			if (this.isPlain && !(this.content && this.content.backgroundColor)) {
				return 'var(--color-main-text)'
			}
			return this.isLightColor(this.backgroundColor) ? '#000000' : '#ffffff'
		},

		/**
		 * Inline style for the banner wrapper.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-ground-greeting-lines-its-switch-up-with-the-heading
		 * @return {object}
		 */
		wrapperStyle() {
			const style = {
				position: 'relative',
				width: '100%',
				// Fill the dashboard grid cell so the banner resizes with the
				// widget. A fixed pixel height ignored the cell, which made the
				// banner un-resizable and made it overflow/scroll inside a
				// smaller cell. The grid controls the size now.
				// On the page ground there is no banner to fill the cell with:
				// the greeting takes its own height, so the view switch lines
				// up with the heading instead of the bottom of a taller cell,
				// and a size-to-content cell can shrink to it.
				height: this.isGround ? 'auto' : '100%',
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

		/**
		 * Inline style for the content flex container.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-ground-greeting-lines-its-switch-up-with-the-heading
		 */
		contentStyle() {
			return {
				position: 'relative',
				'z-index': 1,
				// Beside a view switch the content shares the row instead of
				// taking the whole width (see .cn-header-widget--with-views).
				width: this.viewOptions.length > 0 ? 'auto' : '100%',
				height: this.isGround ? 'auto' : '100%',
				display: 'flex',
				'flex-direction': 'column',
				'align-items': this.flexAlignFromTextAlign,
				'justify-content': VERTICAL_ALIGN_FLEX[this.verticalAlign],
				// Plain drops the coloured background, not the card padding:
				// at 0 the greeting sat flush against the card's left edge.
				// Ground has no card, so it has no padding either.
				padding: this.isGround ? '0' : (this.isPlain ? '16px' : '16px 24px'),
				'box-sizing': 'border-box',
				gap: this.isGround ? '6px' : '8px',
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

		/** The CTA label, translated. */
		ctaLabel() {
			return this.hasCta && this.cta.label ? this.effectiveTranslate(this.cta.label) : ''
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
		 * Follow the chosen view: push its route (with the option's `params`
		 * when declared). Nothing happens for the route already shown.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-greeting-header-switches-views
		 * @param {string} route The chosen option's route name.
		 * @return {void}
		 */
		onViewChange(route) {
			if (typeof route === 'string' && route.startsWith(VIEW_OPTION_PREFIX)) {
				if (this.cnPageViews && typeof this.cnPageViews.select === 'function') {
					this.cnPageViews.select(route.slice(VIEW_OPTION_PREFIX.length))
				}
				return
			}
			if (!this.$router || !route || route === (this.$route && this.$route.name)) {
				return
			}
			const declared = (this.content.views.options || []).find((o) => o && o.route === route) || {}
			const target = { name: route }
			if (declared.params && typeof declared.params === 'object') {
				target.params = declared.params
			}
			this.$router.push(target)
		},

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

.cn-header-widget--plain {
	min-height: 0;
	border-radius: 0;
}

/* With a view switch the heading and the switch share one row, the switch
   at the right and bottom-aligned with the heading; on a narrow card the
   switch wraps under it. */
.cn-header-widget--with-views {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: calc(2 * var(--default-grid-baseline)) calc(4 * var(--default-grid-baseline));
}

.cn-header-widget--with-views .cn-header-widget__content {
	flex: 1 1 320px;
	width: auto;
}

/* The emblem beside the greeting (`content.emblem`): on one row with the
   date line and heading, centred on them, as LpStart draws it. */
.cn-header-widget--with-emblem {
	display: flex;
	column-gap: var(--cn-header-emblem-gap, 16px);
}

.cn-header-widget--with-emblem .cn-header-widget__content {
	flex: 1 1 auto;
	width: auto;
	min-width: 0;
}

.cn-header-widget__emblem {
	position: relative;
	z-index: 1;
	flex: none;
	align-self: center;
	height: var(--cn-header-emblem-size, 52px);
	width: auto;
}

.cn-header-widget__emblem--theme {
	width: var(--cn-header-emblem-size, 52px);
	background: var(--nldesign-emblem-url) center / contain no-repeat;
}

.cn-header-widget__views {
	position: relative;
	z-index: 1;
	flex: 0 0 auto;
	padding: 16px;
}

/* On the page ground (`content.ground`): no card, so no inset around the
   view switch, and the heading at the board's 32px. */
.cn-header-widget--ground .cn-header-widget__views {
	padding: 0;
}

.cn-header-widget--ground .cn-header-widget__title {
	font-size: var(--cn-header-ground-title-size, 32px);
	letter-spacing: -0.01em;
}

.cn-header-widget__date {
	font-size: 14px;
	line-height: 1.4;
	margin: 0;
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
	inset-inline-start: -9999px;
	top: -9999px;
}

@media print {
	.cn-header-widget {
		print-color-adjust: exact;
		-webkit-print-color-adjust: exact;
	}
}
</style>
