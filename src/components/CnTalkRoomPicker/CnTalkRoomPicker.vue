<!--
  CnTalkRoomPicker — modal dialog for picking an existing NC Talk
  conversation room to link to the parent OR object.

  Flow:
    - Loads the current user's rooms from
      GET /api/integrations/talk/rooms (optional ?search=)
    - User filters by name + selects a row
    - Confirm emits `link` with `{ roomToken }`

  Talk's room list is flat (no boards/stacks), so this picker is a
  single-step search list — simpler than the Deck multi-step picker.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnTalkRoomPicker/` (NcDialog-based — picker UX is
  dialog-shaped per ADR-004 §3).

  ADR-019: drives the `talk` integration leaf's "link existing"
  surface; emits `link` so the parent (CnTalkTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-talk-room-picker"
		@closing="onClose">
		<div class="cn-talk-room-picker">
			<!-- Inline error banner -->
			<NcNoteCard v-if="error" type="error" class="cn-talk-room-picker__error">
				{{ error }}
			</NcNoteCard>

			<!-- Search input -->
			<NcTextField
				v-model="search"
				:label="t('nextcloud-vue', 'Search rooms')"
				:placeholder="t('nextcloud-vue', 'Search rooms')"
				class="cn-talk-room-picker__search"
				@input="onSearchInput" />

			<!-- Room list -->
			<section class="cn-talk-room-picker__panel">
				<NcLoadingIcon v-if="loading" />
				<NcEmptyContent
					v-else-if="rooms.length === 0"
					:name="t('nextcloud-vue', 'No rooms available')"
					:description="t('nextcloud-vue', 'You are not a member of any Talk conversations yet.')" />
				<ul v-else class="cn-talk-room-picker__list">
					<li
						v-for="room in rooms"
						:key="room.token"
						class="cn-talk-room-picker__row"
						:class="{ 'cn-talk-room-picker__row--selected': selectedToken === room.token }">
						<button type="button" class="cn-talk-room-picker__row-button" @click="pickRoom(room)">
							<ChatOutline :size="20" />
							<span class="cn-talk-room-picker__row-label">
								{{ room.name || room.token }}
							</span>
							<span v-if="room.participantCount" class="cn-talk-room-picker__row-meta">
								{{ participantLabel(room.participantCount) }}
							</span>
						</button>
					</li>
				</ul>
			</section>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!selectedToken"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link room') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnTalkRoomPicker — pick an existing Talk room. Emits `link` with
 * the chosen room token.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import ChatOutline from 'vue-material-design-icons/ChatOutline.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnTalkRoomPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, ChatOutline },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing Talk room') },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			search: '',
			rooms: [],
			selectedToken: null,
			searchTimer: null,
		}
	},

	mounted() {
		this.fetchRooms()
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

		participantLabel(count) {
			return t('nextcloud-vue', '{n} participants', { n: count })
		},

		onSearchInput() {
			// Debounce the server-side search so typing doesn't fire
			// a request per keystroke. 300ms is the NC convention.
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.fetchRooms()
			}, 300)
		},

		async fetchRooms() {
			this.loading = true
			this.error = ''
			try {
				const params = this.search ? `?search=${encodeURIComponent(this.search)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/talk/rooms${params}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.rooms = data.results || []
				} else {
					this.error = t('nextcloud-vue', 'Could not load rooms.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTalkRoomPicker] fetch rooms failed', err)
				this.error = t('nextcloud-vue', 'Could not load rooms.')
			} finally {
				this.loading = false
			}
		},

		pickRoom(room) {
			this.selectedToken = room.token
		},

		confirm() {
			if (!this.selectedToken) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ roomToken }`.
			 */
			this.$emit('link', { roomToken: this.selectedToken })
		},
	},
}
</script>

<style scoped>
.cn-talk-room-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-talk-room-picker__error {
	margin: 4px 0;
}

.cn-talk-room-picker__search {
	max-width: 100%;
}

.cn-talk-room-picker__panel {
	min-height: 180px;
}

.cn-talk-room-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-talk-room-picker__row {
	border-radius: var(--border-radius);
}

.cn-talk-room-picker__row--selected {
	background: var(--color-primary-element-light);
}

.cn-talk-room-picker__row-button {
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

.cn-talk-room-picker__row-button:hover {
	background: var(--color-background-hover);
}

.cn-talk-room-picker__row--selected .cn-talk-room-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-talk-room-picker__row-label {
	flex: 1 1 auto;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-talk-room-picker__row-meta {
	flex-shrink: 0;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}
</style>
