<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<!--
  CnAiChatWidget — the AI Chat Companion as a widget (`type: "ai-chat"`), so a
  page can place the assistant in its own flow: a detail page tab, a card. It is
  the same companion as the launcher's floating window, embedded: the same
  health probe, agents, sessions and stream, always open and without the hex.
  The floating companion keeps working beside it.

  The page context (record, register, schema) is the one CnAppRoot provides and
  the detail page fills in, so the agents offered are the ones relevant here.
  Renders nothing when the chat backend does not answer.
-->
<template>
	<div class="cn-ai-chat-widget" data-testid="cn-ai-chat-widget">
		<CnAiCompanion
			:embedded="true"
			:chatAppId="content.chatAppId || defaultChatAppId" />
	</div>
</template>

<script>
import CnAiCompanion from './CnAiCompanion.vue'
import { DEFAULT_CHAT_APP_ID } from '../../composables/aiChatConfig.js'

export default {
	name: 'CnAiChatWidget',

	components: {
		CnAiCompanion,
	},

	props: {
		/**
		 * The widget's content: `chatAppId`, the backend app that answers the
		 * chat (defaults to the companion's own).
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			defaultChatAppId: DEFAULT_CHAT_APP_ID,
		}
	},
}
</script>
