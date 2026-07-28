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
    - `markers.dataSource.{register, schema}` — plots the objects of an
      OpenRegister register/schema, reading each one's `@self.geo`
      (falling back to `latField` / `lngField` on the object itself).
      Objects with no usable location are skipped, not plotted at (0, 0).

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
		:class="{ 'cn-map-widget--fullscreen': isFullscreen }"
		:style="{ height: isFullscreen ? null : resolvedHeight }">
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
		<div v-if="$slots.legend || $slots.legend" class="cn-map-widget__legend">
			<!--
				@slot legend
				@description Custom legend overlay. Receives `{ layers, markers }` as scoped props.
				Positioned absolute (top-right) by default; consumers MAY override with their own
				container.
			-->
			<slot name="legend" :layers="cfg.layers" :markers="cfg.markers" />
		</div>
	</div>
</template>

<script>
// Leaflet's own stylesheet positions the map panes, tiles the tile
// images, and places the zoom/attribution controls. The JS is lazy-loaded
// in mounted(), but the CSS must be present whenever this widget renders —
// otherwise the map paints unstyled (no basemap, mispositioned controls).
// Import it here so the widget is self-styling for every consumer rather
// than relying on another component (e.g. a location picker) to pull it in.
import 'leaflet/dist/leaflet.css'
import { translate as t } from '@nextcloud/l10n'
import DOMPurify from 'dompurify'
import { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from '../../utils/safeMarkdownDompurifyConfig.js'
import { objectToGeoFeature } from '../../utils/geo.js'
import { objectDisplayName } from '../../utils/objectName.js'

const ALLOWED_LAYER_TYPES = ['tile', 'wms', 'wfs', 'geojson']

// Fallback background used when the consumer configures no `basemaps` and no
// `tile`/`wms` entry in `layers` — otherwise the map paints white. Consuming
// apps MUST allow this host in their Content-Security-Policy `img-src`
// (Nextcloud blocks external images by default) or the tiles are CSP-blocked
// and the map stays blank.
const DEFAULT_BASEMAP = {
	url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	options: {
		attribution: '© OpenStreetMap contributors',
		maxZoom: 19,
	},
}

// MDI paths for the custom control buttons, inlined so the widget carries no
// icon-font dependency and renders identically inside a Leaflet control bar.
const ICON_FIT = 'M9.5,13.09L10.91,14.5L6.41,19H10V21H3V14H5V17.59L9.5,13.09M10.91,9.5L9.5,10.91L5,6.41V10H3V3H10V5H6.41L10.91,9.5M14.5,13.09L19,17.59V14H21V21H14V19H17.59L13.09,14.5L14.5,13.09M13.09,9.5L17.59,5H14V3H21V10H19V6.41L14.5,10.91L13.09,9.5Z'
const ICON_LOCATE = 'M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M3.05,13H1V11H3.05C3.5,6.83 6.83,3.5 11,3.05V1H13V3.05C17.17,3.5 20.5,6.83 20.95,11H23V13H20.95C20.5,17.17 17.17,20.5 13,20.95V23H11V20.95C6.83,20.5 3.5,17.17 3.05,13M12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5Z'
const ICON_FULLSCREEN = 'M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z'
const ICON_FULLSCREEN_EXIT = 'M14,14H19V16H16V19H14V14M5,14H10V19H8V16H5V14M8,5H10V10H5V8H8V5M19,8V10H14V5H16V8H19Z'

/**
 * Wrap an MDI path in a 24x24 SVG sized for a Leaflet control button.
 *
 * @param {string} path The MDI `d` attribute.
 * @return {string} SVG markup.
 */
function controlIcon(path) {
	return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="${path}" /></svg>`
}

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
		 * Initial map center as `[latitude, longitude]`. Optional: on a dashboard
		 * the centre arrives via `content.center` (see the `cfg` computed), and when
		 * neither source supplies a valid pair it defaults to `[52.13, 5.29]` (the
		 * Netherlands).
		 * @type {[number, number]}
		 */
		center: {
			type: Array,
			default: () => [52.13, 5.29],
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
		 * clustering?, iconColor?, iconUrl?, centerMarker? }`. `features[]` is inline;
		 * `dataSource.url` is HTTP-fetched on mount; `dataSource.{register, schema}`
		 * plots the objects of an OpenRegister register/schema via their `@self.geo`.
		 * `centerMarker: true` adds an extra pin at the map's `center`, alongside any
		 * source markers.
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
		 * Show the "fit all markers" control — re-centres and re-zooms the map so
		 * every marker is back in view (the position the map opens at).
		 * @type {boolean}
		 */
		fitControl: {
			type: Boolean,
			default: true,
		},
		/**
		 * Show the fullscreen toggle. Expands the widget to fill the viewport via a
		 * CSS overlay, so it needs no Fullscreen-API permission prompt.
		 * @type {boolean}
		 */
		fullscreenControl: {
			type: Boolean,
			default: true,
		},
		/**
		 * Show the "locate me" control, which centres the map on the visitor's own
		 * position via the browser geolocation API. Warns (does not throw) if denied.
		 * @type {boolean}
		 */
		locateControl: {
			type: Boolean,
			default: true,
		},
		/**
		 * Switchable base maps: `[{ name, url, attribution, options }]`. The first
		 * entry is active on load and a layer switcher appears when more than one is
		 * given. Supply these INSTEAD of a `tile` entry in `layers` for the background
		 * map. Empty by default, so consumers that declare their background through
		 * `layers` are unaffected.
		 * @type {Array<object>}
		 */
		basemaps: {
			type: Array,
			default: () => [],
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
		/**
		 * Dashboard `content` blob. When this widget is placed on a dashboard, the
		 * grid stores its config here and each key (`center`, `zoom`, `markers`,
		 * `clustering`, `height`, `autoFit`, `layers`, `basemaps`) overrides the
		 * matching flat prop. Direct (non-dashboard) consumers omit this and pass
		 * the flat props instead. See the `cfg` computed for the merge rules.
		 * @type {object|null}
		 */
		content: {
			type: Object,
			default: null,
		},
		/**
		 * Dashboard placement record. Declared so the grid's `:placement` binding is
		 * consumed as a prop instead of leaking onto the root element; unused here.
		 * @type {object|null}
		 */
		placement: {
			type: Object,
			default: null,
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
			// Controls / sizing
			isFullscreen: false,
			controlBar: null,
			layersControl: null,
			fullscreenButton: null,
			resizeObserver: null,
			resizeTimer: null,
		}
	},

	computed: {
		/**
		 * Effective configuration. On a dashboard the placement `content` blob
		 * carries the widget's config, so each key falls back to `content.<key>`
		 * when present and otherwise uses the matching flat prop. This lets
		 * CnMapWidget work both directly (flat props) and as a dashboard renderer
		 * (a grid that binds only `:content` never spreads the keys as props).
		 *
		 * @return {object} the resolved `{ center, zoom, layers, markers,
		 *   clustering, height, autoFit, basemaps }`.
		 */
		cfg() {
			const c = this.content || {}
			const p = this.$props
			const validCentre = Array.isArray(c.center) && c.center.length === 2
				&& c.center.every((n) => Number.isFinite(n))
			return {
				center: validCentre ? c.center : p.center,
				zoom: Number.isFinite(c.zoom) ? c.zoom : p.zoom,
				layers: Array.isArray(c.layers) ? c.layers : p.layers,
				markers: (c.markers !== undefined && c.markers !== null) ? c.markers : p.markers,
				clustering: typeof c.clustering === 'boolean' ? c.clustering : p.clustering,
				height: (c.height !== undefined && c.height !== null && c.height !== '') ? c.height : p.height,
				autoFit: typeof c.autoFit === 'boolean' ? c.autoFit : p.autoFit,
				basemaps: Array.isArray(c.basemaps) ? c.basemaps : p.basemaps,
			}
		},
		resolvedHeight() {
			if (typeof this.cfg.height === 'number') return `${this.cfg.height}px`
			return this.cfg.height
		},
		clusteringEnabled() {
			if (this.cfg.markers && typeof this.cfg.markers.clustering === 'boolean') {
				return this.cfg.markers.clustering
			}
			return this.cfg.clustering
		},
	},

	watch: {
		// Watch the resolved config so both flat-prop and `content`-blob updates
		// re-render the affected layer set.
		'cfg.layers': {
			handler() {
				if (this.map) this.renderLayers()
			},
			deep: true,
		},
		'cfg.markers': {
			handler() {
				if (this.map) this.renderMarkers()
			},
			deep: true,
		},
		// Re-plot when the centre moves, but only while the centre pin is on —
		// otherwise the centre is an initial-view concern, not a marker one.
		'cfg.center': {
			handler() {
				if (this.map && this.cfg.markers && this.cfg.markers.centerMarker) {
					this.renderMarkers()
				}
			},
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

	beforeUnmount() {
		clearTimeout(this.boundsTimer)
		clearTimeout(this.resizeTimer)
		if (this.resizeObserver) {
			this.resizeObserver.disconnect()
			this.resizeObserver = null
		}
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
				center: this.cfg.center,
				zoom: this.cfg.zoom,
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

			// Geolocation is best-effort — a denied permission or an insecure origin
			// must not break the map, so just warn.
			this.map.on('locationerror', (e) => {
				// eslint-disable-next-line no-console
				console.warn('[CnMapWidget] Geolocation unavailable', e && e.message)
			})

			this.renderLayers()
			this.renderMarkers()
			this.addControls()

			// The container may grow (fill-height layouts) or start hidden behind a
			// view toggle. Re-flow whenever its box actually changes — otherwise
			// Leaflet keeps the stale size it measured at mount and the tiles and
			// markers land in the wrong place.
			if (typeof ResizeObserver !== 'undefined' && this.$refs.mapEl) {
				this.resizeObserver = new ResizeObserver(() => {
					clearTimeout(this.resizeTimer)
					this.resizeTimer = setTimeout(() => {
						if (this.map) this.map.invalidateSize()
					}, 100)
				})
				this.resizeObserver.observe(this.$refs.mapEl)
			}

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
			if (this.layersControl) {
				this.map.removeControl(this.layersControl)
				this.layersControl = null
			}

			this.renderBasemaps()

			for (const def of this.cfg.layers) {
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
			if (!this.map || !L || !this.cfg.markers) return

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
						|| (this.cfg.markers && this.cfg.markers.iconColor)
						|| 'var(--color-primary-element, #2196F3)'
					if (this.cfg.markers && this.cfg.markers.iconUrl) {
						return L.marker(latlng, {
							icon: L.icon({ iconUrl: this.cfg.markers.iconUrl, iconSize: [25, 41], iconAnchor: [12, 41] }),
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
					const popupField = this.cfg.markers && this.cfg.markers.popupField
					const popupHtml = popupField && feature.properties ? feature.properties[popupField] : null
					if (popupHtml) {
						// Security: marker data may come from an external URL
						// (markers.dataSource.url) or arbitrary GeoJSON feature
						// properties (often an OR-backed data source). Leaflet's
						// bindPopup renders its string argument as HTML (innerHTML),
						// so sanitize with the shared strict config (C1) before
						// injecting — a `<script>` / `onerror=` payload cannot
						// execute in the Nextcloud origin.
						const safeHtml = DOMPurify.sanitize(String(popupHtml), SAFE_MARKDOWN_DOMPURIFY_CONFIG)
						lyr.bindPopup(safeHtml)
					}

					// Hover tooltip: a marker with no label is a mystery dot. Name it
					// with the object's own display name — the backend already derives
					// one and publishes it as `@self.name`, so a Cow (`name`), a Barn
					// (`title`), and a Case (`reference`) all read correctly without the
					// widget knowing the schema. bindTooltip also renders HTML, so
					// sanitize the same way bindPopup does.
					const label = objectDisplayName(feature.properties || {})
					if (label !== '') {
						const safeLabel = DOMPurify.sanitize(label, SAFE_MARKDOWN_DOMPURIFY_CONFIG)
						lyr.bindTooltip(safeLabel, { direction: 'top' })
					}
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
					// `leaflet.markercluster` is a soft optional dep — declared in our
					// `dependencies` so npm installs it for direct consumers, but the
					// `webpackIgnore: true` magic comment stops the bundler from trying
					// to resolve the literal string against `node_modules/@conduction/
					// nextcloud-vue/dist/` in downstream apps (which would fail with
					// "Module not found"). The runtime catch handles the case where the
					// dep genuinely isn't installed.
					// eslint-disable-next-line import/no-unresolved
					await import(/* webpackIgnore: true */ 'leaflet.markercluster')
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

			if (this.cfg.autoFit) {
				// Wait a tick so the container has its final box — fill-height layouts
				// and the hidden→visible view toggle both settle after render.
				// fitToMarkers() then measures before it fits.
				this.$nextTick(() => this.fitToMarkers())
			}
		},

		/**
		 * Mount the switchable base maps and, when more than one is configured, a
		 * Leaflet layer switcher. Falls back to a single OpenStreetMap base map when
		 * the consumer supplied neither `basemaps` nor a `tile` entry in `layers`, so
		 * a map is never left with a blank background.
		 */
		renderBasemaps() {
			const L = this.L
			if (!this.map || !L || typeof L.tileLayer !== 'function') return

			const basemaps = (this.cfg.basemaps || []).filter((b) => b && typeof b.url === 'string' && b.url.length > 0)
			if (basemaps.length === 0) {
				// No explicit basemaps. Unless the consumer draws its own background
				// via a `tile`/`wms` entry in `layers`, add a single OpenStreetMap
				// base map so the map is never left blank (see DEFAULT_BASEMAP).
				const hasTileLayer = (this.cfg.layers || []).some((l) => l
					&& (l.type === 'tile' || l.type === 'wms')
					&& typeof l.url === 'string' && l.url.length > 0)
				if (!hasTileLayer) {
					const fallback = L.tileLayer(DEFAULT_BASEMAP.url, { ...DEFAULT_BASEMAP.options })
					fallback.addTo(this.map)
					this.layerInstances.push(fallback)
				}
				return
			}

			const baseLayers = {}
			basemaps.forEach((bm, index) => {
				const opts = { ...(bm.options || {}) }
				if (bm.attribution && !opts.attribution) opts.attribution = bm.attribution
				const instance = L.tileLayer(bm.url, opts)
				baseLayers[bm.name || `${index + 1}`] = instance
				// Only the first base map is live on load; the switcher swaps in the rest.
				if (index === 0) instance.addTo(this.map)
				this.layerInstances.push(instance)
			})

			if (Object.keys(baseLayers).length > 1 && L.control && typeof L.control.layers === 'function') {
				this.layersControl = L.control.layers(baseLayers, {}, { position: 'topright' })
				this.layersControl.addTo(this.map)
			}
		},

		/**
		 * Mount the custom control bar (fit-all / locate / fullscreen). Leaflet's own
		 * zoom + attribution controls are enabled separately in `initMap`.
		 */
		addControls() {
			const L = this.L
			// L.Control is absent from lightweight Leaflet stubs (tests); the map is
			// still perfectly usable without the extra bar, so degrade quietly.
			if (!this.map || !L || !L.Control || typeof L.Control.extend !== 'function') return

			const buttons = []
			if (this.fitControl) {
				buttons.push({ key: 'fit', title: t('nextcloud-vue', 'Fit all markers'), icon: ICON_FIT, onClick: () => this.fitToMarkers() })
			}
			if (this.locateControl) {
				buttons.push({ key: 'locate', title: t('nextcloud-vue', 'Show my location'), icon: ICON_LOCATE, onClick: () => this.locateMe() })
			}
			if (this.fullscreenControl) {
				buttons.push({ key: 'fullscreen', title: t('nextcloud-vue', 'Toggle fullscreen'), icon: ICON_FULLSCREEN, onClick: () => this.toggleFullscreen() })
			}
			if (buttons.length === 0) return

			// `onAdd()` below is invoked by Leaflet with `this` bound to the
			// L.Control instance, so the component has to be captured here to
			// stash the fullscreen button ref on it.
			// eslint-disable-next-line @typescript-eslint/no-this-alias
			const self = this
			const ControlBar = L.Control.extend({
				onAdd() {
					const bar = L.DomUtil.create('div', 'leaflet-bar cn-map-widget__controls')
					for (const button of buttons) {
						const anchor = L.DomUtil.create('a', `cn-map-widget__control cn-map-widget__control--${button.key}`, bar)
						anchor.href = '#'
						anchor.title = button.title
						anchor.setAttribute('role', 'button')
						anchor.setAttribute('aria-label', button.title)
						anchor.innerHTML = controlIcon(button.icon)
						if (button.key === 'fullscreen') self.fullscreenButton = anchor
						L.DomEvent.on(anchor, 'click', L.DomEvent.stop).on(anchor, 'click', button.onClick)
					}
					// Keep clicks / wheel on the bar from panning or zooming the map.
					L.DomEvent.disableClickPropagation(bar)
					L.DomEvent.disableScrollPropagation(bar)
					return bar
				},
			})

			this.controlBar = new ControlBar({ position: 'topleft' })
			this.controlBar.addTo(this.map)
		},

		/**
		 * Re-centre and re-zoom so every marker is back in view — the same frame
		 * `autoFit` lands on at load. Public: consumers MAY call it through `$refs`.
		 */
		fitToMarkers() {
			if (!this.map) return
			const target = this.clusterGroup || this.markerLayer
			if (!target) return
			try {
				const bounds = target.getBounds()
				if (!bounds || !bounds.isValid()) return
				// Measure first — a stale container size yields a wrong fit.
				this.map.invalidateSize()
				this.map.fitBounds(bounds, { padding: [50, 50] })
			} catch {
				// ignore — empty layer set means no bounds to fit
			}
		},

		/**
		 * Centre the map on the visitor's own position. Failures (denied permission,
		 * insecure origin) surface via the `locationerror` handler in `initMap`.
		 */
		locateMe() {
			if (!this.map || typeof this.map.locate !== 'function') return
			this.map.locate({ setView: true, maxZoom: 16 })
		},

		/**
		 * Toggle the CSS fullscreen overlay and re-flow Leaflet into the new box.
		 */
		toggleFullscreen() {
			this.isFullscreen = !this.isFullscreen
			if (this.fullscreenButton) {
				this.fullscreenButton.innerHTML = controlIcon(this.isFullscreen ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN)
			}
			this.$nextTick(() => {
				if (this.map) this.map.invalidateSize()
			})
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
		 * `dataSource.{register, schema}` plots the objects of an OpenRegister
		 * register/schema (see fetchRegisterFeatures).
		 *
		 * @return {Promise<Array<object>>} GeoJSON Feature array.
		 */
		async collectFeatures() {
			if (!this.cfg.markers) return []
			let features = await this.collectSourceFeatures()
			// Optional pin at the configured centre, plotted alongside the object
			// markers (`markers.centerMarker`). Spread into a new array so an inline
			// `features[]` prop is never mutated.
			if (this.cfg.markers.centerMarker) {
				const centre = this.centreMarkerFeature()
				if (centre) features = [...features, centre]
			}
			return features
		},

		/**
		 * Resolve the marker features from the configured source only —
		 * inline `features[]`, a fetched `dataSource.url`, or an OpenRegister
		 * `dataSource.{register, schema}`. The optional centre pin is layered on
		 * by collectFeatures().
		 *
		 * @return {Promise<Array<object>>} GeoJSON Feature array.
		 */
		async collectSourceFeatures() {
			if (Array.isArray(this.cfg.markers.features)) {
				return this.cfg.markers.features
			}
			const ds = this.cfg.markers.dataSource
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
			if (ds.register && ds.schema) {
				return await this.fetchRegisterFeatures(ds)
			}
			return []
		},

		/**
		 * Build a GeoJSON point Feature at the resolved centre, or null when the
		 * centre is not a valid `[lat, lng]` pair. GeoJSON coordinates are
		 * `[lng, lat]`, the reverse of the `center` prop's order.
		 *
		 * @return {object|null} the centre Feature, or null.
		 */
		centreMarkerFeature() {
			const c = this.cfg.center
			if (!Array.isArray(c) || c.length !== 2 || !c.every((n) => Number.isFinite(n))) {
				return null
			}
			return {
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [c[1], c[0]] },
				properties: {},
			}
		},

		/**
		 * Plot the objects of an OpenRegister register/schema.
		 *
		 * Each object's location comes from `@self.geo` (where CnObjectGeoWidget writes
		 * it), falling back to plain `latField` / `lngField` properties so a schema that
		 * models coordinates itself still plots. Objects with no usable location are
		 * skipped rather than dropped at (0, 0) — an invisible wrong marker is worse
		 * than an absent one.
		 *
		 * @param {{register: string, schema: string, limit?: number}} ds The data source.
		 * @return {Promise<Array<object>>} GeoJSON Feature array.
		 */
		async fetchRegisterFeatures(ds) {
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/{register}/{schema}',
					{ register: ds.register, schema: ds.schema },
				)
				const res = await axios.get(url, { params: { _limit: ds.limit || 500 } })
				const rows = (res && res.data && res.data.results) || []

				const latField = this.cfg.markers && this.cfg.markers.latField
				const lngField = this.cfg.markers && this.cfg.markers.lngField

				return rows
					.map((row) => objectToGeoFeature(row, { latField, lngField }))
					.filter(Boolean)
			} catch (err) {
				// eslint-disable-next-line no-console
				console.warn('[CnMapWidget] Failed to load objects for the map', ds, err)
				return []
			}
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
				const latField = (this.cfg.markers && this.cfg.markers.latField) || 'lat'
				const lngField = (this.cfg.markers && this.cfg.markers.lngField) || 'lng'
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

/* Fullscreen overlay. A CSS-fixed box rather than the Fullscreen API, so it needs
   no permission prompt; the z-index clears the Nextcloud header. */
.cn-map-widget--fullscreen {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	z-index: 3000;
}

/* Custom control bar (fit / locate / fullscreen), themed to Nextcloud rather than
   Leaflet's default white-on-grey buttons.
   ::v-deep is required — Leaflet builds the control DOM via L.DomUtil.create, so
   those nodes never receive this SFC's scoped data-v attribute. */
.cn-map-widget ::v-deep .cn-map-widget__control {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	color: var(--color-main-text);
	background: var(--color-main-background);
}

.cn-map-widget ::v-deep .cn-map-widget__control:hover,
.cn-map-widget ::v-deep .cn-map-widget__control:focus-visible {
	background: var(--color-background-hover);
}
</style>
