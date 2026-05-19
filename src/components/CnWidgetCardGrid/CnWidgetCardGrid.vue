<!--
  CnWidgetCardGrid — built-in v2 widget rendering a grid of CnObjectCard items.

  Referenced in v2 manifests via `widgetKey: "card-grid"`. Renders each
  item in `objects` as a CnObjectCard, replacing the v1.3.0 `cardComponent`
  field pattern.

  Spec: REQ-MVR-010 (manifest-v2-renderer) — built-in widget: card-grid
-->
<template>
	<div class="cn-widget-card-grid">
		<CnObjectCard
			v-for="(item, index) in objects"
			:key="item.id || index"
			:object="item" />
	</div>
</template>

<script>
import CnObjectCard from '../CnObjectCard/CnObjectCard.vue'

export default {
	name: 'CnWidgetCardGrid',

	components: { CnObjectCard },

	props: {
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
