<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: AGPL-3.0-or-later

  CnAiHistoryList — searchable conversation list with inline rename/describe
  editing, shared by:
  - CnAiChatPanel's inline "History" sidebar tab (ADR-004 file-isolation rule
    only requires modal/dialog MARKUP to live in its own file under
    src/modals//src/dialogs/ — this component is neither, it's a plain list,
    so it can live alongside its sibling CnAiCompanion components and be
    embedded directly, no overlay).
  - CnAiHistoryDialog.vue, which still wraps it in an NcDialog overlay for any
    external consumer still using the dialog directly.

  Search matches on both `title` and `description` (case-insensitive
  substring), per the History search requirement — `description` comes from
  `metadata.description`, the field the rename/describe control below writes.

  Rename/describe: the hermiq conversation schema only exposes `title` +
  `metadata` for PATCH (no dedicated description column), so the description
  is stored at `metadata.description` — see aiChatConfig.js's
  conversationUrl()/normalizeConversation().
-->
<template>
	<div class="cn-ai-history-list" data-testid="cn-ai-history-list">
		<NcTextField
			v-if="searchable"
			class="cn-ai-history-list__search"
			:model-value="searchQuery"
			:label="cnTranslate('Search conversations')"
			:placeholder="cnTranslate('Search by name or description')"
			data-testid="cn-ai-history-list-search"
			@update:model-value="searchQuery = $event" />

		<div v-if="loading" class="cn-ai-history-list__loading" data-testid="cn-ai-history-list-loading">
			<NcLoadingIcon :size="32" />
			<span>{{ cnTranslate('Loading conversations...') }}</span>
		</div>

		<NcEmptyContent
			v-else-if="fetchError"
			:name="cnTranslate('Could not connect to AI service')">
			<template #icon>
				<AlertCircleOutline :size="48" />
			</template>
		</NcEmptyContent>

		<NcEmptyContent
			v-else-if="filteredConversations.length === 0"
			:name="emptyStateLabel">
			<template #icon>
				<ChatOutline :size="48" />
			</template>
		</NcEmptyContent>

		<ul v-else class="cn-ai-history-list__items" data-testid="cn-ai-history-list-items">
			<li
				v-for="conv in filteredConversations"
				:key="conv.uuid"
				:class="[
					'cn-ai-history-list__item',
					{ 'cn-ai-history-list__item--active': conv.uuid === activeConversationUuid },
				]">
				<div v-if="editingUuid === conv.uuid" class="cn-ai-history-list__edit" data-testid="cn-ai-history-list-edit">
					<NcTextField
						:model-value="editTitle"
						:label="cnTranslate('Name')"
						@update:model-value="editTitle = $event" />
					<NcTextField
						:model-value="editDescription"
						:label="cnTranslate('Description')"
						@update:model-value="editDescription = $event" />
					<div class="cn-ai-history-list__edit-actions">
						<NcButton type="primary" :disabled="saving" @click="saveEdit(conv)">
							{{ cnTranslate('Save') }}
						</NcButton>
						<NcButton type="tertiary" :disabled="saving" @click="cancelEdit">
							{{ cnTranslate('Cancel') }}
						</NcButton>
					</div>
				</div>
				<template v-else>
					<button
						type="button"
						class="cn-ai-history-list__item-button"
						@click="$emit('select', conv.uuid)">
						<span class="cn-ai-history-list__item-title">{{ conv.title || cnTranslate('New conversation') }}</span>
						<span v-if="conv.description" class="cn-ai-history-list__item-desc">{{ conv.description }}</span>
						<span class="cn-ai-history-list__item-time">{{ formatRelative(conv.updatedAt || conv.createdAt) }}</span>
					</button>
					<button
						type="button"
						class="cn-ai-history-list__item-edit-btn"
						:aria-label="cnTranslate('Rename conversation')"
						:title="cnTranslate('Rename conversation')"
						data-testid="cn-ai-history-list-edit-btn"
						@click="startEdit(conv)">
						<Pencil :size="16" />
					</button>
				</template>
			</li>
		</ul>
	</div>
</template>

<script>
import { NcTextField, NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import axios from '@nextcloud/axios'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ChatOutline from 'vue-material-design-icons/ChatOutline.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import { DEFAULT_CHAT_APP_ID, conversationUrl } from '../../composables/aiChatConfig.js'

export default {
	name: 'CnAiHistoryList',

	components: {
		NcTextField,
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		AlertCircleOutline,
		ChatOutline,
		Pencil,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Normalized conversations (see aiChatConfig.js's normalizeConversation()). */
		conversations: {
			type: Array,
			default: () => [],
		},
		/** Whether the parent's conversation fetch is still in flight. */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Whether the parent's conversation fetch failed. */
		fetchError: {
			type: Boolean,
			default: false,
		},
		/** UUID of the currently active conversation (for the active-row indicator). */
		activeConversationUuid: {
			type: String,
			default: null,
		},
		/** Backend app id the rename/describe PATCH resolves against. */
		chatAppId: {
			type: String,
			default: DEFAULT_CHAT_APP_ID,
		},
		/** Whether to show the name/description search field. */
		searchable: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['select', 'renamed'],

	data() {
		return {
			searchQuery: '',
			editingUuid: null,
			editTitle: '',
			editDescription: '',
			saving: false,
		}
	},

	computed: {
		filteredConversations() {
			const query = this.searchQuery.trim().toLowerCase()
			if (!this.searchable || query === '') {
				return this.conversations
			}
			return this.conversations.filter((conv) => {
				const title = (conv.title || '').toLowerCase()
				const description = (conv.description || '').toLowerCase()
				return title.includes(query) || description.includes(query)
			})
		},

		emptyStateLabel() {
			if (this.searchable && this.searchQuery.trim() !== '') {
				return this.cnTranslate('No conversations match your search')
			}
			return this.cnTranslate('No conversations yet')
		},
	},

	methods: {
		startEdit(conv) {
			this.editingUuid = conv.uuid
			this.editTitle = conv.title || ''
			this.editDescription = conv.description || ''
		},

		cancelEdit() {
			this.editingUuid = null
		},

		async saveEdit(conv) {
			this.saving = true
			try {
				await axios.patch(
					conversationUrl(this.chatAppId, conv.uuid),
					{
						title: this.editTitle,
						metadata: { ...(conv.metadata || {}), description: this.editDescription },
					},
				)
				this.$emit('renamed', {
					uuid: conv.uuid,
					title: this.editTitle,
					description: this.editDescription,
				})
				this.editingUuid = null
			} catch {
				// Keep edit mode open on failure so the user's edits aren't lost —
				// no crash, no silent data loss.
			} finally {
				this.saving = false
			}
		},

		formatRelative(dateStr) {
			if (!dateStr) return ''
			try {
				const date = new Date(dateStr)
				const now = new Date()
				const diffMs = now - date
				const diffMinutes = Math.floor(diffMs / 60000)
				const diffHours = Math.floor(diffMinutes / 60)
				const diffDays = Math.floor(diffHours / 24)
				if (diffMinutes < 2) return 'just now'
				if (diffMinutes < 60) return `${diffMinutes}m ago`
				if (diffHours < 24) return `${diffHours}h ago`
				return `${diffDays}d ago`
			} catch {
				return ''
			}
		},
	},
}
</script>

<style>
.cn-ai-history-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-ai-history-list__search {
	padding: 0 16px;
}

.cn-ai-history-list__loading {
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: center;
	justify-content: center;
	padding: 32px;
}

.cn-ai-history-list__items {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-ai-history-list__item {
	display: flex;
	align-items: stretch;
	border-bottom: 1px solid var(--color-border);
}

.cn-ai-history-list__item:last-child {
	border-bottom: none;
}

.cn-ai-history-list__item--active .cn-ai-history-list__item-button {
	background: var(--color-primary-element-light, rgba(var(--color-primary-rgb), 0.1));
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-ai-history-list__item-button {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 2px;
	align-items: flex-start;
	min-width: 0;
	padding: 10px 16px;
	border: none;
	background: transparent;
	color: var(--color-main-text);
	text-align: left;
	cursor: pointer;
}

.cn-ai-history-list__item-button:hover,
.cn-ai-history-list__item-button:focus-visible {
	background: var(--color-background-hover);
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-ai-history-list__item-title {
	overflow: hidden;
	width: 100%;
	font-weight: 500;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.cn-ai-history-list__item-desc {
	overflow: hidden;
	width: 100%;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.cn-ai-history-list__item-time {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-ai-history-list__item-edit-btn {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 36px;
	border: none;
	background: transparent;
	color: var(--color-text-maxcontrast);
	cursor: pointer;
}

.cn-ai-history-list__item-edit-btn:hover,
.cn-ai-history-list__item-edit-btn:focus-visible {
	color: var(--color-main-text);
	background: var(--color-background-hover);
}

.cn-ai-history-list__edit {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 8px;
	padding: 10px 16px;
}

.cn-ai-history-list__edit-actions {
	display: flex;
	gap: 8px;
}
</style>
