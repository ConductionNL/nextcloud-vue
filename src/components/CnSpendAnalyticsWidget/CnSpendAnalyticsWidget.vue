<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-spend-analytics-widget">
		<header class="cn-spend-analytics-widget__header">
			<span class="cn-spend-analytics-widget__title">{{ t('nextcloud-vue', 'Spend analytics') }}</span>
			<select
				class="cn-spend-analytics-widget__period"
				:value="period"
				:aria-label="t('nextcloud-vue', 'Reporting period')"
				@change="onPeriodChange($event.target.value)">
				<option v-for="opt in periodOptions" :key="opt.value" :value="opt.value">
					{{ opt.label }}
				</option>
			</select>
		</header>

		<div class="cn-spend-analytics-widget__body">
			<div v-if="loading" class="cn-spend-analytics-widget__state">
				{{ t('nextcloud-vue', 'Loading spend data…') }}
			</div>

			<!-- No data source wired at all. -->
			<div v-else-if="!hasSource" class="cn-spend-analytics-widget__state">
				{{ t('nextcloud-vue', 'No spend data source available') }}
			</div>

			<!-- financeq absent → empty-state naming the source. -->
			<div v-else-if="financeMissing" class="cn-spend-analytics-widget__state">
				{{ t('nextcloud-vue', 'No spend data — financeq is not installed') }}
			</div>

			<!-- financeq present but no data in window. -->
			<div v-else-if="financeEmpty" class="cn-spend-analytics-widget__state">
				{{ t('nextcloud-vue', 'No spend recorded for the selected period') }}
			</div>

			<template v-else>
				<section class="cn-spend-analytics-widget__cards">
					<div class="cn-spend-analytics-widget__card">
						<span class="cn-spend-analytics-widget__card-label">{{ t('nextcloud-vue', 'Total spend') }}</span>
						<span class="cn-spend-analytics-widget__card-value" :aria-label="totalAriaLabel">
							{{ formattedTotal }}
						</span>
					</div>
					<div class="cn-spend-analytics-widget__card">
						<span class="cn-spend-analytics-widget__card-label">{{ t('nextcloud-vue', 'Categories') }}</span>
						<span class="cn-spend-analytics-widget__card-value">{{ finance.byCategory.length }}</span>
					</div>
				</section>

				<section v-if="viewMode === 'trend'" class="cn-spend-analytics-widget__panel">
					<h3 class="cn-spend-analytics-widget__panel-title">
						{{ t('nextcloud-vue', 'Spend trend') }}
					</h3>
					<ul class="cn-spend-analytics-widget__rows">
						<li v-for="row in finance.trend" :key="row.month" class="cn-spend-analytics-widget__row cn-spend-analytics-widget__row--static">
							<span>{{ row.month }}</span>
							<span>{{ formatAmount(row.amount) }}</span>
						</li>
					</ul>
				</section>

				<section v-else-if="viewMode === 'top-categories'" class="cn-spend-analytics-widget__panel">
					<h3 class="cn-spend-analytics-widget__panel-title">
						{{ t('nextcloud-vue', 'Top categories') }}
					</h3>
					<ul class="cn-spend-analytics-widget__rows">
						<li
							v-for="row in finance.byCategory"
							:key="row.category"
							class="cn-spend-analytics-widget__row"
							role="button"
							tabindex="0"
							@click="drillTo('financeq', 'category', row.category)"
							@keyup.enter="drillTo('financeq', 'category', row.category)">
							<span>{{ row.category }}</span>
							<span>{{ formatAmount(row.amount) }}</span>
						</li>
					</ul>
				</section>

				<section v-else-if="viewMode === 'top-vendors'" class="cn-spend-analytics-widget__panel">
					<h3 class="cn-spend-analytics-widget__panel-title">
						{{ t('nextcloud-vue', 'Top vendors') }}
					</h3>
					<div v-if="vendorMissing" class="cn-spend-analytics-widget__inline-empty">
						{{ t('nextcloud-vue', 'No vendor data — procest is not installed') }}
					</div>
					<div v-else-if="vendorEmpty" class="cn-spend-analytics-widget__inline-empty">
						{{ t('nextcloud-vue', 'No vendor commitments for the selected period') }}
					</div>
					<ul v-else class="cn-spend-analytics-widget__rows">
						<li
							v-for="row in vendor.topVendors"
							:key="row.vendor"
							class="cn-spend-analytics-widget__row"
							role="button"
							tabindex="0"
							@click="drillTo('procest', 'vendor', row.vendor)"
							@keyup.enter="drillTo('procest', 'vendor', row.vendor)">
							<span>{{ row.vendor }}</span>
							<span>{{ formatAmount(row.committed) }}</span>
						</li>
					</ul>
				</section>

				<section v-if="aiEnabled" class="cn-spend-analytics-widget__panel">
					<h3 class="cn-spend-analytics-widget__panel-title">
						{{ t('nextcloud-vue', 'AI insight') }}
					</h3>
					<div v-if="aiUnavailable" class="cn-spend-analytics-widget__inline-empty">
						{{ t('nextcloud-vue', 'AI insight unavailable — the source is not configured') }}
					</div>
					<p v-else-if="aiNarrative" class="cn-spend-analytics-widget__ai-text">
						{{ aiNarrative }}
					</p>
					<button
						v-else
						type="button"
						class="cn-spend-analytics-widget__ai-btn"
						@click="requestNarrative">
						{{ t('nextcloud-vue', 'Generate insight') }}
					</button>
				</section>
			</template>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

const VIEW_MODES = ['summary', 'trend', 'top-vendors', 'top-categories']
const PERIODS = ['month', 'quarter', 'ytd', 'fy']
const DEBOUNCE_MS = 200

/**
 * CnSpendAnalyticsWidget — dashboard renderer for a `spend-analytics`
 * placement. Renders summary / trend / top-vendors / top-categories views over
 * spend data with graceful per-source empty states and row drill-through.
 *
 * Data origin (decoupling seam): all data flows through a consumer-supplied
 * `dataSource` prop OR the `cnSpendAnalyticsSource` injection — an object
 * exposing `fetchSummary(args)`, `fetchVendorCommitments(args)`,
 * `fetchNarrative(args)`, and optionally `resolveDeepLink(app, kind, id)`. The
 * renderer imports NO financeq / procest / launchpad service module and never
 * calls axios itself; the consuming app (typically over GraphQL) owns the
 * transport. The `requires.graphql` hint lives only in the registry entry, not
 * in any manifest dependency.
 *
 * Graceful degradation: with no source the widget shows "No spend data source
 * available"; the source signals per-sibling availability via
 * `{ available, empty }` envelopes so a partial fleet still renders
 * ("financeq is not installed" / "procest is not installed").
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnSpendAnalyticsWidget',

	inject: {
		cnSpendAnalyticsSource: {
			default: null,
		},
	},

	props: {
		/**
		 * Persisted widget content `{period, viewMode, filters, aiInsights}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Consumer-supplied data source overriding the
		 * `cnSpendAnalyticsSource` injection. Must expose `fetchSummary`,
		 * `fetchVendorCommitments`, and `fetchNarrative`; may expose
		 * `resolveDeepLink`. When `null` the injection (then the empty state)
		 * is used.
		 *
		 * @type {object|null}
		 */
		dataSource: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			period: PERIODS.includes(this.content && this.content.period) ? this.content.period : 'quarter',
			loading: false,
			finance: { available: false, empty: false, total: 0, currency: 'EUR', byCategory: [], trend: [] },
			vendor: { available: false, empty: false, topVendors: [] },
			aiNarrative: '',
			aiUnavailable: false,
			debounceTimer: null,
		}
	},

	computed: {
		/**
		 * The active data source (prop wins over injection).
		 *
		 * @return {object|null} the resolved source, or `null`.
		 */
		source() {
			const candidate = this.dataSource || this.cnSpendAnalyticsSource
			return candidate && typeof candidate.fetchSummary === 'function' ? candidate : null
		},

		/**
		 * Whether a usable spend source is configured.
		 *
		 * @return {boolean} true when a source exists.
		 */
		hasSource() {
			return this.source !== null
		},

		/**
		 * The validated view mode.
		 *
		 * @return {string} the view mode.
		 */
		viewMode() {
			return VIEW_MODES.includes(this.content && this.content.viewMode) ? this.content.viewMode : 'summary'
		},

		/**
		 * Whether the AI narrative panel is enabled.
		 *
		 * @return {boolean} the AI-enabled flag.
		 */
		aiEnabled() {
			return !!(this.content && this.content.aiInsights && this.content.aiInsights.enabled === true)
		},

		/**
		 * Whether financeq is absent.
		 *
		 * @return {boolean} true when finance is unavailable.
		 */
		financeMissing() {
			return this.finance.available === false
		},

		/**
		 * Whether financeq is present but has no data in the window.
		 *
		 * @return {boolean} true when finance is available but empty.
		 */
		financeEmpty() {
			return this.finance.available === true && this.finance.empty === true
		},

		/**
		 * Whether procest is absent.
		 *
		 * @return {boolean} true when vendor data is unavailable.
		 */
		vendorMissing() {
			return this.vendor.available === false
		},

		/**
		 * Whether procest is present but has no vendor data in the window.
		 *
		 * @return {boolean} true when vendor is available but empty.
		 */
		vendorEmpty() {
			return this.vendor.available === true && this.vendor.empty === true
		},

		/**
		 * The reporting-period dropdown options.
		 *
		 * @return {Array<{value: string, label: string}>} the options.
		 */
		periodOptions() {
			return [
				{ value: 'month', label: t('nextcloud-vue', 'This month') },
				{ value: 'quarter', label: t('nextcloud-vue', 'This quarter') },
				{ value: 'ytd', label: t('nextcloud-vue', 'Year to date') },
				{ value: 'fy', label: t('nextcloud-vue', 'Fiscal year') },
			]
		},

		/**
		 * The formatted total-spend amount.
		 *
		 * @return {string} the formatted total.
		 */
		formattedTotal() {
			return this.formatAmount(this.finance.total)
		},

		/**
		 * The accessible label for the total-spend value.
		 *
		 * @return {string} the aria label.
		 */
		totalAriaLabel() {
			return t('nextcloud-vue', 'Total spend: {amount}').replace('{amount}', this.formattedTotal)
		},
	},

	watch: {
		viewMode() {
			this.scheduleFetch()
		},
	},

	mounted() {
		this.fetchData()
	},

	beforeDestroy() {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer)
		}
	},

	methods: {
		t,

		/**
		 * Handle a reporting-period change.
		 *
		 * @param {string} value the new period.
		 * @return {void}
		 */
		onPeriodChange(value) {
			if (PERIODS.includes(value)) {
				this.period = value
				this.scheduleFetch()
			}
		},

		/**
		 * Debounce period / view changes before re-querying.
		 *
		 * @return {void}
		 */
		scheduleFetch() {
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer)
			}
			this.debounceTimer = setTimeout(() => {
				this.fetchData()
			}, DEBOUNCE_MS)
		},

		/**
		 * Fetch finance (always) + vendor (top-vendors view only) data in
		 * parallel through the source. A missing source or a failure degrades
		 * to the relevant empty state without throwing.
		 *
		 * @return {Promise<void>}
		 */
		async fetchData() {
			if (!this.source) {
				return
			}
			this.loading = true
			const filters = (this.content && this.content.filters) || {}
			try {
				const tasks = [
					this.source.fetchSummary({
						period: this.period,
						categoryIds: Array.isArray(filters.categoryIds) ? filters.categoryIds : [],
						departmentIds: Array.isArray(filters.departmentIds) ? filters.departmentIds : [],
					}),
				]
				if (this.viewMode === 'top-vendors' && typeof this.source.fetchVendorCommitments === 'function') {
					tasks.push(this.source.fetchVendorCommitments({
						period: this.period,
						vendorIds: Array.isArray(filters.vendorIds) ? filters.vendorIds : [],
					}))
				}
				const [finance, vendor] = await Promise.all(tasks)
				if (finance) {
					this.finance = finance
				}
				if (vendor) {
					this.vendor = vendor
				}
			} catch (e) {
				this.finance = { available: false, empty: false, total: 0, currency: 'EUR', byCategory: [], trend: [] }
			} finally {
				this.loading = false
			}
		},

		/**
		 * Request an AI narrative through the source. When the source lacks
		 * `fetchNarrative` or reports it unavailable, the panel disables
		 * gracefully.
		 *
		 * @return {Promise<void>}
		 */
		async requestNarrative() {
			if (!this.source || typeof this.source.fetchNarrative !== 'function') {
				this.aiUnavailable = true
				return
			}
			try {
				const result = await this.source.fetchNarrative({
					summary: { total: this.finance.total, currency: this.finance.currency, period: this.period },
				}) || {}
				if (result.available) {
					this.aiNarrative = result.narrative
					this.aiUnavailable = false
				} else {
					this.aiUnavailable = true
				}
			} catch (e) {
				this.aiUnavailable = true
			}
		},

		/**
		 * Deep-link a row to the owning sibling app's detail surface. The
		 * source may provide `resolveDeepLink`; absent that, the row is inert.
		 *
		 * @param {string} app the owning app id.
		 * @param {string} kind the entity kind.
		 * @param {string} id the entity id.
		 * @return {void}
		 */
		drillTo(app, kind, id) {
			if (this.source && typeof this.source.resolveDeepLink === 'function') {
				const href = this.source.resolveDeepLink(app, kind, id)
				if (typeof href === 'string' && href !== '') {
					window.location.href = href
				}
			}
		},

		/**
		 * Format a monetary amount respecting the browser locale.
		 *
		 * @param {number} amount the amount.
		 * @return {string} the locale-formatted currency string.
		 */
		formatAmount(amount) {
			const value = Number(amount) || 0
			const locale = (typeof navigator !== 'undefined' && navigator.language) || 'en'
			try {
				return new Intl.NumberFormat(locale, {
					style: 'currency',
					currency: this.finance.currency || 'EUR',
				}).format(value)
			} catch (e) {
				return String(value)
			}
		},
	},
}
</script>

<style scoped>
.cn-spend-analytics-widget {
	display: flex;
	flex-direction: column;
	height: 100%;
	gap: 8px;
	padding: 8px;
	overflow: hidden;
}

.cn-spend-analytics-widget__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.cn-spend-analytics-widget__title {
	font-weight: bold;
}

.cn-spend-analytics-widget__period {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	padding: 2px 6px;
}

.cn-spend-analytics-widget__body {
	flex: 1;
	overflow: auto;
}

.cn-spend-analytics-widget__cards {
	display: flex;
	gap: 12px;
}

.cn-spend-analytics-widget__card {
	display: flex;
	flex-direction: column;
	padding: 8px 12px;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	flex: 1;
}

.cn-spend-analytics-widget__card-label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-spend-analytics-widget__card-value {
	font-size: 1.4em;
	font-weight: bold;
}

.cn-spend-analytics-widget__panel-title {
	font-size: 1em;
	margin: 8px 0 4px;
}

.cn-spend-analytics-widget__rows {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-spend-analytics-widget__row {
	display: flex;
	justify-content: space-between;
	padding: 4px 8px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-spend-analytics-widget__row--static {
	cursor: default;
}

.cn-spend-analytics-widget__row:hover,
.cn-spend-analytics-widget__row:focus {
	background: var(--color-background-hover);
	outline: none;
}

.cn-spend-analytics-widget__state {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 64px;
	color: var(--color-text-maxcontrast);
	padding: 12px;
	text-align: center;
}

.cn-spend-analytics-widget__inline-empty {
	color: var(--color-text-maxcontrast);
	padding: 6px;
	text-align: left;
}

.cn-spend-analytics-widget__ai-text {
	white-space: pre-wrap;
}

.cn-spend-analytics-widget__ai-btn {
	border: 1px solid var(--color-border);
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	padding: 4px 12px;
	cursor: pointer;
}
</style>
