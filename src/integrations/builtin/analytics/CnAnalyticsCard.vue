<!--
  CnAnalyticsCard — bespoke surface-aware widget for the `analytics`
  integration.

  Replaces the generic CnIntegrationCard for the `analytics` leaf.
  Branches on `surface` per ADR-019 AD-19:
    - user-dashboard / app-dashboard : count headline "N reports" + the
        most-recently-modified report's name + type badge.
    - detail-page                    : a compact list of linked reports
        (type icon + name + type badge, up to COMPACT_LIMIT) with
        "view all" trail-off.
    - single-entity                  : a chip with type icon + name for
        reference-property auto-rendering.

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnAnalyticsTab; for `single-entity` the optional `value` prop
  addresses a single report by id.

  This is the widget LaunchPad adopts to consume the analytics leaf. v1
  deliberately does NOT fetch chart data inline per row — that would be
  N HTTP calls per dashboard. The type-coded icon + badge surface the
  report kind cheaply. Phase D / follow-up can wire one inline chart
  via the existing analytics_facts endpoint if the perf budget allows.

  See ADR-019 (registry mechanism), AD-19 (surface fallback), ADR-022
  (consumption principle). Refs openregister#1321.
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-analytics-card__chip" :title="reportTitle(entity)">
				<component :is="reportIcon(entity)" :size="14" />
				<a
					:href="reportUrl(entity)"
					target="_blank"
					rel="noopener noreferrer">{{ reportTitle(entity) }}</a>
			</span>
			<span v-else class="cn-analytics-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-analytics-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="reports.length === 0" class="cn-analytics-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-analytics-card__headline">
				<div class="cn-analytics-card__headline-line">
					<strong>{{ reportCountLabel }}</strong>
				</div>
				<div v-if="mostRecent" class="cn-analytics-card__headline-recent">
					<component :is="reportIcon(mostRecent)" :size="16" />
					<a
						:href="reportUrl(mostRecent)"
						target="_blank"
						rel="noopener noreferrer"
						class="cn-analytics-card__headline-name">
						{{ reportTitle(mostRecent) }}
					</a>
					<span class="cn-analytics-card__badge" :class="badgeClass(mostRecent)">
						{{ reportTypeLabel(mostRecent) }}
					</span>
				</div>
				<div v-if="reports.length > 1" class="cn-analytics-card__view-all">
					<a
						:href="analyticsAppUrl"
						target="_blank"
						rel="noopener noreferrer">{{ viewAllLabel }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact list -->
		<template v-else>
			<div v-if="degraded" class="cn-analytics-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="reports.length === 0" class="cn-analytics-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-analytics-card__list">
				<li
					v-for="report in displayedReports"
					:key="reportKey(report)"
					class="cn-analytics-card__row">
					<div class="cn-analytics-card__row-icon">
						<component :is="reportIcon(report)" :size="16" />
					</div>
					<div class="cn-analytics-card__row-main">
						<a
							:href="reportUrl(report)"
							target="_blank"
							rel="noopener noreferrer"
							class="cn-analytics-card__title">{{ reportTitle(report) }}</a>
						<span class="cn-analytics-card__badge" :class="badgeClass(report)">
							{{ reportTypeLabel(report) }}
						</span>
					</div>
				</li>
			</ul>
			<div v-if="reports.length > COMPACT_LIMIT" class="cn-analytics-card__view-all">
				<a
					:href="analyticsAppUrl"
					target="_blank"
					rel="noopener noreferrer">{{ viewAllLabel }}</a>
			</div>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import ChartBar from 'vue-material-design-icons/ChartBar.vue'
import ChartLine from 'vue-material-design-icons/ChartLine.vue'
import ChartPie from 'vue-material-design-icons/ChartPie.vue'
import TableIcon from 'vue-material-design-icons/Table.vue'
import ViewDashboard from 'vue-material-design-icons/ViewDashboard.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5

/**
 * CnAnalyticsCard — bespoke surface-aware widget for the `analytics`
 * integration.
 *
 * Renders Analytics-aware metadata (report count, type icon, modified
 * date) across all four AD-19 surfaces. See the file-level docblock
 * for surface-by-surface behaviour.
 */
export default {
	name: 'CnAnalyticsCard',

	components: { CnDetailCard, NcLoadingIcon, ChartBar, ChartLine, ChartPie, TableIcon, ViewDashboard },

	props: {
		/** Stable integration id (forwarded from the registry — always `'analytics'`). */
		integrationId: { type: String, default: 'analytics' },
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
		/** Optional single-entity reference (report id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Analytics') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => ChartBar },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No reports linked yet') },
		/** Pre-translated 503 unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Analytics is currently unavailable.') },
		/** Pre-translated "view all" trail-off link label. */
		viewAllLabel: { type: String, default: () => t('nextcloud-vue', 'View all in Analytics') },
		/** URL of the NC Analytics app entry. */
		analyticsAppUrl: { type: String, default: '/index.php/apps/analytics' },
	},

	data() {
		return {
			COMPACT_LIMIT,
			reports: [],
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

		displayedReports() {
			return this.reports.slice(0, COMPACT_LIMIT)
		},

		reportCountLabel() {
			const total = this.reports.length
			return n('nextcloud-vue', '{count} report', '{count} reports', total, { count: total })
		},

		mostRecent() {
			if (this.reports.length === 0) {
				return null
			}
			// Most recently modified first; falls back to most recently
			// created when no modified timestamp exists.
			const sorted = [...this.reports].sort((a, b) => {
				const ta = Date.parse(a.modifiedAt || a.data?.modifiedAt || a.createdAt || a.data?.createdAt || 0) || 0
				const tb = Date.parse(b.modifiedAt || b.data?.modifiedAt || b.createdAt || b.data?.createdAt || 0) || 0
				return tb - ta
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

		reportKey(report) {
			return (report && (report.id ?? report.data?.id)) || ''
		},

		reportTitle(report) {
			const raw = (report && (report.title || report.name || report.data?.name)) || ''
			return String(raw).replace(/\s*\[or:[^\]]+\]\s*/g, ' ').trim() || t('nextcloud-vue', 'Untitled report')
		},

		reportType(report) {
			const raw = report?.reportType ?? report?.type ?? report?.data?.type
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const num = Number(raw)
			return Number.isFinite(num) ? num : null
		},

		reportTypeLabel(report) {
			const type = this.reportType(report)
			switch (type) {
			case 1: return t('nextcloud-vue', 'Group')
			case 2: return t('nextcloud-vue', 'Remote')
			case 3: return t('nextcloud-vue', 'File')
			case 4: return t('nextcloud-vue', 'Internal')
			case 5: return t('nextcloud-vue', 'Database')
			case 6: return t('nextcloud-vue', 'External')
			default: return t('nextcloud-vue', 'Report')
			}
		},

		reportIcon(report) {
			const type = this.reportType(report)
			switch (type) {
			case 3: return TableIcon
			case 4: return ViewDashboard
			case 2: return ChartLine
			case 5: return ChartPie
			default: return ChartBar
			}
		},

		badgeClass(report) {
			const type = this.reportType(report)
			return `cn-analytics-card__badge--type-${type ?? 'unknown'}`
		},

		reportUrl(report) {
			if (report && report.url) {
				return report.url
			}
			const id = this.reportKey(report)
			return id ? `/index.php/apps/analytics/#/r/${encodeURIComponent(id)}` : this.analyticsAppUrl
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
					this.reports = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.reports = []
					this.degraded = this.unavailableLabel
				} else {
					this.reports = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnAnalyticsCard] failed to fetch reports', err)
				this.reports = []
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
				console.error('[CnAnalyticsCard] failed to fetch single report', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-analytics-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-analytics-card__headline {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-analytics-card__headline-line {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-analytics-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
}

.cn-analytics-card__headline-name {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 1;
	min-width: 0;
}

.cn-analytics-card__headline-name:hover {
	text-decoration: underline;
}

.cn-analytics-card__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border-radius: 12px;
	background: var(--color-background-hover);
	font-size: 0.9em;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-analytics-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-analytics-card__chip a:hover {
	text-decoration: underline;
}

.cn-analytics-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-analytics-card__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-analytics-card__row:last-child {
	border-bottom: none;
}

.cn-analytics-card__row-icon {
	flex-shrink: 0;
	color: var(--color-primary-element);
	width: 18px;
	height: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.cn-analytics-card__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-analytics-card__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
	font-size: 13px;
}

a.cn-analytics-card__title:hover {
	text-decoration: underline;
}

.cn-analytics-card__badge {
	display: inline-flex;
	align-items: center;
	padding: 1px 6px;
	border-radius: 8px;
	background: var(--color-background-hover);
	color: var(--color-main-text);
	font-size: 10px;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	flex-shrink: 0;
}

.cn-analytics-card__badge--type-3 { background: var(--color-primary-element-light, var(--color-primary-light)); color: var(--color-primary-element-text); }
.cn-analytics-card__badge--type-4 { background: var(--color-success, #46ba61); color: var(--color-main-background); }
.cn-analytics-card__badge--type-2 { background: var(--color-warning, #e9a40f); color: var(--color-main-background); }

.cn-analytics-card__view-all {
	margin-top: 6px;
	font-size: 0.8em;
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-analytics-card__view-all a {
	color: var(--color-primary-element);
	text-decoration: none;
}

.cn-analytics-card__view-all a:hover {
	text-decoration: underline;
}
</style>
