<!--
  CnWidgetCardGrid — built-in v2 widget rendering a grid of CnObjectCard items.

  Referenced in v2 manifests via `widgetKey: "card-grid"`. Renders the grid on
  the shared CnWidgetWrapper chrome (title + standard overflow Actions menu:
  Refresh / Documentation / Request a feature) and renders each item in
  `objects` as a CnObjectCard, replacing the v1.3.0 `cardComponent` field
  pattern.

  Spec: REQ-MVR-010 (manifest-v2-renderer) — built-in widget: card-grid
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId"
		:documentation-url="documentationUrl"
		flush>
		<div class="cn-widget-card-grid">
			<CnObjectCard
				v-for="(item, index) in objects"
				:key="item.id || index"
				:object="item" />
		</div>
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnObjectCard from '../CnObjectCard/CnObjectCard.vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'

/**
 * CnWidgetCardGrid — built-in v2 widget rendering a grid of CnObjectCard items.
 *
 * Renders the card grid on the shared CnWidgetWrapper chrome, which supplies
 * the widget title and the standard overflow Actions menu (Refresh /
 * Documentation / Request a feature). Each entry in `objects` is rendered as a
 * CnObjectCard.
 */
export default {
	name: 'CnWidgetCardGrid',

	components: { CnObjectCard, CnWidgetWrapper },

	props: {
		/**
		 * Widget title shown in the CnWidgetWrapper header.
		 */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Items'),
		},
		/**
		 * Documentation link surfaced in the widget's overflow Actions menu.
		 * Empty (the default) hides the Documentation item; the Refresh and
		 * Request-a-feature items always render.
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * Stable id forwarded to the widget chrome for the Refresh /
		 * Request-a-feature payloads.
		 */
		widgetId: {
			type: String,
			default: '',
		},
		/** Array of object records to render as cards. */
		objects: {
			type: Array,
			default: () => [],
		},
	},
}
</script>

<style>
.cn-widget-card-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: calc(2 * var(--default-grid-baseline, 4px));
}
</style>
