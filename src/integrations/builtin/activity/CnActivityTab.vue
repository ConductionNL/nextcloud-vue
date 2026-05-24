<!--
  CnActivityTab — bespoke sidebar tab for the `activity` integration.

  Replaces the generic CnIntegrationTab for the `activity` leaf: renders
  a chronological timeline of NC Activity events grouped by day, with
  a type icon + actor + subject text + relative timestamp per row, and
  a "load more" button for paging.

  Talks to the OpenRegister pluggable-integration sub-resource:
    `/api/objects/{register}/{schema}/{objectId}/integrations/activity`
  served by `OCA\OpenRegister\Service\Integration\Providers\ActivityProvider`.
  (Activity is the one leaf where the MarkerLookupTrait usage is
  intentionally preserved — NC Activity does write a single string
  subject column and that column is the marker target; see the
  integration-activity change proposal for the carve-out rationale.)

  Surface behaviour:
    - Empty state with neutral copy when no activity is logged.
    - Loading + 503 "unavailable" + generic error banner all match
      CnIntegrationTab's degradation patterns (AD-23).

  Bespoke-vs-generic rationale: the generic tab renders a flat link list
  which strips Activity's three primary timeline signals — actor, verb,
  and time — that case handlers need to skim recent events in chronological
  context. The timeline grouping by day mirrors NC Activity's own UI.

  See `openregister/openspec/changes/integration-activity/` for the spec
  delta and ADR-019 (registry mechanism).
-->
<template>
	<div class="cn-sidebar-tab cn-activity-tab">
		<div v-if="degraded" class="cn-activity-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading && entries.length === 0" />
		<div v-else-if="error" class="cn-activity-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="entries.length === 0" class="cn-sidebar-tab__empty cn-activity-tab__empty">
			<Timeline :size="32" class="cn-activity-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
		</div>
		<div v-else class="cn-activity-tab__timeline">
			<section
				v-for="day in groupedByDay"
				:key="day.key"
				class="cn-activity-tab__day">
				<header class="cn-activity-tab__day-header">
					<CalendarOutline :size="16" />
					<span class="cn-activity-tab__day-label">{{ day.label }}</span>
					<span class="cn-activity-tab__day-count">{{ day.rows.length }}</span>
				</header>
				<ul class="cn-activity-tab__list">
					<li
						v-for="entry in day.rows"
						:key="entryKey(entry)"
						class="cn-activity-tab__row">
						<div class="cn-activity-tab__row-icon">
							<component :is="iconFor(entry)" :size="20" />
						</div>
						<div class="cn-activity-tab__row-main">
							<span class="cn-activity-tab__subject">{{ subjectFor(entry) }}</span>
							<span class="cn-activity-tab__meta">
								<span class="cn-activity-tab__actor">{{ actorFor(entry) }}</span>
								<span class="cn-activity-tab__dot">·</span>
								<span class="cn-activity-tab__time">{{ relativeTime(entry) }}</span>
							</span>
						</div>
					</li>
				</ul>
			</section>
			<div v-if="hasMore" class="cn-activity-tab__footer">
				<NcButton
					type="tertiary"
					:wide="true"
					:disabled="loadingMore"
					@click="loadMore">
					<template v-if="loadingMore" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ loadMoreLabel }}
				</NcButton>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import CalendarOutline from 'vue-material-design-icons/CalendarOutline.vue'
import Timeline from 'vue-material-design-icons/Timeline.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import AccountOutline from 'vue-material-design-icons/AccountOutline.vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import ShareVariantOutline from 'vue-material-design-icons/ShareVariantOutline.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import CalendarClockOutline from 'vue-material-design-icons/CalendarClockOutline.vue'
import { buildHeaders } from '../../../utils/index.js'

const DEFAULT_PAGE_SIZE = 25

/**
 * CnActivityTab — bespoke chronological timeline for the `activity`
 * integration.
 *
 * Renders activity entries grouped by day (today / yesterday / older
 * dates), with type icons, actor name, and a relative timestamp.
 * Reads from the OR pluggable-integration endpoint with simple
 * page-based "load more" paging.
 */
export default {
	name: 'CnActivityTab',

	components: {
		NcButton,
		NcLoadingIcon,
		AlertCircleOutline,
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
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Number of entries per fetch. */
		pageSize: { type: Number, default: DEFAULT_PAGE_SIZE },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No activity yet for this object') },
		/** Pre-translated unavailable banner. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Activity is currently unavailable.') },
		/** Pre-translated load-more button label. */
		loadMoreLabel: { type: String, default: () => t('nextcloud-vue', 'Load more') },
	},

	data() {
		return {
			entries: [],
			loading: false,
			loadingMore: false,
			page: 1,
			total: 0,
			error: '',
			degraded: '',
		}
	},

	computed: {
		hasMore() {
			if (this.total > 0) {
				return this.entries.length < this.total
			}
			// Heuristic: if last page filled, assume more might exist.
			return this.entries.length > 0 && (this.entries.length % this.pageSize) === 0
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
			// Preserve insertion order (entries assumed pre-sorted DESC by
			// the provider). Each day's rows likewise stay in the order
			// they were appended.
			return [...groups.values()]
		},
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.resetAndFetch() } } },
		register() { this.resetAndFetch() },
		schema() { this.resetAndFetch() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		buildQuery() {
			const params = new URLSearchParams()
			params.set('limit', String(this.pageSize))
			params.set('_page', String(this.page))
			return params.toString()
		},

		entryKey(entry) {
			return entry.id ?? entry.activity_id ?? entry.activityId ?? ''
		},

		timestampFor(entry) {
			const raw = entry.timestamp ?? entry.datetime ?? entry.created ?? entry.creationDateTime ?? null
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			// NC Activity exposes Unix epoch seconds in `timestamp`.
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

		resetAndFetch() {
			this.entries = []
			this.page = 1
			this.total = 0
			this.fetchEntries()
		},

		async fetchEntries() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			if (this.page === 1) {
				this.loading = true
			} else {
				this.loadingMore = true
			}
			this.error = ''
			this.degraded = ''
			try {
				const response = await fetch(`${this.baseUrl()}?${this.buildQuery()}`, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
					this.entries = this.page === 1 ? rows : [...this.entries, ...rows]
					this.total = Number(data.total ?? 0)
				} else if (response.status === 503) {
					if (this.page === 1) {
						this.entries = []
					}
					this.degraded = this.unavailableLabel
				} else {
					if (this.page === 1) {
						this.entries = []
					}
					this.error = t('nextcloud-vue', 'Could not load activity.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnActivityTab] failed to fetch activity', err)
				if (this.page === 1) {
					this.entries = []
				}
				this.error = t('nextcloud-vue', 'Could not load activity.')
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},

		loadMore() {
			this.page += 1
			this.fetchEntries()
		},
	},
}
</script>

<style scoped>
.cn-activity-tab__banner {
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

.cn-activity-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-activity-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-activity-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-activity-tab__day {
	margin-bottom: 14px;
}

.cn-activity-tab__day-header {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 0;
	font-size: 0.85em;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	border-bottom: 1px solid var(--color-border);
}

.cn-activity-tab__day-label {
	flex: 1;
}

.cn-activity-tab__day-count {
	font-weight: normal;
	font-size: 0.85em;
	padding: 1px 6px;
	border-radius: 9px;
	background: var(--color-background-hover);
}

.cn-activity-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-activity-tab__row {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-activity-tab__row:last-child {
	border-bottom: none;
}

.cn-activity-tab__row-icon {
	flex-shrink: 0;
	padding-top: 2px;
	color: var(--color-text-maxcontrast);
}

.cn-activity-tab__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-activity-tab__subject {
	color: var(--color-main-text);
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-activity-tab__meta {
	display: flex;
	align-items: baseline;
	gap: 6px;
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-activity-tab__actor {
	font-weight: 500;
}

.cn-activity-tab__dot {
	opacity: 0.6;
}

.cn-activity-tab__footer {
	margin-top: 8px;
}
</style>
