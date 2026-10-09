<!--
  CnActivityTab — bespoke sidebar tab for the `activity` integration.

  Reads OpenRegister's MERGED activity feed (audit trail, NC Activity, files,
  notes, mail) for the object, paged on the feed's time cursor, with a chip
  per kind (a kind with no rows still shows, reading 0), reads off by default
  (the reader's choice is remembered per user), a from/until date range and
  an export of what is on screen. The wire names are in `activityFeedWire.js`.
  A server without the merged feed (404/405/501) makes the tab fall back to
  the single-source mode described below, which `legacyFeed` also selects.

  Single-source mode: renders a chronological timeline of NC Activity events grouped by day,
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
	<div class="cn-sidebar-tab cn-activity-tab" :class="{ 'cn-activity-tab--board': isBoard }">
		<div v-if="degraded" class="cn-activity-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<!-- The History panel's header in the board look: the title, what the
		     list is, and the two buttons at its end. -->
		<div v-if="isBoard && !degraded" class="cn-activity-tab__board-head" data-testid="cn-activity-board-head">
			<div class="cn-activity-tab__board-titles">
				<h2 class="cn-activity-tab__board-title">
					{{ historyTitle }}
				</h2>
				<p class="cn-activity-tab__board-subtitle">
					{{ historySubtitle }}
				</p>
			</div>
			<div class="cn-activity-tab__board-actions">
				<NcButton
					v-if="showAddNote"
					variant="secondary"
					data-testid="cn-activity-add-note"
					@click="$emit('add-note')">
					{{ addNoteLabel }}
				</NcButton>
				<NcButton
					v-if="!legacy"
					variant="secondary"
					:disabled="visibleEntries.length === 0 || exporting"
					data-testid="cn-activity-export"
					@click="exportFeed">
					{{ exportLabel }}
				</NcButton>
			</div>
		</div>

		<div v-if="!degraded" class="cn-activity-tab__filters">
			<!-- Merged feed: one chip per kind. A kind with no rows keeps its chip, reading 0: gone would say the kind does not exist on this object. -->
			<div
				v-if="!legacy"
				class="cn-activity-tab__kinds"
				role="group"
				:aria-label="kindsGroupLabel"
				data-testid="cn-activity-kinds">
				<button
					v-for="kind in feedKinds"
					:key="kind"
					type="button"
					class="cn-activity-tab__kind"
					:class="{ 'cn-activity-tab__kind--active': selectedKinds.includes(kind) }"
					:aria-pressed="String(selectedKinds.includes(kind))"
					:data-testid="`cn-activity-kind-${kind}`"
					@click="toggleKind(kind)">
					{{ kindLabel(kind) }}
					<span class="cn-activity-tab__kind-count" :data-testid="`cn-activity-kind-count-${kind}`">{{ kindCount(kind) }}</span>
				</button>
			</div>
			<div class="cn-activity-tab__filter-row">
				<label v-if="legacy" class="cn-activity-tab__filter">
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
			<!-- Visibility filter (showVisibility): all, internal, public. A caller served the
			     public view sees it fixed at public, with the reason. -->
			<div v-if="showVisibility" class="cn-activity-tab__visibility" data-testid="cn-activity-visibility">
				<p v-if="publicViewOnly" class="cn-activity-tab__visibility-fixed" data-testid="cn-activity-visibility-fixed">
					<CnVisibilityChip visibility="public" />
					{{ publicOnlyLabel }}
				</p>
				<label v-else class="cn-activity-tab__filter">
					<span class="cn-activity-tab__filter-label">{{ visibilityLabel }}</span>
					<select
						v-model="selectedVisibility"
						class="cn-activity-tab__select"
						data-testid="cn-activity-visibility-select"
						@change="resetAndFetch">
						<option value="">{{ allVisibilityLabel }}</option>
						<option value="internal">{{ internalLabel }}</option>
						<option value="public">{{ publicLabel }}</option>
					</select>
				</label>
			</div>
			<label v-if="!legacy" class="cn-activity-tab__reads">
				<input
					type="checkbox"
					:checked="showReads"
					data-testid="cn-activity-reads"
					@change="setShowReads($event.target.checked)">
				{{ showReadsLabel }}
			</label>
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
			<!-- The range kept as a range: from and until, which is what the feed takes. -->
			<div v-if="!legacy" class="cn-activity-tab__dates">
				<label class="cn-activity-tab__filter">
					<span class="cn-activity-tab__filter-label">{{ fromLabel }}</span>
					<input
						type="date"
						class="cn-activity-tab__select"
						:value="fromDate"
						data-testid="cn-activity-from"
						@change="setDate('fromDate', $event.target.value)">
				</label>
				<label class="cn-activity-tab__filter">
					<span class="cn-activity-tab__filter-label">{{ untilLabel }}</span>
					<input
						type="date"
						class="cn-activity-tab__select"
						:value="untilDate"
						data-testid="cn-activity-until"
						@change="setDate('untilDate', $event.target.value)">
				</label>
			</div>
			<!-- The export is what is on screen: these rows and these filters, nothing re-queried. -->
			<NcButton
				v-if="!legacy && !isBoard"
				variant="tertiary"
				:disabled="visibleEntries.length === 0 || exporting"
				data-testid="cn-activity-export"
				@click="exportFeed">
				{{ exportLabel }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading && entries.length === 0" />
		<div v-else-if="error" class="cn-activity-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="visibleEntries.length === 0" class="cn-sidebar-tab__empty cn-activity-tab__empty">
			<Timeline :size="32" class="cn-activity-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
		</div>
		<!-- The board look draws the events as one rail: a 34px icon on a tint
		     of its kind, a connector to the next event, the verb in bold, and a
		     meta line of kind, who and when. -->
		<div v-else-if="isBoard" class="cn-activity-tab__timeline cn-activity-tab__timeline--rail">
			<ol class="cn-activity-tab__rail" data-testid="cn-activity-rail">
				<li
					v-for="entry in visibleEntries"
					:key="entryKey(entry)"
					class="cn-activity-tab__event"
					:class="`cn-activity-tab__event--${entry.kind || 'activity'}`"
					data-testid="cn-activity-event">
					<span class="cn-activity-tab__event-icon" aria-hidden="true">
						<component :is="iconFor(entry)" :size="18" />
					</span>
					<div class="cn-activity-tab__event-body">
						<p class="cn-activity-tab__event-line">
							<strong>{{ splitSubject(entry).verb }}</strong>{{ splitSubject(entry).rest }}
						</p>
						<p class="cn-activity-tab__event-meta">
							{{ eventMeta(entry) }}
						</p>
					</div>
					<CnVisibilityChip v-if="showVisibility" :visibility="entry.visibility" />
				</li>
			</ol>
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
						:forceDisplayActions="false">
						<template #name>
							<span class="cn-activity-tab__subject">{{ subjectFor(entry) }}</span>
						</template>
						<template #icon>
							<span class="cn-activity-tab__avatar-wrap">
								<NcAvatar
									:user="avatarUser(entry)"
									:displayName="actorFor(entry)"
									:size="36"
									:disableMenu="true"
									:disableTooltip="true"
									hideStatus />
								<span class="cn-activity-tab__type-badge" :class="typeBadgeClass(entry)">
									<component :is="iconFor(entry)" :size="12" />
								</span>
							</span>
						</template>
						<template #subname>
							<span class="cn-activity-tab__subname">
								<span class="cn-activity-tab__actor">{{ actorFor(entry) }}</span>
								<CnVisibilityChip v-if="showVisibility" :visibility="entry.visibility" />
							</span>
						</template>
						<template v-if="timestampMillis(entry)" #details>
							<NcDateTime
								class="cn-activity-tab__time"
								:timestamp="timestampMillis(entry)"
								relativeTime="short" />
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
import AccountOutline from 'vue-material-design-icons/AccountOutline.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import CalendarClockOutline from 'vue-material-design-icons/CalendarClockOutline.vue'
import CalendarOutline from 'vue-material-design-icons/CalendarOutline.vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import EmailOutline from 'vue-material-design-icons/EmailOutline.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import ShareVariantOutline from 'vue-material-design-icons/ShareVariantOutline.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import Timeline from 'vue-material-design-icons/Timeline.vue'
import CnVisibilityChip from '../../../components/CnVisibilityChip/CnVisibilityChip.vue'
import { normalizeLook } from '../../../composables/useLook.js'
import { buildHeaders, prefixUrl } from '../../../utils/index.js'
import { ACTIVITY_FEED_KINDS, exportBody, feedPath, feedQuery, isReadRow, parseFeed } from './activityFeedWire.js'

const DEFAULT_PAGE_SIZE = 25
const READS_PREFERENCE_KEY = 'activity.showReads'
const SECONDS_PER_DAY = 86400

/**
 * CnActivityTab — bespoke chronological timeline for the `activity`
 * integration. Reads the merged feed (audit trail, NC Activity, files, notes,
 * mail) with a chip per kind, a reads toggle that is remembered per user, a
 * from/until range, an export of what is on screen, and cursor pagination on
 * the feed's time cursor. In `legacyFeed` mode (or against a server without
 * the merged feed) it reads the single-source Activity endpoint with type,
 * actor and date filters, as it did before.
 *
 * Renders activity entries grouped by day (today / yesterday / older
 * dates), with type icons, actor name, and a relative timestamp. Reads
 * from the OR Tier-2 activity endpoints; filters drive a fresh fetch,
 * "load more" walks the cursor returned by the backend.
 */
export default {
	name: 'CnActivityTab',

	components: {
		CnVisibilityChip,
		NcAvatar,
		NcButton,
		NcDateTime,
		NcListItem,
		NcLoadingIcon,
		AlertCircleOutline,
		CalendarOutline,
		EmailOutline,
		Timeline,
		FileOutline,
		AccountOutline,
		CommentTextOutline,
		ShareVariantOutline,
		TagOutline,
		CalendarClockOutline,
	},

	inject: {
		/** The per-user preference group from CnAppRoot, so "show reads" is remembered. */
		cnUserPreferences: { default: null },
		/** The app's look, provided by CnAppRoot or CnPageRenderer (`nextcloud` or `board`). */
		cnLook: { default: 'nextcloud' },
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
		/**
		 * Read the single-source NC Activity endpoint (type, actor, date-range
		 * filters, no kinds, reads toggle or export) instead of the merged feed.
		 * The tab also falls back to it by itself when the server has no merged feed.
		 */
		legacyFeed: { type: Boolean, default: false },
		/**
		 * Show a visibility chip on each row and a visibility filter (all,
		 * internal, public) that sends `visibility` on the fetch. Off by default,
		 * so a host that passes nothing renders the feed as before.
		 */
		showVisibility: { type: Boolean, default: false },
		/**
		 * The server serves this caller the public view only (no `update` on the
		 * object): the filter is then fixed at public and says why, instead of
		 * offering options that change nothing. The host passes it.
		 */
		publicViewOnly: { type: Boolean, default: false },
		/**
		 * Offer an "Add note" button in the board look's History header. It
		 * emits `add-note`; the host opens whatever composes the note. Off by
		 * default, so no button points at nothing.
		 */
		showAddNote: { type: Boolean, default: false },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No activity yet for this object') },
		/** Pre-translated unavailable banner. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Activity is currently unavailable.') },
		/** Pre-translated load-more button label. */
		loadMoreLabel: { type: String, default: () => t('nextcloud-vue', 'Load more') },
	},

	emits: ['exported', 'add-note'],

	data() {
		return {
			entries: [],
			types: [],
			actors: [],
			selectedType: '',
			selectedActor: '',
			selectedVisibility: '',
			selectedRange: 'all',
			/** The single-source endpoint is in use: chosen by `legacyFeed`, or after the server had no merged feed. */
			legacy: this.legacyFeed,
			feedKinds: ACTIVITY_FEED_KINDS,
			/** Kinds the reader narrowed to; empty = all. */
			selectedKinds: [],
			/** Count per kind, as the feed returned it. */
			kindCounts: {},
			/** Read entries are shown. Off by default; the reader's choice is remembered per user. */
			showReads: false,
			fromDate: '',
			untilDate: '',
			exporting: false,
			cursor: null,
			loading: false,
			loadingMore: false,
			total: 0,
			error: '',
			degraded: '',
			visibilityLabel: t('nextcloud-vue', 'Visibility'),
			allVisibilityLabel: t('nextcloud-vue', 'All entries'),
			internalLabel: t('nextcloud-vue', 'Internal'),
			publicLabel: t('nextcloud-vue', 'Public'),
			publicOnlyLabel: t('nextcloud-vue', 'You see the public entries only.'),
			typeLabel: t('nextcloud-vue', 'Type'),
			actorLabel: t('nextcloud-vue', 'Actor'),
			allTypesLabel: t('nextcloud-vue', 'All types'),
			allActorsLabel: t('nextcloud-vue', 'All actors'),
			rangeGroupLabel: t('nextcloud-vue', 'Date range'),
			kindsGroupLabel: t('nextcloud-vue', 'Kinds of activity'),
			showReadsLabel: t('nextcloud-vue', 'Show reads'),
			fromLabel: t('nextcloud-vue', 'From'),
			untilLabel: t('nextcloud-vue', 'Until'),
			exportLabel: t('nextcloud-vue', 'Export'),
			addNoteLabel: t('nextcloud-vue', 'Add note'),
			historyTitle: t('nextcloud-vue', 'History'),
			historySubtitle: t('nextcloud-vue', 'What happened, who did it and when, newest first'),
			ranges: [
				{ key: '24h', label: t('nextcloud-vue', '24h') },
				{ key: '7d', label: t('nextcloud-vue', '7d') },
				{ key: '30d', label: t('nextcloud-vue', '30d') },
				{ key: 'all', label: t('nextcloud-vue', 'All') },
			],
		}
	},

	computed: {
		/**
		 * Whether the tab is drawn in the board look: the History header, the
		 * filled kind chips and the event rail.
		 *
		 * @return {boolean} True in the board look.
		 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-history-is-the-last-tab
		 */
		isBoard() {
			return normalizeLook(this.cnLook) === 'board'
		},

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

		/**
		 * The rows on screen: reads are left out unless the reader turned them on.
		 * Only an audit row can be a read.
		 *
		 * @return {object[]} The rows.
		 */
		visibleEntries() {
			if (this.legacy || this.showReads) {
				return this.entries
			}
			return this.entries.filter((entry) => !isReadRow(entry))
		},

		groupedByDay() {
			const groups = new Map()
			for (const entry of this.visibleEntries) {
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
		objectId: { immediate: true, handler(id) {
			if (id) {
				this.bootstrap()
			}
		} },

		register() {
			this.bootstrap()
		},

		schema() {
			this.bootstrap()
		},
	},

	methods: {
		baseUrl() {
			if (!this.legacy) {
				return prefixUrl(feedPath(this.objectAddress()))
			}
			return prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/activity`)
		},

		objectAddress() {
			return { apiBase: this.apiBase, register: this.register, schema: this.schema, objectId: this.objectId }
		},

		/** @return {object} The filters the tab is showing, in the feed's terms. */
		feedFilters() {
			return {
				kinds: this.selectedKinds,
				from: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : '',
				until: this.untilDate ? new Date(`${this.untilDate}T23:59:59.999`).toISOString() : '',
				reads: this.showReads,
				actor: this.selectedActor,
				visibility: this.showVisibility ? (this.publicViewOnly ? 'public' : this.selectedVisibility) : '',
				limit: this.pageSize,
			}
		},

		dropdownUrl(kind) {
			const object = `${this.register}/${this.schema}/${this.objectId}`
			return prefixUrl(`${this.apiBase}/integrations/activity/${kind}?object=${encodeURIComponent(object)}`)
		},

		buildQuery() {
			if (!this.legacy) {
				return feedQuery({ ...this.feedFilters(), cursor: this.cursor })
			}
			const params = new URLSearchParams()
			params.set('limit', String(this.pageSize))
			if (this.selectedType) {
				params.set('type', this.selectedType)
			}
			if (this.selectedActor) {
				params.set('actor', this.selectedActor)
			}
			if (this.showVisibility) {
				const visibility = this.publicViewOnly ? 'public' : this.selectedVisibility
				if (visibility) {
					params.set('visibility', visibility)
				}
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
			const raw = entry.timestamp ?? entry.datetime ?? entry.time ?? entry.at ?? entry.created ?? entry.creationDateTime ?? null
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
			} catch {
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
			} catch {
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

		/**
		 * Split an event's subject at its first colon: the verb ("Document
		 * reviewed") is drawn bold, the rest as written. A subject without a
		 * colon is all verb.
		 *
		 * @param {object} entry Activity row.
		 * @return {{verb: string, rest: string}} The two parts.
		 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-history-is-the-last-tab
		 */
		splitSubject(entry) {
			const subject = String(this.subjectFor(entry))
			const at = subject.indexOf(':')
			if (at <= 0) {
				return { verb: subject, rest: '' }
			}
			return { verb: subject.slice(0, at + 1), rest: subject.slice(at + 1) }
		},

		/**
		 * The meta line under an event: kind, who, when.
		 *
		 * @param {object} entry Activity row.
		 * @return {string} For example "Document · Pieter Jansen · 6 Oct, 15:40".
		 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-history-is-the-last-tab
		 */
		eventMeta(entry) {
			const ts = this.timestampFor(entry)
			let when = ''
			if (ts !== null) {
				try {
					when = ts.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
				} catch {
					when = ts.toISOString().replace('T', ' ').slice(0, 16)
				}
			}
			return [this.kindLabel(entry.kind || 'activity'), this.actorFor(entry), when].filter((part) => part !== '').join(' \u00b7 ')
		},

		subjectFor(entry) {
			return entry.subject_rich ?? entry.subjectRich ?? entry.subject ?? entry.summary ?? entry.title ?? ''
		},

		actorFor(entry) {
			return entry.actor_id ?? entry.actorDisplayName ?? entry.actor ?? entry.user ?? entry.affecteduser ?? t('nextcloud-vue', 'System')
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
			const id = entry.actor_id ?? entry.actor ?? entry.user ?? entry.affecteduser ?? ''
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
			const byKind = { file: 'FileOutline', note: 'CommentTextOutline', mail: 'EmailOutline', audit: 'Timeline', activity: 'Timeline' }[entry.kind]
			if (byKind) {
				return byKind
			}
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
			if (!this.legacy) {
				// A preset is a from date; until stays open.
				const days = { '24h': 1, '7d': 7, '30d': 30 }[key]
				this.fromDate = days ? this.localDate(new Date(Date.now() - (days * SECONDS_PER_DAY * 1000))) : ''
				this.untilDate = ''
			}
			this.resetAndFetch()
		},

		/**
		 * @param {Date} date A date.
		 * @return {string} `YYYY-MM-DD` in local time.
		 */
		localDate(date) {
			const pad = (n) => String(n).padStart(2, '0')
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
		},

		/**
		 * @param {'fromDate'|'untilDate'} field Which end of the range.
		 * @param {string} value `YYYY-MM-DD`, or '' to leave it open.
		 * @return {void}
		 */
		setDate(field, value) {
			this[field] = value
			this.selectedRange = 'custom'
			this.resetAndFetch()
		},

		/**
		 * @param {string} kind A feed kind.
		 * @return {string} Its label.
		 */
		kindLabel(kind) {
			return {
				audit: t('nextcloud-vue', 'Changes'),
				activity: t('nextcloud-vue', 'Activity'),
				file: t('nextcloud-vue', 'Files'),
				note: t('nextcloud-vue', 'Notes'),
				mail: t('nextcloud-vue', 'Mail'),
			}[kind] || kind
		},

		/**
		 * The count the feed returned for a kind. A kind with no rows reads 0
		 * and keeps its chip.
		 *
		 * @param {string} kind A feed kind.
		 * @return {number} The count.
		 */
		kindCount(kind) {
			return this.kindCounts[kind] ?? 0
		},

		toggleKind(kind) {
			this.selectedKinds = this.selectedKinds.includes(kind)
				? this.selectedKinds.filter((k) => k !== kind)
				: [...this.selectedKinds, kind]
			this.resetAndFetch()
		},

		/**
		 * Turn read entries on or off, and remember the choice for this user.
		 *
		 * @param {boolean} on Whether reads are shown.
		 * @return {Promise<void>}
		 */
		async setShowReads(on) {
			this.showReads = !!on
			const write = this.cnUserPreferences && this.cnUserPreferences.write
			try {
				if (typeof write === 'function') {
					await write(READS_PREFERENCE_KEY, this.showReads)
				} else if (typeof localStorage !== 'undefined') {
					localStorage.setItem(`cn-pref:${READS_PREFERENCE_KEY}`, JSON.stringify(this.showReads))
				}
			} catch {
				// Not remembered; the toggle still works for this session.
			}
			this.resetAndFetch()
		},

		/**
		 * Read the reader's remembered choice for the reads toggle.
		 *
		 * @return {Promise<void>}
		 */
		async loadShowReads() {
			try {
				const read = this.cnUserPreferences && this.cnUserPreferences.read
				if (typeof read === 'function') {
					this.showReads = (await read(READS_PREFERENCE_KEY, false)) === true
				} else if (typeof localStorage !== 'undefined') {
					this.showReads = JSON.parse(localStorage.getItem(`cn-pref:${READS_PREFERENCE_KEY}`) || 'false') === true
				}
			} catch {
				this.showReads = false
			}
		},

		/**
		 * Export what is on screen: the rows shown and the filters that produced
		 * them are sent to the feed's export; nothing is re-queried.
		 *
		 * @return {Promise<void>}
		 */
		async exportFeed() {
			this.exporting = true
			try {
				const response = await fetch(`${this.baseUrl()}/export`, {
					method: 'POST',
					headers: buildHeaders(),
					body: JSON.stringify(exportBody(this.visibleEntries, this.feedFilters())),
				})
				if (!response.ok) {
					throw new Error(`export failed (${response.status})`)
				}
				const blob = new Blob([await response.text()], { type: 'text/csv;charset=utf-8' })
				const url = URL.createObjectURL(blob)
				const link = document.createElement('a')
				link.href = url
				link.download = `activity-${this.objectId}.csv`
				document.body.appendChild(link)
				link.click()
				link.remove()
				URL.revokeObjectURL(url)
				/**
				 * @event exported Emitted after the feed on screen was exported. Payload: the number of rows.
				 * @type {number}
				 */
				this.$emit('exported', this.visibleEntries.length)
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnActivityTab] export failed', err)
				this.error = t('nextcloud-vue', 'Could not export activity.')
			} finally {
				this.exporting = false
			}
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
			if (!this.legacy) {
				this.loadShowReads().then(() => this.resetAndFetch())
				return
			}
			this.resetAndFetch()
		},

		resetAndFetch() {
			this.entries = []
			this.cursor = null
			this.total = 0
			this.fetchEntries()
		},

		/** The server has no merged feed: read the single-source endpoint, as before. */
		fallBackToLegacy() {
			this.legacy = true
			this.selectedRange = 'all'
			this.fromDate = ''
			this.untilDate = ''
			this.resetAndFetch()
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
			let noFeed = false
			try {
				const response = await fetch(`${this.baseUrl()}?${this.buildQuery()}`, { headers: buildHeaders() })
				if (!this.legacy && [404, 405, 501].includes(response.status)) {
					// No merged feed on this server: read the single-source endpoint instead.
					noFeed = true
				} else if (response.ok && !this.legacy) {
					const feed = parseFeed(await response.json())
					this.entries = isFirstPage ? feed.rows : [...this.entries, ...feed.rows]
					this.kindCounts = feed.counts
					this.total = this.entries.length
					this.cursor = feed.cursor
				} else if (response.ok) {
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
			if (noFeed) {
				this.fallBackToLegacy()
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
