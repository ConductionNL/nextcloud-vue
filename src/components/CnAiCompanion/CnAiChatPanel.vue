<!--
  CnAiChatPanel — the AI Chat Companion's own floating window.

  ⚠️ DELIBERATELY NOT AN NcAppSidebar. It used to be one, and the reasons it
  stopped are worth keeping, because "use the native component" is otherwise the
  right instinct:

  - A sidebar belongs to the app that owns the page. This companion is injected
    on EVERY page, including third-party office editors (onlyoffice, eurooffice,
    richdocuments) that own their own chrome. Observed on the Euro-Office editor:
    NcAppSidebar docked itself to the LEFT edge, over the editor's own rail, and
    rendered without a usable close control — because its host page provides
    neither the layout container nor the app-content siblings NcAppSidebar
    positions against.
  - A sidebar reflows the host application. A window overlays it. Only the second
    is honest about being a guest.

  So this is a self-contained fixed-position window anchored to the launcher hex.
  It carries its own close control and never assumes anything about the page it
  is dropped onto.

  Chrome, top-left, icon-only (labels are `title` + `aria-label`, i.e. hover and
  screen readers, so the header stays narrow enough to leave room for the agent's
  name):
  - Close     — plain button.
  - Sessions  — NcActions menu: start a new chat, pick a recent conversation,
                or open the full searchable history.
  - Agent     — NcActions menu listing every accessible agent, checkmarked.

  Both selectors are MENUS rather than inline controls on purpose: the window is
  ~380px wide, and an inline agent dropdown plus a recent-sessions list consumed
  most of the first screen before a single message was visible.

  The title is the AGENT, not the product. "Hermiq" was the same string on every
  page for every agent; the one thing a user needs to see before typing is which
  agent is about to answer — the same reason the agent list is one click away
  rather than buried in settings.

  Two views, switched by `activeView`: 'chat' (message list + input) and
  'history' (the full searchable CnAiHistoryList). No tab bar — the sessions menu
  is how you reach history, which keeps the header to one row.
-->
<template>
	<div
		v-if="visible"
		class="cn-ai-chat-window"
		:class="`cn-ai-chat-window--${position}`"
		role="dialog"
		:aria-label="agentLabel"
		data-testid="cn-ai-panel"
		@keydown.esc="onClose">
		<header class="cn-ai-chat-window__titlebar">
			<div class="cn-ai-chat-window__controls">
				<NcButton
					:aria-label="cnTranslate('Close')"
					:title="cnTranslate('Close')"
					type="tertiary"
					data-testid="cn-ai-panel-close"
					@click="onClose">
					<template #icon>
						<Close :size="18" />
					</template>
				</NcButton>

				<NcActions
					:aria-label="cnTranslate('Sessions')"
					:title="cnTranslate('Sessions')"
					:force-menu="true"
					data-testid="cn-ai-panel-sessions">
					<template #icon>
						<History :size="18" />
					</template>
					<NcActionButton
						:disabled="isOnNewChatScreen"
						:close-after-click="true"
						@click="onNewChat">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ cnTranslate('Start new chat') }}
					</NcActionButton>
					<NcActionCaption :name="cnTranslate('Recent conversations')" />
					<NcActionButton
						v-for="conversation in recentConversations"
						:key="conversation.uuid"
						:close-after-click="true"
						@click="onConversationSelect(conversation.uuid)">
						<template #icon>
							<MessageTextOutline :size="20" />
						</template>
						{{ conversationLabel(conversation) }}
					</NcActionButton>
					<NcActionButton
						:close-after-click="true"
						@click="activeView = 'history'">
						<template #icon>
							<History :size="20" />
						</template>
						{{ cnTranslate('View all conversations') }}
					</NcActionButton>
				</NcActions>

				<NcActions
					:aria-label="cnTranslate('Agent')"
					:title="cnTranslate('Agent')"
					:force-menu="true"
					data-testid="cn-ai-panel-agent">
					<template #icon>
						<RobotOutline :size="18" />
					</template>
					<NcActionCaption :name="cnTranslate('Agent')" />
					<NcActionButton
						v-for="agent in agentOptions"
						:key="agent.id"
						:close-after-click="true"
						@click="onAgentSelected(agent.id)">
						<template #icon>
							<Check v-if="agent.id === selectedAgentUuid" :size="20" />
							<RobotOutline v-else :size="20" />
						</template>
						{{ agent.label }}
					</NcActionButton>
					<NcActionCaption
						v-if="agentOptions.length === 0"
						:name="agentsFetchError ? cnTranslate('Could not load agents') : cnTranslate('No agents available')" />
				</NcActions>
			</div>

			<div class="cn-ai-chat-window__identity" :title="agentLabel">
				<Creation :size="16" class="cn-ai-chat-window__identity-icon" />
				<span class="cn-ai-chat-window__identity-name">{{ agentLabel }}</span>
			</div>
		</header>

		<div v-if="activeView === 'chat'" class="cn-ai-chat-window__body">
			<div class="cn-ai-chat-window__messages">
				<CnAiMessageList
					:messages="streamState.messages"
					:current-text="streamState.currentText"
					:is-streaming="streamState.isStreaming">
					<template #empty>
						<div class="cn-ai-chat-window__start" data-testid="cn-ai-chat-tab-start">
							<NcEmptyContent :name="agentLabel">
								<template #icon>
									<Creation :size="40" />
								</template>
								<template #description>
									{{ cnTranslate('Ask me anything about what you are viewing.') }}
								</template>
							</NcEmptyContent>
						</div>
					</template>
				</CnAiMessageList>
			</div>
			<div class="cn-ai-chat-window__input">
				<CnAiInput
					ref="input"
					:disabled="streamState.isStreaming"
					:chat-app-id="chatAppId"
					@send="onSend" />
			</div>
		</div>

		<div v-else class="cn-ai-chat-window__body cn-ai-chat-window__body--history">
			<CnAiHistoryList
				:conversations="conversations"
				:loading="conversationsLoading"
				:fetch-error="conversationsFetchError"
				:active-conversation-uuid="activeConversationUuid"
				:chat-app-id="chatAppId"
				:searchable="true"
				@select="onConversationSelect"
				@renamed="onConversationRenamed" />
		</div>
	</div>
</template>

<script>
import { NcActions, NcActionButton, NcActionCaption, NcButton, NcEmptyContent } from '@nextcloud/vue'
import axios from '@nextcloud/axios'
import Plus from 'vue-material-design-icons/Plus.vue'
import History from 'vue-material-design-icons/History.vue'
import Creation from 'vue-material-design-icons/Creation.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Check from 'vue-material-design-icons/Check.vue'
import RobotOutline from 'vue-material-design-icons/RobotOutline.vue'
import MessageTextOutline from 'vue-material-design-icons/MessageTextOutline.vue'
import CnAiMessageList from './CnAiMessageList.vue'
import CnAiInput from './CnAiInput.vue'
import CnAiHistoryList from './CnAiHistoryList.vue'
import {
	DEFAULT_CHAT_APP_ID,
	agentsUrl,
	conversationsUrl,
	normalizeConversation,
} from '../../composables/aiChatConfig.js'

/** Recent conversations offered directly in the sessions menu — top N of the fetched list. */
const RECENT_CONVERSATIONS_LIMIT = 5

/** Longest conversation title shown in the sessions menu before ellipsis. */
const MENU_TITLE_MAX = 40

export default {
	name: 'CnAiChatPanel',

	components: {
		NcActions,
		NcActionButton,
		NcActionCaption,
		NcButton,
		NcEmptyContent,
		Plus,
		History,
		Creation,
		Close,
		Check,
		RobotOutline,
		MessageTextOutline,
		CnAiMessageList,
		CnAiInput,
		CnAiHistoryList,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	/**
	 * Declared so the linter can check them and a consumer can read the
	 * component's outward surface without grepping for `$emit`. These four were
	 * always emitted; only the declaration is new.
	 */
	emits: ['close', 'send', 'new-thread', 'load-conversation'],

	props: {
		/** Controls panel visibility */
		visible: {
			type: Boolean,
			default: false,
		},

		/**
		 * Reactive state from useAiChatStream: `{ messages, currentText, isStreaming, conversationUuid }`.
		 */
		streamState: {
			type: Object,
			required: true,
		},

		/**
		 * The launcher button, kept for focus return on close.
		 */
		fabRef: {
			type: [Object, null],
			default: null,
		},

		/**
		 * Corner the window is anchored to — mirrors the launcher hex's own
		 * `position`, so the window opens from the button rather than across
		 * the page from it.
		 * @type {'bottom-right'|'bottom-left'|'top-right'|'top-left'}
		 */
		position: {
			type: String,
			default: 'bottom-right',
		},

		/**
		 * Backend app id that answers the chat/agents/conversations HTTP calls.
		 */
		chatAppId: {
			type: String,
			default: DEFAULT_CHAT_APP_ID,
		},
	},

	data() {
		return {
			activeView: 'chat',
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
		/** Top N conversations offered directly in the sessions menu. */
		recentConversations() {
			return this.conversations.slice(0, RECENT_CONVERSATIONS_LIMIT)
		},

		/**
		 * Agents as `{ id, label }`, matching the shape the old inline picker
		 * used — the agents API returns `uuid` on some deployments and `id` on
		 * others, and both have been seen in the wild.
		 * @return {Array<{id: string, label: string}>} Selectable agents.
		 */
		agentOptions() {
			return this.agents.map((agent) => ({
				id: agent.uuid || agent.id,
				label: agent.name || agent.title || this.cnTranslate('Untitled agent'),
			}))
		},

		/**
		 * The window's title: the selected agent's name.
		 *
		 * Falls back while the agent list is still loading, and again if it
		 * failed — a titlebar with an empty title reads as a broken window, so
		 * every branch names something.
		 * @return {string} Title text.
		 */
		agentLabel() {
			const selected = this.agentOptions.find((agent) => agent.id === this.selectedAgentUuid)
			if (selected) {
				return selected.label
			}

			return this.agentsLoading
				? this.cnTranslate('Loading…')
				: this.cnTranslate('AI assistant')
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
		 * A conversation's menu label, trimmed to keep the menu one line per row.
		 * @param {{title: string, uuid: string}} conversation The conversation.
		 * @return {string} Display label.
		 */
		conversationLabel(conversation) {
			const title = (conversation.title || '').trim() || this.cnTranslate('Untitled conversation')

			return title.length > MENU_TITLE_MAX
				? `${title.slice(0, MENU_TITLE_MAX - 1)}…`
				: title
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
			this.activeView = 'chat'
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
			this.activeView = 'chat'
			this.$emit('load-conversation', uuid)
		},

		/**
		 * Keep the panel's own conversation list (feeding both the sessions menu
		 * and the history view) in sync after an inline rename/describe save,
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
		 * Fetch the agent list for the agent menu. Defaults the selection to the
		 * first accessible agent — the agents API has no "default agent"
		 * indicator to prefer instead (verified against hermiq's
		 * AgentsController::index()/serializeAgent()). Degrades gracefully on
		 * failure: the menu shows an inline notice but the rest of the window
		 * (history, message input) stays usable.
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
		 * Fetch the caller's conversations once, feeding both the sessions menu's
		 * recent entries (top 5) and the history view's full searchable list — a
		 * single fetch keeps both surfaces consistent.
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
/* The window itself. Fixed, anchored to the same corner as the launcher hex,
   and sized to sit comfortably on a laptop viewport without covering the
   host application it is a guest on.

   `!important` is deliberate and matches CnAiFloatingButton's reasoning: this
   markup lands inside third-party apps whose stylesheets we do not control. */
.cn-ai-chat-window {
	position: fixed !important;
	z-index: 9001 !important; /* above the launcher hex (9000) */
	display: flex !important;
	flex-direction: column !important;
	width: 380px;
	max-width: calc(100vw - 32px);
	height: 600px;
	max-height: calc(100vh - 120px);
	overflow: hidden;
	border: 1px solid var(--color-border, #d0d0d0);
	border-radius: 12px;
	background: var(--color-background-hover, #f5f5f5);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* Anchored clear of the hex rather than on top of it: the hex is 26x30 at a
   24px inset, so 70px leaves the launcher visible and clickable to close. */
.cn-ai-chat-window--bottom-right {
	right: 24px;
	bottom: 70px;
}

.cn-ai-chat-window--bottom-left {
	left: 24px;
	bottom: 70px;
}

.cn-ai-chat-window--top-right {
	top: 70px;
	right: 24px;
}

.cn-ai-chat-window--top-left {
	top: 70px;
	left: 24px;
}

/* White titlebar over the light-grey body — the one contrast that tells a
   guest window's chrome apart from its content. */
.cn-ai-chat-window__titlebar {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	gap: 8px;
	padding: 4px 8px;
	border-bottom: 1px solid var(--color-border, #d0d0d0);
	background: var(--color-main-background, #ffffff);
}

.cn-ai-chat-window__controls {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	gap: 2px;
}

/* The agent's identity, after the controls. `min-width: 0` + ellipsis so a
   long agent name shortens instead of pushing the controls off the edge. */
.cn-ai-chat-window__identity {
	display: flex;
	flex: 1 1 auto;
	gap: 6px;
	align-items: center;
	min-width: 0;
}

.cn-ai-chat-window__identity-icon {
	flex: 0 0 auto;
	color: var(--color-primary-element, #21468b);
}

.cn-ai-chat-window__identity-name {
	overflow: hidden;
	font-weight: 600;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.cn-ai-chat-window__body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-height: 0; /* allow flex children to shrink past their content size */
}

.cn-ai-chat-window__body--history {
	overflow-y: auto;
	padding: 8px;
}

.cn-ai-chat-window__messages {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	padding: 8px;
}

.cn-ai-chat-window__input {
	flex: 0 0 auto;
	padding: 8px;
	border-top: 1px solid var(--color-border, #d0d0d0);
	background: var(--color-main-background, #ffffff);
}

/* Empty state: just the agent's name and the prompt. The agent picker and the
   recent-sessions list used to live here and now live in the titlebar menus —
   on a 380px window they filled the first screen before any message did. */
.cn-ai-chat-window__start {
	display: flex;
	flex-direction: column;
	align-self: stretch;
	gap: 16px;
	width: 100%;
	margin: 0 auto;
	padding: 0 12px;
}
</style>
