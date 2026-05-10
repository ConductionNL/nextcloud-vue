<!--
  CnMapPage — Manifest-driven Leaflet map page.

  Resolved by `CnPageRenderer` for `pages[]` entries with
  `type: "map"`. Composes `CnPageHeader` + `CnMapWidget` and
  forwards the manifest's `config.{center, zoom, layers, markers,
  height, clustering, autoFit}` shape verbatim.

  The widget is the rendering primitive; this component is the page
  shell + slot surface. Apps that want to embed a map inside a custom
  dashboard slot can use `<CnMapWidget v-bind="props" />` directly
  instead.

  Slots (mirror the page family conventions):
    - `#header` — overrides `CnPageHeader`. Scope `{ title, description }`.
    - `#filters` — chrome rendered between header and map (case-type /
      status / "my cases" toggles in procest's CaseMap).
    - `#legend` — pass-through to `CnMapWidget` legend slot.
    - `#popup` — pass-through to `CnMapWidget` popup slot.

  Events (pass-through from `CnMapWidget`):
    - `@map-ready` — `{ map }` once Leaflet has mounted.
    - `@marker-click` — `{ feature, latlng }`.
    - `@bounds-change` — `{ north, south, east, west, zoom }`.
    - `@click` — `{ lat, lng }` on empty-area click.

  Spec: REQ-MMW-* (manifest-map-widget).
-->
<template>
	<div class="cn-map-page">
		<!--
			@slot header
			@description Replaces the default `CnPageHeader`. Receives `{ title, description }`.
		-->
		<slot
			name="header"
			:title="title"
			:description="description">
			<CnPageHeader
				v-if="title"
				:title="title"
				:description="description" />
		</slot>

		<!--
			@slot filters
			@description Filter chrome rendered between header and map. Used by procest's
			CaseMap for case-type / status / "my cases" toggles.
		-->
		<div v-if="$slots.filters || $scopedSlots.filters" class="cn-map-page__filters">
			<slot name="filters" />
		</div>

		<div class="cn-map-page__body">
			<CnMapWidget
				:center="center"
				:zoom="zoom"
				:layers="layers"
				:markers="markers"
				:clustering="clustering"
				:height="height"
				:auto-fit="autoFit"
				:aria-label="ariaLabel"
				:unavailable-label="unavailableLabel"
				@map-ready="$emit('map-ready', $event)"
				@marker-click="$emit('marker-click', $event)"
				@bounds-change="$emit('bounds-change', $event)"
				@click="$emit('click', $event)">
				<template v-if="$slots.legend || $scopedSlots.legend" #legend="ctx">
					<slot name="legend" v-bind="ctx" />
				</template>
				<template v-if="$slots.popup || $scopedSlots.popup" #popup="ctx">
					<slot name="popup" v-bind="ctx" />
				</template>
				<template v-if="$slots.fallback" #fallback>
					<slot name="fallback" />
				</template>
			</CnMapWidget>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnPageHeader from '../CnPageHeader/CnPageHeader.vue'
import CnMapWidget from '../CnMapWidget/CnMapWidget.vue'

/**
 * CnMapPage — manifest `type: "map"` renderer.
 *
 * Manifest example:
 *
 * ```jsonc
 * {
 *   "id": "CaseMap",
 *   "route": "/map",
 *   "type": "map",
 *   "title": "procest.case_map.title",
 *   "config": {
 *     "center": [52.1326, 5.2913],
 *     "zoom": 7,
 *     "layers": [
 *       { "type": "tile",
 *         "url":  "https://service.pdok.nl/.../EPSG:3857/{z}/{x}/{y}.png",
 *         "options": { "attribution": "© Kadaster", "maxZoom": 19 } },
 *       { "type": "wms",
 *         "url":  "https://service.pdok.nl/lv/bag/wms/v2_0",
 *         "options": { "layers": "pand", "transparent": true, "opacity": 0.6 } }
 *     ],
 *     "markers": {
 *       "dataSource": { "url": "/index.php/apps/procest/api/cases/geo" },
 *       "latField":   "lat",
 *       "lngField":   "lng",
 *       "popupField": "title",
 *       "clustering": true
 *     },
 *     "height": "calc(100vh - 200px)"
 *   }
 * }
 * ```
 */
export default {
	name: 'CnMapPage',

	components: {
		CnPageHeader,
		CnMapWidget,
	},

	props: {
		/** Page title. Forwarded to `CnPageHeader`. @type {string} */
		title: {
			type: String,
			default: '',
		},
		/** Page description. Forwarded to `CnPageHeader`. @type {string} */
		description: {
			type: String,
			default: '',
		},
		/** Initial map center as `[latitude, longitude]`. @type {[number, number]} */
		center: {
			type: Array,
			required: true,
			validator: (v) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n)),
		},
		/** Initial zoom level. @type {number} */
		zoom: {
			type: Number,
			default: 7,
		},
		/** Layer definitions. See CnMapWidget docs. @type {Array<object>} */
		layers: {
			type: Array,
			default: () => [],
		},
		/** Marker config. See CnMapWidget docs. @type {object|null} */
		markers: {
			type: Object,
			default: null,
		},
		/** Enable marker clustering. @type {boolean} */
		clustering: {
			type: Boolean,
			default: false,
		},
		/** Map container height. @type {string|number} */
		height: {
			type: [String, Number],
			default: 'calc(100vh - 200px)',
		},
		/** Auto-fit bounds to loaded features. @type {boolean} */
		autoFit: {
			type: Boolean,
			default: true,
		},
		/** Aria-label for the map application region. @type {string} */
		ariaLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Map'),
		},
		/** Label shown when Leaflet is unavailable. @type {string} */
		unavailableLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Map library not available'),
		},
	},

	emits: ['map-ready', 'marker-click', 'bounds-change', 'click'],
}
</script>

<style scoped>
.cn-map-page {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.cn-map-page__filters {
	padding: 16px;
	border-bottom: 1px solid var(--color-border);
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	align-items: center;
}

.cn-map-page__body {
	flex: 1;
	position: relative;
	min-height: 400px;
}
</style>
