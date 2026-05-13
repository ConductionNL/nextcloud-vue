<!--
  CnAiChatPanel — AI Chat Companion panel built on Nextcloud's NcAppSidebar.

  Uses the native NcAppSidebar component (proper NC theming, a11y, slide
  animation, focus management) rather than a hand-rolled fixed-position div.
  Falls naturally into the right edge alongside CnObjectSidebar.

  Header: agent name (NcAppSidebar's built-in title). Custom secondary
  actions (Start new chat + History) live in the `secondary-actions` slot.
  Default body: CnAiMessageList + CnAiInput inside a single tab.
  History dialog: still a separate NcDialog (per ADR-004 file-isolation rule).

  Focus management is owned by NcAppSidebar itself (NC handles Escape to close,
  focus trap, focus return on close).
-->
<template>
	<NcAppSidebar
		v-if="visible"
		:name="agentName"
		:title="agentName"
		:active="activeTab"
		:force-menu="true"
		data-testid="cn-ai-panel"
		@close="onClose"
		@update:active="activeTab = $event">
		<template #description>
			{{ cnTranslate('Context-aware assistant') }}
		</template>

		<template #secondary-actions>
			<NcActionButton
				:aria-label="cnTranslate('Start new chat')"
				:title="cnTranslate('Start new chat')"
				@click="onNewChat">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ cnTranslate('Start new chat') }}
			</NcActionButton>
			<NcActionButton
				:aria-label="cnTranslate('History')"
				:title="cnTranslate('History')"
				@click="isHistoryOpen = true">
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
				<Creation :size="20" />
			</template>
			<div class="cn-ai-chat-tab">
				<div class="cn-ai-chat-tab__messages">
					<CnAiMessageList
						:messages="streamState.messages"
						:current-text="streamState.currentText">
						<template #empty>
							<NcEmptyContent :name="cnTranslate('AI assistant')">
								<template #icon>
									<Creation :size="48" />
								</template>
								<template #description>
									{{ cnTranslate('Ask me anything about what you are viewing.') }}
								</template>
							</NcEmptyContent>
						</template>
					</CnAiMessageList>
				</div>
				<div class="cn-ai-chat-tab__input">
					<CnAiInput
						ref="input"
						:disabled="streamState.isStreaming"
						@send="onSend" />
				</div>
			</div>
		</NcAppSidebarTab>

		<!-- History dialog (NcDialog overlay, per ADR-004 file-isolation rule) -->
		<CnAiHistoryDialog
			:open="isHistoryOpen"
			:active-conversation-uuid="activeConversationUuid"
			@update:open="onHistoryOpenUpdate"
			@select="onConversationSelect" />
	</NcAppSidebar>
</template>

<script>
import { NcActionButton, NcAppSidebar, NcAppSidebarTab, NcEmptyContent } from '@nextcloud/vue'
import Creation from 'vue-material-design-icons/Creation.vue'
import History from 'vue-material-design-icons/History.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnAiHistoryDialog from '../../dialogs/CnAiHistoryDialog.vue'
import CnAiInput from './CnAiInput.vue'
import CnAiMessageList from './CnAiMessageList.vue'

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
		CnAiMessageList,
		CnAiInput,
		CnAiHistoryDialog,
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
		 * Contains: isStreaming, currentText, toolCalls, error, messages.
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
	},

	emits: ['close', 'send', 'new-thread', 'load-conversation'],

	data() {
		return {
			activeTab: 'chat',
			isHistoryOpen: false,
			activeConversationUuid: null,
		}
	},

	computed: {
		agentName() {
			return this.cnTranslate('AI assistant')
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
	},

	methods: {
		onClose() {
			this.$emit('close')
		},

		onSend(text) {
			this.$emit('send', text)
		},

		onNewChat() {
			this.$emit('new-thread')
		},

		onHistoryOpenUpdate(val) {
			this.isHistoryOpen = val
		},

		onConversationSelect(uuid) {
			this.activeConversationUuid = uuid
			this.$emit('load-conversation', uuid)
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
</style>
