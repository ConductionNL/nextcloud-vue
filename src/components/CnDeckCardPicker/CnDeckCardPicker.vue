<!--
  CnDeckCardPicker — multi-step modal for picking an existing NC Deck
  card to link to the parent OR object.

  Flow (three steps + confirm):
    1. Choose a board   — GET /api/integrations/deck/boards
    2. Choose a stack   — GET /api/integrations/deck/boards/{id}/stacks
    3. Choose a card    — list cards on the stack
    4. Confirm          — emit `link` with `{ cardId }`

  The card list in step 3 is sourced from the host application: by
  default we request Deck's app-internal endpoint
  `/index.php/apps/deck/stacks/{boardId}/{stackId}` (since Deck does
  not expose an OCS card listing) — but the host can override by
  providing a `loadCards(stackId)` function via the `cardLoader` prop.

  All API calls are wrapped in best-effort try/catch so a transient
  Deck failure surfaces a user-visible inline error rather than a
  modal crash. The modal stays open across errors so the user can
  retry without losing context.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnDeckCardPicker/` (NcDialog-based variants accepted
  per ADR-004 §3 — picker UX is dialog-shaped, not full-modal).

  ADR-019: drives the `deck` integration leaf's "link existing"
  surface; emits `link` so the parent (CnDeckTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-deck-card-picker"
		@closing="onClose">
		<div class="cn-deck-card-picker">
			<!-- Step indicator -->
			<ol class="cn-deck-card-picker__steps">
				<li :class="stepClass(1)">
					{{ t('nextcloud-vue', '1. Board') }}
				</li>
				<li :class="stepClass(2)">
					{{ t('nextcloud-vue', '2. Stack') }}
				</li>
				<li :class="stepClass(3)">
					{{ t('nextcloud-vue', '3. Card') }}
				</li>
			</ol>

			<!-- Inline error banner -->
			<NcNoteCard v-if="error" type="error" class="cn-deck-card-picker__error">
				{{ error }}
			</NcNoteCard>

			<!-- Step 1 — boards -->
			<section v-if="step === 1" class="cn-deck-card-picker__panel">
				<NcLoadingIcon v-if="loading" />
				<NcEmptyContent
					v-else-if="boards.length === 0"
					:name="t('nextcloud-vue', 'No boards available')"
					:description="t('nextcloud-vue', 'NC Deck has no boards visible to you yet.')" />
				<ul v-else class="cn-deck-card-picker__list">
					<li
						v-for="board in boards"
						:key="board.id"
						class="cn-deck-card-picker__row"
						:class="{ 'cn-deck-card-picker__row--selected': selectedBoardId === board.id }">
						<button type="button" class="cn-deck-card-picker__row-button" @click="pickBoard(board)">
							<ViewColumnOutline :size="20" />
							<span class="cn-deck-card-picker__row-label">{{ board.title }}</span>
						</button>
					</li>
				</ul>
			</section>

			<!-- Step 2 — stacks -->
			<section v-else-if="step === 2" class="cn-deck-card-picker__panel">
				<NcLoadingIcon v-if="loading" />
				<NcEmptyContent
					v-else-if="stacks.length === 0"
					:name="t('nextcloud-vue', 'No stacks on this board')"
					:description="t('nextcloud-vue', 'Pick a different board or add a stack in NC Deck.')" />
				<ul v-else class="cn-deck-card-picker__list">
					<li
						v-for="stack in stacks"
						:key="stack.id"
						class="cn-deck-card-picker__row"
						:class="{ 'cn-deck-card-picker__row--selected': selectedStackId === stack.id }">
						<button type="button" class="cn-deck-card-picker__row-button" @click="pickStack(stack)">
							<span class="cn-deck-card-picker__row-label">{{ stack.title }}</span>
						</button>
					</li>
				</ul>
			</section>

			<!-- Step 3 — cards -->
			<section v-else-if="step === 3" class="cn-deck-card-picker__panel">
				<NcLoadingIcon v-if="loading" />
				<NcEmptyContent
					v-else-if="cards.length === 0"
					:name="t('nextcloud-vue', 'No cards on this stack')"
					:description="t('nextcloud-vue', 'Pick a different stack or create a card in NC Deck.')" />
				<ul v-else class="cn-deck-card-picker__list">
					<li
						v-for="card in cards"
						:key="card.id"
						class="cn-deck-card-picker__row"
						:class="{ 'cn-deck-card-picker__row--selected': selectedCardId === card.id }">
						<button type="button" class="cn-deck-card-picker__row-button" @click="pickCard(card)">
							<span class="cn-deck-card-picker__row-label">{{ card.title }}</span>
						</button>
					</li>
				</ul>
			</section>
		</div>

		<template #actions>
			<NcButton v-if="step > 1" @click="goBack">
				{{ t('nextcloud-vue', 'Back') }}
			</NcButton>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				v-if="step === 3"
				variant="primary"
				:disabled="!selectedCardId"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link card') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnDeckCardPicker — pick an existing Deck card via board → stack →
 * card. Emits `link` with the chosen card id.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnDeckCardPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, ViewColumnOutline },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing Deck card') },
		/**
		 * Optional override for step 3's card-loading logic.
		 *
		 * Signature: `(stackId, boardId) => Promise<Array<{id, title}>>`.
		 * The default tries Deck's `/apps/deck/stacks/{boardId}/{stackId}`
		 * endpoint, which serves a stack-with-cards payload — but the
		 * shape varies across Deck releases, so consumers can override
		 * for a stable contract.
		 */
		cardLoader: { type: Function, default: null },
	},

	emits: ['close', 'link'],

	data() {
		return {
			step: 1,
			loading: false,
			error: '',
			boards: [],
			stacks: [],
			cards: [],
			selectedBoardId: null,
			selectedStackId: null,
			selectedCardId: null,
		}
	},

	mounted() {
		this.fetchBoards()
	},

	methods: {
		t,

		/**
		 * Dismiss the dialog.
		 *
		 * @return {void}
		 */
		onClose() {
			/**
			 * @event close Emitted when the dialog should be closed (cancel or close button).
			 */
			this.$emit('close')
		},

		stepClass(step) {
			return {
				'cn-deck-card-picker__step': true,
				'cn-deck-card-picker__step--active': this.step === step,
				'cn-deck-card-picker__step--done': this.step > step,
			}
		},

		async fetchBoards() {
			this.loading = true
			this.error = ''
			try {
				const response = await fetch(`${this.apiBase}/integrations/deck/boards`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.boards = data.results || []
				} else {
					this.error = t('nextcloud-vue', 'Could not load boards.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnDeckCardPicker] fetch boards failed', err)
				this.error = t('nextcloud-vue', 'Could not load boards.')
			} finally {
				this.loading = false
			}
		},

		async fetchStacks(boardId) {
			this.loading = true
			this.error = ''
			try {
				const response = await fetch(`${this.apiBase}/integrations/deck/boards/${boardId}/stacks`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.stacks = data.results || []
				} else {
					this.error = t('nextcloud-vue', 'Could not load stacks.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnDeckCardPicker] fetch stacks failed', err)
				this.error = t('nextcloud-vue', 'Could not load stacks.')
			} finally {
				this.loading = false
			}
		},

		async fetchCards(stackId) {
			this.loading = true
			this.error = ''
			try {
				if (typeof this.cardLoader === 'function') {
					this.cards = await this.cardLoader(stackId, this.selectedBoardId)
					return
				}

				// Default: hit Deck's own stack endpoint, which returns
				// a `cards` array. Shape: { cards: [{id, title}, ...] }.
				const url = `/index.php/apps/deck/stacks/${this.selectedBoardId}/${stackId}`
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const raw = Array.isArray(data) ? data : (data.cards || data.results || [])
					this.cards = raw.map(c => ({
						id: c.id ?? c.cardId,
						title: c.title ?? c.cardTitle ?? `Card ${c.id}`,
					}))
				} else {
					this.error = t('nextcloud-vue', 'Could not load cards.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnDeckCardPicker] fetch cards failed', err)
				this.error = t('nextcloud-vue', 'Could not load cards.')
			} finally {
				this.loading = false
			}
		},

		pickBoard(board) {
			this.selectedBoardId = board.id
			this.selectedStackId = null
			this.selectedCardId = null
			this.stacks = []
			this.cards = []
			this.step = 2
			this.fetchStacks(board.id)
		},

		pickStack(stack) {
			this.selectedStackId = stack.id
			this.selectedCardId = null
			this.cards = []
			this.step = 3
			this.fetchCards(stack.id)
		},

		pickCard(card) {
			this.selectedCardId = card.id
		},

		goBack() {
			if (this.step === 3) {
				this.selectedCardId = null
				this.step = 2
				return
			}
			if (this.step === 2) {
				this.selectedStackId = null
				this.stacks = []
				this.step = 1
			}
		},

		confirm() {
			if (!this.selectedCardId) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ cardId }`.
			 */
			this.$emit('link', { cardId: this.selectedCardId })
		},
	},
}
</script>

<style scoped>
.cn-deck-card-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-deck-card-picker__steps {
	display: flex;
	gap: 16px;
	list-style: none;
	margin: 0;
	padding: 0 4px 8px;
	border-bottom: 1px solid var(--color-border);
}

.cn-deck-card-picker__step {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-deck-card-picker__step--active {
	color: var(--color-main-text);
	font-weight: 600;
}

.cn-deck-card-picker__step--done {
	color: var(--color-success, #46ba61);
}

.cn-deck-card-picker__error {
	margin: 4px 0;
}

.cn-deck-card-picker__panel {
	min-height: 180px;
}

.cn-deck-card-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-deck-card-picker__row {
	border-radius: var(--border-radius);
}

.cn-deck-card-picker__row--selected {
	background: var(--color-primary-element-light);
}

.cn-deck-card-picker__row-button {
	display: flex;
	width: 100%;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	background: transparent;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-deck-card-picker__row-button:hover {
	background: var(--color-background-hover);
}

.cn-deck-card-picker__row--selected .cn-deck-card-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-deck-card-picker__row-label {
	flex: 1 1 auto;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
