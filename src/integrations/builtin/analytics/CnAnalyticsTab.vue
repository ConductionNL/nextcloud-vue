<!--
  CnAnalyticsTab — bespoke sidebar tab for the `analytics` integration
  leaf.

  Replaces the generic `CnIntegrationTab` for the `analytics` leaf:
  renders the linked NC Analytics reports / datasets so the tab reads
  like the real Analytics app — each row is an `NcListItem` showing the
  chart-type icon (bar / line / pie / dataset), the bold report name, a
  data-source / type subtitle, an optional headline KPI value, and a
  colour-coded type badge (CnStatusBadge). Clicking a row deep-links
  into the NC Analytics app at `/index.php/apps/analytics/#/r/{id}`
  (`#/r/` is NC Analytics 6.x's report route). Per-row "Open in
  Analytics" + "Unlink" live in the NcListItem action menu.

  Tier-2 surface (this commit):
    - "Link existing report" → opens CnAnalyticsReportPicker (modal)
    - "Create new report"    → opens CnAnalyticsReportCreate (modal)
    - Per-row unlink         → DELETE …/analytics/{reportId}

  Talks to the OpenRegister Tier-2 analytics-link endpoints
    GET     /api/objects/{r}/{s}/{id}/analytics             — list
    POST    /api/objects/{r}/{s}/{id}/analytics             — link existing
    POST    /api/objects/{r}/{s}/{id}/analytics/new         — create + link
    DELETE  /api/objects/{r}/{s}/{id}/analytics/{reportId}  — unlink
    GET     /api/integrations/analytics/available           — picker source
  served by `OCA\OpenRegister\Controller\AnalyticsLinksController`.

  The endpoint returns rows shaped:
    { id, reportId, reportTitle, reportType, subheader, value, kpi,
      createdAt, modifiedAt, url, … }

  Empty + loading + error + 501/503 unavailable states follow ADR-017
  and AD-23 graceful degradation. All UI strings pass through
  `t('nextcloud-vue', ...)` per ADR-007. Styling uses Nextcloud CSS
  variables only so the nldesign overrides apply transparently
  (ADR-010).

  The headline KPI (`value` / `kpi`) is rendered only when the provider
  supplies it — there is no extra HTTP call per row. A type-coded icon
  communicates the chart kind without fetching chart data; inline
  mini-charts remain a follow-up enhancement.

  Bespoke-vs-generic rationale: MyDash needs to surface "what kind of
  report is this + its headline number" without opening it; the generic
  link list strips the chart type, the data source and the KPI.
-->
<template>
	<div class="cn-sidebar-tab cn-analytics-tab">
		<!-- 503 unavailable banner (AD-23) -->
		<div v-if="degraded" class="cn-analytics-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<div class="cn-analytics-tab__actions">
			<NcButton type="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing report') }}
			</NcButton>
			<NcButton type="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new report') }}
			</NcButton>
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

		<!-- Report list — NcListItem rows mirror the NC Analytics dataset list -->
		<ul v-else class="cn-analytics-tab__list">
			<NcListItem
				v-for="report in reports"
				:key="reportKey(report)"
				class="cn-analytics-tab__row"
				:name="reportTitle(report)"
				:bold="true"
				:href="reportUrl(report)"
				target="_blank"
				:force-display-actions="true">
				<template #icon>
					<span class="cn-analytics-tab__row-icon">
						<component :is="reportIcon(report)" :size="22" />
					</span>
				</template>
				<template #subname>
					<span class="cn-analytics-tab__sub">
						<CnStatusBadge
							class="cn-analytics-tab__badge"
							size="small"
							:variant="badgeVariant(report)"
							:label="reportTypeLabel(report)" />
						<span v-if="reportSubheader(report)" class="cn-analytics-tab__subheader">
							{{ reportSubheader(report) }}
						</span>
						<span v-if="modifiedAt(report)" class="cn-analytics-tab__when">
							· {{ formatWhen(modifiedAt(report)) }}
						</span>
					</span>
				</template>
				<template v-if="reportValue(report)" #details>
					<span class="cn-analytics-tab__kpi" :title="kpiTitle(report)">
						{{ reportValue(report) }}
					</span>
				</template>
				<template #actions>
					<NcActionButton :close-after-click="true" @click="openReport(report)">
						<template #icon>
							<OpenInNew :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Open in Analytics') }}
					</NcActionButton>
					<NcActionButton :close-after-click="true" @click="unlinkReport(report)">
						<template #icon>
							<LinkOff :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Unlink report') }}
					</NcActionButton>
				</template>
			</NcListItem>
		</ul>

		<CnAnalyticsReportPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnAnalyticsReportCreate
			v-if="createOpen"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ChartBar from 'vue-material-design-icons/ChartBar.vue'
import ChartLine from 'vue-material-design-icons/ChartLine.vue'
import ChartPie from 'vue-material-design-icons/ChartPie.vue'
import DatabaseOutline from 'vue-material-design-icons/DatabaseOutline.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import TableIcon from 'vue-material-design-icons/Table.vue'
import ViewDashboard from 'vue-material-design-icons/ViewDashboard.vue'
import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import CnAnalyticsReportCreate from '../../../components/CnAnalyticsReportCreate/CnAnalyticsReportCreate.vue'
import CnAnalyticsReportPicker from '../../../components/CnAnalyticsReportPicker/CnAnalyticsReportPicker.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnAnalyticsTab — bespoke dataset list for the `analytics` integration.
 *
 * Renders linked NC Analytics reports / datasets as NcListItem rows
 * styled to mirror the Analytics app: chart-type icon, bold report
 * name, data-source / type subtitle, type badge and an optional
 * headline KPI value. Clicking a row opens the report in NC Analytics
 * in a new tab. Tier-2: includes link / create modals and per-row
 * unlink via the row action menu. See the file-level docblock for
 * design notes.
 */
export default {
	name: 'CnAnalyticsTab',

	components: {
		NcActionButton,
		NcButton,
		NcListItem,
		NcLoadingIcon,
		CnStatusBadge,
		AlertCircleOutline,
		ChartBar,
		ChartLine,
		ChartPie,
		DatabaseOutline,
		LinkOff,
		LinkVariant,
		OpenInNew,
		Plus,
		TableIcon,
		ViewDashboard,
		CnAnalyticsReportPicker,
		CnAnalyticsReportCreate,
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
			pickerOpen: false,
			createOpen: false,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchReports() } } },
		register() { this.fetchReports() },
		schema() { this.fetchReports() },
	},

	methods: {
		t,

		/**
		 * Base for the Tier-2 analytics endpoints (list/link/new/destroy).
		 *
		 * @return {string} The endpoint URL.
		 */
		analyticsEndpoint() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/analytics`
		},

		reportKey(report) {
			return (report && (report.reportId ?? report.id ?? report.data?.id)) || ''
		},

		/**
		 * Resolve the displayable report title, stripping the
		 * `[or:{uuid}]` marker (pre-Tier-2 reports embedded the marker
		 * inside `name`).
		 *
		 * @param {object} report Provider row.
		 *
		 * @return {string}
		 */
		reportTitle(report) {
			const raw = (report && (report.reportTitle || report.title || report.name || report.data?.name)) || ''
			return String(raw).replace(/\s*\[or:[^\]]+\]\s*/g, ' ').trim() || t('nextcloud-vue', 'Untitled report')
		},

		/**
		 * Resolve the secondary "subheader" line, stripping any leaked
		 * marker defensively.
		 *
		 * @param {object} report Provider row.
		 *
		 * @return {string}
		 */
		reportSubheader(report) {
			const raw = report?.subheader ?? report?.dataSource ?? report?.data?.subheader ?? ''
			return String(raw).replace(/\s*\[or:[^\]]+\]\s*/g, ' ').trim()
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
			case 0: return t('nextcloud-vue', 'Group')
			case 1: return t('nextcloud-vue', 'File')
			case 2: return t('nextcloud-vue', 'Database')
			case 3: return t('nextcloud-vue', 'Git')
			case 4: return t('nextcloud-vue', 'External')
			case 6: return t('nextcloud-vue', 'JSON')
			default: return t('nextcloud-vue', 'Report')
			}
		},

		/**
		 * CnStatusBadge colour variant for the report type. Mirrors NC
		 * Analytics' datasource-type accenting without inventing colours
		 * (uses the shared variant palette).
		 *
		 * @param {object} report Provider row.
		 *
		 * @return {string}
		 */
		badgeVariant(report) {
			const type = this.reportType(report)
			switch (type) {
			case 1: return 'primary'
			case 2: return 'success'
			case 4: return 'warning'
			case 6: return 'info'
			default: return 'default'
			}
		},

		/**
		 * MDI component for the report type. Tries to express the
		 * "kind" without fetching chart data.
		 *
		 * @param {object} report Provider row.
		 *
		 * @return {object} Vue component.
		 */
		reportIcon(report) {
			const type = this.reportType(report)
			switch (type) {
			case 1: return TableIcon
			case 0: return ViewDashboard
			case 2: return DatabaseOutline
			case 4: return ChartLine
			case 6: return ChartPie
			default: return ChartBar
			}
		},

		/**
		 * Headline KPI / value for the report, when the provider supplies
		 * one. Numbers are locale-formatted; strings pass through.
		 *
		 * @param {object} report Provider row.
		 *
		 * @return {string}
		 */
		reportValue(report) {
			const raw = report?.value ?? report?.kpi ?? report?.data?.value ?? ''
			if (raw === null || raw === undefined || raw === '') {
				return ''
			}
			const num = Number(raw)
			if (Number.isFinite(num) && String(raw).trim() !== '') {
				try {
					return num.toLocaleString()
				} catch (_) {
					return String(num)
				}
			}
			return String(raw)
		},

		kpiTitle(_report) {
			return t('nextcloud-vue', 'Latest value')
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
			if (!value) {
				return ''
			}
			try {
				const num = Number(value)
				const d = Number.isFinite(num) && num > 0 && String(value).length <= 12
					? new Date(num * 1000)
					: new Date(value)
				if (Number.isNaN(d.getTime())) {
					return String(value)
				}
				return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
			} catch (_) {
				return String(value)
			}
		},

		openPicker() {
			this.pickerOpen = true
		},

		openCreate() {
			this.createOpen = true
		},

		openReport(report) {
			if (typeof window !== 'undefined') {
				window.open(this.reportUrl(report), '_blank', 'noopener')
			}
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.analyticsEndpoint(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchReports()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This report is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link report.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnAnalyticsTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link report.')
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.analyticsEndpoint()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchReports()
				} else {
					this.error = t('nextcloud-vue', 'Could not create report.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnAnalyticsTab] create failed', err)
				this.error = t('nextcloud-vue', 'Could not create report.')
			}
		},

		async unlinkReport(report) {
			const reportId = this.reportKey(report)
			if (!reportId) {
				return
			}
			try {
				const response = await fetch(`${this.analyticsEndpoint()}/${reportId}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchReports()
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink report.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnAnalyticsTab] unlink failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink report.')
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
				const response = await fetch(this.analyticsEndpoint(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.reports = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503 || response.status === 501) {
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

.cn-analytics-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 10px;
	flex-wrap: wrap;
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
	display: flex;
	flex-direction: column;
	gap: 2px;
}

/* Chart-type icon avatar — tinted with the descriptor accent (or NC primary). */
.cn-analytics-tab__row-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-primary-element-light, var(--color-background-hover));
	color: var(--cn-iw-accent, var(--color-primary-element, #0082c9));
}

/* Subtitle row: type badge + data source + modified date, single muted line. */
.cn-analytics-tab__sub {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	min-width: 0;
}

.cn-analytics-tab__badge {
	flex-shrink: 0;
}

.cn-analytics-tab__subheader {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.cn-analytics-tab__when {
	white-space: nowrap;
}

/* Headline KPI value, right-aligned in the details slot — Analytics style. */
.cn-analytics-tab__kpi {
	font-weight: 700;
	font-size: 15px;
	color: var(--color-main-text);
	white-space: nowrap;
}
</style>
