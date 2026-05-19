<!--
  CnWidgetMapViewer — built-in v2 widget wrapping CnMapWidget (the map primitive).

  Referenced in v2 manifests via `widgetKey: "map-viewer"`. Forwards all
  map-relevant props to CnMapWidget directly (not CnMapPage, since we don't
  want the page shell — header, filters — inside a widget slot).

  Spec: REQ-MVR-009 (manifest-v2-renderer) — built-in widget: map-viewer
-->
<template>
	<CnMapWidget v-bind="mapProps" v-on="$listeners" />
</template>

<script>
import CnMapWidget from '../CnMapWidget/CnMapWidget.vue'

export default {
	name: 'CnWidgetMapViewer',

	components: { CnMapWidget },

	props: {
		/** Map center as [lat, lng]. */
		center: {
			type: Array,
			default: () => [52.0, 5.0],
		},
		/** Initial zoom level. */
		zoom: {
			type: Number,
			default: 7,
		},
		/** Layer definitions. */
		layers: {
			type: Array,
			default: () => [],
		},
		/** Marker configuration object. */
		markers: {
			type: Object,
			default: null,
		},
		/** Enable clustering. */
		clustering: {
			type: Boolean,
			default: false,
		},
		/** Map container height. */
		height: {
			type: [String, Number],
			default: '400px',
		},
		/** Auto-fit bounds to loaded features. */
		autoFit: {
			type: Boolean,
			default: true,
		},
	},

	computed: {
		mapProps() {
			return {
				center: this.center,
				zoom: this.zoom,
				layers: this.layers,
				markers: this.markers,
				clustering: this.clustering,
				height: this.height,
				autoFit: this.autoFit,
			}
		},
	},
}
</script>
