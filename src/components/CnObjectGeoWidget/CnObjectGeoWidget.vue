<!--
  CnObjectGeoWidget — view and edit an OpenRegister object's geo metadata.

  Renders the object's location (`@self.geo`) on a Leaflet map (via the
  CnMapWidget primitive) on the CnWidgetWrapper chrome. When `editable`, a
  click on the map places or moves the location marker and a footer offers
  Save / Cancel / Remove. Save PATCHes only `@self.geo` on the object via
  OpenRegister's REST API — the object's own properties are untouched.

  The stored shape is a GeoJSON Point geometry (`{ type: 'Point',
  coordinates: [lng, lat] }`). Reading is tolerant: a bare Point geometry, a
  Feature, a FeatureCollection (first feature) or a plain `{ lat, lng }` /
  `{ latitude, longitude }` object are all accepted.
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId || 'object-geo'"
		:documentation-url="documentationUrl"
		:refreshing="saving"
		flush>
		<div class="cn-object-geo-widget">
			<div v-if="editable && addressSearch" class="cn-object-geo-widget__search">
				<NcTextField
					:model-value="query"
					:label="t('nextcloud-vue', 'Search for an address or place')"
					:show-trailing-button="false"
					@update:model-value="onQueryInput">
					<Magnify :size="18" />
				</NcTextField>
				<NcLoadingIcon v-if="searching" :size="20" />
				<ul v-if="results.length" class="cn-object-geo-widget__results">
					<li v-for="(result, index) in results" :key="`geo-result-${index}`">
						<button type="button" @click="pickResult(result)">
							{{ result.label }}
						</button>
					</li>
				</ul>
				<p v-if="searchError" class="cn-object-geo-widget__error">
					{{ searchError }}
				</p>
			</div>

			<CnMapWidget
				:key="`cn-object-geo-map-${mapEpoch}`"
				:center="mapCenter"
				:zoom="mapZoom"
				:layers="resolvedLayers"
				:basemaps="resolvedBasemaps"
				:markers="mapMarkers"
				:height="height"
				:auto-fit="false"
				:fit-control="fitControl"
				:locate-control="locateControl"
				:fullscreen-control="fullscreenControl"
				:aria-label="t('nextcloud-vue', 'Object location map')"
				@click="onMapClick" />
			<p v-if="editable && !activePoint" class="cn-object-geo-widget__hint">
				{{ t('nextcloud-vue', 'Click the map to set this object’s location.') }}
			</p>
			<p v-if="error" class="cn-object-geo-widget__error">
				{{ error }}
			</p>
		</div>

		<template v-if="editable" #footer>
			<div class="cn-object-geo-widget__footer">
				<template v-if="dirty">
					<NcButton variant="primary" :disabled="saving" @click="save">
						<template #icon>
							<NcLoadingIcon v-if="saving" :size="20" />
							<ContentSave v-else :size="20" />
						</template>
						{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Save location') }}
					</NcButton>
					<NcButton variant="tertiary" :disabled="saving" @click="cancel">
						{{ t('nextcloud-vue', 'Cancel') }}
					</NcButton>
				</template>
				<NcButton v-else-if="activePoint"
					variant="tertiary"
					:disabled="saving"
					@click="clear">
					<template #icon>
						<MapMarkerOff :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Remove location') }}
				</NcButton>
				<span v-if="activePoint" class="cn-object-geo-widget__coords">{{ coordsLabel }}</span>
			</div>
		</template>
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
// Aliased: the methods below are also called parseGeoPoint/finitePoint (kept for
// backwards compatibility), and an unaliased call inside them would read like recursion.
import { parseGeoPoint as parseGeoPointUtil, finitePoint as finitePointUtil } from '../../utils/geo.js'
import { NcButton, NcLoadingIcon, NcTextField } from '@nextcloud/vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import MapMarkerOff from 'vue-material-design-icons/MapMarkerOff.vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'
import CnMapWidget from '../CnMapWidget/CnMapWidget.vue'
import { buildHeaders } from '../../utils/headers.js'

/** Default map centre when the object has no location yet (Netherlands). */
const DEFAULT_CENTER = Object.freeze([52.132633, 5.291266])

/**
 * Default base layer — the OpenStreetMap standard tile set. Uses the `{s}`
 * subdomain form (a/b/c) so the tile host matches a `*.tile.openstreetmap.org`
 * CSP `img-src` allow-list entry (the bare `tile.openstreetmap.org` host does
 * NOT match a `*.` wildcard and would be blocked on CSP-hardened instances).
 */
const DEFAULT_LAYERS = Object.freeze([
	Object.freeze({
		type: 'tile',
		url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		options: Object.freeze({ attribution: '© OpenStreetMap contributors', maxZoom: 19, subdomains: 'abc' }),
	}),
])

/**
 * The base maps a widget config may choose from, keyed by the id stored in the
 * widget content blob.
 *
 * Every entry is an `<img>` load from a third-party host, so the consuming app
 * MUST allowlist that host in its `img-src` Content-Security-Policy or the tiles
 * render blank with no network request at all. Only `standard` is safe to assume;
 * see Dossiq's `relaxCspForMapTiles()` for the pattern.
 */
const BASEMAPS = Object.freeze({
	standard: Object.freeze({
		id: 'standard',
		name: 'Standard',
		url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		attribution: '© OpenStreetMap contributors',
	}),
	humanitarian: Object.freeze({
		id: 'humanitarian',
		name: 'Humanitarian',
		url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
		attribution: '© OpenStreetMap contributors, tiles by HOT',
	}),
	terrain: Object.freeze({
		id: 'terrain',
		name: 'Terrain',
		url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
		attribution: '© OpenStreetMap contributors, SRTM | © OpenTopoMap',
	}),
})

/** Nominatim forward-geocoding endpoint used by the optional address search. */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

/** Debounce for address lookups — Nominatim's usage policy caps ~1 request/second. */
const GEOCODE_DEBOUNCE_MS = 600

/**
 * CnObjectGeoWidget — view and edit an object's `@self.geo` on a map.
 *
 * Reads the object's location from `objectData['@self'].geo`, renders it as a
 * marker on a CnMapWidget, and (when `editable`) lets the user place / move /
 * remove the marker and persist it as a GeoJSON Point via a PATCH that only
 * touches `@self.geo`.
 *
 * ```vue
 * <CnObjectGeoWidget
 *   :object-data="object"
 *   :register="register"
 *   :schema="schema"
 *   @saved="onGeoSaved" />
 * ```
 */
export default {
	name: 'CnObjectGeoWidget',

	components: {
		CnWidgetWrapper,
		CnMapWidget,
		NcButton,
		NcLoadingIcon,
		NcTextField,
		ContentSave,
		Magnify,
		MapMarkerOff,
	},

	props: {
		/** Widget title shown in the header. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Location'),
		},
		/** The object data — its `@self.geo` seeds the marker; `@self` also supplies register/schema/id fallbacks. */
		objectData: {
			type: Object,
			default: () => ({}),
		},
		/** The object's id. Explicit prop wins over `objectData['@self'].id`. */
		objectId: {
			type: [String, Number],
			default: '',
		},
		/** OpenRegister register slug/id. When omitted, derived from `objectData['@self'].register`. */
		register: {
			type: [String, Number],
			default: '',
		},
		/** OpenRegister schema slug/id. When omitted, derived from `objectData['@self'].schema`. */
		schema: {
			type: [String, Number],
			default: '',
		},
		/** Whether the map is editable (click to set, footer Save/Remove). Read-only when false. */
		editable: {
			type: Boolean,
			default: true,
		},
		/** Map container height. Forwarded to CnMapWidget. */
		height: {
			type: [String, Number],
			default: '360px',
		},
		/** Map centre `[lat, lng]` used when the object has no location yet. */
		defaultCenter: {
			type: Array,
			default: () => [...DEFAULT_CENTER],
			validator: (v) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n)),
		},
		/** Zoom used when the object has no location yet. */
		defaultZoom: {
			type: Number,
			default: 7,
		},
		/**
		 * Base layer stack forwarded to `CnMapWidget` (`{ type, url, options }[]`).
		 * Defaults to the OpenStreetMap standard tile set; override to use a
		 * different basemap (e.g. the Dutch PDOK BRT achtergrondkaart). Supplying a
		 * `tile` entry here takes over the background and disables `basemap`.
		 * @type {Array<object>}
		 */
		layers: {
			type: Array,
			default: () => DEFAULT_LAYERS.map((l) => ({ ...l })),
		},
		/**
		 * Base map shown by default — one of `standard`, `humanitarian`, `terrain`.
		 * The app must allowlist the tile host in its `img-src` CSP.
		 * @type {string}
		 */
		basemap: {
			type: String,
			default: 'standard',
			validator: (v) => Object.prototype.hasOwnProperty.call(BASEMAPS, v),
		},
		/** Offer a base-map switcher so users can change the background themselves. */
		allowBasemapSwitch: {
			type: Boolean,
			default: false,
		},
		/** Show the "fit to location" control (re-centres on the marker). */
		fitControl: {
			type: Boolean,
			default: true,
		},
		/** Show the "locate me" control (browser geolocation). */
		locateControl: {
			type: Boolean,
			default: true,
		},
		/** Show the fullscreen toggle. */
		fullscreenControl: {
			type: Boolean,
			default: true,
		},
		/**
		 * Show an address-search box that geocodes a place name via OpenStreetMap
		 * Nominatim and drops the marker there. Requires `editable`, and the app must
		 * allowlist `https://nominatim.openstreetmap.org` in its `connect-src` CSP.
		 */
		addressSearch: {
			type: Boolean,
			default: false,
		},
		/** Documentation link for the overflow Actions menu. */
		documentationUrl: {
			type: String,
			default: '',
		},
		/** Stable id forwarded to the widget chrome. */
		widgetId: {
			type: String,
			default: '',
		},
	},

	emits: [
		/**
		 * @event saved Emitted after `@self.geo` is persisted. Payload is the saved geo value (GeoJSON Point or null).
		 * @type {object|null}
		 */
		'saved',
		/**
		 * @event update:geo Sibling of `saved` for `.sync`-style consumers.
		 * @type {object|null}
		 */
		'update:geo',
	],

	data() {
		return {
			// The working marker: `undefined` = unchanged from the saved value,
			// `null` = cleared, `{ lat, lng }` = placed/moved.
			draft: undefined,
			// Local override of the saved geo after a successful PATCH (the
			// `objectData` prop is a render-time snapshot and stays stale).
			localGeo: undefined,
			saving: false,
			error: '',
			// Bumped to remount CnMapWidget so it re-centres after a save/reload.
			mapEpoch: 0,
			// Address search (opt-in via `addressSearch`).
			query: '',
			results: [],
			searching: false,
			searchError: '',
			searchTimer: null,
		}
	},

	computed: {
		/** The object-data record, guaranteed to be a plain object (prop may be null while loading). */
		safeObjectData() {
			return (this.objectData && typeof this.objectData === 'object') ? this.objectData : {}
		},

		/** Resolved object id — explicit prop wins, else from `@self`. */
		resolvedId() {
			const self = this.safeObjectData['@self'] || {}
			return this.objectId || this.safeObjectData.id || self.id || ''
		},

		/** Resolved register slug/id — explicit prop wins, else from `@self`. */
		resolvedRegister() {
			const self = this.safeObjectData['@self'] || {}
			return this.register || self.register || ''
		},

		/** Resolved schema slug/id — explicit prop wins, else from `@self`. */
		resolvedSchema() {
			const self = this.safeObjectData['@self'] || {}
			return this.schema || self.schema || ''
		},

		/** The currently-saved geo value (local override after PATCH, else the prop's `@self.geo`). */
		savedGeo() {
			if (this.localGeo !== undefined) return this.localGeo
			const self = this.safeObjectData['@self'] || {}
			return self.geo || null
		},

		/** The saved location as `{ lat, lng }`, or null when unset/unparseable. */
		savedPoint() {
			return this.parseGeoPoint(this.savedGeo)
		},

		/** Whether the user has an unsaved draft (placed, moved, or cleared). */
		hasDraft() {
			return this.draft !== undefined
		},

		/** The effective location shown on the map — the draft when present, else the saved point. */
		activePoint() {
			return this.hasDraft ? this.draft : this.savedPoint
		},

		/** Whether the draft differs from the saved point (drives Save/Cancel). */
		dirty() {
			return this.hasDraft && !this.samePoint(this.draft, this.savedPoint)
		},

		/** Map centre — the active point, else the configured default. */
		mapCenter() {
			return this.activePoint ? [this.activePoint.lat, this.activePoint.lng] : [...this.defaultCenter]
		},

		/** Map zoom — tighter when a point is set, else the configured default. */
		mapZoom() {
			return this.activePoint ? 14 : this.defaultZoom
		},

		/**
		 * Base layers forwarded to CnMapWidget. When `resolvedBasemaps` supplies the
		 * background we pass NO tile layer here, or the two would stack.
		 */
		resolvedLayers() {
			if (this.resolvedBasemaps.length > 0) return []
			return (Array.isArray(this.layers) && this.layers.length) ? this.layers : DEFAULT_LAYERS.map((l) => ({ ...l }))
		},

		/**
		 * Switchable base maps forwarded to CnMapWidget. Empty when the consumer
		 * supplied its own `tile` layer through `layers` (that wins, so a custom
		 * background such as PDOK keeps working). Otherwise the selected base map is
		 * first — CnMapWidget makes the first entry live and only renders a switcher
		 * when more than one is present.
		 *
		 * @return {Array<object>}
		 */
		resolvedBasemaps() {
			// A consumer-supplied custom tile layer owns the background.
			if (!this.layersAreDefault) return []

			const selected = BASEMAPS[this.basemap] || BASEMAPS.standard
			if (!this.allowBasemapSwitch) return [{ ...selected }]

			// Selected first (it is the one CnMapWidget activates on load), then the rest.
			return [
				{ ...selected },
				...Object.values(BASEMAPS)
					.filter((b) => b.id !== selected.id)
					.map((b) => ({ ...b })),
			]
		},

		/** Whether `layers` is still the untouched OSM default (so a basemap may take over). */
		layersAreDefault() {
			const l = Array.isArray(this.layers) ? this.layers : []
			return l.length === 0 || (l.length === 1 && l[0] && l[0].url === DEFAULT_LAYERS[0].url)
		},

		/** CnMapWidget markers config — a single Point feature for the active location, or null. */
		mapMarkers() {
			if (!this.activePoint) return null
			return {
				features: [this.pointFeature(this.activePoint)],
				iconColor: 'var(--color-primary-element, #0082c9)',
			}
		},

		/** Human-readable "lat, lng" for the active point. */
		coordsLabel() {
			if (!this.activePoint) return ''
			return `${this.activePoint.lat.toFixed(5)}, ${this.activePoint.lng.toFixed(5)}`
		},
	},

	watch: {
		// Re-centre the map when the persisted location changes (save / reload /
		// a fresh object) — CnMapWidget takes its centre at mount, so remount it.
		savedGeo() {
			this.mapEpoch += 1
		},
	},

	beforeUnmount() {
		clearTimeout(this.searchTimer)
	},

	methods: {
		t,

		/**
		 * Debounce an address lookup. Nominatim's usage policy caps requests at
		 * roughly one per second, so we never fire per keystroke.
		 *
		 * @param {string} value The current query text.
		 * @return {void}
		 */
		onQueryInput(value) {
			this.query = value
			this.searchError = ''
			clearTimeout(this.searchTimer)
			if (!value || value.trim().length < 3) {
				this.results = []
				return
			}
			this.searchTimer = setTimeout(() => this.geocode(), GEOCODE_DEBOUNCE_MS)
		},

		/**
		 * Forward-geocode the current query through OpenStreetMap Nominatim.
		 *
		 * Failures here are expected in the wild — the app may not have allowlisted
		 * `nominatim.openstreetmap.org` in its `connect-src` CSP, or the service may
		 * rate-limit — so surface a message rather than throwing.
		 *
		 * @return {Promise<void>}
		 */
		async geocode() {
			const q = (this.query || '').trim()
			if (q.length < 3) return

			this.searching = true
			this.searchError = ''
			try {
				const url = `${NOMINATIM_URL}?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`
				const response = await fetch(url)
				if (!response.ok) throw new Error(`HTTP ${response.status}`)
				const json = await response.json()
				this.results = (Array.isArray(json) ? json : [])
					.map((r) => ({
						label: r.display_name,
						lat: Number.parseFloat(r.lat),
						lng: Number.parseFloat(r.lon),
					}))
					.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
				if (this.results.length === 0) {
					this.searchError = t('nextcloud-vue', 'No places found for that search.')
				}
			} catch (err) {
				this.results = []
				this.searchError = t('nextcloud-vue', 'Address lookup failed. The search service may be unreachable.')
				// eslint-disable-next-line no-console
				console.warn('[CnObjectGeoWidget] Geocoding failed', err)
			} finally {
				this.searching = false
			}
		},

		/**
		 * Drop the marker on a geocoded result and re-centre the map on it.
		 *
		 * @param {{lat: number, lng: number, label: string}} result The chosen place.
		 * @return {void}
		 */
		pickResult(result) {
			if (!this.editable || !result) return
			this.draft = { lat: result.lat, lng: result.lng }
			this.results = []
			this.query = result.label
			// CnMapWidget takes its centre at mount, so remount it to re-centre.
			this.mapEpoch += 1
		},

		/**
		 * Parse a stored geo value into `{ lat, lng }`, or null when absent /
		 * unparseable. Accepts a Point geometry, a Feature, a FeatureCollection
		 * (first feature), or a plain `{ lat, lng }` / `{ latitude, longitude }`.
		 *
		 * @param {object|null} geo The stored geo value.
		 * @return {{lat: number, lng: number}|null} The parsed point.
		 */
		parseGeoPoint(geo) {
			// Shared with CnMapWidget — the two must agree on what a valid location is.
			return parseGeoPointUtil(geo)
		},

		/**
		 * Build a `{ lat, lng }` when both are finite numbers, else null.
		 *
		 * @param {*} lat Candidate latitude.
		 * @param {*} lng Candidate longitude.
		 * @return {?{lat: number, lng: number}} The point, or null.
		 */
		finitePoint(lat, lng) {
			return finitePointUtil(lat, lng)
		},

		/**
		 * Convert a `{ lat, lng }` point into a GeoJSON Point geometry.
		 *
		 * @param {{lat: number, lng: number}} point The point.
		 * @return {{type: 'Point', coordinates: [number, number]}} The GeoJSON Point.
		 */
		pointToGeoJSON(point) {
			return { type: 'Point', coordinates: [point.lng, point.lat] }
		},

		/**
		 * Wrap a point in a GeoJSON Feature for CnMapWidget's `markers.features`.
		 *
		 * @param {{lat: number, lng: number}} point The point.
		 * @return {object} The GeoJSON Feature.
		 */
		pointFeature(point) {
			return { type: 'Feature', geometry: this.pointToGeoJSON(point), properties: {} }
		},

		/**
		 * Whether two points (or nulls) are effectively equal.
		 *
		 * @param {{lat: number, lng: number}|null} a First point.
		 * @param {{lat: number, lng: number}|null} b Second point.
		 * @return {boolean} True when equal.
		 */
		samePoint(a, b) {
			if (!a && !b) return true
			if (!a || !b) return false
			return Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lng - b.lng) < 1e-9
		},

		/**
		 * Place / move the marker on map click (edit mode only).
		 *
		 * @param {{lat: number, lng: number}} payload The click location from CnMapWidget.
		 * @return {void}
		 */
		onMapClick(payload) {
			if (!this.editable || !payload) return
			const point = this.finitePoint(payload.lat, payload.lng)
			if (point) {
				this.draft = point
				this.error = ''
			}
		},

		/** Discard the working draft. */
		cancel() {
			this.draft = undefined
			this.error = ''
		},

		/** Clear the location (persist `@self.geo = null`). */
		clear() {
			this.draft = null
			this.save()
		},

		/**
		 * Persist the active location as `@self.geo` (GeoJSON Point, or null when
		 * cleared) via a PATCH that touches only `@self.geo`.
		 *
		 * @return {Promise<void>}
		 */
		async save() {
			if (this.saving) return
			if (!this.resolvedRegister || !this.resolvedSchema || !this.resolvedId) {
				this.error = t('nextcloud-vue', 'Cannot save — the object is not fully loaded yet.')
				return
			}
			this.saving = true
			this.error = ''
			const newGeo = this.activePoint ? this.pointToGeoJSON(this.activePoint) : null
			try {
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}', {
					register: this.resolvedRegister,
					schema: this.resolvedSchema,
					id: this.resolvedId,
				})
				const response = await fetch(url, {
					method: 'PATCH',
					headers: buildHeaders(),
					body: JSON.stringify({ '@self': { geo: newGeo } }),
				})
				if (!response.ok) throw new Error(`${response.status}`)
				this.localGeo = newGeo
				this.draft = undefined
				/**
				 * @event saved Emitted after `@self.geo` is persisted. Payload is the saved geo value (GeoJSON Point or null).
				 * @type {object|null}
				 */
				this.$emit('saved', newGeo)
				/**
				 * @event update:geo Sibling of `saved` for `.sync`-style consumers.
				 * @type {object|null}
				 */
				this.$emit('update:geo', newGeo)
			} catch (e) {
				this.error = t('nextcloud-vue', 'Could not save the location.')
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-object-geo-widget {
	display: flex;
	flex-direction: column;
}

/* Address search sits above the map; the result list overlays it rather than
   pushing the map down, so the layout doesn't jump while typing. */
.cn-object-geo-widget__search {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: calc(2 * var(--default-grid-baseline, 4px));
}

.cn-object-geo-widget__results {
	position: absolute;
	top: 100%;
	left: calc(2 * var(--default-grid-baseline, 4px));
	right: calc(2 * var(--default-grid-baseline, 4px));
	z-index: 1000;
	max-height: 220px;
	overflow-y: auto;
	margin: 0;
	padding: 4px;
	list-style: none;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, .15);
}

.cn-object-geo-widget__results button {
	display: block;
	width: 100%;
	padding: 8px;
	border: none;
	border-radius: var(--border-radius, 4px);
	background: transparent;
	color: var(--color-main-text);
	text-align: left;
	font-size: 0.9em;
	cursor: pointer;
}

.cn-object-geo-widget__results button:hover,
.cn-object-geo-widget__results button:focus-visible {
	background: var(--color-background-hover);
}

.cn-object-geo-widget__hint {
	margin: 0;
	padding: calc(2 * var(--default-grid-baseline, 4px));
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-object-geo-widget__error {
	margin: 0;
	padding: calc(2 * var(--default-grid-baseline, 4px));
	color: var(--color-error);
	font-size: 0.85em;
}

.cn-object-geo-widget__footer {
	display: flex;
	align-items: center;
	gap: calc(2 * var(--default-grid-baseline, 4px));
	padding: calc(2 * var(--default-grid-baseline, 4px));
}

.cn-object-geo-widget__coords {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	font-variant-numeric: tabular-nums;
}
</style>
