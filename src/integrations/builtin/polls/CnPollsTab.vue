<!--
  CnPollsTab — bespoke sidebar tab for the `polls` integration.

  Replaces the generic CnIntegrationTab for the `polls` leaf: renders a
  live vote tally for each linked NC Polls poll, mirroring the real NC
  Polls list look. Each row foregrounds a poll-type icon (text vs date
  poll), the bold poll question/title, an open / closed status chip
  (CnStatusBadge), a meta line with participant + option counts, a
  relative expiry (NcDateTime) when a deadline is present, and a
  per-option vote-tally progress bar. A trailing "Open in Polls" action
  per row deep-links to `/index.php/apps/polls/vote/{id}`.

  Tier-2 surface (this commit):
    - "Link existing poll"   → opens CnPollPicker (modal)
    - "Create new poll"      → opens CnPollCreate (modal)
    - Per-row unlink         → DELETE …/polls/{pollId}

  Talks to the OpenRegister Tier-2 poll-link endpoints
    GET     /api/objects/{r}/{s}/{id}/polls          — list
    POST    /api/objects/{r}/{s}/{id}/polls          — link existing
    POST    /api/objects/{r}/{s}/{id}/polls/new      — create + link
    DELETE  /api/objects/{r}/{s}/{id}/polls/{pollId} — unlink
    GET     /api/integrations/polls/available        — picker source
  served by `OCA\OpenRegister\Controller\PollLinksController`.

  Surface behaviour:
    - Empty state with "Open Polls" CTA when no linked polls.
    - Loading + 503 "currently unavailable" + generic error states match
      CnIntegrationTab's behaviour for AD-23 graceful degradation.

  See `openregister/openspec/changes/integration-polls/` for the spec
  delta and ADR-019 (registry mechanism).
-->
<template>
	<div class="cn-sidebar-tab cn-polls-tab">
		<div v-if="degraded" class="cn-polls-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<div class="cn-polls-tab__actions">
			<NcButton variant="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing poll') }}
			</NcButton>
			<NcButton variant="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new poll') }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-polls-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="polls.length === 0" class="cn-sidebar-tab__empty cn-polls-tab__empty">
			<Poll :size="32" class="cn-polls-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton variant="primary" @click="openPollsApp">
				<template #icon>
					<Poll :size="20" />
				</template>
				{{ openPollsLabel }}
			</NcButton>
		</div>
		<ul v-else class="cn-polls-tab__list">
			<li
				v-for="poll in polls"
				:key="pollKey(poll)"
				class="cn-polls-tab__row"
				:class="{ 'cn-polls-tab__row--closed': isClosed(poll) }">
				<div class="cn-polls-tab__row-header">
					<span class="cn-polls-tab__row-icon" :title="typeLabel(poll)" :aria-label="typeLabel(poll)">
						<CalendarRange v-if="isDatePoll(poll)" :size="20" />
						<FormatListChecks v-else :size="20" />
					</span>
					<a
						:href="pollUrl(poll)"
						target="_blank"
						rel="noopener"
						class="cn-polls-tab__title">{{ pollTitle(poll) }}</a>
					<CnStatusBadge
						:label="statusLabel(poll)"
						:variant="statusVariant(poll)"
						size="small"
						class="cn-polls-tab__status" />
					<NcButton
						type="tertiary-no-background"
						:aria-label="t('nextcloud-vue', 'Unlink poll')"
						class="cn-polls-tab__unlink"
						@click="unlinkPoll(poll)">
						<template #icon>
							<LinkOff :size="18" />
						</template>
					</NcButton>
				</div>

				<div class="cn-polls-tab__meta">
					<span class="cn-polls-tab__meta-item">
						<AccountMultiple :size="14" class="cn-polls-tab__meta-icon" />
						<span>{{ voterMetaLabel(poll) }}</span>
					</span>
					<span v-if="pollOptions(poll).length > 0" class="cn-polls-tab__meta-item">
						<FormatListBulleted :size="14" class="cn-polls-tab__meta-icon" />
						<span>{{ optionMetaLabel(poll) }}</span>
					</span>
					<span v-if="deadlineMs(poll) !== null" class="cn-polls-tab__meta-item">
						<ClockOutline :size="14" class="cn-polls-tab__meta-icon" />
						<NcDateTime
							class="cn-polls-tab__time"
							:timestamp="deadlineMs(poll)"
							:relative-time="'short'" />
					</span>
				</div>

				<ul v-if="pollOptions(poll).length > 0" class="cn-polls-tab__options">
					<li
						v-for="opt in pollOptions(poll)"
						:key="optionKey(opt)"
						class="cn-polls-tab__option">
						<div class="cn-polls-tab__option-label">
							<span class="cn-polls-tab__option-text">{{ optionLabel(opt) }}</span>
							<span class="cn-polls-tab__option-count">
								{{ optionCount(opt) }} ({{ optionPercent(poll, opt) }}%)
							</span>
						</div>
						<div
							class="cn-polls-tab__option-bar"
							role="progressbar"
							:aria-valuenow="optionPercent(poll, opt)"
							aria-valuemin="0"
							aria-valuemax="100">
							<div
								class="cn-polls-tab__option-bar-fill"
								:style="{ width: optionPercent(poll, opt) + '%' }" />
						</div>
					</li>
				</ul>
				<div v-if="pollDescription(poll)" class="cn-polls-tab__description">
					{{ pollDescription(poll) }}
				</div>
			</li>
		</ul>

		<CnPollPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnPollCreate
			v-if="createOpen"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDateTime, NcLoadingIcon } from '@nextcloud/vue'
import AccountMultiple from 'vue-material-design-icons/AccountMultiple.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import CalendarRange from 'vue-material-design-icons/CalendarRange.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import FormatListChecks from 'vue-material-design-icons/FormatListChecks.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Poll from 'vue-material-design-icons/Poll.vue'
import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import CnPollCreate from '../../../components/CnPollCreate/CnPollCreate.vue'
import CnPollPicker from '../../../components/CnPollPicker/CnPollPicker.vue'
import { buildHeaders } from '../../../utils/index.js'
import { stripMarker } from '../../utils/marker.js'

/**
 * CnPollsTab — bespoke live-tally list for the `polls` integration.
 *
 * Renders rows pulled from the OR pluggable-integration endpoint that
 * mirror the real NC Polls list: type icon, bold question, open/closed
 * status chip, participant + option counts, a relative expiry, and
 * per-option vote-tally progress bars. Tier-2: includes link/create
 * modals and per-row unlink.
 */
export default {
	name: 'CnPollsTab',

	components: {
		NcButton,
		NcDateTime,
		NcLoadingIcon,
		CnStatusBadge,
		AccountMultiple,
		AlertCircleOutline,
		CalendarRange,
		ClockOutline,
		FormatListBulleted,
		FormatListChecks,
		LinkOff,
		LinkVariant,
		Plus,
		Poll,
		CnPollPicker,
		CnPollCreate,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'polls'`). */
		integrationId: { type: String, default: 'polls' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No polls linked yet') },
		/** Pre-translated label for the "Open in Polls" CTA. */
		openPollsLabel: { type: String, default: () => t('nextcloud-vue', 'Open Polls') },
		/** Pre-translated banner when Polls is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Polls is currently unavailable.') },
		/** URL of the NC Polls app entry. */
		pollsAppUrl: { type: String, default: '/index.php/apps/polls' },
	},

	data() {
		return {
			polls: [],
			loading: false,
			error: '',
			degraded: '',
			pickerOpen: false,
			createOpen: false,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchPolls() } } },
		register() { this.fetchPolls() },
		schema() { this.fetchPolls() },
	},

	methods: {
		t,

		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		/**
		 * Base for the Tier-2 polls endpoints (link/new/destroy).
		 *
		 * @return {string}
		 */
		pollsEndpoint() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/polls`
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
				const response = await fetch(this.pollsEndpoint(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchPolls()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This poll is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link poll.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPollsTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link poll.')
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.pollsEndpoint()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchPolls()
				} else {
					this.error = t('nextcloud-vue', 'Could not create poll.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPollsTab] create failed', err)
				this.error = t('nextcloud-vue', 'Could not create poll.')
			}
		},

		async unlinkPoll(poll) {
			const pollId = this.pollKey(poll)
			if (!pollId) {
				return
			}
			try {
				const response = await fetch(`${this.pollsEndpoint()}/${pollId}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchPolls()
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink poll.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPollsTab] unlink failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink poll.')
			}
		},

		pollKey(poll) {
			return poll.pollId ?? poll.id ?? poll.reference ?? ''
		},

		pollTitle(poll) {
			const raw = poll.title ?? poll.pollTitle ?? poll.name ?? this.pollKey(poll)
			// Strip any legacy `[or:{uuid}]` marker from displayed title
			// via the shared helper (ADR-019).
			return stripMarker(raw) || String(raw)
		},

		pollDescription(poll) {
			return stripMarker(poll.description)
		},

		pollUrl(poll) {
			if (poll.url) {
				return poll.url
			}
			const id = this.pollKey(poll)
			return id ? `/index.php/apps/polls/vote/${id}` : this.pollsAppUrl
		},

		pollType(poll) {
			return poll.type ?? poll.pollType ?? ''
		},

		isDatePoll(poll) {
			const type = String(this.pollType(poll)).toLowerCase()
			return type.indexOf('date') !== -1
		},

		typeLabel(poll) {
			return this.isDatePoll(poll)
				? t('nextcloud-vue', 'Date poll')
				: t('nextcloud-vue', 'Text poll')
		},

		pollOptions(poll) {
			const opts = poll.options ?? poll.results ?? poll.optionResults ?? []
			return Array.isArray(opts) ? opts : []
		},

		optionKey(opt) {
			return opt.id ?? opt.key ?? opt.text ?? ''
		},

		optionLabel(opt) {
			return opt.text ?? opt.label ?? opt.name ?? String(this.optionKey(opt))
		},

		optionCount(opt) {
			const n = Number(opt.votes ?? opt.count ?? opt.voteCount ?? 0)
			return Number.isFinite(n) ? n : 0
		},

		optionPercent(poll, opt) {
			const total = this.totalVotes(poll)
			if (total <= 0) {
				return 0
			}
			return Math.round((this.optionCount(opt) / total) * 100)
		},

		totalVotes(poll) {
			return this.pollOptions(poll).reduce((sum, o) => sum + this.optionCount(o), 0)
		},

		voterCount(poll) {
			const n = Number(poll.voterCount ?? poll.voters ?? poll.participants ?? 0)
			return Number.isFinite(n) && n > 0 ? n : this.totalVotes(poll)
		},

		voterMetaLabel(poll) {
			const voters = this.voterCount(poll)
			return t('nextcloud-vue', '{n} participants', { n: voters })
		},

		optionMetaLabel(poll) {
			const count = this.pollOptions(poll).length
			return t('nextcloud-vue', '{n} options', { n: count })
		},

		deadline(poll) {
			return poll.deadline ?? poll.expire ?? poll.expiresAt ?? null
		},

		deadlineMs(poll) {
			const v = this.deadline(poll)
			if (v === null || v === undefined || v === '') {
				return null
			}
			if (typeof v === 'number') {
				// Treat as unix seconds when it's small enough to be a 10-digit epoch.
				return v < 1e12 ? v * 1000 : v
			}
			const parsed = Date.parse(String(v))
			return Number.isNaN(parsed) === true ? null : parsed
		},

		isClosed(poll) {
			const ms = this.deadlineMs(poll)
			if (ms === null) {
				// Without a deadline, fall back to a `closed` flag if present.
				return poll.closed === true || poll.status === 'closed'
			}
			return ms <= Date.now()
		},

		statusLabel(poll) {
			return this.isClosed(poll)
				? t('nextcloud-vue', 'Closed')
				: t('nextcloud-vue', 'Open')
		},

		statusVariant(poll) {
			return this.isClosed(poll) ? 'default' : 'success'
		},

		openPollsApp() {
			if (typeof window !== 'undefined') {
				window.open(this.pollsAppUrl, '_blank', 'noopener')
			}
		},

		async fetchPolls() {
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
					this.polls = rows
				} else if (response.status === 503) {
					this.polls = []
					this.degraded = this.unavailableLabel
				} else {
					this.polls = []
					this.error = t('nextcloud-vue', 'Could not load polls.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPollsTab] failed to fetch polls', err)
				this.polls = []
				this.error = t('nextcloud-vue', 'Could not load polls.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-polls-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
	flex-wrap: wrap;
}

.cn-polls-tab__banner {
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

.cn-polls-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-polls-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-polls-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-polls-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-polls-tab__row {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 10px;
	border-radius: var(--border-radius-large, 8px);
	border-left: 3px solid var(--color-primary-element);
	background: var(--color-background-hover);
}

.cn-polls-tab__row--closed {
	border-left-color: var(--color-border-dark, var(--color-border));
	background: transparent;
	opacity: 0.78;
}

.cn-polls-tab__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-polls-tab__row-icon {
	display: inline-flex;
	color: var(--color-primary-element);
	flex-shrink: 0;
}

.cn-polls-tab__row--closed .cn-polls-tab__row-icon {
	color: var(--color-text-maxcontrast);
}

.cn-polls-tab__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 600;
}

a.cn-polls-tab__title:hover {
	text-decoration: underline;
}

.cn-polls-tab__status {
	flex-shrink: 0;
}

.cn-polls-tab__unlink {
	flex-shrink: 0;
}

.cn-polls-tab__meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px;
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	padding-left: 28px;
}

.cn-polls-tab__meta-item {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.cn-polls-tab__meta-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
}

.cn-polls-tab__time {
	font-size: 1em;
	color: var(--color-text-maxcontrast);
}

.cn-polls-tab__options {
	list-style: none;
	margin: 4px 0 0;
	padding: 0 0 0 28px;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-polls-tab__option {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-polls-tab__option-label {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 0.85em;
}

.cn-polls-tab__option-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
}

.cn-polls-tab__option-count {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
}

.cn-polls-tab__option-bar {
	height: 6px;
	border-radius: 3px;
	background: var(--color-background-dark);
	overflow: hidden;
}

.cn-polls-tab__option-bar-fill {
	height: 100%;
	background: var(--color-primary-element, #21468B);
	transition: width 0.2s ease;
}

.cn-polls-tab__description {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	padding-left: 28px;
}
</style>
