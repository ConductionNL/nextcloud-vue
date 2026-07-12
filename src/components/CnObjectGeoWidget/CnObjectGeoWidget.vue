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
			<CnMapWidget
				:key="`cn-object-geo-map-${mapEpoch}`"
				:center="mapCenter"
				:zoom="mapZoom"
				:layers="resolvedLayers"
				:markers="mapMarkers"
				:height="height"
				:auto-fit="false"
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
					<NcButton type="primary" :disabled="saving" @click="save">
						<template #icon>
							<NcLoadingIcon v-if="saving" :size="20" />
							<ContentSave v-else :size="20" />
						</template>
						{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Save location') }}
					</NcButton>
					<NcButton type="tertiary" :disabled="saving" @click="cancel">
						{{ t('nextcloud-vue', 'Cancel') }}
					</NcButton>
				</template>
				<NcButton v-else-if="activePoint"
					type="tertiary"
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
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
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
		ContentSave,
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
		 * different basemap (e.g. the Dutch PDOK BRT achtergrondkaart).
		 * @type {Array<object>}
		 */
		layers: {
			type: Array,
			default: () => DEFAULT_LAYERS.map((l) => ({ ...l })),
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
		/* eslint-disable jsdoc/valid-types -- the colon in the event name is valid Vue but not a jsdoc namepath */
		/**
		 * @event update:geo Sibling of `saved` for `.sync`-style consumers.
		 * @type {object|null}
		 */
		'update:geo',
		/* eslint-enable jsdoc/valid-types */
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

		/** Base layers forwarded to CnMapWidget — the `layers` prop, else the OSM default. */
		resolvedLayers() {
			return (Array.isArray(this.layers) && this.layers.length) ? this.layers : DEFAULT_LAYERS.map((l) => ({ ...l }))
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

	methods: {
		t,

		/**
		 * Parse a stored geo value into `{ lat, lng }`, or null when absent /
		 * unparseable. Accepts a Point geometry, a Feature, a FeatureCollection
		 * (first feature), or a plain `{ lat, lng }` / `{ latitude, longitude }`.
		 *
		 * @param {object|null} geo The stored geo value.
		 * @return {{lat: number, lng: number}|null} The parsed point.
		 */
		parseGeoPoint(geo) {
			if (!geo || typeof geo !== 'object') return null
			// FeatureCollection → first feature.
			if (geo.type === 'FeatureCollection' && Array.isArray(geo.features) && geo.features.length) {
				return this.parseGeoPoint(geo.features[0])
			}
			// Feature → its geometry.
			if (geo.type === 'Feature' && geo.geometry) {
				return this.parseGeoPoint(geo.geometry)
			}
			// Point geometry → [lng, lat].
			if (geo.type === 'Point' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
				const [lng, lat] = geo.coordinates
				return this.finitePoint(lat, lng)
			}
			// Plain lat/lng shapes.
			const lat = geo.lat ?? geo.latitude
			const lng = geo.lng ?? geo.lon ?? geo.longitude
			return this.finitePoint(lat, lng)
		},

		/**
		 * Build a `{ lat, lng }` when both are finite numbers, else null.
		 *
		 * @param {*} lat Candidate latitude.
		 * @param {*} lng Candidate longitude.
		 * @return {{lat: number, lng: number}|null} The point or null.
		 */
		finitePoint(lat, lng) {
			const nLat = Number(lat)
			const nLng = Number(lng)
			if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null
			return { lat: nLat, lng: nLng }
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
				/* eslint-disable jsdoc/valid-types -- the colon in the event name is valid Vue but not a jsdoc namepath */
				/**
				 * @event update:geo Sibling of `saved` for `.sync`-style consumers.
				 * @type {object|null}
				 */
				this.$emit('update:geo', newGeo)
				/* eslint-enable jsdoc/valid-types */
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
