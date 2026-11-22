<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<a
		:href="href"
		class="cn-app-tile"
		:style="{ '--cn-app-tile-background': background }"
		:aria-label="accessibleName"
		:title="label"
		data-testid="cn-app-tile"
		@click="$emit('open', $event)">
		<span
			v-if="icon"
			class="cn-app-tile__icon"
			:style="{ '--cn-app-tile-icon': `url(&quot;${icon}&quot;)` }"
			aria-hidden="true"
			data-testid="cn-app-tile-icon" />
		<ViewGridOutline
			v-else
			class="cn-app-tile__fallback"
			aria-hidden="true" />
		<span
			v-if="shownCount !== ''"
			class="cn-app-tile__count"
			aria-hidden="true"
			data-testid="cn-app-tile-count">{{ shownCount }}</span>
	</a>
</template>

<script>
import { translatePlural as n } from '@nextcloud/l10n'
import ViewGridOutline from 'vue-material-design-icons/ViewGridOutline.vue'
import { appTileColourValue } from '../../utils/appTilePalette.js'

/**
 * CnAppTile: one app as a square, solid-coloured link with the app's icon
 * large and white in the middle, and no visible text. The app's name is the
 * link's accessible name and its tooltip. An optional count (new items in the
 * app) shows as a small bubble and is part of the accessible name.
 *
 * The icon is the app's own SVG used as a mask over white, so any
 * navigation icon draws as a crisp white glyph at any size.
 *
 * @spec openspec/changes/app-tile/specs/app-tile/spec.md
 */
export default {
	name: 'CnAppTile',

	components: { ViewGridOutline },

	props: {
		/** The app's address. */
		href: {
			type: String,
			required: true,
		},

		/** The app's name: the accessible name and the tooltip. */
		label: {
			type: String,
			required: true,
		},

		/** The app's icon URL, an SVG; empty draws a generic grid glyph. */
		icon: {
			type: String,
			default: '',
		},

		/** The app id, which picks the default colour. */
		appId: {
			type: String,
			default: '',
		},

		/** A key of the app tile palette; empty uses the app's default colour. */
		colour: {
			type: String,
			default: '',
		},

		/** New items in the app; 0 or null shows no bubble. */
		count: {
			type: Number,
			default: null,
		},
	},

	emits: [
		/**
		 * The tile was opened.
		 *
		 * @event open
		 * @type {MouseEvent}
		 */
		'open',
	],

	computed: {
		/** @return {string} The tile's background colour. */
		background() {
			return appTileColourValue(this.colour, this.appId)
		},

		/** @return {string} The bubble's text, '' for none. */
		shownCount() {
			if (!Number.isFinite(this.count) || this.count <= 0) {
				return ''
			}
			return this.count > 99 ? '99+' : String(this.count)
		},

		/** @return {string} The name, with the count when there is one. */
		accessibleName() {
			if (this.shownCount === '') {
				return this.label
			}
			return n('nextcloud-vue', '{app}, %n new item', '{app}, %n new items', this.count, { app: this.label })
		},
	},
}
</script>

<style scoped>
.cn-app-tile {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	aspect-ratio: 1 / 1;
	width: 100%;
	max-width: 100%;
	max-height: 100%;
	border-radius: var(--border-radius-large, 12px);
	background-color: var(--cn-app-tile-background);
	color: #fff;
	text-decoration: none;
	container-type: inline-size;
	transition: filter 0.1s ease-in-out;
}

.cn-app-tile:hover {
	filter: brightness(1.08);
}

.cn-app-tile:focus-visible {
	outline: 3px solid var(--color-main-text, #000);
	outline-offset: 3px;
	box-shadow: 0 0 0 2px var(--color-main-background, #fff);
}

.cn-app-tile__icon {
	display: block;
	width: 45%;
	height: 45%;
	background-color: currentColor;
	mask: var(--cn-app-tile-icon) center / contain no-repeat;
	-webkit-mask: var(--cn-app-tile-icon) center / contain no-repeat;
}

.cn-app-tile__fallback {
	display: flex;
	width: 45%;
	height: 45%;
}

.cn-app-tile__fallback :deep(svg) {
	width: 100%;
	height: 100%;
}

.cn-app-tile__count {
	position: absolute;
	top: 6%;
	inset-inline-end: 6%;
	min-width: 1.5em;
	padding: 0 0.4em;
	border-radius: 999px;
	background: #fff;
	color: var(--cn-app-tile-background);
	font-size: max(12px, 9cqi);
	font-weight: 700;
	line-height: 1.5em;
	text-align: center;
}

@media (prefers-reduced-motion: reduce) {
	.cn-app-tile {
		transition: none;
	}
}
</style>
