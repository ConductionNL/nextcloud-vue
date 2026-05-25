<!--
  CnTimeTrackerTab — bespoke sidebar tab for the `time-tracker`
  integration.

  Replaces the generic CnIntegrationTab for the `time-tracker` leaf:
  renders the NC TimeManager rows linked to the parent OR object as a
  flat list. TimeManager exposes THREE kinds of rows in the same
  payload (per wave-2.4 design — see `TimeProvider.php`); each row
  carries a `kind` discriminator (`'client'` | `'task'` | `'time'`)
  which this tab shows as a coloured chip alongside the title.

  Rows show:
    - client: name + linked-tasks count
    - task:   name + duration + billable indicator
    - time:   start time + duration + billable indicator

  Clicking a row deep-links to the TimeManager UI — own `url` field
  wins; otherwise the tab synthesises a sensible permalink per kind.

  Talks to the OpenRegister Tier-2 time-tracker link API
    GET    /api/objects/{register}/{schema}/{id}/time-tracker
    POST   /api/objects/{register}/{schema}/{id}/time-tracker          (link existing)
    POST   /api/objects/{register}/{schema}/{id}/time-tracker/new      (create + link client)
    DELETE /api/objects/{register}/{schema}/{id}/time-tracker/{entryId} (unlink)
  served by `OCA\OpenRegister\Controller\TimeTrackerLinksController`
  (link-table strategy — rows in `openregister_timetracker_links`; the
  `TimeProvider` still falls back to the legacy `[or:{uuid}]` note marker).

  Tier-2 surface: a Link/Create actions bar drives the
  CnTimeTrackerPicker (pick an existing entry) + CnTimeTrackerCreate
  (create a client) dialogs; each row has a per-row unlink button.

  Surface behaviour (per ADR-017 graceful degradation):
    - Empty state with "Open TimeManager" CTA when no linked rows.
    - Loading spinner during fetch.
    - 503 / 501 "currently unavailable" banner when TimeManager is down.
    - Generic error label when fetch throws.

  Bespoke-vs-generic rationale: the generic tab renders a flat link
  list which loses TimeManager's primary signals — *what kind of entity
  the row is*, its duration, and whether it's billable. Surfacing them
  inline lets case handlers triage tracked work at a glance without
  switching to TimeManager itself.

  Note: the leaf slug is `time-tracker` (with a hyphen); the underlying
  NC app id is `timemanager` (no hyphen).

  See `openregister/openspec/changes/integration-time-tracker/` for the
  spec delta, ADR-019 (registry mechanism), ADR-022 (sidebar tab
  contract), `openregister#1322` for provider follow-ups.
-->
<template>
	<div class="cn-sidebar-tab cn-time-tracker-tab">
		<div v-if="degraded" class="cn-time-tracker-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<div v-if="!degraded" class="cn-time-tracker-tab__actions">
			<NcButton type="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing entry') }}
			</NcButton>
			<NcButton type="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new client') }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-time-tracker-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="rows.length === 0" class="cn-sidebar-tab__empty cn-time-tracker-tab__empty">
			<Clock :size="32" class="cn-time-tracker-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openTimeTrackerApp">
				<template #icon>
					<Clock :size="20" />
				</template>
				{{ openTimeTrackerLabel }}
			</NcButton>
		</div>
		<template v-else>
			<div v-if="totalDurationLabel" class="cn-time-tracker-tab__summary">
				<span class="cn-time-tracker-tab__summary-label">
					<Timer :size="16" />
					{{ t('nextcloud-vue', 'Total tracked') }}
				</span>
				<span class="cn-time-tracker-tab__summary-value">{{ totalDurationLabel }}</span>
			</div>
			<ul class="cn-time-tracker-tab__list">
				<NcListItem
					v-for="row in rows"
					:key="rowKey(row)"
					class="cn-time-tracker-tab__row"
					:class="rowClass(row)"
					:name="rowTitle(row)"
					:bold="true"
					:href="rowUrl(row)"
					target="_blank"
					:force-display-actions="true">
					<template #icon>
						<span class="cn-time-tracker-tab__row-icon" :class="rowClass(row)">
							<ClipboardTextOutline v-if="rowKind(row) === 'task'" :size="22" />
							<AccountOutline v-else-if="rowKind(row) === 'client'" :size="22" />
							<ClockOutline v-else :size="22" />
						</span>
					</template>
					<template #subname>
						<span class="cn-time-tracker-tab__subline">
							<span class="cn-time-tracker-tab__kind-chip" :class="kindChipClass(row)">
								{{ kindLabel(row) }}
							</span>
							<NcDateTime
								v-if="startedAtMs(row) !== null"
								class="cn-time-tracker-tab__date"
								:timestamp="startedAtMs(row)"
								:relative-time="'short'" />
							<span v-else-if="taskCountLabel(row)" class="cn-time-tracker-tab__task-count">
								{{ taskCountLabel(row) }}
							</span>
						</span>
					</template>
					<template #details>
						<span v-if="durationLabel(row)" class="cn-time-tracker-tab__duration">
							{{ durationLabel(row) }}
						</span>
					</template>
					<template v-if="isBillable(row)" #indicator>
						<span class="cn-time-tracker-tab__billable" :title="billableTitle">
							<CurrencyEur :size="14" />
							{{ billableLabel }}
						</span>
					</template>
					<template #actions>
						<NcActionButton
							class="cn-time-tracker-tab__unlink"
							:close-after-click="true"
							@click="unlinkRow(row)">
							<template #icon>
								<LinkOff :size="20" />
							</template>
							{{ t('nextcloud-vue', 'Unlink entry') }}
						</NcActionButton>
					</template>
				</NcListItem>
			</ul>
		</template>

		<CnTimeTrackerPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnTimeTrackerCreate
			v-if="createOpen"
			:api-base="apiBase"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcDateTime, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AccountOutline from 'vue-material-design-icons/AccountOutline.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ClipboardTextOutline from 'vue-material-design-icons/ClipboardTextOutline.vue'
import Clock from 'vue-material-design-icons/Clock.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import CurrencyEur from 'vue-material-design-icons/CurrencyEur.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Timer from 'vue-material-design-icons/Timer.vue'
import CnTimeTrackerCreate from '../../../components/CnTimeTrackerCreate/CnTimeTrackerCreate.vue'
import CnTimeTrackerPicker from '../../../components/CnTimeTrackerPicker/CnTimeTrackerPicker.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnTimeTrackerTab — bespoke sidebar tab for the `time-tracker`
 * integration.
 *
 * Renders linked TimeManager clients / tasks / time entries with a
 * kind chip, duration, billable indicator. See file-level docblock.
 */
export default {
	name: 'CnTimeTrackerTab',

	components: {
		NcActionButton,
		NcButton,
		NcDateTime,
		NcListItem,
		NcLoadingIcon,
		AccountOutline,
		AlertCircleOutline,
		ClipboardTextOutline,
		Clock,
		ClockOutline,
		CurrencyEur,
		LinkOff,
		LinkVariant,
		Plus,
		Timer,
		CnTimeTrackerPicker,
		CnTimeTrackerCreate,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'time-tracker'`). */
		integrationId: { type: String, default: 'time-tracker' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No tracked time linked yet') },
		/** Pre-translated label for the "Open TimeManager" CTA. */
		openTimeTrackerLabel: { type: String, default: () => t('nextcloud-vue', 'Open TimeManager') },
		/** Pre-translated banner when TimeManager is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC TimeManager is currently unavailable.') },
		/** URL of the NC TimeManager app entry. */
		timeTrackerAppUrl: { type: String, default: '/index.php/apps/timemanager' },
		/** Pre-translated "billable" label. */
		billableLabel: { type: String, default: () => t('nextcloud-vue', 'Billable') },
	},

	data() {
		return {
			rows: [],
			loading: false,
			error: '',
			degraded: '',
			pickerOpen: false,
			createOpen: false,
			billableTitle: t('nextcloud-vue', 'This entry is marked as billable.'),
		}
	},

	computed: {
		/**
		 * Total tracked seconds across all linked rows that carry a
		 * `duration` (clients are parent containers and usually omit it).
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

		/**
		 * Human-readable total duration shown in the summary header, or
		 * empty when nothing tracked.
		 *
		 * @return {string} Formatted "Xh Ym" / "Ym" total.
		 */
		totalDurationLabel() {
			if (this.totalSeconds === 0) {
				return ''
			}
			return this.formatDuration(this.totalSeconds)
		},
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchRows() } } },
		register() { this.fetchRows() },
		schema() { this.fetchRows() },
	},

	methods: {
		t,

		/**
		 * Base for the Tier-2 time-tracker endpoints (list/link/new/destroy).
		 *
		 * @return {string} The endpoint URL.
		 */
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/time-tracker`
		},

		rowKey(row) {
			return row.id ?? row.uuid ?? row.data?.uuid ?? ''
		},

		rowTitle(row) {
			return row.title ?? row.name ?? this.rowKey(row)
		},

		/**
		 * Discriminator. Defaults to 'client' when the provider doesn't
		 * surface a `kind` field (the current shipping TimeProvider
		 * only returns projects-as-clients without an explicit kind).
		 *
		 * @param {object} row Provider row.
		 * @return {'client'|'task'|'time'} Row kind.
		 */
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
			return `cn-time-tracker-tab__kind-chip--${this.rowKind(row)}`
		},

		rowClass(row) {
			return `cn-time-tracker-tab__row--${this.rowKind(row)}`
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

		/**
		 * Total seconds carried on the row, normalised across the kind
		 * variants. Tasks/time entries usually carry `duration` as
		 * seconds (or minutes when explicitly suffixed).
		 *
		 * @param {object} row Provider row.
		 * @return {number|null} Seconds total or null if absent / unparseable.
		 */
		durationSeconds(row) {
			const raw = row.duration ?? row.seconds ?? row.data?.duration ?? null
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const num = Number(raw)
			return Number.isNaN(num) ? null : num
		},

		/**
		 * Format a seconds total as a compact "Xh Ym" / "Ym" duration.
		 *
		 * @param {number} seconds Total seconds.
		 * @return {string} Formatted duration.
		 */
		formatDuration(seconds) {
			const totalMinutes = Math.round(seconds / 60)
			const hours = Math.floor(totalMinutes / 60)
			const minutes = totalMinutes % 60
			if (hours > 0) {
				return `${hours}h ${minutes}m`
			}
			return `${minutes}m`
		},

		durationLabel(row) {
			const total = this.durationSeconds(row)
			if (total === null) {
				return ''
			}
			return this.formatDuration(total)
		},

		taskCountLabel(row) {
			if (this.rowKind(row) !== 'client') {
				return ''
			}
			const raw = row.tasks ?? row.taskCount ?? row.data?.task_count ?? null
			if (raw === null || raw === undefined) {
				return ''
			}
			const num = Number(raw)
			if (Number.isNaN(num)) {
				return ''
			}
			return t('nextcloud-vue', '{count} tasks', { count: num })
		},

		/**
		 * Start timestamp in milliseconds for the row, suitable for
		 * `NcDateTime`. Only time entries carry a start; returns null when
		 * absent or unparseable.
		 *
		 * @param {object} row Provider row.
		 * @return {number|null} Epoch milliseconds or null.
		 */
		startedAtMs(row) {
			if (this.rowKind(row) !== 'time') {
				return null
			}
			const raw = row.startedAt ?? row.started_at ?? row.start ?? row.data?.start ?? null
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const ms = typeof raw === 'number' ? raw * 1000 : Date.parse(raw)
			if (Number.isNaN(ms)) {
				return null
			}
			return ms
		},

		isBillable(row) {
			return row.billable === true || row.billable === 1 || row.billable === '1'
		},

		openTimeTrackerApp() {
			if (typeof window !== 'undefined') {
				window.open(this.timeTrackerAppUrl, '_blank', 'noopener')
			}
		},

		openPicker() {
			this.pickerOpen = true
		},

		openCreate() {
			this.createOpen = true
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.baseUrl(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchRows()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This entry is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link entry.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTimeTrackerTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link entry.')
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.baseUrl()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchRows()
				} else {
					this.error = t('nextcloud-vue', 'Could not create client.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTimeTrackerTab] create failed', err)
				this.error = t('nextcloud-vue', 'Could not create client.')
			}
		},

		async unlinkRow(row) {
			const id = this.rowKey(row)
			if (!id) {
				return
			}
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(id)}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchRows()
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink entry.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTimeTrackerTab] unlink failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink entry.')
			}
		},

		async fetchRows() {
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
					const rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
					this.rows = rows
				} else if (response.status === 503 || response.status === 501) {
					this.rows = []
					this.degraded = this.unavailableLabel
				} else {
					this.rows = []
					this.error = t('nextcloud-vue', 'Could not load tracked time.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTimeTrackerTab] failed to fetch rows', err)
				this.rows = []
				this.error = t('nextcloud-vue', 'Could not load tracked time.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-time-tracker-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 10px;
	flex-wrap: wrap;
}

.cn-time-tracker-tab__unlink {
	flex-shrink: 0;
}

.cn-time-tracker-tab__banner {
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

.cn-time-tracker-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-time-tracker-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-time-tracker-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-time-tracker-tab__summary {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 8px 12px;
	margin-bottom: 8px;
	border-radius: var(--border-radius-large, var(--border-radius));
	background: var(--color-background-hover);
}

.cn-time-tracker-tab__summary-label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-time-tracker-tab__summary-value {
	font-weight: 700;
	font-size: 1.15em;
	color: var(--color-main-text);
	font-variant-numeric: tabular-nums;
}

.cn-time-tracker-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-time-tracker-tab__row-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-time-tracker-tab__row-icon.cn-time-tracker-tab__row--client {
	background: var(--color-primary-element-light, var(--color-background-dark));
	color: var(--color-primary-element, #21468B);
}

.cn-time-tracker-tab__row-icon.cn-time-tracker-tab__row--task {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-time-tracker-tab__row-icon.cn-time-tracker-tab__row--time {
	background: var(--color-success, #46ba61);
	color: var(--color-main-background);
}

.cn-time-tracker-tab__subline {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;
}

.cn-time-tracker-tab__date,
.cn-time-tracker-tab__task-count {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-time-tracker-tab__kind-chip {
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

.cn-time-tracker-tab__kind-chip--client {
	background: var(--color-primary-element, #21468B);
	color: var(--color-main-background);
}

.cn-time-tracker-tab__kind-chip--task {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-time-tracker-tab__kind-chip--time {
	background: var(--color-success, #46ba61);
	color: var(--color-main-background);
}

.cn-time-tracker-tab__duration {
	font-weight: 700;
	font-size: 1.05em;
	color: var(--color-main-text);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.cn-time-tracker-tab__billable {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 1px 6px;
	border-radius: 8px;
	font-size: 0.72em;
	font-weight: 600;
	color: var(--color-main-background);
	background: var(--color-success, #46ba61);
	white-space: nowrap;
}
</style>
