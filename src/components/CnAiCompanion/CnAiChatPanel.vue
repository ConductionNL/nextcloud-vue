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

  Titlebar: the AGENT's icon and name left-aligned (a long name gets the whole
  remaining row), then the controls pushed to the RIGHT, icon-only — labels ride
  on `title` + `aria-label`, so they reach hover and screen readers without
  spending width the agent's name needs:
  - Settings  — NcActions menu. The AGENT LIVES IN HERE: choosing one is a
                setting of the session, not a peer of "close".
  - Sessions  — NcActions menu: start a new chat, pick a recent conversation,
                or open the full searchable history.
  - Close     — plain button, at the outside edge where it is hardest to hit by
                accident.

  Both selectors are MENUS rather than inline controls on purpose: the window is
  ~380px wide, and an inline agent dropdown plus a recent-sessions list consumed
  most of the first screen before a single message was visible.

  The window is anchored ABOVE the launcher with a white pointer aimed at it, and
  animates from that point, so it reads as speech coming out of the hex rather
  than as an unrelated panel that appeared nearby.

  The title is the AGENT, not the product. "Hermiq" was the same string on every
  page for every agent; the one thing a user needs to see before typing is which
  agent is about to answer — the same reason the agent list is one click away
  rather than buried in settings.

  Two views, switched by `activeView`: 'chat' (message list + input) and
  'history' (the full searchable CnAiHistoryList). No tab bar — the sessions menu
  is how you reach history, which keeps the header to one row.
-->
<template>
	<!--
	  The window grows out of the hex and shrinks back into it.

	  `transform-origin` is set per corner to the pointer's tip — the point the
	  hex sits under — so the scale animation converges on the launcher rather
	  than on the window's own centre. That single property is what makes it read
	  as "this came from there" instead of "a box faded in".
	-->
	<transition :name="`cn-ai-chat-window-pop-${position}`">
		<div
			v-if="visible"
			class="cn-ai-chat-window"
			:class="`cn-ai-chat-window--${position}`"
			role="dialog"
			:aria-label="agentLabel"
			data-testid="cn-ai-panel"
			@keydown.esc="onClose">
			<header class="cn-ai-chat-window__titlebar">
				<!--
			  Identity FIRST in source order and left-aligned: a long agent name
			  gets the whole remaining row, and the controls are pushed right by
			  the identity's `flex: 1`. Reading order matches visual order, so
			  screen readers announce whose window this is before its controls.
			-->
				<div class="cn-ai-chat-window__identity" :title="agentLabel">
					<!--
				  The AGENT's icon, not a generic sparkle. `Agent.icon` is an MDI
				  registry name picked with CnIconPicker, so the same icon shown in
				  the agent list and on its detail page is shown here — the window
				  is that agent's window, and a shared mark is what says so.
				  Falls back to the list's default agent icon when unset.
				-->
					<CnDashboardIcon
						:name="agentIconName"
						:size="16"
						class="cn-ai-chat-window__identity-icon" />
					<span class="cn-ai-chat-window__identity-name">{{ agentLabel }}</span>
				</div>

				<div class="cn-ai-chat-window__controls">
					<!--
				  Settings first, close last — destructive-adjacent controls sit
				  at the outside edge where they are hardest to hit by accident,
				  and the menus a user opens repeatedly sit inboard.

				  The AGENT LIVES IN HERE rather than in its own button: picking
				  an agent is a setting of the session, not a peer of "close".
				-->
					<NcActions
						:aria-label="cnTranslate('Session settings')"
						:title="cnTranslate('Session settings')"
						:force-menu="true"
						data-testid="cn-ai-panel-settings">
						<template #icon>
							<Cog :size="18" />
						</template>
						<NcActionCaption :name="agentCaption" />
						<NcActionButton
							v-for="agent in visibleAgentOptions"
							:key="agent.id"
							:close-after-click="true"
							@click="onAgentSelected(agent.id)">
							<template #icon>
								<Check v-if="agent.id === selectedAgentUuid" :size="20" />
								<CnDashboardIcon v-else :name="agent.icon" :size="20" />
							</template>
							{{ agent.label }}
						</NcActionButton>
						<!--
					  The escape hatch is NOT optional. The relevance rule below is a
					  heuristic over tool ids, so it will be wrong sometimes; an agent
					  the user knows exists and cannot reach reads as data loss. This
					  stays visible whenever anything is being hidden.
					-->
						<NcActionButton
							v-if="hiddenAgentCount > 0"
							:close-after-click="false"
							data-testid="cn-ai-panel-all-agents"
							@click="showAllAgents = true">
							<template #icon>
								<DotsHorizontal :size="20" />
							</template>
							{{ cnTranslate('All agents') }} ({{ agentOptions.length }})
						</NcActionButton>
						<NcActionCaption
							v-if="agentOptions.length === 0"
							:name="agentsFetchError ? cnTranslate('Could not load agents') : cnTranslate('No agents available')" />
					</NcActions>

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
	</transition>
</template>

<script>
import { NcActions, NcActionButton, NcActionCaption, NcButton, NcEmptyContent } from '@nextcloud/vue'
import axios from '@nextcloud/axios'
import Plus from 'vue-material-design-icons/Plus.vue'
import History from 'vue-material-design-icons/History.vue'
import Creation from 'vue-material-design-icons/Creation.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Check from 'vue-material-design-icons/Check.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import MessageTextOutline from 'vue-material-design-icons/MessageTextOutline.vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import CnAiMessageList from './CnAiMessageList.vue'
import CnAiInput from './CnAiInput.vue'
import CnAiHistoryList from './CnAiHistoryList.vue'
import CnDashboardIcon from '../CnIconPicker/CnDashboardIcon.vue'
import {
	DEFAULT_CHAT_APP_ID,
	agentsUrl,
	conversationsUrl,
	normalizeConversation,
} from '../../composables/aiChatConfig.js'

/**
 * Shown when an agent has no `icon` set, which is most of them. Matches the
 * icon the agent list has always used, so an agent without an icon does not
 * change appearance between the list and the window title.
 *
 * @type {string}
 */
const DEFAULT_AGENT_ICON = 'RobotOutline'

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
		Cog,
		MessageTextOutline,
		DotsHorizontal,
		CnAiMessageList,
		CnAiInput,
		CnAiHistoryList,
		CnDashboardIcon,
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

		/**
		 * The page the companion is sitting on: `{ appId, pageKind, fileId, route }`.
		 *
		 * Used ONLY to decide which agents are worth offering first. An empty
		 * object means "no page context", and every agent is listed — the
		 * behaviour before filtering existed.
		 */
		context: {
			type: Object,
			default: () => ({}),
		},
	},

	/**
	 * Declared so the linter can check them and a consumer can read the
	 * component's outward surface without grepping for `$emit`. These four were
	 * always emitted; only the declaration is new.
	 */
	emits: ['close', 'send', 'new-thread', 'load-conversation'],

	data() {
		return {
			activeView: 'chat',
			activeConversationUuid: null,
			/**
			 * Whether the user has asked past the page-relevance filter. Sticky
			 * for the life of the panel: having asked for everything once, being
			 * silently re-filtered on the next open is the annoying half of this
			 * feature.
			 */
			showAllAgents: false,
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
				// `Agent.icon` is an MDI registry name (CnIconPicker); empty means
				// "use the default agent icon", which is what the list showed for
				// every agent before any of them had one set.
				icon: agent.icon || DEFAULT_AGENT_ICON,
				tools: Array.isArray(agent.tools) ? agent.tools : [],
			}))
		},

		/**
		 * The agents worth offering on THIS page, most specific first.
		 *
		 * ⚠️ This is a HEURISTIC over tool ids, and it is written to fail open.
		 * An agent is relevant when it holds a tool whose owning app is the app
		 * of the current page, OR — on a file/document page — a tool that is
		 * about documents at all.
		 *
		 * The second clause is not decoration. The demo's document agent holds
		 * `docudesk.*` tools while the page it is used on is `eurooffice`, so a
		 * plain "tool app === page app" rule HIDES exactly the agent the user
		 * wants. Matching page KIND as well as page APP is what makes the rule
		 * describe capability rather than packaging.
		 *
		 * Falls back to every agent when the filter would empty the list — an
		 * empty agent menu is indistinguishable from a broken one.
		 *
		 * @return {Array<object>} Agents judged relevant to the current page.
		 */
		relevantAgentOptions() {
			const appId = (this.context && this.context.appId) || ''
			const pageKind = (this.context && this.context.pageKind) || ''
			if (appId === '' && pageKind === '') {
				return this.agentOptions
			}

			const isDocumentPage = pageKind === 'file' || pageKind === 'document'
			const matches = this.agentOptions.filter((agent) => agent.tools.some((tool) => {
				const id = String(tool).toLowerCase()
				// Tool ids are `app.verb` or `app_verb`; the app is the first segment.
				const app = id.split(/[._]/)[0]
				if (appId !== '' && app === appId.toLowerCase()) {
					return true
				}
				return isDocumentPage && /document|file/.test(id)
			}))

			return matches.length > 0 ? matches : this.agentOptions
		},

		/**
		 * What the menu actually lists: the relevant subset, or everything once
		 * the user has asked for everything.
		 *
		 * @return {Array<object>} Agents to render.
		 */
		visibleAgentOptions() {
			return this.showAllAgents ? this.agentOptions : this.relevantAgentOptions
		},

		/**
		 * How many agents the filter is currently hiding.
		 *
		 * @return {number} Hidden count, 0 when nothing is hidden.
		 */
		hiddenAgentCount() {
			return this.agentOptions.length - this.visibleAgentOptions.length
		},

		/**
		 * The menu heading, which must SAY when the list is filtered — a silently
		 * shortened list is the same failure as a silently truncated one.
		 *
		 * @return {string} Caption text.
		 */
		agentCaption() {
			return this.hiddenAgentCount > 0
				? this.cnTranslate('Agents for this page')
				: this.cnTranslate('Agent')
		},

		/**
		 * The selected agent's icon name, for the titlebar.
		 *
		 * @return {string} An MDI registry name.
		 */
		agentIconName() {
			const selected = this.agentOptions.find((agent) => agent.id === this.selectedAgentUuid)
			return (selected && selected.icon) || DEFAULT_AGENT_ICON
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
	max-height: calc(100vh - 160px);
	/* NOT `overflow: hidden` — the pointer below is drawn outside this box and
	   would be clipped away. The rounded corners are held by the titlebar and
	   input rows clipping their own ends instead. */
	border: 1px solid var(--color-border, #d0d0d0);
	border-radius: 12px;
	background: var(--color-background-hover, #f5f5f5);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* Anchored ABOVE the hex and inboard of it.
 *
 * The hex sits at a 56px inset (see CnAiFloatingButton) to clear the host
 * application's own bottom-right chrome — an office editor puts a zoom control
 * and a status bar exactly there. The window clears the hex itself: 56px inset
 * + 30px tall + 14px for the pointer + breathing room = 108px.
 *
 * ⚠️ THE POINTER IS AIMED AT THE HEX, and the arithmetic is the only thing
 * keeping it there. The hex is 36px wide at a 56px inset, so its centre is
 * 56 + 18 = 74px from the viewport edge. The window sits at a 44px inset, so the
 * pointer's own centre must be 74 - 44 = 30px in from the window's edge; the
 * triangle is 22px wide, so its leading edge is 30 - 11 = 19px.
 *
 * Change the hex size, the hex inset, or the window inset, and this number is
 * wrong — the arrow will point at empty space beside the button, which reads as
 * a rendering bug rather than a measurement one. */
.cn-ai-chat-window {
	--cn-ai-pointer-offset: 19px;
}

.cn-ai-chat-window--bottom-right {
	right: 44px;
	bottom: 108px;
}

.cn-ai-chat-window--bottom-left {
	left: 44px;
	bottom: 108px;
}

.cn-ai-chat-window--top-right {
	top: 108px;
	right: 44px;
}

.cn-ai-chat-window--top-left {
	top: 108px;
	left: 44px;
}

/* The pointer: a white triangle under the window, aimed at the hex, so the
   window reads as speech FROM the launcher rather than as an unrelated panel
   that happened to appear. Built from two stacked triangles — the lower one is
   the border colour and sits 1px further down, which is what gives the visible
   1px edge along the two diagonals. `overflow: hidden` on the window would clip
   these, which is why the window does not use it. */
.cn-ai-chat-window--bottom-right::after,
.cn-ai-chat-window--bottom-left::after,
.cn-ai-chat-window--bottom-right::before,
.cn-ai-chat-window--bottom-left::before {
	position: absolute;
	top: 100%;
	width: 0;
	height: 0;
	content: '';
	border-right: 11px solid transparent;
	border-left: 11px solid transparent;
}

/* Border layer, 1px lower and 1px wider than the fill. */
.cn-ai-chat-window--bottom-right::before,
.cn-ai-chat-window--bottom-left::before {
	border-top: 12px solid var(--color-border, #d0d0d0);
}

/* Fill layer, in the titlebar's white so the pointer belongs to the chrome. */
.cn-ai-chat-window--bottom-right::after,
.cn-ai-chat-window--bottom-left::after {
	margin-top: -1px;
	border-top: 12px solid var(--color-main-background, #ffffff);
}

.cn-ai-chat-window--bottom-right::before,
.cn-ai-chat-window--bottom-right::after {
	right: var(--cn-ai-pointer-offset);
}

.cn-ai-chat-window--bottom-left::before,
.cn-ai-chat-window--bottom-left::after {
	left: var(--cn-ai-pointer-offset);
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
	/* Clips its own top corners, since the window can no longer use
	   `overflow: hidden` (it would eat the pointer). */
	border-radius: 11px 11px 0 0;
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
	/* Mirrors the titlebar: clips its own bottom corners. */
	border-radius: 0 0 11px 11px;
	background: var(--color-main-background, #ffffff);
}

/* ── The pop animation ──────────────────────────────────────────────────────
 *
 * Scale + fade, with `transform-origin` at the corner the hex sits under, so the
 * window converges on the launcher. 0.14 rather than 0 as the start scale: a
 * true zero briefly renders a 0x0 box that some engines treat as invisible for
 * hit-testing, and the tiny non-zero keeps the transition interruptible if the
 * user toggles the hex twice quickly.
 *
 * Leave is faster than enter (140ms vs 180ms) — dismissal should feel immediate,
 * while appearance can afford to be seen. */
.cn-ai-chat-window-pop-bottom-right-enter-active,
.cn-ai-chat-window-pop-bottom-left-enter-active,
.cn-ai-chat-window-pop-top-right-enter-active,
.cn-ai-chat-window-pop-top-left-enter-active {
	transition: transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity 0.14s ease-out;
}

.cn-ai-chat-window-pop-bottom-right-leave-active,
.cn-ai-chat-window-pop-bottom-left-leave-active,
.cn-ai-chat-window-pop-top-right-leave-active,
.cn-ai-chat-window-pop-top-left-leave-active {
	transition: transform 0.14s ease-in, opacity 0.12s ease-in;
}

.cn-ai-chat-window-pop-bottom-right-enter,
.cn-ai-chat-window-pop-bottom-right-enter-from,
.cn-ai-chat-window-pop-bottom-right-leave-to {
	transform: scale(0.14);
	transform-origin: calc(100% - var(--cn-ai-pointer-offset) - 11px) 100%;
	opacity: 0;
}

.cn-ai-chat-window-pop-bottom-left-enter,
.cn-ai-chat-window-pop-bottom-left-enter-from,
.cn-ai-chat-window-pop-bottom-left-leave-to {
	transform: scale(0.14);
	transform-origin: calc(var(--cn-ai-pointer-offset) + 11px) 100%;
	opacity: 0;
}

.cn-ai-chat-window-pop-top-right-enter,
.cn-ai-chat-window-pop-top-right-enter-from,
.cn-ai-chat-window-pop-top-right-leave-to {
	transform: scale(0.14);
	transform-origin: calc(100% - var(--cn-ai-pointer-offset) - 11px) 0%;
	opacity: 0;
}

.cn-ai-chat-window-pop-top-left-enter,
.cn-ai-chat-window-pop-top-left-enter-from,
.cn-ai-chat-window-pop-top-left-leave-to {
	transform: scale(0.14);
	transform-origin: calc(var(--cn-ai-pointer-offset) + 11px) 0%;
	opacity: 0;
}

/* Someone who asked not to be moved gets the window without the flight. */
@media (prefers-reduced-motion: reduce) {
	.cn-ai-chat-window-pop-bottom-right-enter-active,
	.cn-ai-chat-window-pop-bottom-left-enter-active,
	.cn-ai-chat-window-pop-top-right-enter-active,
	.cn-ai-chat-window-pop-top-left-enter-active,
	.cn-ai-chat-window-pop-bottom-right-leave-active,
	.cn-ai-chat-window-pop-bottom-left-leave-active,
	.cn-ai-chat-window-pop-top-right-leave-active,
	.cn-ai-chat-window-pop-top-left-leave-active {
		transition: opacity 0.1s linear;
	}

	.cn-ai-chat-window-pop-bottom-right-enter,
	.cn-ai-chat-window-pop-bottom-left-enter,
	.cn-ai-chat-window-pop-top-right-enter,
	.cn-ai-chat-window-pop-top-left-enter,
	.cn-ai-chat-window-pop-bottom-right-leave-to,
	.cn-ai-chat-window-pop-bottom-left-leave-to,
	.cn-ai-chat-window-pop-top-right-leave-to,
	.cn-ai-chat-window-pop-top-left-leave-to {
		transform: none;
	}
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
