<!--
  CnAiHistoryDialog — conversation history browser (NcDialog overlay).

  Lives in src/dialogs/ per ADR-004 modal/dialog file-isolation rule.
  Opened by CnAiChatPanel when the user clicks the History button.

  On open, fetches the 50 most-recent conversations from:
    GET /index.php/apps/openregister/api/chat/conversations?limit=50
  via axios from @nextcloud/axios.

  Emits:
  - update:open (false) — when the dialog is closed
  - select (conversationUuid) — when the user picks a conversation
-->
<template>
	<NcDialog
		:open="open"
		:name="cnTranslate('History')"
		:close-on-click-outside="true"
		@update:open="$emit('update:open', $event)">
		<template #default>
			<!-- Loading state -->
			<div v-if="loading" class="cn-ai-history-dialog__loading">
				<NcLoadingIcon :size="32" />
				<span>{{ cnTranslate('Loading conversations...') }}</span>
			</div>

			<!-- Error state -->
			<NcEmptyContent
				v-else-if="fetchError"
				:name="cnTranslate('Could not connect to AI service')">
				<template #icon>
					<AlertCircleOutline :size="48" />
				</template>
			</NcEmptyContent>

			<!-- Empty state -->
			<NcEmptyContent
				v-else-if="conversations.length === 0"
				:name="cnTranslate('No conversations yet')">
				<template #icon>
					<ChatOutline :size="48" />
				</template>
			</NcEmptyContent>

			<!-- Conversation list -->
			<ul v-else class="cn-ai-history-dialog__list">
				<li
					v-for="conv in conversations"
					:key="conv.uuid"
					:class="[
						'cn-ai-history-dialog__item',
						{ 'cn-ai-history-dialog__item--active': conv.uuid === activeConversationUuid },
					]">
					<button
						type="button"
						class="cn-ai-history-dialog__item-button"
						@click="selectConversation(conv.uuid)">
						<span class="cn-ai-history-dialog__item-title">{{ conv.title }}</span>
						<span class="cn-ai-history-dialog__item-time">{{ formatRelative(conv.updatedAt || conv.createdAt) }}</span>
					</button>
				</li>
			</ul>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import axios from '@nextcloud/axios'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ChatOutline from 'vue-material-design-icons/ChatOutline.vue'

export default {
	name: 'CnAiHistoryDialog',

	components: {
		NcDialog,
		NcEmptyContent,
		NcLoadingIcon,
		AlertCircleOutline,
		ChatOutline,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Controls dialog visibility */
		open: {
			type: Boolean,
			default: false,
		},
		/** UUID of the currently active conversation (for active indicator) */
		activeConversationUuid: {
			type: String,
			default: null,
		},
	},

	emits: ['update:open', 'select'],

	data() {
		return {
			conversations: [],
			loading: false,
			fetchError: false,
		}
	},

	watch: {
		open(newVal) {
			if (newVal) {
				this.fetchConversations()
			}
		},
	},

	methods: {
		async fetchConversations() {
			this.loading = true
			this.fetchError = false
			try {
				const response = await axios.get(
					'/index.php/apps/openregister/api/chat/conversations',
					{ params: { limit: 50 } },
				)
				const data = response.data
				const list = Array.isArray(data)
					? data
					: (data.results || data.conversations || [])
				this.conversations = list.map((c) => ({
					uuid: c.uuid || c.id,
					title: c.title || this.excerptTitle(c),
					updatedAt: c.updatedAt || c.modified || c.created,
					createdAt: c.createdAt || c.created,
				}))
			} catch {
				this.fetchError = true
				this.conversations = []
			} finally {
				this.loading = false
			}
		},

		excerptTitle(conv) {
			const firstMsg = Array.isArray(conv.messages) ? conv.messages[0] : null
			if (firstMsg && firstMsg.content) {
				return firstMsg.content.substring(0, 60) + (firstMsg.content.length > 60 ? '…' : '')
			}
			return `Conversation ${conv.uuid || conv.id || ''}`
		},

		selectConversation(uuid) {
			this.$emit('select', uuid)
			this.$emit('update:open', false)
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
.cn-ai-history-dialog__loading {
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: center;
	justify-content: center;
	padding: 32px;
}

.cn-ai-history-dialog__list {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-ai-history-dialog__item {
	border-bottom: 1px solid var(--color-border);
}

.cn-ai-history-dialog__item:last-child {
	border-bottom: none;
}

.cn-ai-history-dialog__item--active .cn-ai-history-dialog__item-button {
	background: var(--color-primary-element-light, rgba(var(--color-primary-rgb), 0.1));
}

.cn-ai-history-dialog__item-button {
	display: flex;
	flex-direction: column;
	gap: 2px;
	align-items: flex-start;
	width: 100%;
	padding: 10px 16px;
	border: none;
	background: transparent;
	color: var(--color-main-text);
	text-align: left;
	cursor: pointer;
}

.cn-ai-history-dialog__item-button:hover,
.cn-ai-history-dialog__item-button:focus-visible {
	background: var(--color-background-hover);
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-ai-history-dialog__item-title {
	overflow: hidden;
	font-weight: 500;
	white-space: nowrap;
	text-overflow: ellipsis;
	max-width: 100%;
}

.cn-ai-history-dialog__item-time {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}
</style>
