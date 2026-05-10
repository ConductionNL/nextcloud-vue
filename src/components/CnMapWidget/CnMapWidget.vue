<!--
  CnMapWidget — Renders a Leaflet map with declarative layers + markers.

  A library-first wrapper around Leaflet that consumes the manifest's
  page-shape directly: `{ center, zoom, layers, markers, clustering,
  height, autoFit }`. Layer dispatch picks `L.tileLayer |
  L.tileLayer.wms | L.geoJSON` per `layer.type`; unknown types log a
  console.warn and are skipped (matches CnChartWidget's
  unknown-`chartKind` posture).

  Marker support is opt-in:
    - `markers.features[]` — inline GeoJSON FeatureCollection.
    - `markers.dataSource.url` — fetched on mount; the response may
      be either a GeoJSON FeatureCollection OR a flat array of rows
      (in which case `latField`, `lngField`, `popupField` drive the
      conversion).
    - `markers.dataSource.{register, schema}` — RESERVED. The
      validator round-trips this shape but the resolver lands in a
      follow-up change; v1 ignores it at render time.

  `leaflet.markercluster` lazy-loads only when `clustering: true`
  (or `markers.clustering: true`) — consumers without clustering
  do NOT pay the cluster bundle cost.

  This component is the page's primitive — `CnMapPage` wraps it for
  manifest-driven `type: "map"` routes. Apps that want to embed a map
  inside a custom dashboard slot can `<CnMapWidget v-bind="props" />`
  directly.

  Spec: REQ-MMW-* (manifest-map-widget).
-->
<template>
	<div
		class="cn-map-widget"
		:style="{ height: resolvedHeight }">
		<div
			v-if="leafletAvailable"
			ref="mapEl"
			class="cn-map-widget__leaflet"
			role="application"
			:aria-label="ariaLabel"
			tabindex="0" />
		<div v-else class="cn-map-widget__fallback">
			<!--
				@slot fallback
				@description Shown when Leaflet is not available (e.g. test environments where
				the global `L` cannot be loaded).
			-->
			<slot name="fallback">
				<p class="cn-map-widget__error">
					{{ unavailableLabel }}
				</p>
			</slot>
		</div>
		<div v-if="$slots.legend || $scopedSlots.legend" class="cn-map-widget__legend">
			<!--
				@slot legend
				@description Custom legend overlay. Receives `{ layers, markers }` as scoped props.
				Positioned absolute (top-right) by default; consumers MAY override with their own
				container.
			-->
			<slot name="legend" :layers="layers" :markers="markers" />
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

const ALLOWED_LAYER_TYPES = ['tile', 'wms', 'wfs', 'geojson']

/**
 * CnMapWidget — Leaflet wrapper for declarative manifest-driven maps.
 *
 * Manifest usage — when CnPageRenderer dispatches a `type: "map"` page
 * it mounts CnMapPage, which forwards `pages[].config.{center, zoom,
 * layers, markers, height, clustering}` to this component. Manifest
 * authors do NOT mount this component themselves — declare a
 * `type: "map"` page instead. See CnMapPage's leading docblock for
 * the manifest example.
 *
 * Direct (non-manifest) usage:
 *
 * ```vue
 * <CnMapWidget
 *   :center="[52.13, 5.29]"
 *   :zoom="7"
 *   :layers="[
 *     { type: 'tile', url: 'https://service.pdok.nl/.../EPSG:3857/{z}/{x}/{y}.png',
 *       options: { attribution: '© Kadaster', maxZoom: 19 } },
 *     { type: 'wms', url: 'https://service.pdok.nl/lv/bag/wms/v2_0',
 *       options: { layers: 'pand', transparent: true, opacity: 0.6 } },
 *   ]"
 *   :markers="{
 *     dataSource: { url: '/api/cases/geo' },
 *     latField: 'lat',
 *     lngField: 'lng',
 *     popupField: 'title',
 *   }"
 *   clustering
 *   height="500px"
 *   @marker-click="onMarkerClick" />
 * ```
 *
 * @event map-ready Fired once after Leaflet has loaded and the map is mounted. Payload: `{ map }` — the underlying Leaflet `L.Map` instance.
 * @event marker-click Fired when a marker is clicked. Payload: `{ feature, latlng, originalEvent }`.
 * @event bounds-change Fired after the map's visible bounds change (pan / zoom settle). Payload: `{ bounds, zoom }` where `bounds = { north, south, east, west }`.
 * @event click Fired when the user clicks the map background (no marker hit). Payload: `{ latlng, originalEvent }`.
 *
 * @slot legend Custom legend overlay positioned over the map. Scoped props: `{ layers, markers }`.
 * @slot popup Per-marker popup body override. Scoped props: `{ feature, properties }`. When omitted, the widget renders the value of `markers.popupField` (or no popup at all when unset).
 * @slot fallback Replaces the default "map unavailable" message when Leaflet fails to load (test environments, CSP-blocked builds, offline dev). No scoped props.
 */
export default {
	name: 'CnMapWidget',

	props: {
		/**
		 * Initial map center as `[latitude, longitude]`.
		 * @type {[number, number]}
		 */
		center: {
			type: Array,
			required: true,
			validator: (v) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n)),
		},
		/**
		 * Initial zoom level.
		 * @type {number}
		 */
		zoom: {
			type: Number,
			default: 7,
		},
		/**
		 * Layer definitions. Each entry: `{ type: 'tile'|'wms'|'wfs'|'geojson', url, options }`.
		 * `geojson` MAY supply inline `data` (FeatureCollection) instead of `url`.
		 * Unknown types log a console.warn and are skipped.
		 * @type {Array<object>}
		 */
		layers: {
			type: Array,
			default: () => [],
		},
		/**
		 * Marker config. `{ features?, dataSource?, latField?, lngField?, popupField?,
		 * clustering?, iconColor?, iconUrl? }`. `features[]` is inline; `dataSource.url`
		 * is HTTP-fetched on mount; `dataSource.{register, schema}` is reserved
		 * (resolver deferred).
		 * @type {object|null}
		 */
		markers: {
			type: Object,
			default: null,
		},
		/**
		 * Enable marker clustering. When true, lazy-loads `leaflet.markercluster`
		 * on first mount. `markers.clustering` overrides this prop when set.
		 * @type {boolean}
		 */
		clustering: {
			type: Boolean,
			default: false,
		},
		/**
		 * Container height. Forwarded to the wrapper div's `style.height`.
		 * @type {string|number}
		 */
		height: {
			type: [String, Number],
			default: '500px',
		},
		/**
		 * Auto-fit map bounds to all loaded features after first load.
		 * @type {boolean}
		 */
		autoFit: {
			type: Boolean,
			default: true,
		},
		/**
		 * Aria-label for the map application region.
		 * @type {string}
		 */
		ariaLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Map'),
		},
		/**
		 * Label shown when Leaflet is not available.
		 * @type {string}
		 */
		unavailableLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Map library not available'),
		},
	},

	/**
	 * Events:
	 * @event map-ready
	 * @description Fired once after Leaflet has loaded and the map is mounted. Payload: `{ map }` — the underlying Leaflet `L.Map` instance. Consumers MAY use the instance to register custom controls or layers beyond the manifest shape.
	 *
	 * @event marker-click
	 * @description Fired when a marker is clicked. Payload: `{ feature, latlng, originalEvent }`.
	 *
	 * @event bounds-change
	 * @description Fired after the map's visible bounds change (pan / zoom settle). Payload: `{ bounds, zoom }` where `bounds = { north, south, east, west }`. Useful for triggering a re-fetch of viewport-scoped data.
	 *
	 * @event click
	 * @description Fired when the user clicks the map background (no marker hit). Payload: `{ latlng, originalEvent }`.
	 */
	emits: ['map-ready', 'marker-click', 'bounds-change', 'click'],

	data() {
		return {
			L: null,
			map: null,
			layerInstances: [],
			markerLayer: null,
			clusterGroup: null,
			leafletAvailable: true,
			boundsTimer: null,
		}
	},

	computed: {
		resolvedHeight() {
			if (typeof this.height === 'number') return `${this.height}px`
			return this.height
		},
		clusteringEnabled() {
			if (this.markers && typeof this.markers.clustering === 'boolean') {
				return this.markers.clustering
			}
			return this.clustering
		},
	},

	watch: {
		layers: {
			handler() {
				if (this.map) this.renderLayers()
			},
			deep: true,
		},
		markers: {
			handler() {
				if (this.map) this.renderMarkers()
			},
			deep: true,
		},
	},

	async mounted() {
		try {
			// Leaflet is loaded as a runtime dep. Default-export the namespace.
			const mod = await import('leaflet')
			this.L = mod.default || mod
		} catch (err) {
			// Fallback when Leaflet can't load (test envs, CSP-blocked CDNs).
			// Surface the fallback slot rather than blanking the page.
			// eslint-disable-next-line no-console
			console.warn('[CnMapWidget] Leaflet unavailable', err)
			this.leafletAvailable = false
			return
		}
		this.initMap()
	},

	beforeDestroy() {
		clearTimeout(this.boundsTimer)
		if (this.map) {
			this.map.remove()
			this.map = null
		}
	},

	methods: {
		/**
		 * Mount the Leaflet map instance, attach event handlers, and
		 * render the initial layer + marker set.
		 */
		initMap() {
			const L = this.L
			this.map = L.map(this.$refs.mapEl, {
				center: this.center,
				zoom: this.zoom,
				zoomControl: true,
				attributionControl: true,
			})

			this.map.on('click', (e) => {
				/**
				 * Map background click event. Fired when the user clicks the map outside any marker.
				 *
				 * @event click
				 * @type {{lat: number, lng: number}}
				 */
				this.$emit('click', { lat: e.latlng.lat, lng: e.latlng.lng })
			})

			this.map.on('moveend', () => {
				clearTimeout(this.boundsTimer)
				this.boundsTimer = setTimeout(() => {
					if (!this.map) return
					const b = this.map.getBounds()
					/**
					 * Viewport bounds change event. Fired (debounced) after pan / zoom settles.
					 *
					 * @event bounds-change
					 * @type {{north: number, south: number, east: number, west: number, zoom: number}}
					 */
					this.$emit('bounds-change', {
						north: b.getNorth(),
						south: b.getSouth(),
						east: b.getEast(),
						west: b.getWest(),
						zoom: this.map.getZoom(),
					})
				}, 100)
			})

			this.renderLayers()
			this.renderMarkers()
			/**
			 * Map ready event. Fired once after Leaflet has loaded and the map is mounted.
			 *
			 * @event map-ready
			 * @type {{map: object}}
			 */
			this.$emit('map-ready', { map: this.map })

			// Re-flow size if the container was hidden when first mounted.
			this.$nextTick(() => {
				if (this.map && typeof this.map.invalidateSize === 'function') {
					this.map.invalidateSize()
				}
			})
		},

		/**
		 * Mount the configured `layers[]` onto the Leaflet map. Each entry
		 * dispatches by `type` to a Leaflet factory; unknown types warn and
		 * skip. `geojson` may supply inline `data` to skip the fetch.
		 */
		renderLayers() {
			const L = this.L
			if (!this.map || !L) return

			// Tear down old layers
			for (const layer of this.layerInstances) {
				this.map.removeLayer(layer)
			}
			this.layerInstances = []

			for (const def of this.layers) {
				if (!def || typeof def !== 'object') continue
				if (!ALLOWED_LAYER_TYPES.includes(def.type)) {
					// eslint-disable-next-line no-console
					console.warn(`[CnMapWidget] Unknown layer type "${def.type}", skipping.`)
					continue
				}

				const opts = { ...(def.options || {}) }
				if (def.attribution && !opts.attribution) opts.attribution = def.attribution

				let instance = null
				if (def.type === 'tile') {
					if (typeof def.url !== 'string' || def.url.length === 0) continue
					instance = L.tileLayer(def.url, opts)
				} else if (def.type === 'wms') {
					if (typeof def.url !== 'string' || def.url.length === 0) continue
					instance = L.tileLayer.wms(def.url, opts)
				} else if (def.type === 'wfs') {
					if (typeof def.url !== 'string' || def.url.length === 0) continue
					this.fetchAndAddGeoJson(def.url, opts)
					continue
				} else if (def.type === 'geojson') {
					if (def.data && typeof def.data === 'object') {
						instance = L.geoJSON(def.data, opts)
					} else if (typeof def.url === 'string' && def.url.length > 0) {
						this.fetchAndAddGeoJson(def.url, opts)
						continue
					}
				}

				if (instance) {
					instance.addTo(this.map)
					this.layerInstances.push(instance)
				}
			}
		},

		/**
		 * Fetch a GeoJSON-shaped resource and add it to the map. Used by
		 * the WFS branch and the geojson-from-url branch.
		 *
		 * @param {string} url Endpoint that returns GeoJSON.
		 * @param {object} opts Leaflet `geoJSON` options.
		 */
		fetchAndAddGeoJson(url, opts) {
			const L = this.L
			fetch(url)
				.then((r) => r.json())
				.then((json) => {
					if (!this.map) return
					const layer = L.geoJSON(json, opts)
					layer.addTo(this.map)
					this.layerInstances.push(layer)
				})
				.catch((err) => {
					// eslint-disable-next-line no-console
					console.warn('[CnMapWidget] Failed to load layer', url, err)
				})
		},

		/**
		 * Mount the configured `markers` onto the Leaflet map. Reads from
		 * `features[]` (inline) OR `dataSource.url` (HTTP fetch). When
		 * `clusteringEnabled`, lazy-loads `leaflet.markercluster` and
		 * groups markers under a single cluster layer.
		 */
		async renderMarkers() {
			const L = this.L
			if (!this.map || !L || !this.markers) return

			// Tear down previous marker layer
			if (this.markerLayer) {
				this.map.removeLayer(this.markerLayer)
				this.markerLayer = null
			}
			if (this.clusterGroup) {
				this.map.removeLayer(this.clusterGroup)
				this.clusterGroup = null
			}

			const features = await this.collectFeatures()
			if (!features || features.length === 0) return

			const layer = L.geoJSON({ type: 'FeatureCollection', features }, {
				pointToLayer: (feature, latlng) => {
					const color = (feature.properties && feature.properties.markerColor)
						|| (this.markers && this.markers.iconColor)
						|| 'var(--color-primary-element, #2196F3)'
					if (this.markers && this.markers.iconUrl) {
						return L.marker(latlng, {
							icon: L.icon({ iconUrl: this.markers.iconUrl, iconSize: [25, 41], iconAnchor: [12, 41] }),
						})
					}
					return L.circleMarker(latlng, {
						radius: 8,
						fillColor: color,
						color: '#fff',
						weight: 2,
						opacity: 1,
						fillOpacity: 0.85,
					})
				},
				onEachFeature: (feature, lyr) => {
					const popupField = this.markers && this.markers.popupField
					const popupHtml = popupField && feature.properties ? feature.properties[popupField] : null
					if (popupHtml) lyr.bindPopup(String(popupHtml))
					lyr.on('click', (e) => {
						/**
						 * Marker click event. Fired when a marker is clicked.
						 *
						 * @event marker-click
						 * @type {{feature: object, latlng: object}}
						 */
						this.$emit('marker-click', { feature, latlng: e.latlng })
					})
				},
			})

			if (this.clusteringEnabled) {
				try {
					// eslint-disable-next-line import/no-unresolved
					await import('leaflet.markercluster')
					if (typeof L.markerClusterGroup === 'function') {
						this.clusterGroup = L.markerClusterGroup()
						this.clusterGroup.addLayer(layer)
						this.clusterGroup.addTo(this.map)
					} else {
						layer.addTo(this.map)
						this.markerLayer = layer
					}
				} catch (err) {
					// eslint-disable-next-line no-console
					console.warn('[CnMapWidget] Cluster plugin unavailable', err)
					layer.addTo(this.map)
					this.markerLayer = layer
				}
			} else {
				layer.addTo(this.map)
				this.markerLayer = layer
			}

			if (this.autoFit) {
				const target = this.clusterGroup || layer
				try {
					const b = target.getBounds()
					if (b.isValid()) this.map.fitBounds(b, { padding: [50, 50] })
				} catch {
					// ignore — empty layer set means no bounds to fit
				}
			}
		},

		/**
		 * Resolve the features set for the current `markers` config.
		 *
		 * Returns the inline `features[]` when set; otherwise fetches
		 * `dataSource.url` and converts the response into GeoJSON
		 * features. The response MAY be either a GeoJSON
		 * FeatureCollection OR an array of flat rows (in which case
		 * `latField`, `lngField`, `popupField` drive the conversion).
		 *
		 * The `dataSource.{register, schema}` shape is RESERVED for a
		 * follow-up resolver and returns `[]` today.
		 *
		 * @return {Promise<Array<object>>} GeoJSON Feature array.
		 */
		async collectFeatures() {
			if (!this.markers) return []
			if (Array.isArray(this.markers.features)) {
				return this.markers.features
			}
			const ds = this.markers.dataSource
			if (!ds) return []
			if (typeof ds.url === 'string' && ds.url.length > 0) {
				try {
					const response = await fetch(ds.url)
					const json = await response.json()
					return this.normaliseFeatures(json)
				} catch (err) {
					// eslint-disable-next-line no-console
					console.warn('[CnMapWidget] Failed to fetch markers', ds.url, err)
					return []
				}
			}
			// register+schema reserved; resolver deferred
			return []
		},

		/**
		 * Normalise a fetched payload into a GeoJSON Feature array.
		 * Accepts FeatureCollection, raw Feature[], or flat rows that
		 * declare `latField` / `lngField` (plus optional `popupField`
		 * for popup HTML).
		 *
		 * @param {object|Array} json The fetched payload.
		 * @return {Array<object>} GeoJSON Feature array.
		 */
		normaliseFeatures(json) {
			if (!json) return []
			if (Array.isArray(json.features)) return json.features
			if (Array.isArray(json)) {
				const latField = (this.markers && this.markers.latField) || 'lat'
				const lngField = (this.markers && this.markers.lngField) || 'lng'
				return json
					.filter((row) => row != null && Number.isFinite(row[latField]) && Number.isFinite(row[lngField]))
					.map((row) => ({
						type: 'Feature',
						geometry: { type: 'Point', coordinates: [row[lngField], row[latField]] },
						properties: { ...row },
					}))
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-map-widget {
	position: relative;
	width: 100%;
	min-height: 200px;
}

.cn-map-widget__leaflet {
	width: 100%;
	height: 100%;
}

.cn-map-widget__fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-height: 150px;
	color: var(--color-text-maxcontrast);
}

.cn-map-widget__error {
	font-size: 14px;
	margin: 0;
}

.cn-map-widget__legend {
	position: absolute;
	top: 12px;
	right: 12px;
	z-index: 1000;
	background: var(--color-main-background);
	padding: 8px 12px;
	border-radius: var(--border-radius-large, 8px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, .15);
}
</style>
