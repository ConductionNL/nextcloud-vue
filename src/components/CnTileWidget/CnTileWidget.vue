<!--
  CnTileWidget — Quick-access tile with icon and link.

  A simple, colorful tile for app shortcuts or external links.
  Supports SVG paths, CSS icon classes, image URLs, and emoji icons.
-->
<template>
	<div
		v-if="tile"
		class="cn-tile-widget"
		:style="tileStyles">
		<a
			:href="tileUrl"
			class="cn-tile-widget__link"
			:target="tile.linkType === 'url' ? '_blank' : '_self'"
			rel="noopener noreferrer"
			@click="onLinkClick">
			<!-- SVG icon -->
			<svg
				v-if="tile.iconType === 'svg'"
				class="cn-tile-widget__icon cn-tile-widget__icon--svg"
				:style="{ fill: tile.textColor || '#ffffff' }"
				viewBox="0 0 24 24">
				<path :d="tile.icon" />
			</svg>
			<!-- Other icon types -->
			<div v-else class="cn-tile-widget__icon">
				<span v-if="tile.iconType === 'class'" :class="['icon', tile.icon]" />
				<img v-else-if="tile.iconType === 'url'" :src="tile.icon" alt="">
				<span v-else-if="tile.iconType === 'emoji'" class="cn-tile-widget__emoji">{{ tile.icon }}</span>
			</div>
			<div class="cn-tile-widget__title" :style="{ color: tile.textColor || '#ffffff' }">
				{{ resolvedTitle }}
			</div>
		</a>
	</div>
</template>

<script>
import { generateUrl } from '@nextcloud/router'

/**
 * CnTileWidget — Quick-access tile with icon and link.
 *
 * ```vue
 * <CnTileWidget :tile="{
 *   title: 'Files',
 *   icon: 'M12,2C6.48,...',
 *   iconType: 'svg',
 *   backgroundColor: '#0082c9',
 *   textColor: '#ffffff',
 *   linkType: 'app',
 *   linkValue: 'files',
 * }" />
 * ```
 */
export default {
	name: 'CnTileWidget',

	inject: {
		/**
		 * Host translate function provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). The
		 * manifest-authored tile title is run through it. Defaults to an
		 * identity function so an untranslated key renders as itself.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Tile configuration object. `linkType` decides how `linkValue` is
		 * followed: `app` builds a full-page `/apps/…` URL, `url` opens an
		 * external link, and `route` pushes `linkValue` through the host
		 * app's vue-router so SPA state (e.g. an in-memory vault key)
		 * survives the navigation.
		 * @type {{ title: string, icon: string, iconType: 'svg'|'class'|'url'|'emoji', backgroundColor: string, textColor: string, linkType: 'app'|'url'|'route', linkValue: string }}
		 */
		tile: {
			type: Object,
			required: true,
		},
	},

	computed: {
		/**
		 * The tile caption run through the host translate function.
		 *
		 * @return {string}
		 */
		resolvedTitle() {
			const fn = typeof this.cnTranslate === 'function' ? this.cnTranslate : (k) => k
			return this.tile.title ? fn(this.tile.title) : this.tile.title
		},

		/**
		 * The anchor href. `route` tiles resolve through the host router so
		 * middle-click / ctrl-click open the correct full URL (including the
		 * router base); plain clicks are intercepted by `onLinkClick` instead.
		 *
		 * @return {string}
		 */
		tileUrl() {
			if (this.tile.linkType === 'route') {
				if (this.$router) {
					return this.$router.resolve(this.tile.linkValue || '/').href
				}
				// No router on the host page — degrade to a plain link.
				return this.tile.linkValue || '#'
			}
			if (this.tile.linkType === 'app') {
				return generateUrl('/apps/' + this.tile.linkValue)
			}
			return this.tile.linkValue || '#'
		},

		tileStyles() {
			return {
				'--cn-tile-bg': this.tile.backgroundColor || '#0082c9',
				'--cn-tile-text': this.tile.textColor || '#ffffff',
			}
		},
	},

	methods: {
		/**
		 * Push `route` tiles through the host router instead of letting the
		 * anchor trigger a full page load — a full load tears down the SPA
		 * (and with it any in-memory state such as an unlocked vault).
		 * Mirrors RouterLink's guard: modified clicks (new tab/window) and
		 * non-left buttons fall through to the resolved href.
		 *
		 * @param {MouseEvent} event The click event.
		 * @return {void}
		 */
		onLinkClick(event) {
			if (this.tile.linkType !== 'route' || !this.$router) {
				return
			}
			if (event.defaultPrevented
				|| (event.button !== undefined && event.button !== 0)
				|| event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
				return
			}
			event.preventDefault()
			this.$router.push(this.tile.linkValue || '/')
		},
	},
}
</script>

<style scoped>
.cn-tile-widget {
	height: 100%;
	width: 100%;
	position: absolute;
	top: 0;
	left: 0;
	overflow: hidden;
	background-color: var(--cn-tile-bg);
}

.cn-tile-widget__link {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	width: 100%;
	text-decoration: none;
	padding: 20px;
	gap: 12px;
	transition: transform 0.2s ease, opacity 0.2s ease;
	background-color: var(--cn-tile-bg);
	color: var(--cn-tile-text);
}

.cn-tile-widget__link:hover {
	transform: scale(1.02);
	opacity: 0.95;
}

.cn-tile-widget__icon {
	font-size: 48px;
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.cn-tile-widget__icon--svg {
	width: 48px;
	height: 48px;
}

.cn-tile-widget__icon span.icon {
	display: inline-block;
	width: 48px;
	height: 48px;
	background-size: 48px;
	filter: brightness(0) invert(1);
}

.cn-tile-widget__icon img {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.cn-tile-widget__emoji {
	font-size: 48px;
}

.cn-tile-widget__title {
	font-size: 16px;
	font-weight: 700;
	text-align: center;
	word-break: break-word;
	line-height: 1.3;
	color: var(--cn-tile-text);
}
</style>
