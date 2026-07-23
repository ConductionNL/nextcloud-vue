<!--
  CnAiHistoryDialog — conversation history browser (NcDialog overlay).

  Lives in src/dialogs/ per ADR-004 modal/dialog file-isolation rule (modal/
  dialog MARKUP must live in its own file — see CnAiChatPanel.vue's docblock
  for the exact wording and how the sidebar's own inline History tab honours
  it without an overlay). Kept for any external consumer still using the
  dialog directly (`CnAiHistoryDialog` is a public `src/index.js` export);
  CnAiChatPanel itself no longer opens this dialog — its History secondary
  action now switches to an inline sidebar tab instead (see CnAiHistoryList.vue).

  On open, fetches the 50 most-recent conversations from:
    GET /index.php/apps/{chatAppId}/api/conversations?limit=50
  via axios from @nextcloud/axios. The backend app id is the `chatAppId` prop
  (default `hermiq`) forwarded from CnAiCompanion — see
  composables/aiChatConfig.js. List rendering, name/description search, and
  inline rename/describe editing are delegated to CnAiHistoryList (shared
  with the sidebar's inline History tab) so both surfaces stay identical.

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
			<div v-if="loading"
				class="cn-ai-history-dialog__loading"
				data-testid="cn-modal"
				data-testid-modal="cn-ai-history-dialog"
				data-testid-phase="loading">
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

			<!-- Conversation list (search + rename delegated to CnAiHistoryList) -->
			<div v-else
				data-testid="cn-modal"
				data-testid-modal="cn-ai-history-dialog"
				data-testid-phase="list">
				<CnAiHistoryList
					:conversations="conversations"
					:loading="false"
					:fetch-error="false"
					:active-conversation-uuid="activeConversationUuid"
					:chat-app-id="chatAppId"
					:searchable="true"
					@select="selectConversation"
					@renamed="onRenamed" />
			</div>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import axios from '@nextcloud/axios'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import CnAiHistoryList from '../components/CnAiCompanion/CnAiHistoryList.vue'
import { DEFAULT_CHAT_APP_ID, conversationsUrl, normalizeConversation } from '../composables/aiChatConfig.js'

export default {
	name: 'CnAiHistoryDialog',

	components: {
		NcDialog,
		NcEmptyContent,
		NcLoadingIcon,
		AlertCircleOutline,
		CnAiHistoryList,
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
		/**
		 * Backend app id the conversation-list URL resolves against. Single
		 * configuration point for the chat backend — see
		 * composables/aiChatConfig.js. Defaults to `hermiq`.
		 * @type {string}
		 */
		chatAppId: {
			type: String,
			default: DEFAULT_CHAT_APP_ID,
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
					conversationsUrl(this.chatAppId),
					{ params: { limit: 50 } },
				)
				const data = response.data
				const list = Array.isArray(data)
					? data
					: (data.results || data.conversations || [])
				this.conversations = list.map(normalizeConversation)
			} catch {
				this.fetchError = true
				this.conversations = []
			} finally {
				this.loading = false
			}
		},

		selectConversation(uuid) {
			this.$emit('select', uuid)
			this.$emit('update:open', false)
		},

		/**
		 * Keep the dialog's own conversation list in sync after
		 * CnAiHistoryList's inline rename/describe control saves a change,
		 * without a full refetch.
		 * @param {{uuid: string, title: string, description: string}} payload Renamed fields.
		 */
		onRenamed({ uuid, title, description }) {
			const index = this.conversations.findIndex((conv) => conv.uuid === uuid)
			if (index !== -1) {
				this.conversations.splice(index, 1, { ...this.conversations[index], title, description })
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
</style>
