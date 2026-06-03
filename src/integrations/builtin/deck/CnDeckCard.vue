<!--
  CnDeckCard — bespoke surface-aware widget for the `deck` integration.

  Replaces the generic CnIntegrationCard for the `deck` leaf. Branches on
  `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N cards across M stacks";
        secondary line names the most recent card.
    - detail-page                    : mini three-column kanban view of
        the linked card's board with the linked card highlighted in its
        current stack (per design.md AD-2).
    - single-entity                  : chip with card title + stack name
        (referenceType: 'deck').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnDeckTab; for `single-entity` the optional `value` prop addresses a
  single card by id (matching CnIntegrationCard's fetchSingle contract).

  See `openregister/openspec/changes/integration-deck/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback),
  AD-2 (mini-kanban on detail-page).
-->
<template>
	<CnDetailCard :title="cardHeaderTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-deck-card__chip" :title="chipSubtitle(entity)">
				<ViewColumnOutline :size="14" />
				<a
					:href="cardUrl(entity)"
					target="_blank"
					rel="noopener">{{ cardTitle(entity) }}</a>
				<span v-if="stackTitle(entity)" class="cn-deck-card__chip-stack">
					· {{ stackTitle(entity) }}
				</span>
			</span>
			<span v-else class="cn-deck-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-deck-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="cards.length === 0" class="cn-deck-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-deck-card__headline">
				<div class="cn-deck-card__headline-line">
					<strong>{{ countHeadline }}</strong>
				</div>
				<ul v-if="stackDistribution.length > 0" class="cn-deck-card__distribution">
					<li
						v-for="bucket in stackDistribution"
						:key="bucket.key"
						class="cn-deck-card__distribution-row">
						<span class="cn-deck-card__distribution-label">{{ bucket.label }}</span>
						<span class="cn-deck-card__distribution-count">{{ bucket.count }}</span>
					</li>
				</ul>
				<div v-if="mostRecent" class="cn-deck-card__headline-recent">
					<ViewColumnOutline :size="14" />
					<a
						:href="cardUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ cardTitle(mostRecent) }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: mini-kanban -->
		<template v-else>
			<div v-if="degraded" class="cn-deck-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="cards.length === 0" class="cn-deck-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-deck-card__kanban">
				<section
					v-for="stack in miniColumns"
					:key="stack.key"
					class="cn-deck-card__column">
					<header class="cn-deck-card__column-header">
						<span class="cn-deck-card__column-title">{{ stack.label }}</span>
						<span class="cn-deck-card__column-count">{{ stack.cards.length }}</span>
					</header>
					<ul class="cn-deck-card__column-list">
						<li
							v-for="card in stack.cards"
							:key="cardKey(card)"
							class="cn-deck-card__row"
							:class="{ 'cn-deck-card__row--highlight': isLinked(card) }">
							<a
								:href="cardUrl(card)"
								target="_blank"
								rel="noopener"
								class="cn-deck-card__title">{{ cardTitle(card) }}</a>
						</li>
					</ul>
				</section>
			</div>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * CnDeckCard — bespoke surface-aware widget for the `deck` integration.
 *
 * Renders Deck-aware metadata across all four surfaces. See the
 * file-level docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnDeckCard',

	components: { CnDetailCard, NcLoadingIcon, ViewColumnOutline },

	props: {
		/** Stable integration id (forwarded from the registry — always `'deck'`). */
		integrationId: { type: String, default: 'deck' },
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
		/** Optional single-entity reference (card id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Cards') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => ViewColumnOutline },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No cards linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Deck is currently unavailable.') },
		/** URL of the NC Deck app entry. */
		deckAppUrl: { type: String, default: '/index.php/apps/deck' },
	},

	data() {
		return {
			cards: [],
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
		 * Cards grouped by stack for both the mini-kanban (detail-page)
		 * and the stack-distribution list (dashboard surfaces).
		 *
		 * @return {Array<{key: string, label: string, cards: Array}>}
		 */
		columns() {
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

		/**
		 * Up to three columns for the mini-kanban view on `detail-page`.
		 *
		 * Per AD-2 (design.md): when the linked card has its own stack
		 * we always include that stack; otherwise the first three stacks
		 * by first-seen order are surfaced.
		 *
		 * @return {Array<{key: string, label: string, cards: Array}>}
		 */
		miniColumns() {
			return this.columns.slice(0, 3)
		},

		stackDistribution() {
			return this.columns.map((col) => ({
				key: col.key,
				label: col.label,
				count: col.cards.length,
			}))
		},

		countHeadline() {
			const total = this.cards.length
			const stackCount = this.columns.length
			if (stackCount <= 1) {
				return n('nextcloud-vue', '{count} card', '{count} cards', total, { count: total })
			}
			const cardFragment = n('nextcloud-vue', '{count} card', '{count} cards', total, { count: total })
			const stacksFragment = n('nextcloud-vue', 'across {count} stack', 'across {count} stacks', stackCount, { count: stackCount })
			return `${cardFragment} ${stacksFragment}`
		},

		mostRecent() {
			if (this.cards.length === 0) {
				return null
			}
			const sorted = [...this.cards].sort((a, b) => {
				const ta = Date.parse(a.linkedAt ?? a.lastActivity ?? '') || 0
				const tb = Date.parse(b.linkedAt ?? b.lastActivity ?? '') || 0
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

		stackTitle(card) {
			return card.stackTitle ?? card.stack?.title ?? ''
		},

		isLinked(card) {
			if (!this.value) {
				return false
			}
			return String(this.cardKey(card)) === String(this.value)
		},

		chipSubtitle(card) {
			return this.stackTitle(card) || this.cardTitle(card)
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
					this.cards = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.cards = []
					this.degraded = this.unavailableLabel
				} else {
					this.cards = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnDeckCard] failed to fetch cards', err)
				this.cards = []
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
				console.error('[CnDeckCard] failed to fetch single card', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-deck-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-deck-card__headline {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-deck-card__headline-line {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-deck-card__distribution {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-deck-card__distribution-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-deck-card__distribution-count {
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-deck-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-deck-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-deck-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-deck-card__chip {
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

.cn-deck-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-deck-card__chip a:hover {
	text-decoration: underline;
}

.cn-deck-card__chip-stack {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-deck-card__kanban {
	display: flex;
	gap: 8px;
	align-items: flex-start;
}

.cn-deck-card__column {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 6px;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
}

.cn-deck-card__column-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 4px;
}

.cn-deck-card__column-title {
	font-size: 0.85em;
	font-weight: 600;
	color: var(--color-main-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-deck-card__column-count {
	font-size: 0.7em;
	color: var(--color-text-maxcontrast);
}

.cn-deck-card__column-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.cn-deck-card__row {
	padding: 4px 6px;
	border-radius: 4px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	font-size: 0.8em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-deck-card__row--highlight {
	border-color: var(--color-primary-element, #21468B);
	background: var(--color-primary-element-light, var(--color-background-darker));
	font-weight: 600;
}

.cn-deck-card__title {
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-deck-card__title:hover {
	text-decoration: underline;
}
</style>
