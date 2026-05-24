<!--
  CnMapsTab — bespoke sidebar tab for the `maps` integration.

  Replaces the generic CnIntegrationTab for the `maps` leaf: renders
  linked POIs / favourites with name, category badge, comment snippet,
  and a nicely-formatted lat/lng coordinate pair. Each row deep-links
  into the NC Maps app — the provider already supplies a per-POI URL
  (`/index.php/apps/maps/#/m={id}`); the tab also exposes a separate
  "Open on map" link in the format requested by host bundles
  (`/index.php/apps/maps/?point={lat},{lng}` — see the task brief).

  Talks to the same OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/maps`
  served by `OCA\OpenRegister\Service\Integration\Providers\MapsProvider`
  (storage strategy `link-table` — marker `[or:{uuid}]` lives in the
  Maps `maps_favorites.name` column). Provider payload shape (verified
  against `MapsProvider::list`):
    { id, title, url, data: { id, name, lat, lng, category, comment, ... } }
  The richer "spec" shape (name, category, lat, lng, comment, url) is
  accepted too — the UI reads top-level and `data.*` fields defensively.

  Bespoke-vs-generic rationale: the generic tab renders a flat title
  list which loses the category badge, the human-readable coordinate
  string and the comment snippet — three signals that make a POI
  legible at-a-glance. The bespoke tab surfaces them per row.

  Mini-map preview: deliberately skipped for v1 — the only inline map
  component in this repo (`CnMapWidget`) is a heavy Leaflet wrapper
  intended for full-page rendering, not for a sidebar row. We surface
  formatted coordinates + an "Open on map" link instead and revisit
  once a lightweight static-map primitive lands.

  Surface behaviour:
    - Empty state ("No locations linked yet") + "Open Locations" CTA
      when zero rows.
    - Loading state via NcLoadingIcon for the full-tab spin.
    - 503 unavailable banner (matches CnIntegrationTab's AD-23 graceful
      degradation), generic error path on non-OK / fetch throw.

  See `openregister/openspec/changes/integration-maps/` for the spec
  delta and ADR-019 (registry mechanism), ADR-022 (consumption).
-->
<template>
	<div class="cn-sidebar-tab cn-maps-tab">
		<div v-if="degraded" class="cn-maps-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />

		<div v-else-if="error" class="cn-maps-tab__error" role="alert">
			{{ error }}
		</div>

		<div
			v-else-if="points.length === 0 && !degraded"
			class="cn-sidebar-tab__empty cn-maps-tab__empty">
			<MapMarker :size="32" class="cn-maps-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openMapsApp">
				<template #icon>
					<MapMarker :size="20" />
				</template>
				{{ openMapsLabel }}
			</NcButton>
		</div>

		<ul v-else-if="points.length > 0" class="cn-maps-tab__list">
			<li
				v-for="point in points"
				:key="pointKey(point)"
				class="cn-maps-tab__row">
				<div class="cn-maps-tab__row-icon">
					<MapMarker :size="20" />
				</div>
				<div class="cn-maps-tab__row-main">
					<div class="cn-maps-tab__row-header">
						<a
							:href="pointUrl(point)"
							target="_blank"
							rel="noopener"
							class="cn-maps-tab__title">{{ pointName(point) }}</a>
						<span v-if="pointCategory(point)" class="cn-maps-tab__category">
							{{ pointCategory(point) }}
						</span>
					</div>
					<span v-if="pointComment(point)" class="cn-maps-tab__comment">
						{{ pointComment(point) }}
					</span>
					<div v-if="coordsLabel(point)" class="cn-maps-tab__coords">
						<span class="cn-maps-tab__coords-text">{{ coordsLabel(point) }}</span>
						<a
							v-if="pointHasCoords(point)"
							:href="openOnMapUrl(point)"
							target="_blank"
							rel="noopener"
							class="cn-maps-tab__open-link">
							{{ openOnMapLabel }}
						</a>
					</div>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import MapMarker from 'vue-material-design-icons/MapMarker.vue'
import { buildHeaders } from '../../../utils/index.js'
import { stripMarker } from '../../utils/marker.js'

const COMMENT_MAX_CHARS = 160

/**
 * CnMapsTab — bespoke sidebar list for the `maps` integration.
 *
 * Renders POIs / favourites pulled from the OR pluggable-integration
 * endpoint with name, category, comment snippet, formatted coordinates,
 * and an "Open on map" deep-link.
 */
export default {
	name: 'CnMapsTab',

	components: { NcButton, NcLoadingIcon, AlertCircleOutline, MapMarker },

	props: {
		/** Stable integration id (forwarded from the registry — always `'maps'`). */
		integrationId: { type: String, default: 'maps' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No locations linked yet') },
		/** Pre-translated "Open Locations" CTA label. */
		openMapsLabel: { type: String, default: () => t('nextcloud-vue', 'Open Locations') },
		/** Pre-translated "Open on map" inline link label. */
		openOnMapLabel: { type: String, default: () => t('nextcloud-vue', 'Open on map') },
		/** Pre-translated banner when Maps is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Location is currently unavailable.') },
		/** URL of the NC Maps app entry. */
		mapsAppUrl: { type: String, default: '/index.php/apps/maps' },
	},

	data() {
		return {
			points: [],
			loading: false,
			error: '',
			degraded: '',
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchPoints() } } },
		register() { this.fetchPoints() },
		schema() { this.fetchPoints() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		dataOf(point) {
			return (point && typeof point.data === 'object' && point.data !== null) ? point.data : {}
		},

		pointKey(point) {
			const d = this.dataOf(point)
			return point.id ?? d.id ?? this.pointName(point)
		},

		pointName(point) {
			const d = this.dataOf(point)
			const candidate = point.name ?? point.title ?? d.name ?? d.title ?? ''
			// Provider returns the name (which carries the `[or:{uuid}]`
			// marker) as title fallback. Strip the marker for display.
			return stripMarker(candidate) || String(this.pointKey(point))
		},

		pointCategory(point) {
			const d = this.dataOf(point)
			const c = point.category ?? d.category ?? ''
			// Maps fixtures sometimes land a bare `or:{uuid}` marker in
			// the category column when no real category exists. Strip
			// the marker and suppress the chip when nothing meaningful
			// remains — surfacing the marker as a chip artefact (see
			// phase-d1 maps-tab.png) is the bug we're fixing.
			return stripMarker(c)
		},

		pointComment(point) {
			const d = this.dataOf(point)
			const raw = point.comment ?? d.comment ?? ''
			const text = String(raw).replace(/\s+/g, ' ').trim()
			if (text === '') {
				return ''
			}
			if (text.length > COMMENT_MAX_CHARS) {
				return text.slice(0, COMMENT_MAX_CHARS).trimEnd() + '…'
			}
			return text
		},

		coordOf(point, key) {
			const d = this.dataOf(point)
			const v = point[key] ?? d[key] ?? null
			if (v === null || v === undefined || v === '') {
				return null
			}
			const num = typeof v === 'number' ? v : Number(v)
			return Number.isFinite(num) === true ? num : null
		},

		pointLat(point) {
			return this.coordOf(point, 'lat')
		},

		pointLng(point) {
			return this.coordOf(point, 'lng')
		},

		pointHasCoords(point) {
			return this.pointLat(point) !== null && this.pointLng(point) !== null
		},

		coordsLabel(point) {
			const lat = this.pointLat(point)
			const lng = this.pointLng(point)
			if (lat === null || lng === null) {
				return ''
			}
			return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
		},

		pointUrl(point) {
			if (typeof point.url === 'string' && point.url !== '') {
				return point.url
			}
			if (this.pointHasCoords(point)) {
				return this.openOnMapUrl(point)
			}
			return this.mapsAppUrl
		},

		openOnMapUrl(point) {
			const lat = this.pointLat(point)
			const lng = this.pointLng(point)
			if (lat === null || lng === null) {
				return this.mapsAppUrl
			}
			return `${this.mapsAppUrl}/?point=${lat},${lng}`
		},

		openMapsApp() {
			if (typeof window !== 'undefined') {
				window.open(this.mapsAppUrl, '_blank', 'noopener')
			}
		},

		async fetchPoints() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.error = ''
			this.degraded = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
					this.points = rows
				} else if (response.status === 503) {
					this.points = []
					this.degraded = this.unavailableLabel
				} else {
					this.points = []
					this.error = t('nextcloud-vue', 'Could not load locations.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnMapsTab] failed to fetch locations', err)
				this.points = []
				this.error = t('nextcloud-vue', 'Could not load locations.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-maps-tab__banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	margin-bottom: 10px;
	border-radius: var(--border-radius);
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
	font-size: 0.9em;
}

.cn-maps-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-maps-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-maps-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-maps-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-maps-tab__row {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 10px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-maps-tab__row:last-child {
	border-bottom: none;
}

.cn-maps-tab__row-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
	padding-top: 2px;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.cn-maps-tab__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-maps-tab__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-maps-tab__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
}

a.cn-maps-tab__title:hover {
	text-decoration: underline;
}

.cn-maps-tab__category {
	flex-shrink: 0;
	font-size: 0.7em;
	padding: 2px 8px;
	border-radius: 10px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
	letter-spacing: 0.03em;
}

.cn-maps-tab__comment {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.cn-maps-tab__coords {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
}

.cn-maps-tab__coords-text {
	font-family: var(--font-face-monospace, monospace);
}

.cn-maps-tab__open-link {
	color: var(--color-primary-element);
	text-decoration: none;
}

.cn-maps-tab__open-link:hover {
	text-decoration: underline;
}
</style>
