<!--
  CnWidgetMapViewer — built-in v2 widget wrapping CnMapWidget (the map primitive).

  Referenced in v2 manifests via `widgetKey: "map-viewer"`. Renders the map
  on the shared CnWidgetWrapper chrome (title + standard overflow Actions
  menu: Refresh / Documentation / Request a feature) and forwards all
  map-relevant props to CnMapWidget directly (not CnMapPage, since we don't
  want the page shell — header, filters — inside a widget slot).

  Spec: REQ-MVR-009 (manifest-v2-renderer) — built-in widget: map-viewer
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId"
		:documentation-url="documentationUrl"
		flush>
		<CnMapWidget v-bind="{ ...mapProps, ...$attrs }" />
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnMapWidget from '../CnMapWidget/CnMapWidget.vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'

/**
 * CnWidgetMapViewer — built-in v2 widget wrapping CnMapWidget.
 *
 * Renders a map on the shared CnWidgetWrapper chrome, which supplies the
 * widget title and the standard overflow Actions menu (Refresh /
 * Documentation / Request a feature). Map-relevant props are forwarded to
 * the inner CnMapWidget via `mapProps`; the chrome props (`title`,
 * `documentationUrl`, `widgetId`) are consumed by the wrapper.
 */
export default {
	name: 'CnWidgetMapViewer',
	inheritAttrs: false,

	components: { CnMapWidget, CnWidgetWrapper },

	props: {
		/**
		 * Widget title shown in the CnWidgetWrapper header.
		 */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Map'),
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
