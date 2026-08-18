<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<svg
		v-if="path"
		class="ac-icon"
		:class="`ac-icon--${name}`"
		:width="size"
		:height="size"
		viewBox="0 0 24 24"
		fill="none"
		aria-hidden="true"
		focusable="false">
		<path :d="path" fill="currentColor" />
	</svg>
</template>

<script>
/**
 * A small inline icon from a CLOSED vocabulary.
 *
 * WHY INLINE SVG AND NOT AN ICON FONT
 *
 * An icon font is a webfont, and this codebase has already been bitten by
 * exactly that: the reference application's stylesheets declare `ac-icons` with
 * a root-relative url, which from a portal's own path resolves against the
 * ORIGIN and 404s. A missing icon font does not fail loudly — it renders a
 * blank box or a stray letter, and the page looks finished.
 *
 * WHY A CLOSED SET AND NOT AN ARBITRARY `path` PROP
 *
 * Page content is authored data. Letting an author supply raw SVG path data
 * would put attacker-controlled markup inside an `<svg>` on a public government
 * page. A name resolved against a fixed map cannot express anything the map
 * does not already contain, and an unknown name renders NOTHING rather than
 * guessing.
 *
 * ALWAYS DECORATIVE. Every icon here sits beside its own visible label, so it
 * is `aria-hidden` with `focusable="false"`. An icon that repeats the adjacent
 * text is one more thing announced for no gain, and `focusable="false"` keeps
 * IE-era SVG out of the tab order.
 *
 * PUBLIC-SAFE (see ../index.js): no `@nextcloud/*` import.
 */

/**
 * The icon vocabulary. Paths are 24x24, single-path, currentColor.
 *
 * @type {Record<string, string>}
 */
const ICON_PATHS = {
	search: 'M10 4a6 6 0 1 0 3.7 10.72l4.29 4.29a1 1 0 0 0 1.42-1.42l-4.29-4.29A6 6 0 0 0 10 4Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z',
	document: 'M6 2h7l5 5v15H6V2Zm7 1.5V8h4.5L13 3.5ZM8 12h8v1.5H8V12Zm0 4h8v1.5H8V16Z',
	globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 9h-3a15.6 15.6 0 0 0-1.2-5.4A8 8 0 0 1 18.9 11ZM12 4.2c.8 1.2 1.5 3.4 1.7 6.8h-3.4c.2-3.4.9-5.6 1.7-6.8ZM5.1 11a8 8 0 0 1 4.2-5.4A15.6 15.6 0 0 0 8.1 11h-3Zm0 2h3a15.6 15.6 0 0 0 1.2 5.4A8 8 0 0 1 5.1 13Zm6.9 6.8c-.8-1.2-1.5-3.4-1.7-6.8h3.4c-.2 3.4-.9 5.6-1.7 6.8Zm2.7-1.4a15.6 15.6 0 0 0 1.2-5.4h3a8 8 0 0 1-4.2 5.4Z',
	'external-link': 'M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h5v2H7v10h10v-3h2v5H5V5Z',
	'arrow-right': 'M13.17 5.17 12 6.34 16.66 11H4v2h12.66L12 17.66l1.17 1.17L20 12l-6.83-6.83Z',
	information: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z',
	email: 'M4 4h16v16H4V4Zm2 2v.5l6 4 6-4V6H6Zm12 3-6 4-6-4v9h12V9Z',
}

export default {
	name: 'CnSiteIcon',

	props: {
		/** Icon name from the closed vocabulary. Unknown names render nothing. */
		name: {
			type: String,
			required: true,
		},

		/** Square size in pixels. */
		size: {
			type: [Number, String],
			default: 20,
		},
	},

	computed: {
		/**
		 * @return {string} The path data, or '' when the name is unknown.
		 */
		path() {
			return ICON_PATHS[this.name] || ''
		},
	},
}
</script>
