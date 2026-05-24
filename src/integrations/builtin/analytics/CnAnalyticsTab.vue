<!--
  CnAnalyticsTab — bespoke sidebar tab for the `analytics` integration
  leaf.

  Replaces the generic `CnIntegrationTab` for the `analytics` leaf:
  renders the linked NC Analytics reports / dashboards as a list (icon
  by report type, title from subheader-minus-marker, type badge,
  modified date). Clicking a row deep-links into the NC Analytics app
  at `/index.php/apps/analytics/#/r/{id}` (matches the URL the provider
  emits — `#/r/` is NC Analytics 6.x's report route).

  Talks to the OR pluggable-integration sub-resource:
    GET /api/objects/{register}/{schema}/{objectId}/integrations/analytics
  served by `OCA\OpenRegister\Service\Integration\Providers\AnalyticsProvider`.

  The provider returns rows shaped:
    { id, title, url, data: { name, subheader, type } }

  - `name` carries the album/report display name and the `[or:{uuid}]`
    marker the provider uses for its LIKE query.
  - `subheader` is the operator-authored description; we surface it as
    secondary text, stripping any marker that leaked in (the wave-2.2
    design intent was to host the marker here — defensive in case).
  - `type` is the report kind code (1 = SQL/group, 2 = remote, 3 =
    file/CSV, 4 = internal, etc.) — see the badge mapping below.

  Empty + loading + error + 503 unavailable states follow ADR-017 and
  AD-23 graceful degradation. All UI strings pass through
  `t('nextcloud-vue', ...)` per ADR-007. Styling uses Nextcloud CSS
  variables only so the nldesign overrides apply transparently
  (ADR-010).

  v1 deliberately does NOT fetch actual chart data per row — that would
  require N HTTP calls. A type-coded icon placeholder communicates the
  report kind without the network cost. Inline mini-charts are a
  Phase D / follow-up enhancement.

  Bespoke-vs-generic rationale: MyDash needs to surface "what kind of
  report is this + when did it change" without opening it; the generic
  link list strips both the type and the modified date.
-->
<template>
	<div class="cn-sidebar-tab cn-analytics-tab">
		<!-- 503 unavailable banner (AD-23) -->
		<div v-if="degraded" class="cn-analytics-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<!-- Loading -->
		<NcLoadingIcon v-if="loading" />

		<!-- Error -->
		<div v-else-if="error" class="cn-analytics-tab__error" role="alert">
			{{ error }}
		</div>

		<!-- Empty -->
		<div v-else-if="reports.length === 0" class="cn-sidebar-tab__empty cn-analytics-tab__empty">
			<ChartBar :size="32" class="cn-analytics-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openAnalyticsApp">
				<template #icon>
					<ChartBar :size="20" />
				</template>
				{{ openAnalyticsLabel }}
			</NcButton>
		</div>

		<!-- Report list -->
		<ul v-else class="cn-analytics-tab__list">
			<li
				v-for="report in reports"
				:key="reportKey(report)"
				class="cn-analytics-tab__row">
				<div class="cn-analytics-tab__row-icon">
					<component :is="reportIcon(report)" :size="20" />
				</div>
				<div class="cn-analytics-tab__row-main">
					<a
						:href="reportUrl(report)"
						target="_blank"
						rel="noopener noreferrer"
						class="cn-analytics-tab__title">
						{{ reportTitle(report) }}
					</a>
					<div class="cn-analytics-tab__sub">
						<span class="cn-analytics-tab__badge" :class="badgeClass(report)">
							{{ reportTypeLabel(report) }}
						</span>
						<span v-if="reportSubheader(report)" class="cn-analytics-tab__subheader">
							{{ reportSubheader(report) }}
						</span>
						<span v-if="modifiedAt(report)" class="cn-analytics-tab__when">
							· {{ formatWhen(modifiedAt(report)) }}
						</span>
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
import ChartBar from 'vue-material-design-icons/ChartBar.vue'
import ChartLine from 'vue-material-design-icons/ChartLine.vue'
import ChartPie from 'vue-material-design-icons/ChartPie.vue'
import TableIcon from 'vue-material-design-icons/Table.vue'
import ViewDashboard from 'vue-material-design-icons/ViewDashboard.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnAnalyticsTab — bespoke list view for the `analytics` integration.
 *
 * Renders linked NC Analytics reports / dashboards as a list with
 * type-coded icons + badges. Clicking a row opens the report in NC
 * Analytics in a new tab. See the file-level docblock for design notes.
 */
export default {
	name: 'CnAnalyticsTab',

	components: {
		NcButton,
		NcLoadingIcon,
		AlertCircleOutline,
		ChartBar,
		ChartLine,
		ChartPie,
		TableIcon,
		ViewDashboard,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'analytics'`). */
		integrationId: { type: String, default: 'analytics' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No reports linked yet') },
		/** Pre-translated "Open Analytics" CTA label. */
		openAnalyticsLabel: { type: String, default: () => t('nextcloud-vue', 'Open Analytics') },
		/** Pre-translated 503 unavailable banner copy. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Analytics is currently unavailable.') },
		/** URL of the NC Analytics app entry. */
		analyticsAppUrl: { type: String, default: '/index.php/apps/analytics' },
	},

	data() {
		return {
			reports: [],
			loading: false,
			error: '',
			degraded: '',
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchReports() } } },
		register() { this.fetchReports() },
		schema() { this.fetchReports() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		reportKey(report) {
			return (report && (report.id ?? report.data?.id)) || ''
		},

		/**
		 * Resolve the displayable report title, stripping the
		 * `[or:{uuid}]` marker (provider keeps the marker inside the
		 * `name` field for its LIKE query).
		 *
		 * @param {object} report Provider row.
		 *
		 * @return {string}
		 */
		reportTitle(report) {
			const raw = (report && (report.title || report.name || report.data?.name)) || ''
			return String(raw).replace(/\s*\[or:[^\]]+\]\s*/g, ' ').trim() || t('nextcloud-vue', 'Untitled report')
		},

		/**
		 * Resolve the secondary "subheader" line. The wave-2.2 design
		 * intent had the marker living on this field; in case any old
		 * row still has it, strip defensively.
		 *
		 * @param {object} report Provider row.
		 *
		 * @return {string}
		 */
		reportSubheader(report) {
			const raw = report?.subheader ?? report?.data?.subheader ?? ''
			const trimmed = String(raw).replace(/\s*\[or:[^\]]+\]\s*/g, ' ').trim()
			return trimmed
		},

		reportType(report) {
			const raw = report?.reportType ?? report?.type ?? report?.data?.type
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const num = Number(raw)
			return Number.isFinite(num) ? num : null
		},

		/**
		 * Resolve a translatable label for the report type. Falls back
		 * to "Report" when the type code is unknown. Type codes mirror
		 * NC Analytics 6.x (datasource types).
		 *
		 * @param {object} report Provider row.
		 *
		 * @return {string}
		 */
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

		/**
		 * MDI component for the report type. Tries to express the
		 * "kind" without fetching chart data (file = Table, dashboard
		 * = ViewDashboard, group/internal = ChartBar, remote =
		 * ChartLine, etc.).
		 *
		 * @param {object} report Provider row.
		 *
		 * @return {object} Vue component.
		 */
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
			return `cn-analytics-tab__badge--type-${type ?? 'unknown'}`
		},

		reportUrl(report) {
			if (report && report.url) {
				return report.url
			}
			const id = this.reportKey(report)
			return id ? `/index.php/apps/analytics/#/r/${encodeURIComponent(id)}` : this.analyticsAppUrl
		},

		modifiedAt(report) {
			return report?.modifiedAt
				|| report?.data?.modifiedAt
				|| report?.data?.modified
				|| report?.createdAt
				|| report?.data?.createdAt
				|| ''
		},

		formatWhen(value) {
			if (!value) return ''
			try {
				const num = Number(value)
				const d = Number.isFinite(num) && num > 0 && String(value).length <= 12
					? new Date(num * 1000)
					: new Date(value)
				if (Number.isNaN(d.getTime())) return String(value)
				return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
			} catch (_) {
				return String(value)
			}
		},

		openAnalyticsApp() {
			if (typeof window !== 'undefined') {
				window.open(this.analyticsAppUrl, '_blank', 'noopener')
			}
		},

		async fetchReports() {
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
					this.reports = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.reports = []
					this.degraded = this.unavailableLabel
				} else {
					this.reports = []
					this.error = t('nextcloud-vue', 'Could not load reports.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnAnalyticsTab] failed to fetch reports', err)
				this.reports = []
				this.error = t('nextcloud-vue', 'Could not load reports.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-analytics-tab {
	padding: 12px;
	overflow-x: hidden;
}

.cn-analytics-tab__banner {
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

.cn-analytics-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-analytics-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-analytics-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-analytics-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-analytics-tab__row {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-analytics-tab__row:last-child {
	border-bottom: none;
}

.cn-analytics-tab__row-icon {
	flex-shrink: 0;
	color: var(--color-primary-element);
	padding-top: 2px;
}

.cn-analytics-tab__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.cn-analytics-tab__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
	font-size: 13px;
}

a.cn-analytics-tab__title:hover {
	text-decoration: underline;
}

.cn-analytics-tab__sub {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	color: var(--color-text-maxcontrast);
}

.cn-analytics-tab__badge {
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
}

.cn-analytics-tab__badge--type-3 { background: var(--color-primary-element-light, var(--color-primary-light)); color: var(--color-primary-element-text); }
.cn-analytics-tab__badge--type-4 { background: var(--color-success, #46ba61); color: var(--color-main-background); }
.cn-analytics-tab__badge--type-2 { background: var(--color-warning, #e9a40f); color: var(--color-main-background); }

.cn-analytics-tab__subheader {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.cn-analytics-tab__when {
	white-space: nowrap;
}
</style>
