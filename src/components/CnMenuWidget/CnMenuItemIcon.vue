<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<span class="cn-menu-item-icon">
		<img
			v-if="isCustomIcon"
			:src="icon"
			:width="size"
			:height="size"
			alt="">
		<CnWidgetIcon
			v-else
			:name="icon"
			:size="size" />
	</span>
</template>

<script>
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'
import { isCustomIconUrl } from '../CnWidgetGrid/widgetIcons.js'

/**
 * CnMenuItemIcon — icon resolution for menu rows. URL-shaped names render as
 * `<img>`; bare names route through {@link CnWidgetIcon}; the parent suppresses
 * the wrapper for empty values. Default size 20px keeps menu rows compact.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnMenuItemIcon',

	components: {
		CnWidgetIcon,
	},

	props: {
		/** Icon identifier — registry key OR `/`-/`http`-prefixed URL. */
		icon: {
			type: String,
			default: '',
		},
		/** Square pixel size for the icon. */
		size: {
			type: Number,
			default: 20,
		},
	},

	computed: {
		/**
		 * Whether the icon value is a URL (renders as `<img>`).
		 *
		 * @return {boolean} true for URL icons.
		 */
		isCustomIcon() {
			return isCustomIconUrl(this.icon)
		},
	},
}
</script>

<style scoped>
.cn-menu-item-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
}
</style>
