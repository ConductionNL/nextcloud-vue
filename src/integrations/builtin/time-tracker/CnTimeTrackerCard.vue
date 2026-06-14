<!--
  CnTimeTrackerCard — bespoke surface-aware widget for the `time-tracker`
  integration.

  Replaces the generic CnIntegrationCard for the `time-tracker` leaf.
  Branches on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N tracked entries";
        sub-line with total tracked time (hours + minutes) summed over
        all linked time-entries; plus a most-recent row link.
    - detail-page                    : bounded row list with kind chip,
        duration, billable indicator — same shape as the tab but
        read-only.
    - single-entity                  : chip with row title + kind pill
        (referenceType: 'time-tracker').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnTimeTrackerTab; for `single-entity` the optional `value` prop
  addresses a single row by id.

  Note: the leaf slug is `time-tracker` (with a hyphen); the underlying
  NC app id is `timemanager` (no hyphen).

  See `openregister/openspec/changes/integration-time-tracker/` for the
  spec delta, ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardHeaderTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-time-tracker-card__chip" :title="chipSubtitle(entity)">
				<Clock :size="14" />
				<a
					:href="rowUrl(entity)"
					target="_blank"
					rel="noopener">{{ rowTitle(entity) }}</a>
				<span class="cn-time-tracker-card__chip-pill" :class="kindChipClass(entity)">
					{{ kindLabel(entity) }}
				</span>
			</span>
			<span v-else class="cn-time-tracker-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + total tracked time + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-time-tracker-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="rows.length === 0" class="cn-time-tracker-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-time-tracker-card__headline">
				<div class="cn-time-tracker-card__headline-line">
					<strong>{{ countHeadline }}</strong>
				</div>
				<div v-if="totalDurationLabel" class="cn-time-tracker-card__total">
					<Timer :size="14" />
					{{ totalDurationLabel }}
				</div>
				<ul v-if="kindDistribution.length > 0" class="cn-time-tracker-card__distribution">
					<li
						v-for="bucket in kindDistribution"
						:key="bucket.key"
						class="cn-time-tracker-card__distribution-row">
						<span class="cn-time-tracker-card__distribution-label">
							<span
								class="cn-time-tracker-card__distribution-dot"
								:class="`cn-time-tracker-card__distribution-dot--${bucket.key}`" />
							{{ bucket.label }}
						</span>
						<span class="cn-time-tracker-card__distribution-count">{{ bucket.count }}</span>
					</li>
				</ul>
				<div v-if="mostRecent" class="cn-time-tracker-card__headline-recent">
					<Clock :size="14" />
					<a
						:href="rowUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ rowTitle(mostRecent) }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: bounded row list -->
		<template v-else>
			<div v-if="degraded" class="cn-time-tracker-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="rows.length === 0" class="cn-time-tracker-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-time-tracker-card__rows">
				<li
					v-for="row in rows"
					:key="rowKey(row)"
					class="cn-time-tracker-card__row"
					:class="{ 'cn-time-tracker-card__row--highlight': isLinked(row) }">
					<a
						:href="rowUrl(row)"
						target="_blank"
						rel="noopener"
						class="cn-time-tracker-card__title">{{ rowTitle(row) }}</a>
					<span class="cn-time-tracker-card__chip-pill" :class="kindChipClass(row)">
						{{ kindLabel(row) }}
					</span>
					<span v-if="durationLabel(row)" class="cn-time-tracker-card__duration">
						{{ durationLabel(row) }}
					</span>
				</li>
			</ul>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import Clock from 'vue-material-design-icons/Clock.vue'
import Timer from 'vue-material-design-icons/Timer.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * CnTimeTrackerCard — bespoke surface-aware widget for the
 * `time-tracker` integration. See file-level docblock.
 */
export default {
	name: 'CnTimeTrackerCard',

	components: { CnDetailCard, NcLoadingIcon, Clock, Timer },

	props: {
		/** Stable integration id (forwarded from the registry — always `'time-tracker'`). */
		integrationId: { type: String, default: 'time-tracker' },
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
		/** Optional single-entity reference (row id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Time tracker') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => Clock },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No tracked time linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC TimeManager is currently unavailable.') },
		/** URL of the NC TimeManager app entry. */
		timeTrackerAppUrl: { type: String, default: '/index.php/apps/timemanager' },
	},

	data() {
		return {
			rows: [],
			entity: null,
			loading: false,
			degraded: '',
		}
	},

	computed: {
		cardHeaderTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		/**
		 * Rows bucketed by kind so the dashboard surface can show the
		 * clients / tasks / entries distribution.
		 *
		 * @return {Array<{key: string, label: string, count: number}>}
		 */
		kindDistribution() {
			const groups = new Map()
			for (const row of this.rows) {
				const kind = this.rowKind(row)
				if (!groups.has(kind)) {
					groups.set(kind, { key: kind, label: this.kindLabel(row), count: 0 })
				}
				groups.get(kind).count += 1
			}
			return Array.from(groups.values())
		},

		countHeadline() {
			const total = this.rows.length
			return n('nextcloud-vue', '{count} entry', '{count} entries', total, { count: total })
		},

		/**
		 * Total tracked seconds across all rows that carry a `duration`
		 * (clients without a duration don't contribute to this total —
		 * they're parent containers).
		 *
		 * @return {number} Seconds total.
		 */
		totalSeconds() {
			let total = 0
			for (const row of this.rows) {
				const d = this.durationSeconds(row)
				if (d !== null) {
					total += d
				}
			}
			return total
		},

		totalDurationLabel() {
			if (this.totalSeconds === 0) {
				return ''
			}
			const totalMinutes = Math.round(this.totalSeconds / 60)
			const hours = Math.floor(totalMinutes / 60)
			const minutes = totalMinutes % 60
			if (hours > 0) {
				return t('nextcloud-vue', '{hours}h {minutes}m tracked', { hours, minutes })
			}
			return t('nextcloud-vue', '{minutes}m tracked', { minutes })
		},

		mostRecent() {
			if (this.rows.length === 0) {
				return null
			}
			const sorted = [...this.rows].sort((a, b) => {
				const ta = Date.parse(a.startedAt ?? a.started_at ?? a.linkedAt ?? a.created_at ?? '') || 0
				const tb = Date.parse(b.startedAt ?? b.started_at ?? b.linkedAt ?? b.created_at ?? '') || 0
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

		rowKey(row) {
			return row.id ?? row.uuid ?? row.data?.uuid ?? ''
		},

		rowTitle(row) {
			return row.title ?? row.name ?? this.rowKey(row)
		},

		rowKind(row) {
			const k = String(row.kind ?? row.type ?? '').toLowerCase()
			if (k === 'task') {
				return 'task'
			}
			if (k === 'time' || k === 'entry' || k === 'time-entry') {
				return 'time'
			}
			return 'client'
		},

		kindLabel(row) {
			const kind = this.rowKind(row)
			if (kind === 'task') {
				return t('nextcloud-vue', 'Task')
			}
			if (kind === 'time') {
				return t('nextcloud-vue', 'Entry')
			}
			return t('nextcloud-vue', 'Client')
		},

		kindChipClass(row) {
			return `cn-time-tracker-card__chip-pill--${this.rowKind(row)}`
		},

		rowUrl(row) {
			if (row.url) {
				return row.url
			}
			const kind = this.rowKind(row)
			const id = this.rowKey(row)
			if (kind === 'client') {
				const clientId = row.clientId ?? id
				if (clientId) {
					return `/index.php/apps/timemanager/clients/${clientId}`
				}
			}
			if (kind === 'task') {
				const taskId = row.taskId ?? id
				if (taskId) {
					return `/index.php/apps/timemanager/tasks/${taskId}`
				}
			}
			if (kind === 'time' && id) {
				return `/index.php/apps/timemanager/times/${id}`
			}
			if (id) {
				return `/index.php/apps/timemanager/projects/${id}`
			}
			return this.timeTrackerAppUrl
		},

		durationSeconds(row) {
			const raw = row.duration ?? row.seconds ?? row.data?.duration ?? null
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const num = Number(raw)
			return Number.isNaN(num) ? null : num
		},

		durationLabel(row) {
			const total = this.durationSeconds(row)
			if (total === null) {
				return ''
			}
			const totalMinutes = Math.round(total / 60)
			const hours = Math.floor(totalMinutes / 60)
			const minutes = totalMinutes % 60
			if (hours > 0) {
				return `${hours}h ${minutes}m`
			}
			return `${minutes}m`
		},

		isLinked(row) {
			if (!this.value) {
				return false
			}
			return String(this.rowKey(row)) === String(this.value)
		},

		chipSubtitle(row) {
			return this.durationLabel(row) || this.kindLabel(row)
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
					this.rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.rows = []
					this.degraded = this.unavailableLabel
				} else {
					this.rows = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTimeTrackerCard] failed to fetch rows', err)
				this.rows = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (!this.value || !this.register || !this.schema || !this.objectId) {
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
				console.error('[CnTimeTrackerCard] failed to fetch single row', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-time-tracker-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-time-tracker-card__headline {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-time-tracker-card__headline-line {
	font-size: 1.05em;
	color: var(--color-main-text);
}

.cn-time-tracker-card__total {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 0.95em;
	color: var(--color-main-text);
	font-weight: 600;
}

.cn-time-tracker-card__distribution {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-time-tracker-card__distribution-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-time-tracker-card__distribution-label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.cn-time-tracker-card__distribution-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color-background-dark);
}

.cn-time-tracker-card__distribution-dot--client {
	background: var(--color-primary-element, #21468B);
}

.cn-time-tracker-card__distribution-dot--task {
	background: var(--color-warning, #e9a40f);
}

.cn-time-tracker-card__distribution-dot--time {
	background: var(--color-success, #46ba61);
}

.cn-time-tracker-card__distribution-count {
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-time-tracker-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-time-tracker-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-time-tracker-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-time-tracker-card__chip {
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

/* stylelint-disable-next-line no-descending-specificity */
.cn-time-tracker-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-time-tracker-card__chip a:hover {
	text-decoration: underline;
}

.cn-time-tracker-card__chip-pill {
	display: inline-block;
	padding: 1px 6px;
	font-size: 0.7em;
	font-weight: 600;
	border-radius: 8px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	white-space: nowrap;
}

.cn-time-tracker-card__chip-pill--client {
	background: var(--color-primary-element, #21468B);
	color: var(--color-main-background);
}

.cn-time-tracker-card__chip-pill--task {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-time-tracker-card__chip-pill--time {
	background: var(--color-success, #46ba61);
	color: var(--color-main-background);
}

.cn-time-tracker-card__rows {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-time-tracker-card__row {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 4px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	font-size: 0.85em;
}

.cn-time-tracker-card__row--highlight {
	border-color: var(--color-primary-element, #21468B);
	background: var(--color-primary-element-light, var(--color-background-darker));
	font-weight: 600;
}

.cn-time-tracker-card__title {
	flex: 1;
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

a.cn-time-tracker-card__title:hover {
	text-decoration: underline;
}

.cn-time-tracker-card__duration {
	font-weight: 600;
	color: var(--color-main-text);
	font-size: 0.85em;
}
</style>
