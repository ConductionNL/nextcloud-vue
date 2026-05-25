<!--
  CnDeckTab — bespoke sidebar tab for the `deck` integration.

  Replaces the generic CnIntegrationTab for the `deck` leaf: renders a
  kanban-mini view of the cards linked to the parent OR object, grouped
  by stack ("To Do" / "Doing" / "Done" or whatever stacks the cards live
  in). Each card row shows title, optional due date, and optional label
  chips. Clicking a row deep-links to the card in NC Deck.

  Talks to the OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/deck`
  served by `OCA\OpenRegister\Service\Integration\Providers\DeckProvider`
  (which delegates to `OCA\OpenRegister\Service\DeckCardService`).

  Surface behaviour (per ADR-017 graceful degradation):
    - Empty state with "Open Deck" CTA when no linked cards.
    - Loading spinner during fetch.
    - 503 "currently unavailable" banner when Deck is down.
    - Generic error label when fetch throws.

  Bespoke-vs-generic rationale: the generic tab renders a flat link list
  which loses Deck's primary signal — *where the card sits in the
  workflow* (stack name). Grouping by stack reproduces the kanban affordance
  inline so case handlers can see "card X is in Doing" at a glance.

  See `openregister/openspec/changes/integration-deck/` for the spec
  delta, ADR-019 (registry mechanism) and ADR-022 (sidebar tab contract).
-->
<template>
	<div class="cn-sidebar-tab cn-deck-tab">
		<div v-if="degraded" class="cn-deck-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<div class="cn-deck-tab__actions">
			<NcButton type="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing card') }}
			</NcButton>
			<NcButton type="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new card') }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-deck-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="cards.length === 0" class="cn-sidebar-tab__empty cn-deck-tab__empty">
			<ViewColumnOutline :size="32" class="cn-deck-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openDeckApp">
				<template #icon>
					<ViewColumnOutline :size="20" />
				</template>
				{{ openDeckLabel }}
			</NcButton>
		</div>
		<div v-else class="cn-deck-tab__kanban">
			<section
				v-for="stack in stackColumns"
				:key="stack.key"
				class="cn-deck-tab__column">
				<header class="cn-deck-tab__column-header">
					<span class="cn-deck-tab__column-title">{{ stack.label }}</span>
					<span class="cn-deck-tab__column-count">{{ stack.cards.length }}</span>
				</header>
				<ul class="cn-deck-tab__column-list">
					<li
						v-for="card in stack.cards"
						:key="cardKey(card)"
						class="cn-deck-tab__card"
						:class="{ 'cn-deck-tab__card--overdue': isOverdue(card) }">
						<!-- Colored label strip along the top edge, like a real Deck card. -->
						<div v-if="cardLabels(card).length > 0" class="cn-deck-tab__card-labels">
							<span
								v-for="label in cardLabels(card)"
								:key="label.id || label.title"
								class="cn-deck-tab__chip"
								:style="chipStyle(label)"
								:title="chipText(label)">
								{{ chipText(label) }}
							</span>
						</div>

						<!-- Board / stack context badge above the title. -->
						<span v-if="boardBadge(card)" class="cn-deck-tab__card-board">
							<ViewColumnOutline :size="12" />
							{{ boardBadge(card) }}
						</span>

						<a
							:href="cardUrl(card)"
							target="_blank"
							rel="noopener"
							class="cn-deck-tab__card-title">{{ cardTitle(card) }}</a>

						<!-- Footer: due-date chip + assignee avatars, like Deck's card footer. -->
						<div
							v-if="dueLabel(card) || cardAssignees(card).length > 0"
							class="cn-deck-tab__card-footer">
							<CnStatusBadge
								v-if="dueLabel(card)"
								:label="dueLabel(card)"
								:variant="dueVariant(card)"
								size="small">
								<template #icon>
									<ClockOutline :size="12" class="cn-deck-tab__due-icon" />
								</template>
							</CnStatusBadge>
							<div
								v-if="cardAssignees(card).length > 0"
								class="cn-deck-tab__avatars">
								<NcAvatar
									v-for="assignee in visibleAssignees(card)"
									:key="assigneeKey(assignee)"
									class="cn-deck-tab__avatar"
									:size="24"
									:display-name="assigneeName(assignee)"
									:user="assigneeSeed(assignee)"
									:is-no-user="true"
									:disable-menu="true"
									:disable-tooltip="false"
									:show-user-status="false" />
								<span
									v-if="assigneeOverflow(card) > 0"
									class="cn-deck-tab__avatar-overflow"
									:title="overflowTitle(card)">+{{ assigneeOverflow(card) }}</span>
							</div>
						</div>
					</li>
				</ul>
			</section>
		</div>

		<CnDeckCardPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnDeckCardCreate
			v-if="createOpen"
			:api-base="apiBase"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcAvatar, NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import CnDeckCardCreate from '../../../components/CnDeckCardCreate/CnDeckCardCreate.vue'
import CnDeckCardPicker from '../../../components/CnDeckCardPicker/CnDeckCardPicker.vue'
import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import { buildHeaders } from '../../../utils/index.js'

/** Maximum assignee avatars shown before collapsing the rest into a +N overflow badge. */
const MAX_VISIBLE_ASSIGNEES = 3

/**
 * CnDeckTab — kanban-mini sidebar tab for the `deck` integration.
 *
 * Groups linked cards by stack so case handlers see workflow position
 * inline; deep-links to NC Deck for editing. See file-level docblock
 * for surface behaviour.
 */
export default {
	name: 'CnDeckTab',

	components: {
		NcAvatar,
		NcButton,
		NcLoadingIcon,
		AlertCircleOutline,
		ClockOutline,
		LinkVariant,
		Plus,
		ViewColumnOutline,
		CnDeckCardPicker,
		CnDeckCardCreate,
		CnStatusBadge,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'deck'`). */
		integrationId: { type: String, default: 'deck' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No cards linked yet') },
		/** Pre-translated label for the "Open Deck" CTA. */
		openDeckLabel: { type: String, default: () => t('nextcloud-vue', 'Open Deck') },
		/** Pre-translated banner when Deck is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Deck is currently unavailable.') },
		/** URL of the NC Deck app entry. */
		deckAppUrl: { type: String, default: '/index.php/apps/deck' },
	},

	data() {
		return {
			cards: [],
			loading: false,
			error: '',
			degraded: '',
			pickerOpen: false,
			createOpen: false,
		}
	},

	computed: {
		/**
		 * Cards grouped by stack — preserves stack order via first-seen ordering.
		 *
		 * Each column is `{ key, label, cards: [] }`. The `key` is the
		 * numeric stack id (or 'unstacked' for cards without one); the
		 * `label` is the stack title when the provider returned one,
		 * otherwise a placeholder.
		 *
		 * @return {Array<{key: string, label: string, cards: Array}>}
		 */
		stackColumns() {
			const groups = new Map()
			for (const card of this.cards) {
				const stackId = card.stackId ?? card.stack?.id ?? 'unstacked'
				const stackLabel = card.stackTitle
					?? card.stack?.title
					?? (stackId === 'unstacked'
						? t('nextcloud-vue', 'No stack')
						: t('nextcloud-vue', 'Stack {n}', { n: stackId }))
				const key = String(stackId)
				if (!groups.has(key)) {
					groups.set(key, { key, label: stackLabel, cards: [] })
				}
				groups.get(key).cards.push(card)
			}
			return Array.from(groups.values())
		},
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchCards() } } },
		register() { this.fetchCards() },
		schema() { this.fetchCards() },
	},

	methods: {
		t,

		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		/**
		 * Base for the Tier-2 deck endpoints (link/new). The provider's
		 * generic `/integrations/deck` surface accepts the same POST
		 * shape, but the bespoke Tier-2 routes are nicer for the
		 * picker's `/deck/new` create-flow.
		 *
		 * @return {string}
		 */
		deckEndpoint() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/deck`
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
				const response = await fetch(this.deckEndpoint(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchCards()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This card is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link card.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnDeckTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link card.')
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.deckEndpoint()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchCards()
				} else {
					this.error = t('nextcloud-vue', 'Could not create card.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnDeckTab] create failed', err)
				this.error = t('nextcloud-vue', 'Could not create card.')
			}
		},

		cardKey(card) {
			return card.cardId ?? card.id ?? ''
		},

		cardTitle(card) {
			return card.cardTitle ?? card.title ?? this.cardKey(card)
		},

		cardUrl(card) {
			if (card.url) {
				return card.url
			}
			const boardId = card.boardId ?? card.board?.id ?? ''
			const cardId = card.cardId ?? card.id ?? ''
			if (boardId && cardId) {
				return `/index.php/apps/deck/board/${boardId}/card/${cardId}`
			}
			return this.deckAppUrl
		},

		cardLabels(card) {
			const labels = card.labels ?? card.tags ?? []
			return Array.isArray(labels) ? labels : []
		},

		chipText(label) {
			if (typeof label === 'string') {
				return label
			}
			return label.title ?? label.name ?? ''
		},

		chipStyle(label) {
			if (typeof label === 'object' && label.color) {
				const colour = String(label.color)
				const fill = colour.startsWith('#') ? colour : `#${colour}`
				return { background: fill, color: this.readableTextColour(fill) }
			}
			return {}
		},

		/**
		 * Pick black or white text for a hex background so Deck's coloured
		 * label chips stay legible (per-channel luminance, ITU-R BT.601).
		 *
		 * @param {string} hex background colour, e.g. `#31cc7c`
		 * @return {string} `#000000` or `#ffffff`
		 */
		readableTextColour(hex) {
			const clean = hex.replace('#', '')
			const full = clean.length === 3
				? clean.split('').map((c) => c + c).join('')
				: clean
			if (full.length < 6) {
				return '#ffffff'
			}
			const r = parseInt(full.slice(0, 2), 16)
			const g = parseInt(full.slice(2, 4), 16)
			const b = parseInt(full.slice(4, 6), 16)
			const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
			return luminance > 0.6 ? '#000000' : '#ffffff'
		},

		isOverdue(card) {
			const due = card.duedate ?? card.dueDate ?? null
			if (!due) {
				return false
			}
			const date = new Date(due)
			if (Number.isNaN(date.getTime())) {
				return false
			}
			return date.getTime() < Date.now()
		},

		dueLabel(card) {
			const due = card.duedate ?? card.dueDate ?? null
			if (!due) {
				return ''
			}
			const date = new Date(due)
			if (Number.isNaN(date.getTime())) {
				return ''
			}
			return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
		},

		/**
		 * Status-badge variant for the due-date chip: red when overdue,
		 * neutral otherwise — mirrors Deck's own overdue-date highlight.
		 *
		 * @param {object} card the card row
		 * @return {string} CnStatusBadge variant
		 */
		dueVariant(card) {
			return this.isOverdue(card) ? 'error' : 'default'
		},

		/**
		 * Short board/stack context label rendered as a badge above the
		 * title — the "where does this card live" signal a real Deck card
		 * carries via its board colour bar + stack column.
		 *
		 * @param {object} card the card row
		 * @return {string} board (or board · stack) label, or '' when unknown
		 */
		boardBadge(card) {
			const board = card.boardTitle ?? card.board?.title ?? ''
			const stack = card.stackTitle ?? card.stack?.title ?? ''
			if (board && stack) {
				return `${board} · ${stack}`
			}
			return board || stack || ''
		},

		/**
		 * Normalised assignee list for a card. Accepts Deck's
		 * `assignedUsers` (objects with a nested `participant`) as well as
		 * a plain `assignees` array of strings/objects.
		 *
		 * @param {object} card the card row
		 * @return {Array} assignee entries
		 */
		cardAssignees(card) {
			const raw = card.assignedUsers ?? card.assignees ?? card.users ?? []
			return Array.isArray(raw) ? raw : []
		},

		/**
		 * The first {@link MAX_VISIBLE_ASSIGNEES} assignees to render as
		 * avatars; the remainder collapse into a +N overflow badge.
		 *
		 * @param {object} card the card row
		 * @return {Array} visible assignee entries
		 */
		visibleAssignees(card) {
			return this.cardAssignees(card).slice(0, MAX_VISIBLE_ASSIGNEES)
		},

		/**
		 * Count of assignees hidden behind the +N overflow badge.
		 *
		 * @param {object} card the card row
		 * @return {number} overflow count (0 when all fit)
		 */
		assigneeOverflow(card) {
			const extra = this.cardAssignees(card).length - MAX_VISIBLE_ASSIGNEES
			return extra > 0 ? extra : 0
		},

		/**
		 * Tooltip listing the assignees collapsed into the overflow badge.
		 *
		 * @param {object} card the card row
		 * @return {string} comma-separated overflow assignee names
		 */
		overflowTitle(card) {
			return this.cardAssignees(card)
				.slice(MAX_VISIBLE_ASSIGNEES)
				.map((a) => this.assigneeName(a))
				.join(', ')
		},

		/**
		 * Unwrap an assignee entry to its participant payload — Deck nests
		 * the user under `participant`; flat shapes pass through.
		 *
		 * @param {object|string} assignee raw assignee entry
		 * @return {object} normalised participant object
		 */
		assigneeParticipant(assignee) {
			if (typeof assignee === 'string') {
				return { uid: assignee, displayname: assignee }
			}
			return assignee.participant ?? assignee
		},

		assigneeName(assignee) {
			const p = this.assigneeParticipant(assignee)
			return p.displayname ?? p.displayName ?? p.uid ?? p.id ?? t('nextcloud-vue', 'Unknown')
		},

		assigneeSeed(assignee) {
			const p = this.assigneeParticipant(assignee)
			return String(p.uid ?? p.id ?? p.displayname ?? p.displayName ?? '')
		},

		assigneeKey(assignee) {
			const p = this.assigneeParticipant(assignee)
			return String(p.uid ?? p.id ?? p.displayname ?? p.displayName ?? Math.random())
		},

		openDeckApp() {
			if (typeof window !== 'undefined') {
				window.open(this.deckAppUrl, '_blank', 'noopener')
			}
		},

		async fetchCards() {
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
					this.cards = rows
				} else if (response.status === 503) {
					this.cards = []
					this.degraded = this.unavailableLabel
				} else {
					this.cards = []
					this.error = t('nextcloud-vue', 'Could not load cards.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnDeckTab] failed to fetch cards', err)
				this.cards = []
				this.error = t('nextcloud-vue', 'Could not load cards.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-deck-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
	flex-wrap: wrap;
}

.cn-deck-tab__banner {
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

.cn-deck-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-deck-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-deck-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-deck-tab__kanban {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-deck-tab__column {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 8px;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
}

.cn-deck-tab__column-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 0 2px;
}

.cn-deck-tab__column-title {
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-deck-tab__column-count {
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
	background: var(--color-background-dark);
	padding: 1px 6px;
	border-radius: 8px;
}

.cn-deck-tab__column-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-deck-tab__card {
	display: flex;
	flex-direction: column;
	gap: 5px;
	padding: 8px 10px;
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	transition: box-shadow 0.1s ease-in-out, border-color 0.1s ease-in-out;
}

.cn-deck-tab__card:hover {
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
	border-color: var(--color-border-dark);
}

.cn-deck-tab__card--overdue {
	border-color: var(--color-error);
}

.cn-deck-tab__card-board {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	align-self: flex-start;
	max-width: 100%;
	padding: 1px 7px;
	font-size: 0.7em;
	font-weight: 500;
	border-radius: 10px;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-deck-tab__card-title {
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

a.cn-deck-tab__card-title:hover {
	text-decoration: underline;
}

.cn-deck-tab__card-labels {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

/* Deck label chips: solid card-label colour with a readable text shade. */
.cn-deck-tab__chip {
	display: inline-block;
	max-width: 100%;
	padding: 1px 8px;
	font-size: 0.7em;
	font-weight: 500;
	line-height: 1.5;
	border-radius: 8px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-deck-tab__card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	flex-wrap: wrap;
	margin-top: 2px;
}

.cn-deck-tab__due-icon {
	display: inline-flex;
	margin-right: 2px;
	vertical-align: text-bottom;
}

.cn-deck-tab__avatars {
	display: flex;
	align-items: center;
	margin-left: auto;
}

.cn-deck-tab__avatar {
	border: 2px solid var(--color-main-background);
	border-radius: 50%;
}

.cn-deck-tab__avatar:not(:first-child) {
	margin-left: -8px;
}

.cn-deck-tab__avatar-overflow {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	margin-left: -8px;
	border: 2px solid var(--color-main-background);
	border-radius: 50%;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
	font-size: 0.65em;
	font-weight: 600;
}
</style>
