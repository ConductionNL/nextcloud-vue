<!--
  CnPollPicker — modal for picking an existing NC Polls poll to link
  to the parent OR object.

  Flow:
    1. Load polls via GET /api/integrations/polls/available
    2. Filter client-side via a search input (debounced; the same
       query is forwarded as `?search=` for server-side filtering)
    3. Single-select a poll row
    4. Confirm → emit `link` with `{ pollId }`

  All API calls are wrapped in best-effort try/catch so a transient
  Polls failure surfaces a user-visible inline error rather than a
  modal crash. The modal stays open across errors so the user can
  retry without losing context.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnPollPicker/` (NcDialog-based; matches the deck/
  contact/calendar picker pattern).

  ADR-019: drives the `polls` integration leaf's "link existing"
  surface; emits `link` so the parent (CnPollsTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-poll-picker"
		@closing="onClose">
		<div class="cn-poll-picker">
			<NcNoteCard v-if="error" type="error" class="cn-poll-picker__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="search"
				:label="t('nextcloud-vue', 'Search polls')"
				:placeholder="t('nextcloud-vue', 'Type to filter…')"
				class="cn-poll-picker__search"
				@update:value="onSearch" />

			<NcLoadingIcon v-if="loading" />
			<NcEmptyContent
				v-else-if="visiblePolls.length === 0"
				:name="t('nextcloud-vue', 'No polls available')"
				:description="t('nextcloud-vue', 'Create a poll in NC Polls first, or use the create dialog.')" />
			<ul v-else class="cn-poll-picker__list">
				<li
					v-for="poll in visiblePolls"
					:key="poll.id"
					class="cn-poll-picker__row"
					:class="{ 'cn-poll-picker__row--selected': selectedPollId === poll.id }">
					<button type="button" class="cn-poll-picker__row-button" @click="pickPoll(poll)">
						<Poll :size="20" />
						<span class="cn-poll-picker__row-main">
							<span class="cn-poll-picker__row-title">{{ poll.title }}</span>
							<span class="cn-poll-picker__row-meta">{{ rowMeta(poll) }}</span>
						</span>
					</button>
				</li>
			</ul>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!selectedPollId"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link poll') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnPollPicker — pick an existing Polls poll. Emits `link` with the
 * chosen poll id.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import Poll from 'vue-material-design-icons/Poll.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnPollPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, Poll },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing poll') },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			polls: [],
			search: '',
			selectedPollId: null,
			searchTimer: null,
		}
	},

	computed: {
		/**
		 * Client-side filter on top of the server-side `?search=`
		 * payload — so the user sees instant feedback even between
		 * debounce ticks.
		 *
		 * @return {Array}
		 */
		visiblePolls() {
			const term = this.search.trim().toLowerCase()
			if (term === '') {
				return this.polls
			}
			return this.polls.filter(poll => (poll.title || '').toLowerCase().includes(term))
		},
	},

	mounted() {
		this.fetchPolls()
	},

	beforeUnmount() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
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

		async fetchPolls(searchTerm = '') {
			this.loading = true
			this.error = ''
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/polls/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.polls = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC Polls is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load polls.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPollPicker] fetch polls failed', err)
				this.error = t('nextcloud-vue', 'Could not load polls.')
			} finally {
				this.loading = false
			}
		},

		onSearch(value) {
			// Debounce server-side filter; client-side filter is live.
			this.search = value
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.fetchPolls(this.search.trim())
			}, 300)
		},

		pickPoll(poll) {
			this.selectedPollId = poll.id
		},

		rowMeta(poll) {
			const parts = []
			const type = poll.type || ''
			if (type !== '') {
				parts.push(type)
			}
			const optionCount = Number(poll.optionCount || 0)
			if (optionCount > 0) {
				parts.push(t('nextcloud-vue', '{n} options', { n: optionCount }))
			}
			const voterCount = Number(poll.voterCount || 0)
			if (voterCount > 0) {
				parts.push(t('nextcloud-vue', '{n} voters', { n: voterCount }))
			}
			if (poll.closed === true) {
				parts.push(t('nextcloud-vue', 'Closed'))
			}
			return parts.join(' · ')
		},

		confirm() {
			if (!this.selectedPollId) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ pollId }`.
			 */
			this.$emit('link', { pollId: this.selectedPollId })
		},
	},
}
</script>

<style scoped>
.cn-poll-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-poll-picker__error {
	margin: 4px 0;
}

.cn-poll-picker__search {
	width: 100%;
}

.cn-poll-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-poll-picker__row {
	border-radius: var(--border-radius);
}

.cn-poll-picker__row--selected {
	background: var(--color-primary-element-light);
}

.cn-poll-picker__row-button {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 8px 10px;
	background: transparent;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-poll-picker__row-button:hover {
	background: var(--color-background-hover);
}

.cn-poll-picker__row--selected .cn-poll-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-poll-picker__row-main {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-poll-picker__row-title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 500;
}

.cn-poll-picker__row-meta {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}
</style>
