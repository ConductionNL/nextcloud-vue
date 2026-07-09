<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<img
		v-if="isUrl"
		:src="name"
		:alt="alt || 'icon'"
		:width="size"
		:height="size">
	<svg
		v-else-if="isPath"
		viewBox="0 0 24 24"
		:width="size"
		:height="size"
		class="cn-dashboard-icon__path">
		<path :d="name" />
	</svg>
	<component
		:is="iconComponent"
		v-else
		:size="size" />
</template>

<script>
import { getIconComponent, isCustomIconUrl } from './dashboardIcons.js'
import { isSvgPath } from '../../utils/iconUtils.js'

/**
 * CnDashboardIcon — renders an icon for any value following the dashboard
 * `icon` convention: a registry key (→ built-in MDI component), a URL (→
 * `<img>`), a raw SVG path string (→ inline `<svg>`, as emitted by
 * {@link CnIconBrowser}), or null/empty/unknown (→ the default icon). Pair with
 * {@link CnIconPicker} or {@link CnIconBrowser} for selection.
 */
export default {
	name: 'CnDashboardIcon',

	props: {
		/**
		 * Icon identifier — a registry key (e.g. `'Star'`), a URL (rendered as
		 * `<img>`), or null/empty for the default icon.
		 *
		 * @type {string|null}
		 */
		name: {
			type: String,
			default: null,
		},
		/**
		 * Icon size in pixels — the `size` prop on built-in MDI components and
		 * `width`/`height` on `<img>`.
		 *
		 * @type {number}
		 */
		size: {
			type: Number,
			default: 20,
		},
		/**
		 * Alt text for `<img>` (URL icons); falls back to `'icon'` so screen
		 * readers always have something. Ignored for decorative MDI icons.
		 *
		 * @type {string|null}
		 */
		alt: {
			type: String,
			default: null,
		},
	},

	computed: {
		/**
		 * Whether `name` is a URL (render via `<img>`).
		 *
		 * @return {boolean} true for URL icons.
		 */
		isUrl() {
			return isCustomIconUrl(this.name)
		},
		/**
		 * Whether `name` is a raw SVG path string (render via inline `<svg>`).
		 * Registry keys are PascalCase words and never match this shape.
		 *
		 * @return {boolean} true for SVG path values.
		 */
		isPath() {
			return !this.isUrl && isSvgPath(this.name)
		},
		/**
		 * The resolved MDI component for a registry name (null for URLs).
		 *
		 * @return {object|null} the icon component.
		 */
		iconComponent() {
			return getIconComponent(this.name)
		},
	},
}
</script>

<style scoped>
/* Match vue-material-design-icons: inline path icons inherit text colour. */
.cn-dashboard-icon__path {
	fill: currentColor;
}
</style>
