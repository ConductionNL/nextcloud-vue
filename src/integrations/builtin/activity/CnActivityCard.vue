<!--
  CnActivityCard — bespoke surface-aware widget for the `activity` integration.

  Replaces the generic CnIntegrationCard for the `activity` leaf. Branches
  on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline count of activity events
        (with a "today" sub-count) + most-recent line summarising the
        latest event (actor + verb + time).
    - detail-page                    : compact chronological feed grouped
        by day (mirrors the tab layout at a smaller scale).
    - single-entity                  : chip with type icon + actor +
        subject (referenceType: 'activity').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnActivityTab; for `single-entity` the optional `value` prop addresses
  a single event by id (matching CnIntegrationCard's fetchSingle
  contract).

  See `openregister/openspec/changes/integration-activity/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-activity-card__chip" :title="subjectFor(entity)">
				<component :is="iconFor(entity)" :size="14" />
				<span class="cn-activity-card__chip-label">
					<span class="cn-activity-card__chip-actor">{{ actorFor(entity) }}</span>
					<span class="cn-activity-card__chip-sep">·</span>
					<span class="cn-activity-card__chip-subject">{{ subjectFor(entity) }}</span>
				</span>
			</span>
			<span v-else class="cn-activity-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline count + most-recent line -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-activity-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="entries.length === 0" class="cn-activity-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-activity-card__headline">
				<div class="cn-activity-card__headline-line">
					<strong>{{ headlineLabel }}</strong>
				</div>
				<div v-if="mostRecent" class="cn-activity-card__headline-recent">
					<component :is="iconFor(mostRecent)" :size="14" />
					<span class="cn-activity-card__headline-actor">{{ actorFor(mostRecent) }}</span>
					<span class="cn-activity-card__chip-sep">·</span>
					<span class="cn-activity-card__headline-subject">{{ subjectFor(mostRecent) }}</span>
					<span class="cn-activity-card__chip-sep">·</span>
					<span class="cn-activity-card__headline-time">{{ relativeTime(mostRecent) }}</span>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact timeline -->
		<template v-else>
			<div v-if="degraded" class="cn-activity-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="entries.length === 0" class="cn-activity-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-activity-card__timeline">
				<section
					v-for="day in groupedByDay"
					:key="day.key"
					class="cn-activity-card__day">
					<header class="cn-activity-card__day-header">
						<CalendarOutline :size="14" />
						<span>{{ day.label }}</span>
						<span class="cn-activity-card__day-count">{{ day.rows.length }}</span>
					</header>
					<ul class="cn-activity-card__list">
						<li
							v-for="entry in day.rows.slice(0, COMPACT_LIMIT)"
							:key="entryKey(entry)"
							class="cn-activity-card__row">
							<component :is="iconFor(entry)" :size="14" />
							<div class="cn-activity-card__row-main">
								<span class="cn-activity-card__row-subject">{{ subjectFor(entry) }}</span>
								<span class="cn-activity-card__row-meta">
									{{ actorFor(entry) }} · {{ relativeTime(entry) }}
								</span>
							</div>
						</li>
					</ul>
				</section>
			</div>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import CalendarOutline from 'vue-material-design-icons/CalendarOutline.vue'
import Timeline from 'vue-material-design-icons/Timeline.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import AccountOutline from 'vue-material-design-icons/AccountOutline.vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import ShareVariantOutline from 'vue-material-design-icons/ShareVariantOutline.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import CalendarClockOutline from 'vue-material-design-icons/CalendarClockOutline.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 4

/**
 * CnActivityCard — bespoke surface-aware widget for the `activity` integration.
 *
 * Renders activity events across all four surfaces. See the file-level
 * docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnActivityCard',

	components: {
		CnDetailCard,
		NcLoadingIcon,
		CalendarOutline,
		Timeline,
		FileOutline,
		AccountOutline,
		CommentTextOutline,
		ShareVariantOutline,
		TagOutline,
		CalendarClockOutline,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'activity'`). */
		integrationId: { type: String, default: 'activity' },
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
		/** Optional single-entity reference (event id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Activity') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => Timeline },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Compact-feed page size for dashboard / detail surfaces. */
		pageSize: { type: Number, default: 12 },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No activity yet for this object') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Activity is currently unavailable.') },
	},

	data() {
		return {
			entries: [],
			entity: null,
			loading: false,
			degraded: '',
			total: 0,
			COMPACT_LIMIT,
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		todayCount() {
			const now = new Date()
			const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
			let count = 0
			for (const entry of this.entries) {
				const ts = this.timestampFor(entry)
				if (ts !== null && ts.getTime() >= start) {
					count += 1
				}
			}
			return count
		},

		headlineLabel() {
			if (this.todayCount > 0) {
				return t('nextcloud-vue', '{n} today', { n: this.todayCount })
			}
			const total = this.total > 0 ? this.total : this.entries.length
			return t('nextcloud-vue', '{n} events', { n: total })
		},

		mostRecent() {
			if (this.entries.length === 0) {
				return null
			}
			// Provider sorts DESC; rely on first row.
			return this.entries[0]
		},

		groupedByDay() {
			const groups = new Map()
			for (const entry of this.entries) {
				const ts = this.timestampFor(entry)
				const key = this.dayKey(ts)
				if (groups.has(key) === false) {
					groups.set(key, { key, label: this.dayLabel(ts), rows: [] })
				}
				groups.get(key).rows.push(entry)
			}
			return [...groups.values()]
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

		entryKey(entry) {
			return entry.id ?? entry.activity_id ?? entry.activityId ?? ''
		},

		timestampFor(entry) {
			const raw = entry.timestamp ?? entry.datetime ?? entry.created ?? entry.creationDateTime ?? null
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			if (typeof raw === 'number' && raw < 1e12) {
				return new Date(raw * 1000)
			}
			const parsed = new Date(raw)
			return Number.isNaN(parsed.getTime()) ? null : parsed
		},

		dayKey(date) {
			if (date === null) {
				return 'unknown'
			}
			return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
		},

		dayLabel(date) {
			if (date === null) {
				return t('nextcloud-vue', 'Earlier')
			}
			const now = new Date()
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
			const yesterday = new Date(today.getTime() - 86400000)
			const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
			if (start.getTime() === today.getTime()) {
				return t('nextcloud-vue', 'Today')
			}
			if (start.getTime() === yesterday.getTime()) {
				return t('nextcloud-vue', 'Yesterday')
			}
			try {
				return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
			} catch (e) {
				return date.toISOString().split('T')[0]
			}
		},

		relativeTime(entry) {
			const ts = this.timestampFor(entry)
			if (ts === null) {
				return ''
			}
			try {
				return ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
			} catch (e) {
				return ts.toISOString().split('T')[1].slice(0, 5)
			}
		},

		subjectFor(entry) {
			return entry.subject_rich ?? entry.subjectRich ?? entry.subject ?? entry.title ?? ''
		},

		actorFor(entry) {
			return entry.actor_id ?? entry.actorDisplayName ?? entry.user ?? entry.affecteduser ?? t('nextcloud-vue', 'System')
		},

		iconFor(entry) {
			const type = String(entry.type ?? '').toLowerCase()
			if (type.includes('file') || type.includes('upload') || type.includes('change')) {
				return 'FileOutline'
			}
			if (type.includes('comment')) {
				return 'CommentTextOutline'
			}
			if (type.includes('share')) {
				return 'ShareVariantOutline'
			}
			if (type.includes('tag')) {
				return 'TagOutline'
			}
			if (type.includes('calendar') || type.includes('event')) {
				return 'CalendarClockOutline'
			}
			if (type.includes('user') || type.includes('account')) {
				return 'AccountOutline'
			}
			return 'Timeline'
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
				const params = new URLSearchParams({ limit: String(this.pageSize) })
				const response = await fetch(`${this.baseUrl()}?${params.toString()}`, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.entries = data.results || data.items || (Array.isArray(data) ? data : []) || []
					this.total = Number(data.total ?? 0)
				} else if (response.status === 503) {
					this.entries = []
					this.degraded = this.unavailableLabel
				} else {
					this.entries = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnActivityCard] failed to fetch activity', err)
				this.entries = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (this.value === '' || this.value === null || this.value === undefined
				|| !this.register || !this.schema || !this.objectId) {
				this.entity = null
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(String(this.value))}`, { headers: buildHeaders() })
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
				console.error('[CnActivityCard] failed to fetch single event', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-activity-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-activity-card__headline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-activity-card__headline-line {
	font-size: 1.05em;
	color: var(--color-main-text);
}

.cn-activity-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-activity-card__headline-actor {
	font-weight: 500;
}

.cn-activity-card__headline-subject {
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-activity-card__chip {
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

.cn-activity-card__chip-label {
	display: inline-flex;
	gap: 4px;
	color: var(--color-main-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-activity-card__chip-actor {
	font-weight: 500;
}

.cn-activity-card__chip-sep {
	opacity: 0.6;
}

.cn-activity-card__chip-subject {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-activity-card__day {
	margin-bottom: 10px;
}

.cn-activity-card__day-header {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 0;
	font-size: 0.8em;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	border-bottom: 1px solid var(--color-border);
}

.cn-activity-card__day-count {
	margin-left: auto;
	font-weight: normal;
	font-size: 0.8em;
	padding: 1px 6px;
	border-radius: 9px;
	background: var(--color-background-hover);
}

.cn-activity-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-activity-card__row {
	display: flex;
	align-items: flex-start;
	gap: 6px;
	padding: 6px 0;
}

.cn-activity-card__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-activity-card__row-subject {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	font-size: 0.95em;
}

.cn-activity-card__row-meta {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
