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
						<a
							:href="cardUrl(card)"
							target="_blank"
							rel="noopener"
							class="cn-deck-tab__card-title">{{ cardTitle(card) }}</a>
						<div v-if="cardLabels(card).length > 0" class="cn-deck-tab__card-labels">
							<span
								v-for="label in cardLabels(card)"
								:key="label.id || label.title"
								class="cn-deck-tab__chip"
								:style="chipStyle(label)">
								{{ chipText(label) }}
							</span>
						</div>
						<span v-if="dueLabel(card)" class="cn-deck-tab__card-meta">
							<ClockOutline :size="14" />
							{{ dueLabel(card) }}
						</span>
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
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import CnDeckCardCreate from '../../../components/CnDeckCardCreate/CnDeckCardCreate.vue'
import CnDeckCardPicker from '../../../components/CnDeckCardPicker/CnDeckCardPicker.vue'
import { buildHeaders } from '../../../utils/index.js'

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
		NcButton,
		NcLoadingIcon,
		AlertCircleOutline,
		ClockOutline,
		LinkVariant,
		Plus,
		ViewColumnOutline,
		CnDeckCardPicker,
		CnDeckCardCreate,
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
				return { background: fill }
			}
			return {}
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
	gap: 4px;
	padding: 6px 8px;
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
}

.cn-deck-tab__card--overdue {
	border-color: var(--color-error);
}

.cn-deck-tab__card-title {
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
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

.cn-deck-tab__chip {
	display: inline-block;
	padding: 1px 6px;
	font-size: 0.7em;
	border-radius: 8px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
}

.cn-deck-tab__card-meta {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
}

.cn-deck-tab__card--overdue .cn-deck-tab__card-meta {
	color: var(--color-error);
}
</style>
