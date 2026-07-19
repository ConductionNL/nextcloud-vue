<!--
  CnAnalyticsReportPicker — modal for picking an existing NC Analytics
  report to link to the parent OR object.

  Flow:
    1. Load reports via GET /api/integrations/analytics/available
    2. Filter client-side via a search input (debounced; the same query
       is forwarded as `?search=` for server-side filtering)
    3. Single-select a report row (title + report-type badge + modified
       date)
    4. Confirm → emit `link` with `{ reportId }`

  All API calls are wrapped in best-effort try/catch so a transient
  Analytics failure surfaces a user-visible inline error rather than a
  modal crash. The modal stays open across errors so the user can retry
  without losing context.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnAnalyticsReportPicker/` (NcDialog-based; matches the
  photos/deck/poll/talk picker pattern).

  ADR-019: drives the `analytics` integration leaf's "link existing"
  surface; emits `link` so the parent (CnAnalyticsTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-analytics-report-picker"
		@closing="onClose">
		<div class="cn-analytics-report-picker">
			<NcNoteCard v-if="error" type="error" class="cn-analytics-report-picker__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="search"
				:label="t('nextcloud-vue', 'Search reports')"
				:placeholder="t('nextcloud-vue', 'Type to filter…')"
				class="cn-analytics-report-picker__search"
				@update:model-value="onSearch" />

			<NcLoadingIcon v-if="loading" />
			<NcEmptyContent
				v-else-if="visibleReports.length === 0"
				:name="t('nextcloud-vue', 'No reports available')"
				:description="t('nextcloud-vue', 'Create a report in NC Analytics first, or use the create dialog.')" />
			<ul v-else class="cn-analytics-report-picker__list">
				<li
					v-for="report in visibleReports"
					:key="report.id"
					class="cn-analytics-report-picker__row"
					:class="{ 'cn-analytics-report-picker__row--selected': selectedReportId === report.id }">
					<button type="button" class="cn-analytics-report-picker__row-button" @click="pickReport(report)">
						<span class="cn-analytics-report-picker__row-icon">
							<ChartBar :size="20" />
						</span>
						<span class="cn-analytics-report-picker__row-main">
							<span class="cn-analytics-report-picker__name">{{ report.name }}</span>
							<span class="cn-analytics-report-picker__sub">
								<span class="cn-analytics-report-picker__badge">{{ reportTypeLabel(report) }}</span>
								<span v-if="modifiedLabel(report)" class="cn-analytics-report-picker__when">
									· {{ modifiedLabel(report) }}
								</span>
							</span>
						</span>
					</button>
				</li>
			</ul>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="selectedReportId === null"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link report') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnAnalyticsReportPicker — pick an existing Analytics report. Emits
 * `link` with the chosen report id.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import ChartBar from 'vue-material-design-icons/ChartBar.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnAnalyticsReportPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, ChartBar },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing report') },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			reports: [],
			search: '',
			selectedReportId: null,
			searchTimer: null,
		}
	},

	computed: {
		/**
		 * Client-side filter on top of the server-side `?search=`
		 * payload — so the user sees instant feedback even between
		 * debounce ticks.
		 *
		 * @return {Array} The filtered report rows.
		 */
		visibleReports() {
			const term = this.search.trim().toLowerCase()
			if (term === '') {
				return this.reports
			}
			return this.reports.filter(report => (report.name || '').toLowerCase().includes(term))
		},
	},

	mounted() {
		this.fetchReports()
	},

	beforeUnmount() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
	},

	methods: {
		t,

		/**
		 * Dismiss the dialog.
		 *
		 * @return {void}
		 */
		onClose() {
			/**
			 * @event close Emitted when the dialog should be closed (cancel or close button).
			 */
			this.$emit('close')
		},

		async fetchReports(searchTerm = '') {
			this.loading = true
			this.error = ''
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/analytics/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.reports = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC Analytics is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load reports.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnAnalyticsReportPicker] fetch reports failed', err)
				this.error = t('nextcloud-vue', 'Could not load reports.')
			} finally {
				this.loading = false
			}
		},

		onSearch(value) {
			// Debounce server-side filter; client-side filter is live.
			this.search = value
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.fetchReports(this.search.trim())
			}, 300)
		},

		pickReport(report) {
			this.selectedReportId = report.id
		},

		/**
		 * Resolve a translatable label for the report type code. Falls
		 * back to "Report" when the code is unknown (NC Analytics 6.x
		 * datasource types).
		 *
		 * @param {object} report Picker row.
		 *
		 * @return {string}
		 */
		reportTypeLabel(report) {
			const raw = report?.type
			if (raw === null || raw === undefined || raw === '') {
				return t('nextcloud-vue', 'Report')
			}
			switch (Number(raw)) {
			case 0: return t('nextcloud-vue', 'Group')
			case 1: return t('nextcloud-vue', 'File')
			case 2: return t('nextcloud-vue', 'Database')
			case 3: return t('nextcloud-vue', 'Git')
			case 4: return t('nextcloud-vue', 'External')
			case 6: return t('nextcloud-vue', 'JSON')
			default: return t('nextcloud-vue', 'Report')
			}
		},

		modifiedLabel(report) {
			const value = report?.modifiedAt || report?.modified || ''
			if (!value) {
				return ''
			}
			try {
				const num = Number(value)
				const d = Number.isFinite(num) && num > 0 && String(value).length <= 12
					? new Date(num * 1000)
					: new Date(value)
				if (Number.isNaN(d.getTime())) {
					return ''
				}
				return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
			} catch (_) {
				return ''
			}
		},

		confirm() {
			if (this.selectedReportId === null) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ reportId }`.
			 */
			this.$emit('link', { reportId: this.selectedReportId })
		},
	},
}
</script>

<style scoped>
.cn-analytics-report-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-analytics-report-picker__error {
	margin: 4px 0;
}

.cn-analytics-report-picker__search {
	width: 100%;
}

.cn-analytics-report-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-analytics-report-picker__row {
	border-radius: var(--border-radius);
}

.cn-analytics-report-picker__row-button {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	width: 100%;
	padding: 8px 10px;
	background: var(--color-background-hover);
	border: 2px solid transparent;
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-analytics-report-picker__row-button:hover {
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-analytics-report-picker__row--selected .cn-analytics-report-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-analytics-report-picker__row-icon {
	flex-shrink: 0;
	color: var(--color-primary-element);
	padding-top: 2px;
}

.cn-analytics-report-picker__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.cn-analytics-report-picker__name {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-analytics-report-picker__sub {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	color: var(--color-text-maxcontrast);
}

.cn-analytics-report-picker__badge {
	display: inline-flex;
	align-items: center;
	padding: 1px 6px;
	border-radius: 8px;
	background: var(--color-background-darker, var(--color-background-dark));
	color: var(--color-main-text);
	font-size: 10px;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.cn-analytics-report-picker__when {
	white-space: nowrap;
}
</style>
