<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-links-widget" :class="layoutClass" :style="rootStyle">
		<div v-if="!hasVisibleSections" class="cn-links-widget__empty">
			{{ emptyStateText }}
		</div>
		<template v-else>
			<section
				v-for="(section, sIdx) in visibleSections"
				:key="sIdx"
				class="cn-links-widget__section">
				<h3
					v-if="showSectionTitles && section.title"
					class="cn-links-widget__section-title">
					{{ section.title }}
				</h3>
				<div class="cn-links-widget__items">
					<a
						v-for="(link, lIdx) in section.links"
						:key="lIdx"
						class="cn-links-widget__link"
						:class="`cn-links-widget__link--${linkLayout}`"
						:href="safeHref(link.url)"
						:target="openInNewTab ? '_blank' : '_self'"
						:rel="relAttr(link.url)"
						:title="linkLayout === 'icon-only' ? link.label : null"
						@click="onLinkClick($event, link.url)">
						<span
							v-if="linkLayout !== 'inline-no-icon' || resolveIconType(link.icon) !== null"
							class="cn-links-widget__icon-wrap"
							:style="iconWrapStyle">
							<img
								v-if="resolveIconType(link.icon) === 'img'"
								:src="link.icon"
								:width="iconPx"
								:height="iconPx"
								alt="">
							<CnWidgetIcon
								v-else
								:name="link.icon || ''"
								:size="iconPx" />
						</span>
						<span v-if="linkLayout !== 'icon-only'" class="cn-links-widget__label">
							{{ link.label }}
						</span>
						<span
							v-if="linkLayout === 'card' && showLinkDescriptions && link.description"
							class="cn-links-widget__description">
							{{ link.description }}
						</span>
					</a>
				</div>
			</section>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'
import { isCustomIconUrl } from '../CnWidgetGrid/widgetIcons.js'

const VALID_LAYOUTS = Object.freeze(['card', 'inline', 'icon-only'])
const VALID_SIZES = Object.freeze(['small', 'medium', 'large'])
const ICON_PX = Object.freeze({ small: 24, medium: 40, large: 64 })

/**
 * CnLinksWidget — multi-column grid of curated link cards organised into named
 * sections. Renders three layout modes (`card`, `inline`, `icon-only`).
 *
 * Empty sections are filtered at render time but retained in config. Icon
 * resolution: URL-shaped icons render as `<img>`, otherwise registry names
 * route through {@link CnWidgetIcon}. The grid column count is clamped 1–6
 * (default 3). External URLs use `rel="noopener noreferrer"`; edit-mode clicks
 * are suppressed.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnLinksWidget',

	components: {
		CnWidgetIcon,
	},

	props: {
		/**
		 * Persisted widget content `{sections, columns, linkLayout, iconSize,
		 * openInNewTab, showSectionTitles, showLinkDescriptions}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/** Whether the current user is an admin (pairs with `canEdit`). */
		isAdmin: {
			type: Boolean,
			default: false,
		},
		/** Whether the surrounding dashboard shell is in edit mode. */
		canEdit: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		/**
		 * The configured sections.
		 *
		 * @return {object[]} the sections array.
		 */
		sections() {
			const raw = this.content?.sections
			return Array.isArray(raw) ? raw : []
		},

		/**
		 * The grid column count, clamped to 1–6 (default 3).
		 *
		 * @return {number} the column count.
		 */
		columns() {
			const raw = Number(this.content?.columns)
			if (!Number.isFinite(raw)) {
				return 3
			}
			return Math.max(1, Math.min(6, Math.round(raw)))
		},

		/**
		 * The validated link layout (default `card`).
		 *
		 * @return {string} one of card/inline/icon-only.
		 */
		linkLayout() {
			const declared = this.content?.linkLayout
			return VALID_LAYOUTS.includes(declared) ? declared : 'card'
		},

		/**
		 * The layout CSS modifier class.
		 *
		 * @return {string} the layout class.
		 */
		layoutClass() {
			return `cn-links-widget--${this.linkLayout}`
		},

		/**
		 * The validated icon size token (default `medium`).
		 *
		 * @return {string} one of small/medium/large.
		 */
		iconSize() {
			const declared = this.content?.iconSize
			return VALID_SIZES.includes(declared) ? declared : 'medium'
		},

		/**
		 * The pixel size for the current icon-size token.
		 *
		 * @return {number} the icon pixel size.
		 */
		iconPx() {
			return ICON_PX[this.iconSize]
		},

		/**
		 * Whether links open in a new tab (default true).
		 *
		 * @return {boolean} the openInNewTab flag.
		 */
		openInNewTab() {
			const value = this.content?.openInNewTab
			return value === undefined ? true : Boolean(value)
		},

		/**
		 * Whether section titles render (default true).
		 *
		 * @return {boolean} the showSectionTitles flag.
		 */
		showSectionTitles() {
			const value = this.content?.showSectionTitles
			return value === undefined ? true : Boolean(value)
		},

		/**
		 * Whether link descriptions render (default true).
		 *
		 * @return {boolean} the showLinkDescriptions flag.
		 */
		showLinkDescriptions() {
			const value = this.content?.showLinkDescriptions
			return value === undefined ? true : Boolean(value)
		},

		/**
		 * The sections that have at least one valid link (hidden when empty).
		 *
		 * @return {Array<{title: string, links: object[]}>} the visible sections.
		 */
		visibleSections() {
			return this.sections
				.filter((section) => Array.isArray(section?.links) && section.links.length > 0)
				.map((section) => ({
					title: typeof section.title === 'string' ? section.title : '',
					links: section.links.filter((l) => l && typeof l.url === 'string' && l.url !== ''),
				}))
				.filter((section) => section.links.length > 0)
		},

		/**
		 * Whether any visible sections exist.
		 *
		 * @return {boolean} true when there is something to render.
		 */
		hasVisibleSections() {
			return this.visibleSections.length > 0
		},

		/**
		 * Inline style exposing the column count as a CSS variable.
		 *
		 * @return {object} the root style.
		 */
		rootStyle() {
			return {
				'--cn-links-widget-cols': this.columns,
			}
		},

		/**
		 * Inline style for the icon wrapper.
		 *
		 * @return {object} the icon-wrap style.
		 */
		iconWrapStyle() {
			return {
				width: `${this.iconPx}px`,
				height: `${this.iconPx}px`,
			}
		},

		/**
		 * The localised empty-state text.
		 *
		 * @return {string} the empty-state message.
		 */
		emptyStateText() {
			return t('nextcloud-vue', 'No links yet — click the gear icon to add some.')
		},

		/**
		 * Whether the widget is in edit mode (clicks suppressed).
		 *
		 * @return {boolean} true when admin + canEdit.
		 */
		isInEditMode() {
			return this.isAdmin === true && this.canEdit === true
		},
	},

	methods: {
		/**
		 * Icon resolution discriminator — `'img'` for URL icons, else `null`
		 * (template falls through to {@link CnWidgetIcon}).
		 *
		 * @param {string} icon the raw icon field.
		 * @return {string|null} `'img'` or `null`.
		 */
		resolveIconType(icon) {
			return isCustomIconUrl(icon) ? 'img' : null
		},

		/**
		 * Sanitise a link URL — only http(s) and root-relative (no `..`) URLs
		 * reach the rendered `href`; everything else yields `'#'`.
		 *
		 * @param {string} url the raw URL.
		 * @return {string} the sanitised URL, or `'#'`.
		 */
		safeHref(url) {
			if (typeof url !== 'string' || url === '') {
				return '#'
			}
			if (url.startsWith('/') && !url.includes('..')) {
				return url
			}
			if (url.startsWith('http://') || url.startsWith('https://')) {
				return url
			}
			return '#'
		},

		/**
		 * Compute the anchor rel attribute — external URLs get
		 * `noopener noreferrer`; internal URLs omit it.
		 *
		 * @param {string} url the raw URL.
		 * @return {string|null} the rel value, or `null` to omit.
		 */
		relAttr(url) {
			if (!this.openInNewTab) {
				return null
			}
			if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
				return 'noopener noreferrer'
			}
			return null
		},

		/**
		 * Suppress navigation in edit mode and on inert (sanitised) links.
		 *
		 * @param {MouseEvent} event the click event.
		 * @param {string} url the raw URL.
		 * @return {void}
		 */
		onLinkClick(event, url) {
			if (this.isInEditMode) {
				event.preventDefault()
				return
			}
			if (this.safeHref(url) === '#') {
				event.preventDefault()
			}
		},
	},
}
</script>

<style scoped>
.cn-links-widget {
	width: 100%;
	height: 100%;
	overflow: auto;
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-links-widget__empty {
	margin: auto;
	color: var(--color-text-maxcontrast);
	text-align: center;
	font-size: 14px;
}

.cn-links-widget__section {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-links-widget__section-title {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
	color: var(--color-text-light, var(--color-main-text));
}

.cn-links-widget__items {
	display: grid;
	grid-template-columns: repeat(var(--cn-links-widget-cols, 3), 1fr);
	gap: 8px;
}

.cn-links-widget--icon-only .cn-links-widget__items {
	grid-template-columns: repeat(var(--cn-links-widget-cols, 3), minmax(0, 1fr));
	gap: 12px;
	justify-items: center;
}

.cn-links-widget__link {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--color-main-text);
	text-decoration: none;
	border-radius: var(--border-radius, 4px);
	padding: 6px 8px;
	transition: background-color 0.12s ease;
}

.cn-links-widget__link:hover,
.cn-links-widget__link:focus-visible {
	background-color: var(--color-background-hover);
	text-decoration: none;
}

.cn-links-widget__link--card {
	flex-direction: column;
	align-items: flex-start;
	padding: 12px;
	border: 1px solid var(--color-border);
	background-color: var(--color-main-background);
}

.cn-links-widget__link--icon-only {
	justify-content: center;
	padding: 8px;
}

.cn-links-widget__icon-wrap {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.cn-links-widget__label {
	font-size: 14px;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.cn-links-widget__link--card .cn-links-widget__label {
	white-space: normal;
}

.cn-links-widget__description {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	line-height: 1.4;
}

@media (max-width: 600px) {
	.cn-links-widget__items {
		grid-template-columns: 1fr;
	}
}
</style>
