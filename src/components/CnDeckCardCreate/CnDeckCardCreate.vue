<!--
  CnDeckCardCreate — inline-create dialog for a fresh NC Deck card
  linked to the parent OR object.

  Form fields:
    - Board       (NcSelect, required — loaded from
                   GET /api/integrations/deck/boards)
    - Stack       (NcSelect, required — cascades on board change via
                   GET /api/integrations/deck/boards/{id}/stacks)
    - Title       (NcTextField, required)
    - Description (NcTextArea, optional)
    - Due date    (input type=date, optional)

  On submit, emits `create` with `{ boardId, stackId, title, description, duedate }`.
  The parent (CnDeckTab) is responsible for POSTing to
  `/api/objects/{register}/{schema}/{id}/deck/new`.

  ADR-004: lives in its own .vue file under `src/components/CnDeckCardCreate/`.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-deck-card-create"
		@closing="onClose">
		<form class="cn-deck-card-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-deck-card-create__error">
				{{ error }}
			</NcNoteCard>

			<NcSelect
				v-model="selectedBoard"
				:label="t('nextcloud-vue', 'Board')"
				:input-label="t('nextcloud-vue', 'Board')"
				:options="boardOptions"
				:loading="loadingBoards"
				:disabled="loadingBoards"
				:clearable="false"
				required
				@option:selected="onBoardChange" />

			<NcSelect
				v-model="selectedStack"
				:label="t('nextcloud-vue', 'Stack')"
				:input-label="t('nextcloud-vue', 'Stack')"
				:options="stackOptions"
				:loading="loadingStacks"
				:disabled="!selectedBoard || loadingStacks"
				:clearable="false"
				required />

			<NcTextField
				v-model="title"
				:label="t('nextcloud-vue', 'Title')"
				:maxlength="200"
				required />

			<NcTextArea
				v-model="description"
				:label="t('nextcloud-vue', 'Description')"
				:maxlength="4000"
				:rows="4" />

			<label class="cn-deck-card-create__date">
				<span class="cn-deck-card-create__date-label">{{ t('nextcloud-vue', 'Due date (optional)') }}</span>
				<input
					v-model="duedate"
					type="date"
					class="cn-deck-card-create__date-input">
			</label>
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create card') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnDeckCardCreate — inline-create dialog. Emits `create` with the
 * form payload; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnDeckCardCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextArea, NcTextField },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new Deck card') },
	},

	emits: ['close', 'create'],

	data() {
		return {
			loadingBoards: false,
			loadingStacks: false,
			error: '',
			boards: [],
			stacks: [],
			selectedBoard: null,
			selectedStack: null,
			title: '',
			description: '',
			duedate: '',
		}
	},

	computed: {
		boardOptions() {
			return this.boards.map(board => ({ id: board.id, label: board.title }))
		},
		stackOptions() {
			return this.stacks.map(stack => ({ id: stack.id, label: stack.title }))
		},
		canSubmit() {
			return Boolean(this.selectedBoard && this.selectedStack && this.title.trim())
		},
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

		async fetchBoards() {
			this.loadingBoards = true
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
				console.error('[CnDeckCardCreate] fetch boards failed', err)
				this.error = t('nextcloud-vue', 'Could not load boards.')
			} finally {
				this.loadingBoards = false
			}
		},

		async fetchStacks(boardId) {
			this.loadingStacks = true
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
				console.error('[CnDeckCardCreate] fetch stacks failed', err)
				this.error = t('nextcloud-vue', 'Could not load stacks.')
			} finally {
				this.loadingStacks = false
			}
		},

		onBoardChange(option) {
			this.selectedStack = null
			this.stacks = []
			if (option && option.id) {
				this.fetchStacks(option.id)
			}
		},

		submit() {
			if (!this.canSubmit) {
				return
			}
			/**
			 * @event create Emitted when the user confirms creation. Payload: `{ boardId, stackId, title, description, duedate }`.
			 */
			this.$emit('create', {
				boardId: this.selectedBoard.id,
				stackId: this.selectedStack.id,
				title: this.title.trim(),
				description: this.description.trim(),
				duedate: this.duedate || null,
			})
		},
	},
}
</script>

<style scoped>
.cn-deck-card-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-deck-card-create__error {
	margin: 4px 0;
}

.cn-deck-card-create__date {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-deck-card-create__date-label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-deck-card-create__date-input {
	border-radius: var(--border-radius);
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	background: var(--color-main-background);
	color: var(--color-main-text);
}
</style>
