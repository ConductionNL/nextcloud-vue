<!--
  CnActivityTab — bespoke sidebar tab for the `activity` integration.

  Renders a chronological timeline of NC Activity events grouped by day,
  with a type icon + actor + subject text + relative timestamp per row.

  Tier-2 surface (read-only — NC Activity entries are core-generated):
    - Filter bar: type dropdown, actor dropdown, date-range segmented
      control (24h / 7d / 30d / all).
    - Cursor-based "load more" pagination.
    - NO picker, NO inline create (entries are not user-authored here).

  Talks to the OpenRegister Tier-2 activity endpoints:
    GET /api/objects/{register}/{schema}/{objectId}/activity
        ?type=&actor=&after=&limit=&cursor=
    GET /api/integrations/activity/types?object={r}/{s}/{id}
    GET /api/integrations/activity/actors?object={r}/{s}/{id}
  backed by `OCA\OpenRegister\Service\ActivityFilterService`, which wraps
  the wave-5.3 `MarkerLookupTrait` carve-out (NC Activity's single string
  `subject` column is the `[or:{uuid}]` marker target) with the filters
  and cursor pagination above. The carve-out is intentionally preserved.

  Surface behaviour:
    - Empty state with neutral copy when no activity matches the filters.
    - Loading + 501/503 "unavailable" + generic error banner all match
      CnIntegrationTab's degradation patterns (AD-23).

  See `openregister/openspec/changes/integration-activity/` for the spec
  delta and ADR-019 (registry mechanism).
-->
<template>
	<div class="cn-sidebar-tab cn-activity-tab">
		<div v-if="degraded" class="cn-activity-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<div v-if="!degraded" class="cn-activity-tab__filters">
			<div class="cn-activity-tab__filter-row">
				<label class="cn-activity-tab__filter">
					<span class="cn-activity-tab__filter-label">{{ typeLabel }}</span>
					<select
						v-model="selectedType"
						class="cn-activity-tab__select"
						@change="resetAndFetch">
						<option value="">{{ allTypesLabel }}</option>
						<option v-for="ty in types" :key="ty" :value="ty">{{ ty }}</option>
					</select>
				</label>
				<label class="cn-activity-tab__filter">
					<span class="cn-activity-tab__filter-label">{{ actorLabel }}</span>
					<select
						v-model="selectedActor"
						class="cn-activity-tab__select"
						@change="resetAndFetch">
						<option value="">{{ allActorsLabel }}</option>
						<option v-for="ac in actors" :key="ac" :value="ac">{{ ac }}</option>
					</select>
				</label>
			</div>
			<div class="cn-activity-tab__range" role="group" :aria-label="rangeGroupLabel">
				<button
					v-for="range in ranges"
					:key="range.key"
					type="button"
					class="cn-activity-tab__range-btn"
					:class="{ 'cn-activity-tab__range-btn--active': selectedRange === range.key }"
					@click="selectRange(range.key)">
					{{ range.label }}
				</button>
			</div>
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
					<NcListItem
						v-for="entry in day.rows"
						:key="entryKey(entry)"
						class="cn-activity-tab__row"
						:name="subjectFor(entry)"
						:bold="false"
						:compact="true"
						:force-display-actions="false">
						<template #name>
							<span class="cn-activity-tab__subject">{{ subjectFor(entry) }}</span>
						</template>
						<template #icon>
							<span class="cn-activity-tab__avatar-wrap">
								<NcAvatar
									:user="avatarUser(entry)"
									:display-name="actorFor(entry)"
									:size="36"
									:disable-menu="true"
									:disable-tooltip="true"
									:show-user-status="false" />
								<span class="cn-activity-tab__type-badge" :class="typeBadgeClass(entry)">
									<component :is="iconFor(entry)" :size="12" />
								</span>
							</span>
						</template>
						<template #subname>
							<span class="cn-activity-tab__subname">
								<span class="cn-activity-tab__actor">{{ actorFor(entry) }}</span>
							</span>
						</template>
						<template v-if="timestampMillis(entry)" #details>
							<NcDateTime
								class="cn-activity-tab__time"
								:timestamp="timestampMillis(entry)"
								:relative-time="'short'" />
						</template>
						<template v-else #details>
							<span class="cn-activity-tab__time">{{ relativeTime(entry) }}</span>
						</template>
					</NcListItem>
				</ul>
			</section>
			<div v-if="hasMore" class="cn-activity-tab__footer">
				<NcButton
					variant="tertiary"
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
import { NcAvatar, NcButton, NcDateTime, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
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
const SECONDS_PER_DAY = 86400

/**
 * CnActivityTab — bespoke chronological timeline for the `activity`
 * integration with type/actor/date filters + cursor pagination.
 *
 * Renders activity entries grouped by day (today / yesterday / older
 * dates), with type icons, actor name, and a relative timestamp. Reads
 * from the OR Tier-2 activity endpoints; filters drive a fresh fetch,
 * "load more" walks the cursor returned by the backend.
 */
export default {
	name: 'CnActivityTab',

	components: {
		NcAvatar,
		NcButton,
		NcDateTime,
		NcListItem,
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
			types: [],
			actors: [],
			selectedType: '',
			selectedActor: '',
			selectedRange: 'all',
			cursor: null,
			loading: false,
			loadingMore: false,
			total: 0,
			error: '',
			degraded: '',
			typeLabel: t('nextcloud-vue', 'Type'),
			actorLabel: t('nextcloud-vue', 'Actor'),
			allTypesLabel: t('nextcloud-vue', 'All types'),
			allActorsLabel: t('nextcloud-vue', 'All actors'),
			rangeGroupLabel: t('nextcloud-vue', 'Date range'),
			ranges: [
				{ key: '24h', label: t('nextcloud-vue', '24h') },
				{ key: '7d', label: t('nextcloud-vue', '7d') },
				{ key: '30d', label: t('nextcloud-vue', '30d') },
				{ key: 'all', label: t('nextcloud-vue', 'All') },
			],
		}
	},

	computed: {
		hasMore() {
			return this.cursor !== null
		},

		/**
		 * Unix-epoch-seconds lower bound for the selected date range, or
		 * null for "all".
		 *
		 * @return {?number} Lower-bound timestamp or null.
		 */
		afterTimestamp() {
			const days = { '24h': 1, '7d': 7, '30d': 30 }[this.selectedRange]
			if (!days) {
				return null
			}
			return Math.floor(Date.now() / 1000) - (days * SECONDS_PER_DAY)
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
		objectId: { immediate: true, handler(id) { if (id) { this.bootstrap() } } },
		register() { this.bootstrap() },
		schema() { this.bootstrap() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/activity`
		},

		dropdownUrl(kind) {
			const object = `${this.register}/${this.schema}/${this.objectId}`
			return `${this.apiBase}/integrations/activity/${kind}?object=${encodeURIComponent(object)}`
		},

		buildQuery() {
			const params = new URLSearchParams()
			params.set('limit', String(this.pageSize))
			if (this.selectedType) {
				params.set('type', this.selectedType)
			}
			if (this.selectedActor) {
				params.set('actor', this.selectedActor)
			}
			if (this.afterTimestamp !== null) {
				params.set('after', String(this.afterTimestamp))
			}
			if (this.cursor !== null) {
				params.set('cursor', String(this.cursor))
			}
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

		/**
		 * Resolve the entry timestamp as epoch-millisecond value for
		 * NcDateTime, or 0 when unknown (callers branch on truthiness).
		 *
		 * @param {object} entry Activity row.
		 * @return {number} Epoch milliseconds, or 0.
		 */
		timestampMillis(entry) {
			const ts = this.timestampFor(entry)
			return ts === null ? 0 : ts.getTime()
		},

		subjectFor(entry) {
			return entry.subject_rich ?? entry.subjectRich ?? entry.subject ?? entry.title ?? ''
		},

		actorFor(entry) {
			return entry.actor_id ?? entry.actorDisplayName ?? entry.user ?? entry.affecteduser ?? t('nextcloud-vue', 'System')
		},

		/**
		 * NC user id to seed the actor avatar, when the entry carries a
		 * real account id. Falls back to '' so NcAvatar renders initials
		 * from the display name (e.g. the System pseudo-actor).
		 *
		 * @param {object} entry Activity row.
		 * @return {string} NC user id, or ''.
		 */
		avatarUser(entry) {
			const id = entry.actor_id ?? entry.user ?? entry.affecteduser ?? ''
			return typeof id === 'string' ? id : ''
		},

		/**
		 * Modifier class colouring the small activity-type badge that
		 * overlaps the actor avatar, grouping verbs into NC-Activity-like
		 * families (file / comment / share / tag).
		 *
		 * @param {object} entry Activity row.
		 * @return {string} BEM modifier class.
		 */
		typeBadgeClass(entry) {
			const type = String(entry.type ?? '').toLowerCase()
			if (type.includes('comment')) {
				return 'cn-activity-tab__type-badge--comment'
			}
			if (type.includes('share')) {
				return 'cn-activity-tab__type-badge--share'
			}
			if (type.includes('tag')) {
				return 'cn-activity-tab__type-badge--tag'
			}
			return 'cn-activity-tab__type-badge--file'
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

		selectRange(key) {
			if (this.selectedRange === key) {
				return
			}
			this.selectedRange = key
			this.resetAndFetch()
		},

		/**
		 * Full (re)load: refresh the dropdown sources, then fetch the
		 * first filtered page.
		 *
		 * @return {void}
		 */
		bootstrap() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.fetchDropdowns()
			this.resetAndFetch()
		},

		resetAndFetch() {
			this.entries = []
			this.cursor = null
			this.total = 0
			this.fetchEntries()
		},

		async fetchDropdowns() {
			try {
				const [typesRes, actorsRes] = await Promise.all([
					fetch(this.dropdownUrl('types'), { headers: buildHeaders() }),
					fetch(this.dropdownUrl('actors'), { headers: buildHeaders() }),
				])
				if (typesRes.ok) {
					const data = await typesRes.json()
					this.types = data.results || []
				}
				if (actorsRes.ok) {
					const data = await actorsRes.json()
					this.actors = data.results || []
				}
			} catch (err) {
				// Dropdown failure is non-fatal — filters just stay empty.
				// eslint-disable-next-line no-console
				console.error('[CnActivityTab] failed to fetch filter options', err)
			}
		},

		async fetchEntries() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			const isFirstPage = this.cursor === null
			if (isFirstPage) {
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
					this.entries = isFirstPage ? rows : [...this.entries, ...rows]
					this.total = Number(data.total ?? 0)
					const next = data.nextCursor ?? null
					this.cursor = (next === null || next === undefined) ? null : Number(next)
				} else if (response.status === 503 || response.status === 501) {
					if (isFirstPage) {
						this.entries = []
					}
					this.cursor = null
					this.degraded = this.unavailableLabel
				} else {
					if (isFirstPage) {
						this.entries = []
					}
					this.cursor = null
					this.error = t('nextcloud-vue', 'Could not load activity.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnActivityTab] failed to fetch activity', err)
				if (isFirstPage) {
					this.entries = []
				}
				this.cursor = null
				this.error = t('nextcloud-vue', 'Could not load activity.')
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},

		loadMore() {
			if (this.cursor === null) {
				return
			}
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

.cn-activity-tab__filters {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 12px;
}

.cn-activity-tab__filter-row {
	display: flex;
	gap: 8px;
}

.cn-activity-tab__filter {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-activity-tab__filter-label {
	font-size: 0.78em;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
}

.cn-activity-tab__select {
	width: 100%;
	min-height: 34px;
	padding: 4px 6px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-activity-tab__range {
	display: flex;
	gap: 4px;
}

.cn-activity-tab__range-btn {
	flex: 1;
	padding: 4px 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-text-maxcontrast);
	font-size: 0.82em;
	cursor: pointer;
}

.cn-activity-tab__range-btn--active {
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	border-color: var(--color-primary-element);
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
	display: flex;
	flex-direction: column;
	gap: 2px;
}

/* Actor avatar with an overlapping activity-type badge, mirroring the
   NC Activity feed's per-event glyph. */
.cn-activity-tab__avatar-wrap {
	position: relative;
	display: inline-flex;
	width: 36px;
	height: 36px;
}

.cn-activity-tab__type-badge {
	position: absolute;
	right: -2px;
	bottom: -2px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	border: 2px solid var(--color-main-background);
	color: var(--color-primary-element-text);
	background: var(--color-primary-element);
}

.cn-activity-tab__type-badge--comment {
	background: var(--color-success, #46ba61);
}

.cn-activity-tab__type-badge--share {
	background: var(--color-primary-element);
}

.cn-activity-tab__type-badge--tag {
	background: var(--color-warning, #e9a40f);
}

.cn-activity-tab__type-badge--file {
	background: var(--color-text-maxcontrast);
}

.cn-activity-tab__subject {
	color: var(--color-main-text);
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-activity-tab__subname {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-text-maxcontrast);
}

.cn-activity-tab__actor {
	font-weight: 500;
}

.cn-activity-tab__time {
	color: var(--color-text-maxcontrast);
	font-size: 0.8em;
	white-space: nowrap;
}

.cn-activity-tab__footer {
	margin-top: 8px;
}
</style>
