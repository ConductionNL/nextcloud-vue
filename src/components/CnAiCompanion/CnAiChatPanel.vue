<!--
  CnAiChatPanel — AI Chat Companion panel built on Nextcloud's NcAppSidebar.

  Uses the native NcAppSidebar component (proper NC theming, a11y, slide
  animation, focus management) rather than a hand-rolled fixed-position div.
  Falls naturally into the right edge alongside CnObjectSidebar.

  Header: "Hermiq" (NcAppSidebar's built-in title) + a short description with
  a link to https://hermiq.conduction.nl — the companion IS Hermiq, the same
  agent-engine product across all Conduction apps. Custom secondary actions
  (Start new chat + History) live in the `secondary-actions` slot.

  Two tabs:
  - "chat" — CnAiMessageList + CnAiInput. While no conversation is active
    (CnAiMessageList's `#empty` slot), also shows the agent picker
    (CnAiAgentPicker) and up to 5 recent conversations (CnAiRecentSessions).
  - "history" — the full searchable conversation list (CnAiHistoryList),
    embedded directly rather than behind the old NcDialog overlay. ADR-004's
    file-isolation rule ("modal or dialog markup MUST live in its own file
    under src/modals/ or src/dialogs/") only constrains where NcModal/NcDialog
    MARKUP lives; CnAiHistoryList is neither — a plain list component — so it
    can be embedded directly here. CnAiHistoryDialog.vue (the pre-existing
    NcDialog wrapper) is kept as-is for any external consumer still using it
    directly (it's a public src/index.js export), and now also delegates its
    own list rendering to CnAiHistoryList so both surfaces share one
    implementation.

  "Start new chat" disables (not hides) once the panel is already on the
  fresh new-chat screen (no active conversation, no messages yet).

  Focus management is owned by NcAppSidebar itself (NC handles Escape to close,
  focus trap, focus return on close).
-->
<template>
	<NcAppSidebar
		v-if="visible"
		name="Hermiq"
		title="Hermiq"
		:active="activeTab"
		:force-menu="true"
		data-testid="cn-ai-panel"
		@close="onClose"
		@update:active="activeTab = $event">
		<template #description>
			<span class="cn-ai-chat-tab__description-text">{{ cnTranslate('Hermiq is the AI assistant built into every Conduction app.') }}</span>
			<a
				class="cn-ai-chat-tab__description-link"
				href="https://hermiq.conduction.nl"
				target="_blank"
				rel="noopener noreferrer">
				{{ cnTranslate('Learn more') }}
			</a>
		</template>

		<template #secondary-actions>
			<NcActionButton
				:aria-label="cnTranslate('Start new chat')"
				:title="cnTranslate('Start new chat')"
				:disabled="isOnNewChatScreen"
				@click="onNewChat">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ cnTranslate('Start new chat') }}
			</NcActionButton>
			<NcActionButton
				:aria-label="cnTranslate('History')"
				:title="cnTranslate('History')"
				@click="activeTab = 'history'">
				<template #icon>
					<History :size="20" />
				</template>
				{{ cnTranslate('History') }}
			</NcActionButton>
		</template>

		<NcAppSidebarTab
			id="chat"
			:name="cnTranslate('Chat')"
			:order="1"
			data-testid="cn-ai-panel-tab-chat">
			<template #icon>
				<!--
					A chat bubble, NOT the AI sparkles. This tab names a place —
					the conversation — and it sits beside History, which names
					another place. The sparkles mean "the model", and using them
					here made them mean two things at once: the tab said "AI"
					while the tab next to it said "History", so the pair read as
					a kind/time distinction rather than as two views of the same
					thing.

					The sparkles are kept where they still mean the model and
					nothing else: the launcher hex, and this tab's own empty
					state below.
				-->
				<MessageTextOutline :size="20" />
			</template>
			<div class="cn-ai-chat-tab">
				<div class="cn-ai-chat-tab__messages">
					<CnAiMessageList
						:messages="streamState.messages"
						:current-text="streamState.currentText"
						:is-streaming="streamState.isStreaming">
						<template #empty>
							<div class="cn-ai-chat-tab__start" data-testid="cn-ai-chat-tab-start">
								<CnAiAgentPicker
									:agents="agents"
									:loading="agentsLoading"
									:fetch-error="agentsFetchError"
									:value="selectedAgentUuid"
									@input="onAgentSelected" />
								<NcEmptyContent :name="cnTranslate('AI assistant')">
									<template #icon>
										<Creation :size="48" />
									</template>
									<template #description>
										{{ cnTranslate('Ask me anything about what you are viewing.') }}
									</template>
								</NcEmptyContent>
								<CnAiRecentSessions
									:conversations="recentConversations"
									:loading="conversationsLoading"
									:active-conversation-uuid="activeConversationUuid"
									@select="onConversationSelect"
									@view-all="activeTab = 'history'" />
							</div>
						</template>
					</CnAiMessageList>
				</div>
				<div class="cn-ai-chat-tab__input">
					<CnAiInput
						ref="input"
						:disabled="streamState.isStreaming"
						:chat-app-id="chatAppId"
						@send="onSend" />
				</div>
			</div>
		</NcAppSidebarTab>

		<NcAppSidebarTab
			id="history"
			:name="cnTranslate('History')"
			:order="2"
			data-testid="cn-ai-panel-tab-history">
			<template #icon>
				<History :size="20" />
			</template>
			<CnAiHistoryList
				:conversations="conversations"
				:loading="conversationsLoading"
				:fetch-error="conversationsFetchError"
				:active-conversation-uuid="activeConversationUuid"
				:chat-app-id="chatAppId"
				:searchable="true"
				@select="onConversationSelect"
				@renamed="onConversationRenamed" />
		</NcAppSidebarTab>
	</NcAppSidebar>
</template>

<script>
import { NcAppSidebar, NcAppSidebarTab, NcActionButton, NcEmptyContent } from '@nextcloud/vue'
import axios from '@nextcloud/axios'
import Plus from 'vue-material-design-icons/Plus.vue'
import History from 'vue-material-design-icons/History.vue'
import Creation from 'vue-material-design-icons/Creation.vue'
import MessageTextOutline from 'vue-material-design-icons/MessageTextOutline.vue'
import CnAiMessageList from './CnAiMessageList.vue'
import CnAiInput from './CnAiInput.vue'
import CnAiAgentPicker from './CnAiAgentPicker.vue'
import CnAiRecentSessions from './CnAiRecentSessions.vue'
import CnAiHistoryList from './CnAiHistoryList.vue'
import {
	DEFAULT_CHAT_APP_ID,
	agentsUrl,
	conversationsUrl,
	normalizeConversation,
} from '../../composables/aiChatConfig.js'

/** Recent-sessions cards shown on the new-chat screen — top N of the fetched list. */
const RECENT_CONVERSATIONS_LIMIT = 5

export default {
	name: 'CnAiChatPanel',

	components: {
		NcAppSidebar,
		NcAppSidebarTab,
		NcActionButton,
		NcEmptyContent,
		Plus,
		History,
		Creation,
		MessageTextOutline,
		CnAiMessageList,
		CnAiInput,
		CnAiAgentPicker,
		CnAiRecentSessions,
		CnAiHistoryList,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Controls panel visibility */
		visible: {
			type: Boolean,
			default: false,
		},
		/**
		 * Stream state object from useAiChatStream().state.
		 * Contains: isStreaming, currentText, toolCalls, error, messages, conversationUuid.
		 */
		streamState: {
			type: Object,
			required: true,
		},
		/** Ref to the FAB element — kept for API back-compat, focus return is handled by NcAppSidebar. */
		fabRef: {
			type: Object,
			default: null,
		},
		/**
		 * Backend app id, forwarded to the agent picker, recent sessions, and
		 * history list so every fetch resolves against the same backend as the
		 * chat stream. See composables/aiChatConfig.js.
		 * @type {string}
		 */
		chatAppId: {
			type: String,
			default: DEFAULT_CHAT_APP_ID,
		},
	},

	emits: ['close', 'send', 'new-thread', 'load-conversation'],

	data() {
		return {
			activeTab: 'chat',
			activeConversationUuid: null,
			agents: [],
			agentsLoading: false,
			agentsFetchError: false,
			selectedAgentUuid: null,
			conversations: [],
			conversationsLoading: false,
			conversationsFetchError: false,
		}
	},

	computed: {
		/** Top 5 conversations for the new-chat screen's recent-sessions cards. */
		recentConversations() {
			return this.conversations.slice(0, RECENT_CONVERSATIONS_LIMIT)
		},

		/**
		 * Whether the panel is already showing a fresh, empty new-chat screen —
		 * used to disable "Start new chat" (disabled, not hidden, per design).
		 */
		isOnNewChatScreen() {
			return !this.streamState.isStreaming && this.streamState.messages.length === 0
		},
	},

	watch: {
		visible(newVal) {
			if (newVal) {
				this.$nextTick(() => {
					if (this.$refs.input) {
						this.$refs.input.focus()
					}
				})
			}
		},

		/**
		 * The transport composable learns the server-assigned conversation uuid
		 * from the first turn's response (see useAiChatStream.js's finalise()).
		 * Mirror it into the panel's own tracked uuid so a brand-new conversation
		 * shows as "active" immediately — the same tracking that drives
		 * isOnNewChatScreen and the History/recent-sessions active-row indicator.
		 * @param {string|null} newVal The stream's current conversation uuid.
		 */
		'streamState.conversationUuid'(newVal) {
			if (newVal) {
				this.activeConversationUuid = newVal
			}
		},
	},

	created() {
		this.fetchAgents()
		this.fetchConversations()
	},

	methods: {
		onClose() {
			this.$emit('close')
		},

		/**
		 * Re-emit CnAiInput's `{ text, attachments }` payload up to
		 * CnAiCompanion, which owns the stream composable, adding the
		 * currently-selected agent uuid (this panel's own picker state).
		 * @param {{text: string, attachments: Array<{path: string, name: string}>}} payload CnAiInput's send payload.
		 */
		onSend({ text, attachments }) {
			this.$emit('send', text, this.selectedAgentUuid, attachments)
		},

		onNewChat() {
			if (this.isOnNewChatScreen) {
				return
			}
			this.activeConversationUuid = null
			this.$emit('new-thread')
		},

		onAgentSelected(uuid) {
			this.selectedAgentUuid = uuid
		},

		onConversationSelect(uuid) {
			this.activeConversationUuid = uuid
			this.activeTab = 'chat'
			this.$emit('load-conversation', uuid)
		},

		/**
		 * Keep the panel's own conversation list (feeding both recent-sessions
		 * and the History tab) in sync after an inline rename/describe save,
		 * without a full refetch.
		 * @param {{uuid: string, title: string, description: string}} payload Renamed fields.
		 */
		onConversationRenamed({ uuid, title, description }) {
			const index = this.conversations.findIndex((conv) => conv.uuid === uuid)
			if (index !== -1) {
				this.conversations.splice(index, 1, { ...this.conversations[index], title, description })
			}
		},

		/**
		 * Fetch the agent list for the new-conversation picker. Defaults the
		 * selection to the first accessible agent — the agents API has no
		 * "default agent" indicator to prefer instead (verified against
		 * hermiq's AgentsController::index()/serializeAgent()). Degrades
		 * gracefully on failure: the picker shows an inline notice but the rest
		 * of the panel (recent sessions, message input) stays usable.
		 * @returns {Promise<void>}
		 */
		async fetchAgents() {
			this.agentsLoading = true
			this.agentsFetchError = false
			try {
				const response = await axios.get(agentsUrl(this.chatAppId))
				const data = response.data
				const list = Array.isArray(data) ? data : (data.results || [])
				this.agents = list
				if (!this.selectedAgentUuid && list.length > 0) {
					this.selectedAgentUuid = list[0].uuid || list[0].id || null
				}
			} catch {
				this.agentsFetchError = true
				this.agents = []
			} finally {
				this.agentsLoading = false
			}
		},

		/**
		 * Fetch the caller's conversations once, feeding both the new-chat
		 * screen's recent-sessions cards (top 5) and the History tab's full
		 * searchable list — a single fetch keeps both surfaces consistent.
		 * @returns {Promise<void>}
		 */
		async fetchConversations() {
			this.conversationsLoading = true
			this.conversationsFetchError = false
			try {
				const response = await axios.get(conversationsUrl(this.chatAppId), { params: { limit: 50 } })
				const data = response.data
				const list = Array.isArray(data) ? data : (data.results || data.conversations || [])
				this.conversations = list.map(normalizeConversation)
			} catch {
				this.conversationsFetchError = true
				this.conversations = []
			} finally {
				this.conversationsLoading = false
			}
		},
	},
}
</script>

<style>
/* The chat tab fills its NcAppSidebarTab content area with a column
   layout: scrollable message list on top, fixed input at the bottom. */
.cn-ai-chat-tab {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0; /* allow flex children to shrink past their content size */
}

.cn-ai-chat-tab__messages {
	flex: 1 1 auto;
	overflow-y: auto;
	min-height: 0;
}

.cn-ai-chat-tab__input {
	flex: 0 0 auto;
	padding-top: 8px;
	border-top: 1px solid var(--color-border);
}

.cn-ai-chat-tab__description-text {
	display: block;
}

.cn-ai-chat-tab__description-link {
	color: var(--color-primary-element);
}

.cn-ai-chat-tab__description-link:hover,
.cn-ai-chat-tab__description-link:focus-visible {
	text-decoration: underline;
}

/* New-chat screen: agent picker + empty-state message + recent sessions,
   stacked and stretched to the full width of the (centered-flex) message
   list's empty-state container. */
.cn-ai-chat-tab__start {
	display: flex;
	flex-direction: column;
	align-self: stretch;
	gap: 16px;
	width: 100%;
	max-width: 360px;
	margin: 0 auto;
	padding: 0 12px;
}
</style>
