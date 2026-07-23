<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-dash-tile-widget"
		:style="rootStyle">
		<a
			:href="resolvedHref"
			class="cn-dash-tile-widget__link"
			:target="resolvedTarget"
			:rel="resolvedRel"
			:tabindex="isInEditMode ? -1 : 0"
			:aria-disabled="isInEditMode ? 'true' : 'false'"
			:style="linkStyle"
			@click="onClick">
			<span class="cn-dash-tile-widget__icon" aria-hidden="true">
				<svg
					v-if="iconType === 'svg'"
					class="cn-dash-tile-widget__svg"
					:style="{ fill: textColor }"
					viewBox="0 0 24 24">
					<path :d="icon" />
				</svg>
				<span
					v-else-if="iconType === 'class'"
					:class="['icon', icon]"
					class="cn-dash-tile-widget__icon-class" />
				<img
					v-else-if="iconType === 'url'"
					:src="icon"
					alt=""
					class="cn-dash-tile-widget__icon-img">
				<span
					v-else-if="iconType === 'emoji'"
					class="cn-dash-tile-widget__emoji">
					{{ icon }}
				</span>
			</span>
			<span class="cn-dash-tile-widget__title" :style="{ color: textColor }">
				{{ title }}
			</span>
		</a>
	</div>
</template>

<script>
import { generateUrl } from '@nextcloud/router'

/**
 * CnDashTileWidget — registry-driven renderer for the `tile` dashboard widget
 * type. Renders a clickable card with an icon, title, and configurable colours
 * that navigates based on the `linkType` discriminator (`app` → resolved
 * Nextcloud route, `url` → external link opened in a new tab).
 *
 * Dual-shape compatibility: the renderer reads from BOTH the new inline
 * `content.{title, icon, ...}` shape AND the legacy flat
 * `placement.tile{Title,Icon,...}` columns so dashboards holding tile
 * placements created via the deprecated reusable-tile flow keep rendering
 * without a migration step.
 *
 * (Named `CnDashTileWidget` to avoid clobbering the library's existing
 * quick-access `CnTileWidget`; registered under widget type `tile`.)
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnDashTileWidget',

	props: {
		/**
		 * Persisted widget content `{title, icon, iconType, backgroundColor,
		 * textColor, linkType, linkValue}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * The full placement record — legacy fallback source for
		 * `placement.tile*` fields when `content` is empty.
		 *
		 * @type {object}
		 */
		placement: {
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
		 * Merged data view — prefer the new `content.{...}` shape, fall back
		 * to the legacy flat `placement.tile*` columns.
		 *
		 * @return {object} the normalised tile data.
		 */
		data() {
			const c = this.content || {}
			const p = this.placement || {}
			return {
				title: c.title ?? p.tileTitle ?? '',
				icon: c.icon ?? p.tileIcon ?? '',
				iconType: c.iconType ?? p.tileIconType ?? 'class',
				backgroundColor: c.backgroundColor ?? p.tileBackgroundColor ?? '#3b82f6',
				textColor: c.textColor ?? p.tileTextColor ?? '#ffffff',
				linkType: c.linkType ?? p.tileLinkType ?? 'app',
				linkValue: c.linkValue ?? p.tileLinkValue ?? '',
			}
		},

		/**
		 * The tile title.
		 *
		 * @return {string} the title.
		 */
		title() {
			return this.data.title
		},

		/**
		 * The icon value (registry key, URL, emoji, or SVG path).
		 *
		 * @return {string} the icon value.
		 */
		icon() {
			return this.data.icon
		},

		/**
		 * The icon-type discriminator.
		 *
		 * @return {string} one of class/url/emoji/svg.
		 */
		iconType() {
			return this.data.iconType
		},

		/**
		 * The tile background colour.
		 *
		 * @return {string} the colour.
		 */
		backgroundColor() {
			return this.data.backgroundColor
		},

		/**
		 * The tile text/icon colour.
		 *
		 * @return {string} the colour.
		 */
		textColor() {
			return this.data.textColor
		},

		/**
		 * The link-type discriminator.
		 *
		 * @return {string} `'app'` or `'url'`.
		 */
		linkType() {
			return this.data.linkType
		},

		/**
		 * The link target (app route or URL).
		 *
		 * @return {string} the link value.
		 */
		linkValue() {
			return this.data.linkValue
		},

		/**
		 * Whether the tile is currently in edit mode (clicks suppressed).
		 *
		 * @return {boolean} true when admin + canEdit.
		 */
		isInEditMode() {
			return this.isAdmin === true && this.canEdit === true
		},

		/**
		 * The resolved anchor href (app routes go through `generateUrl`).
		 *
		 * @return {string} the href, or `'#'`.
		 */
		resolvedHref() {
			if (this.linkValue === '') {
				return '#'
			}
			if (this.linkType === 'app') {
				return generateUrl(this.linkValue)
			}
			return this.linkValue
		},

		/**
		 * The anchor target.
		 *
		 * @return {string} `'_blank'` for URLs, `'_self'` otherwise.
		 */
		resolvedTarget() {
			return this.linkType === 'url' ? '_blank' : '_self'
		},

		/**
		 * The anchor rel attribute.
		 *
		 * @return {string|null} `'noopener noreferrer'` for URLs, else `null`.
		 */
		resolvedRel() {
			return this.linkType === 'url' ? 'noopener noreferrer' : null
		},

		/**
		 * Inline style for the tile root (CSS vars + background).
		 *
		 * @return {object} the root style.
		 */
		rootStyle() {
			return {
				'--tile-bg-color': this.backgroundColor,
				'--tile-text-color': this.textColor,
				backgroundColor: this.backgroundColor,
			}
		},

		/**
		 * Inline style for the anchor link.
		 *
		 * @return {object} the link style.
		 */
		linkStyle() {
			return {
				backgroundColor: this.backgroundColor,
				color: this.textColor,
			}
		},
	},

	methods: {
		/**
		 * Click handler — suppresses navigation in edit mode and opens URL
		 * links in a new tab; app links fall through to the anchor default.
		 *
		 * @param {Event} event the click event.
		 * @return {void}
		 */
		onClick(event) {
			if (this.isInEditMode) {
				event.preventDefault()
				return
			}
			if (this.linkValue === '') {
				event.preventDefault()
				return
			}
			if (this.linkType === 'url') {
				event.preventDefault()
				window.open(this.linkValue, '_blank', 'noopener,noreferrer')
			}
		},
	},
}
</script>

<style scoped>
.cn-dash-tile-widget {
	width: 100%;
	height: 100%;
	overflow: hidden;
	border-radius: var(--border-radius, 6px);
	background-color: var(--tile-bg-color);
}

.cn-dash-tile-widget__link {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	width: 100%;
	padding: 16px;
	gap: 12px;
	text-decoration: none;
	transition: transform 0.2s ease, opacity 0.2s ease;
	color: var(--tile-text-color);
}

.cn-dash-tile-widget__link:hover {
	transform: scale(1.02);
	opacity: 0.95;
}

.cn-dash-tile-widget__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: auto;
	min-width: 64px;
	max-width: 80%;
	height: 64px;
	flex-shrink: 0;
}

.cn-dash-tile-widget__svg {
	width: 100%;
	height: 100%;
}

.cn-dash-tile-widget__icon-class {
	display: inline-block;
	width: 64px;
	height: 64px;
	background-size: 64px;
	filter: brightness(0) invert(1);
}

.cn-dash-tile-widget__icon-img {
	width: auto;
	height: 100%;
	max-width: 100%;
	object-fit: contain;
}

.cn-dash-tile-widget__emoji {
	font-size: 56px;
	line-height: 1;
}

.cn-dash-tile-widget__title {
	font-size: 16px;
	font-weight: 600;
	text-align: center;
	word-break: break-word;
	line-height: 1.3;
}
</style>
