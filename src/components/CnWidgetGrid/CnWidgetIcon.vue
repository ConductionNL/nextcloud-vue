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
		class="cn-widget-icon__path">
		<path :d="name" />
	</svg>
	<component
		:is="iconComponent"
		v-else
		:size="size" />
</template>

<script>
import { getIconComponent, isCustomIconUrl } from './widgetIcons.js'
import { isSvgPath } from '../../utils/iconUtils.js'

/**
 * CnWidgetIcon — resolves a widget icon field following the
 * `widgetIcons` convention shared by the menu, links, and tile catalog
 * widgets:
 *
 *   - null / '' / unknown → the default registry icon component
 *   - registry key (e.g. 'Star') → that MDI component
 *   - URL (starts with '/' or 'http') → an `<img>` tag
 *   - SVG path string (e.g. from CnIconBrowser) → an inline `<svg>`
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnWidgetIcon',

	props: {
		/**
		 * Icon identifier — a registry key, a `/`-/`http`-prefixed URL, or
		 * null/empty for the default icon.
		 */
		name: {
			type: String,
			default: null,
		},
		/** Square pixel size applied to the MDI component or the `<img>`. */
		size: {
			type: Number,
			default: 20,
		},
		/** Alt text for `<img>` inputs; falls back to `'icon'` for a11y. */
		alt: {
			type: String,
			default: null,
		},
	},

	computed: {
		/**
		 * Whether the icon value is a URL and must render as an `<img>`.
		 *
		 * @return {boolean} true for `/`-/`http`-prefixed values.
		 */
		isUrl() {
			return isCustomIconUrl(this.name)
		},

		/**
		 * Whether the value is a raw SVG path string (render via inline `<svg>`).
		 * Registry keys are PascalCase words and never match this shape.
		 *
		 * @return {boolean} true for SVG path values.
		 */
		isPath() {
			return !this.isUrl && isSvgPath(this.name)
		},

		/**
		 * The resolved MDI component for non-URL names (default-icon safe).
		 *
		 * @return {object|null} a Vue component, or `null` for URL inputs.
		 */
		iconComponent() {
			return getIconComponent(this.name)
		},
	},
}
</script>

<style scoped>
/* Match vue-material-design-icons: inline path icons inherit text colour. */
.cn-widget-icon__path {
	fill: currentColor;
}
</style>
