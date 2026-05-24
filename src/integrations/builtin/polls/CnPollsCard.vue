<!--
  CnPollsCard — bespoke surface-aware widget for the `polls` integration.

  Replaces the generic CnIntegrationCard for the `polls` leaf. Branches
  on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N polls" + "M open"
        secondary line names the most-recent poll with its leading
        option (per integration-polls spec).
    - detail-page                    : compact list of linked polls
        with deadline countdown and a mini per-option bar set per row.
    - single-entity                  : chip with poll title + leading
        option indicator (referenceType: 'polls').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnPollsTab; for `single-entity` the optional `value` prop addresses a
  single poll by id (matching CnIntegrationCard's fetchSingle
  contract).

  See `openregister/openspec/changes/integration-polls/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-polls-card__chip" :title="chipSubtitle(entity)">
				<Poll :size="14" />
				<a
					:href="pollUrl(entity)"
					target="_blank"
					rel="noopener">{{ pollTitle(entity) }}</a>
				<span v-if="leadingOption(entity)" class="cn-polls-card__chip-leader">
					· {{ leadingOption(entity) }}
				</span>
			</span>
			<span v-else class="cn-polls-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-polls-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="polls.length === 0" class="cn-polls-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-polls-card__headline">
				<div class="cn-polls-card__headline-line">
					<strong>{{ countHeadline }}</strong>
				</div>
				<div v-if="mostRecent" class="cn-polls-card__headline-recent">
					<Poll :size="14" />
					<a
						:href="pollUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ pollTitle(mostRecent) }}</a>
					<span v-if="leadingOption(mostRecent)" class="cn-polls-card__headline-leader">
						· {{ leadingOption(mostRecent) }}
					</span>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact list -->
		<template v-else>
			<div v-if="degraded" class="cn-polls-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="polls.length === 0" class="cn-polls-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-polls-card__list">
				<li
					v-for="poll in displayedPolls"
					:key="pollKey(poll)"
					class="cn-polls-card__row"
					:class="{ 'cn-polls-card__row--closed': isClosed(poll) }">
					<div class="cn-polls-card__row-header">
						<Poll :size="16" class="cn-polls-card__row-icon" />
						<a
							:href="pollUrl(poll)"
							target="_blank"
							rel="noopener"
							class="cn-polls-card__title">{{ pollTitle(poll) }}</a>
					</div>
					<span v-if="rowMeta(poll)" class="cn-polls-card__subtitle">{{ rowMeta(poll) }}</span>
					<ul v-if="pollOptions(poll).length > 0" class="cn-polls-card__options">
						<li
							v-for="opt in pollOptions(poll)"
							:key="optionKey(opt)"
							class="cn-polls-card__option">
							<div class="cn-polls-card__option-label">
								<span class="cn-polls-card__option-text">{{ optionLabel(opt) }}</span>
								<span class="cn-polls-card__option-count">{{ optionPercent(poll, opt) }}%</span>
							</div>
							<div
								class="cn-polls-card__option-bar"
								role="progressbar"
								:aria-valuenow="optionPercent(poll, opt)"
								aria-valuemin="0"
								aria-valuemax="100">
								<div
									class="cn-polls-card__option-bar-fill"
									:style="{ width: optionPercent(poll, opt) + '%' }" />
							</div>
						</li>
					</ul>
				</li>
			</ul>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import Poll from 'vue-material-design-icons/Poll.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * CnPollsCard — bespoke surface-aware widget for the `polls` integration.
 *
 * Renders Polls-aware metadata across all four surfaces. See the
 * file-level docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnPollsCard',

	components: { CnDetailCard, NcLoadingIcon, Poll },

	props: {
		/** Stable integration id (forwarded from the registry — always `'polls'`). */
		integrationId: { type: String, default: 'polls' },
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
		/** Optional single-entity reference (poll id). */
		value: { type: String, default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Polls') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => Poll },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No polls linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Polls is currently unavailable.') },
		/** URL of the NC Polls app entry. */
		pollsAppUrl: { type: String, default: '/index.php/apps/polls' },
	},

	data() {
		return {
			polls: [],
			entity: null,
			loading: false,
			degraded: '',
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		displayedPolls() {
			if (this.surface === 'user-dashboard' || this.surface === 'app-dashboard') {
				return this.polls.slice(0, COMPACT_LIMIT)
			}
			return this.polls
		},

		openCount() {
			return this.polls.reduce((sum, p) => sum + (this.isClosed(p) ? 0 : 1), 0)
		},

		countHeadline() {
			const total = this.polls.length
			const open = this.openCount
			if (open === 0) {
				return n('nextcloud-vue', '{count} poll (all closed)', '{count} polls (all closed)', total, { count: total })
			}
			const totalFragment = n('nextcloud-vue', '{count} poll', '{count} polls', total, { count: total })
			const openFragment = n('nextcloud-vue', '{count} open', '{count} open', open, { count: open })
			return `${totalFragment} · ${openFragment}`
		},

		mostRecent() {
			if (this.polls.length === 0) {
				return null
			}
			// Sort defensive copy by deadline / created desc.
			const sorted = [...this.polls].sort((a, b) => {
				const ta = this.sortTimestamp(a)
				const tb = this.sortTimestamp(b)
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

		pollKey(poll) {
			return poll.id ?? poll.reference ?? ''
		},

		pollTitle(poll) {
			const raw = poll.title ?? poll.name ?? this.pollKey(poll)
			return String(raw).replace(/\s*\[or:[^\]]+\]\s*/g, '').trim() || String(raw)
		},

		pollUrl(poll) {
			if (poll.url) {
				return poll.url
			}
			const id = poll.id ?? ''
			return id ? `/index.php/apps/polls/vote/${id}` : this.pollsAppUrl
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
			const c = Number(opt.votes ?? opt.count ?? opt.voteCount ?? 0)
			return Number.isFinite(c) ? c : 0
		},

		totalVotes(poll) {
			return this.pollOptions(poll).reduce((sum, o) => sum + this.optionCount(o), 0)
		},

		optionPercent(poll, opt) {
			const total = this.totalVotes(poll)
			if (total <= 0) {
				return 0
			}
			return Math.round((this.optionCount(opt) / total) * 100)
		},

		leadingOption(poll) {
			const opts = this.pollOptions(poll)
			if (opts.length === 0) {
				return ''
			}
			let best = opts[0]
			for (const o of opts) {
				if (this.optionCount(o) > this.optionCount(best)) {
					best = o
				}
			}
			if (this.optionCount(best) === 0) {
				return ''
			}
			return `${this.optionLabel(best)} (${this.optionPercent(poll, best)}%)`
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
				return v < 1e12 ? v * 1000 : v
			}
			const parsed = Date.parse(String(v))
			return Number.isNaN(parsed) === true ? null : parsed
		},

		sortTimestamp(poll) {
			const d = this.deadlineMs(poll)
			if (d !== null) {
				return d
			}
			const c = Number(poll.created ?? 0)
			return Number.isFinite(c) ? (c < 1e12 ? c * 1000 : c) : 0
		},

		isClosed(poll) {
			const ms = this.deadlineMs(poll)
			if (ms === null) {
				return poll.closed === true || poll.status === 'closed'
			}
			return ms <= Date.now()
		},

		rowMeta(poll) {
			if (this.isClosed(poll)) {
				return t('nextcloud-vue', 'Closed')
			}
			const ms = this.deadlineMs(poll)
			if (ms === null) {
				return ''
			}
			const diff = ms - Date.now()
			const days = Math.ceil(diff / MS_PER_DAY)
			if (days <= 1) {
				const hours = Math.max(1, Math.ceil(diff / (60 * 60 * 1000)))
				return t('nextcloud-vue', 'Closes in {n} hours', { n: hours })
			}
			return t('nextcloud-vue', 'Closes in {n} days', { n: days })
		},

		chipSubtitle(poll) {
			return this.leadingOption(poll) || this.pollTitle(poll)
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
					this.polls = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.polls = []
					this.degraded = this.unavailableLabel
				} else {
					this.polls = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPollsCard] failed to fetch polls', err)
				this.polls = []
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
				console.error('[CnPollsCard] failed to fetch single poll', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-polls-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-polls-card__headline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-polls-card__headline-line {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-polls-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-polls-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-polls-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-polls-card__headline-leader {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-polls-card__chip {
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

.cn-polls-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-polls-card__chip a:hover {
	text-decoration: underline;
}

.cn-polls-card__chip-leader {
	color: var(--color-text-maxcontrast);
}

.cn-polls-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-polls-card__row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-polls-card__row:last-child {
	border-bottom: none;
}

.cn-polls-card__row--closed {
	opacity: 0.85;
}

.cn-polls-card__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-polls-card__row-icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-polls-card__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-polls-card__title:hover {
	text-decoration: underline;
}

.cn-polls-card__subtitle {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	padding-left: 24px;
}

.cn-polls-card__options {
	list-style: none;
	margin: 2px 0 0;
	padding: 0 0 0 24px;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-polls-card__option {
	display: flex;
	flex-direction: column;
	gap: 1px;
}

.cn-polls-card__option-label {
	display: flex;
	justify-content: space-between;
	gap: 6px;
	font-size: 0.8em;
}

.cn-polls-card__option-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
}

.cn-polls-card__option-count {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
}

.cn-polls-card__option-bar {
	height: 4px;
	border-radius: 2px;
	background: var(--color-background-dark);
	overflow: hidden;
}

.cn-polls-card__option-bar-fill {
	height: 100%;
	background: var(--color-primary-element, #21468B);
	transition: width 0.2s ease;
}
</style>
