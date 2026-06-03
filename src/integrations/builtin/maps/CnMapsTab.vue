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

  Visual fidelity: each row mirrors a real NC Maps favourite — an
  offline-safe map-pin tile (no remote tiles / no external images),
  the bold location name, an address subline (falls back to the
  category when no street address is present), a monospace lat/long
  line, and a compact coordinate chip when the row carries coordinates.
  Rows are rendered as `NcListItem`s so the tab matches NC Maps' own
  favourites list look-and-feel. The pin tile is tinted with the leaf
  accent (`--cn-iw-accent`, set from the descriptor's `accentColor`)
  falling back to the theme primary.

  Mini-map preview: deliberately skipped — the only inline map
  component in this repo (`CnMapWidget`) is a heavy Leaflet wrapper
  intended for full-page rendering, not for a sidebar row, and would
  pull remote tiles. We surface a static pin tile + formatted
  coordinates + an "Open on map" link instead.

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

		<div class="cn-maps-tab__actions">
			<NcButton type="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing location') }}
			</NcButton>
			<NcButton type="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new location') }}
			</NcButton>
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
			<NcListItem
				v-for="point in points"
				:key="pointKey(point)"
				class="cn-maps-tab__row"
				:name="pointName(point)"
				:href="pointUrl(point)"
				target="_blank"
				:force-display-actions="true">
				<template #icon>
					<span class="cn-maps-tab__pin" aria-hidden="true">
						<MapMarker :size="22" class="cn-maps-tab__pin-icon" />
					</span>
				</template>
				<template #name>
					<span class="cn-maps-tab__title">{{ pointName(point) }}</span>
					<span v-if="pointCategory(point)" class="cn-maps-tab__category">
						{{ pointCategory(point) }}
					</span>
				</template>
				<template #subname>
					<span class="cn-maps-tab__subname">
						<span v-if="addressLabel(point)" class="cn-maps-tab__address">{{ addressLabel(point) }}</span>
						<span v-if="coordsLabel(point)" class="cn-maps-tab__coords">
							<MapMarkerOutline :size="13" class="cn-maps-tab__coords-icon" />
							<span class="cn-maps-tab__coords-text">{{ coordsLabel(point) }}</span>
						</span>
						<a
							v-if="pointHasCoords(point)"
							:href="openOnMapUrl(point)"
							target="_blank"
							rel="noopener"
							class="cn-maps-tab__open-link"
							@click.stop>
							{{ openOnMapLabel }}
						</a>
					</span>
					<span v-if="pointComment(point)" class="cn-maps-tab__comment">
						{{ pointComment(point) }}
					</span>
				</template>
				<template v-if="pointHasCoords(point)" #indicator>
					<span class="cn-maps-tab__coord-chip" :title="coordsLabel(point)">
						<MapMarker :size="11" />
						{{ coordsLabel(point) }}
					</span>
				</template>
				<template #actions>
					<NcActionButton :close-after-click="true" @click="openPoint(point)">
						<template #icon>
							<OpenInNew :size="20" />
						</template>
						{{ openOnMapLabel }}
					</NcActionButton>
					<NcActionButton :close-after-click="true" @click="unlinkPoint(point)">
						<template #icon>
							<LinkOff :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Unlink location') }}
					</NcActionButton>
				</template>
			</NcListItem>
		</ul>

		<CnMapPoiPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnMapPoiCreate
			v-if="createOpen"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import MapMarker from 'vue-material-design-icons/MapMarker.vue'
import MapMarkerOutline from 'vue-material-design-icons/MapMarkerOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnMapPoiCreate from '../../../components/CnMapPoiCreate/CnMapPoiCreate.vue'
import CnMapPoiPicker from '../../../components/CnMapPoiPicker/CnMapPoiPicker.vue'
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

	components: {
		NcActionButton,
		NcButton,
		NcListItem,
		NcLoadingIcon,
		AlertCircleOutline,
		LinkOff,
		LinkVariant,
		MapMarker,
		MapMarkerOutline,
		OpenInNew,
		Plus,
		CnMapPoiPicker,
		CnMapPoiCreate,
	},

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
			pickerOpen: false,
			createOpen: false,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchPoints() } } },
		register() { this.fetchPoints() },
		schema() { this.fetchPoints() },
	},

	methods: {
		/**
		 * Base for the Tier-2 maps endpoints (list/link/new/destroy).
		 *
		 * @return {string} The endpoint URL.
		 */
		mapsEndpoint() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/maps`
		},

		dataOf(point) {
			return (point && typeof point.data === 'object' && point.data !== null) ? point.data : {}
		},

		pointKey(point) {
			const d = this.dataOf(point)
			return point.favoriteId ?? point.id ?? d.favoriteId ?? d.id ?? this.pointName(point)
		},

		/**
		 * The NC Maps favorite id used for the Tier-2 unlink DELETE.
		 *
		 * @param {object} point Provider row.
		 *
		 * @return {(number|string)} The favorite id.
		 */
		favoriteIdOf(point) {
			const d = this.dataOf(point)
			return point.favoriteId ?? point.id ?? d.favoriteId ?? d.id ?? ''
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

		/**
		 * Human-readable address subline for the row.
		 *
		 * NC Maps favourites don't always carry a structured address, so
		 * read a few common fields defensively (top-level + `data.*`) and
		 * fall back to the category when no street address exists — that
		 * keeps the subline informative without surfacing the bare coords
		 * twice (coords have their own line).
		 *
		 * @param {object} point Provider row.
		 *
		 * @return {string} The address subline (may be empty).
		 */
		addressLabel(point) {
			const d = this.dataOf(point)
			const raw = point.address ?? point.formattedAddress ?? d.address ?? d.formattedAddress ?? d.street ?? ''
			const text = stripMarker(String(raw)).replace(/\s+/g, ' ').trim()
			if (text !== '') {
				return text
			}
			return this.pointCategory(point)
		},

		/**
		 * Open a single POI in NC Maps (row action).
		 *
		 * @param {object} point Provider row.
		 *
		 * @return {void}
		 */
		openPoint(point) {
			if (typeof window !== 'undefined') {
				window.open(this.pointUrl(point), '_blank', 'noopener')
			}
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

		openPicker() {
			this.pickerOpen = true
		},

		openCreate() {
			this.createOpen = true
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.mapsEndpoint(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchPoints()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This location is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link location.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnMapsTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link location.')
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.mapsEndpoint()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchPoints()
				} else {
					this.error = t('nextcloud-vue', 'Could not create location.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnMapsTab] create failed', err)
				this.error = t('nextcloud-vue', 'Could not create location.')
			}
		},

		async unlinkPoint(point) {
			const favoriteId = this.favoriteIdOf(point)
			if (!favoriteId) {
				return
			}
			try {
				const response = await fetch(`${this.mapsEndpoint()}/${favoriteId}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchPoints()
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink location.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnMapsTab] unlink failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink location.')
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
				const response = await fetch(this.mapsEndpoint(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
					this.points = rows
				} else if (response.status === 503 || response.status === 501) {
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
.cn-maps-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 10px;
	flex-wrap: wrap;
}

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

/* Offline-safe static pin tile — a tinted rounded square with a marker
   glyph, mirroring a Maps favourite thumbnail without loading any tiles. */
.cn-maps-tab__pin {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: var(--border-radius-large, 8px);
	background: var(--cn-iw-accent, var(--color-primary-element, #0082c9));
	color: var(--color-primary-element-text, #fff);
	flex-shrink: 0;
}

.cn-maps-tab__pin-icon {
	color: var(--color-primary-element-text, #fff);
}

.cn-maps-tab__title {
	font-weight: 500;
	color: var(--color-main-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-maps-tab__category {
	flex-shrink: 0;
	margin-inline-start: 6px;
	font-size: 0.7em;
	padding: 2px 8px;
	border-radius: 10px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
	letter-spacing: 0.03em;
	vertical-align: middle;
}

.cn-maps-tab__subname {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px 10px;
}

.cn-maps-tab__address {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-maps-tab__coords {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	color: var(--color-text-maxcontrast);
}

.cn-maps-tab__coords-icon {
	color: var(--cn-iw-accent, var(--color-primary-element));
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

.cn-maps-tab__comment {
	display: -webkit-box;
	margin-top: 2px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

/* Compact coordinate chip in the row indicator slot. */
.cn-maps-tab__coord-chip {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 1px 6px;
	border-radius: 10px;
	font-size: 0.7em;
	font-family: var(--font-face-monospace, monospace);
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
}
</style>
