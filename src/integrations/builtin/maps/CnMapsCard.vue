<!--
  CnMapsCard — bespoke surface-aware widget for the `maps` integration.

  Replaces the generic CnIntegrationCard for the `maps` leaf. Branches
  on `surface` per AD-19:
    - user-dashboard / app-dashboard : map-pin icon + headline
        "N linked locations" + the most-recently added POI (name +
        category + coords).
    - detail-page                    : compact list of linked POIs
        (icon + name + category badge + coords) capped at COMPACT_LIMIT
        with a "view all" trail-off pointing at NC Maps.
    - single-entity                  : pin + name chip for
        reference-property auto-rendering (referenceType: 'maps').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnMapsTab. Provider shape and field-fallback strategy matches the
  tab (see the tab's docblock).

  See `openregister/openspec/changes/integration-maps/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span
				v-if="entity"
				class="cn-maps-card__chip"
				:title="chipSubtitle(entity)">
				<MapMarker :size="14" />
				<a
					:href="pointUrl(entity)"
					target="_blank"
					rel="noopener">{{ pointName(entity) }}</a>
				<span v-if="pointCategory(entity)" class="cn-maps-card__chip-category">
					· {{ pointCategory(entity) }}
				</span>
			</span>
			<span v-else-if="value" class="cn-maps-card__chip cn-maps-card__chip--fallback">
				<MapMarker :size="14" />
				<span>{{ value }}</span>
			</span>
			<span v-else class="cn-maps-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: count + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-maps-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="points.length === 0" class="cn-maps-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-maps-card__headline">
				<div class="cn-maps-card__headline-line">
					<MapMarker :size="16" class="cn-maps-card__headline-icon" />
					<strong>{{ countHeadline }}</strong>
				</div>
				<div v-if="mostRecent" class="cn-maps-card__headline-recent">
					<a
						:href="pointUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ pointName(mostRecent) }}</a>
					<span v-if="pointCategory(mostRecent)" class="cn-maps-card__headline-category">
						· {{ pointCategory(mostRecent) }}
					</span>
				</div>
				<div v-if="mostRecent && coordsLabel(mostRecent)" class="cn-maps-card__headline-coords">
					{{ coordsLabel(mostRecent) }}
				</div>
				<div v-if="points.length > 1" class="cn-maps-card__view-all">
					<a
						:href="mapsAppUrl"
						target="_blank"
						rel="noopener">{{ viewAllLabel }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact list -->
		<template v-else>
			<div v-if="degraded" class="cn-maps-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="points.length === 0" class="cn-maps-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-maps-card__list">
				<li
					v-for="point in displayedPoints"
					:key="pointKey(point)"
					class="cn-maps-card__row">
					<MapMarker :size="14" class="cn-maps-card__row-icon" />
					<div class="cn-maps-card__row-main">
						<div class="cn-maps-card__row-header">
							<a
								:href="pointUrl(point)"
								target="_blank"
								rel="noopener"
								class="cn-maps-card__title">{{ pointName(point) }}</a>
							<span v-if="pointCategory(point)" class="cn-maps-card__category">
								{{ pointCategory(point) }}
							</span>
						</div>
						<span v-if="coordsLabel(point)" class="cn-maps-card__coords">
							{{ coordsLabel(point) }}
						</span>
					</div>
				</li>
			</ul>
			<div v-if="points.length > COMPACT_LIMIT" class="cn-maps-card__view-all">
				<a
					:href="mapsAppUrl"
					target="_blank"
					rel="noopener">{{ viewAllLabel }}</a>
			</div>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import MapMarker from 'vue-material-design-icons/MapMarker.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5

/**
 * CnMapsCard — bespoke surface-aware widget for the `maps` integration.
 *
 * Renders Maps-aware metadata across all four AD-19 surfaces. See the
 * file-level docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnMapsCard',

	components: { CnDetailCard, NcLoadingIcon, MapMarker },

	props: {
		/** Stable integration id (forwarded from the registry — always `'maps'`). */
		integrationId: { type: String, default: 'maps' },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Rendering surface (AD-19). */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (s) => VALID_SURFACES.includes(s),
		},
		/** Optional single-entity reference (POI id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Locations') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => MapMarker },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No locations linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Location is currently unavailable.') },
		/** Pre-translated "view all" trail-off link label. */
		viewAllLabel: { type: String, default: () => t('nextcloud-vue', 'View all in Locations') },
		/** URL of the NC Maps app entry. */
		mapsAppUrl: { type: String, default: '/index.php/apps/maps' },
	},

	data() {
		return {
			COMPACT_LIMIT,
			points: [],
			entity: null,
			loading: false,
			degraded: '',
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		displayedPoints() {
			return this.points.slice(0, COMPACT_LIMIT)
		},

		countHeadline() {
			const total = this.points.length
			return n('nextcloud-vue', '{count} linked location', '{count} linked locations', total, { count: total })
		},

		mostRecent() {
			if (this.points.length === 0) {
				return null
			}
			// Maps provider has no modified-time column; fall back to id-order
			// (highest id == most recently added). Defensive: also check
			// addedAt / created when present in a future expansion.
			const sorted = [...this.points].sort((a, b) => {
				const ka = this.recencyKey(a)
				const kb = this.recencyKey(b)
				return kb - ka
			})
			return sorted[0]
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.fetch() } },
		surface() { this.fetch() },
		value() { if (this.surface === 'single-entity') { this.fetchSingle() } },
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
			const text = String(candidate)
			return text.replace(/\s*\[or:[^\]]+\]\s*/g, '').trim() || String(this.pointKey(point))
		},

		pointCategory(point) {
			const d = this.dataOf(point)
			const c = point.category ?? d.category ?? ''
			return String(c).trim()
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
			const lat = this.pointLat(point)
			const lng = this.pointLng(point)
			if (lat !== null && lng !== null) {
				return `${this.mapsAppUrl}/?point=${lat},${lng}`
			}
			return this.mapsAppUrl
		},

		chipSubtitle(point) {
			return this.coordsLabel(point) || this.pointCategory(point) || this.pointName(point)
		},

		recencyKey(point) {
			const d = this.dataOf(point)
			const v = point.addedAt ?? point.added ?? point.created ?? d.addedAt ?? d.added ?? d.created ?? point.id ?? d.id ?? 0
			const num = typeof v === 'number' ? v : Number(v)
			return Number.isFinite(num) === true ? num : 0
		},

		fetch() {
			if (this.surface === 'single-entity') {
				this.fetchSingle()
				return
			}
			this.fetchList()
		},

		async fetchList() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.points = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.points = []
					this.degraded = this.unavailableLabel
				} else {
					this.points = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnMapsCard] failed to fetch locations', err)
				this.points = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (this.value === '' || this.value === undefined || this.value === null || !this.register || !this.schema || !this.objectId) {
				this.entity = null
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(this.value)}`, { headers: buildHeaders() })
				if (response.ok) {
					this.entity = await response.json()
				} else if (response.status === 503) {
					this.entity = null
					this.degraded = this.unavailableLabel
				} else {
					this.entity = null
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnMapsCard] failed to fetch single location', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-maps-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-maps-card__headline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-maps-card__headline-line {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-maps-card__headline-icon {
	color: var(--color-primary-element, #21468B);
	flex-shrink: 0;
}

.cn-maps-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-maps-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-maps-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-maps-card__headline-category {
	color: var(--color-text-maxcontrast);
}

.cn-maps-card__headline-coords {
	font-family: var(--font-face-monospace, monospace);
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
}

.cn-maps-card__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 12px;
	background: var(--color-background-hover);
	font-size: 0.9em;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-maps-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-maps-card__chip a:hover {
	text-decoration: underline;
}

.cn-maps-card__chip-category {
	color: var(--color-text-maxcontrast);
}

.cn-maps-card__chip--fallback {
	opacity: 0.85;
}

.cn-maps-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-maps-card__row {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-maps-card__row:last-child {
	border-bottom: none;
}

.cn-maps-card__row-icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
	padding-top: 3px;
}

.cn-maps-card__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-maps-card__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-maps-card__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-maps-card__title:hover {
	text-decoration: underline;
}

.cn-maps-card__category {
	flex-shrink: 0;
	font-size: 0.65em;
	padding: 1px 6px;
	border-radius: 8px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
	letter-spacing: 0.03em;
}

.cn-maps-card__coords {
	font-family: var(--font-face-monospace, monospace);
	font-size: 0.7em;
	color: var(--color-text-maxcontrast);
}

.cn-maps-card__view-all {
	margin-top: 6px;
	font-size: 0.8em;
}

.cn-maps-card__view-all a {
	color: var(--color-primary-element);
	text-decoration: none;
}

.cn-maps-card__view-all a:hover {
	text-decoration: underline;
}
</style>
