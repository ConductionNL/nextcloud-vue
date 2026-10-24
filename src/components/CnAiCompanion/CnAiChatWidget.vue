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

  The host draws the widget's titled card; the widget reports a pill
  (`content.pill`, e.g. the assistant's name) and the session controls for the
  card's menu through the `header` event. `content.note` is a line above the
  input, `content.placeholder` and `content.sendLabel` word the input.

  The page context (record, register, schema) is the one CnAppRoot provides and
  the detail page fills in, so the agents offered are the ones relevant here.
  Renders nothing when the chat backend does not answer.
-->
<template>
	<div class="cn-ai-chat-widget" data-testid="cn-ai-chat-widget">
		<CnAiCompanion
			:embedded="true"
			:titled="true"
			:note="tr(content.note)"
			:inputPlaceholder="tr(content.placeholder)"
			:sendLabel="tr(content.sendLabel)"
			:chatAppId="content.chatAppId || defaultChatAppId"
			@menu="onMenu" />
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

	inject: {
		cnTranslate: { default: null },
	},

	props: {
		/**
		 * The widget's content: `chatAppId`, the backend app that answers the
		 * chat (defaults to the companion's own); `pill` and `pillVariant`, a
		 * pill in the card's title row; `note`, a line above the input;
		 * `placeholder` and `sendLabel`, the input's wording. Texts go through
		 * the host's translate.
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['header'],

	data() {
		return {
			defaultChatAppId: DEFAULT_CHAT_APP_ID,
		}
	},

	mounted() {
		this.onMenu([])
	},

	methods: {
		/**
		 * A manifest text through the host's translate; '' for anything else.
		 *
		 * @param {string} text The text as written in the manifest.
		 * @return {string} The text in the user's language.
		 */
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * Report the card header: the pill and the panel's session controls.
		 *
		 * @param {Array<object>} menuActions The panel's controls as menu items.
		 * @return {void}
		 */
		onMenu(menuActions) {
			const label = this.tr(this.content.pill)
			/**
			 * @event header The card's title row: `pill` and `menuActions`.
			 * @type {{pill?: {label: string, variant: string}, menuActions: Array<object>}}
			 */
			this.$emit('header', {
				...(label ? { pill: { label, variant: this.content.pillVariant || 'purple' } } : {}),
				menuActions: Array.isArray(menuActions) ? menuActions : [],
			})
		},
	},
}
</script>
