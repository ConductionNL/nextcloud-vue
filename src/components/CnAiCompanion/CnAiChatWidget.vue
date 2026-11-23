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
  `content.approvalTitlePrefix`, `content.allowLabel` and `content.denyLabel`
  word the cards of the approvals the assistant waits on.

  The page context (record, register, schema) is the one CnAppRoot provides and
  the detail page fills in, so the agents offered are the ones relevant here.
  Renders nothing when the chat backend does not answer.
-->
<template>
	<div class="cn-ai-chat-widget" data-testid="cn-ai-chat-widget">
		<CnAiCompanion
			:embedded="true"
			:titled="true"
			:note="noteText"
			:inputPlaceholder="tr(content.placeholder)"
			:sendLabel="tr(content.sendLabel)"
			:approvalWording="approvalWording"
			:chatAppId="content.chatAppId || defaultChatAppId"
			:openSubjectSession="content.openSubjectSession === true"
			@menu="onMenu" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import CnAiCompanion from './CnAiCompanion.vue'
import { DEFAULT_CHAT_APP_ID } from '../../composables/aiChatConfig.js'
import { matchingRows } from '../../utils/actionDialogForm.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'

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
		 * `noteFrom`, `{ url, path?, match?, requires, text }`, that line filled
		 * from an endpoint's row, used only while every `requires` field of the
		 * row is filled, else `note` stands;
		 * `placeholder` and `sendLabel`, the input's wording; `openSubjectSession`,
		 * open the user's latest session about the page's record instead of an
		 * empty thread; `approvalTitlePrefix`, `allowLabel` and `denyLabel`, the
		 * approval cards' title prefix and buttons. Texts go through the host's
		 * translate.
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
			/** The row `noteFrom` read, or null. */
			noteRow: null,
		}
	},

	computed: {
		/**
		 * The line above the input: `noteFrom`'s text once its row has every
		 * required field, else `note`.
		 *
		 * @return {string} The line.
		 * @spec openspec/changes/ai-chat-note-from/specs/ai-chat-note-from/spec.md#requirement-the-chat-note-can-read-its-facts-from-an-endpoint
		 */
		noteText() {
			const from = this.content.noteFrom
			const requires = from && Array.isArray(from.requires) ? from.requires : []
			if (this.noteRow && requires.every((field) => Boolean(this.noteRow[field]))) {
				return fillTemplate(this.tr(from.text), this.noteRow)
			}
			return this.tr(this.content.note)
		},

		/**
		 * The approval cards' wording from the content, translated.
		 *
		 * @return {{titlePrefix: string, allow: string, deny: string}} The wording.
		 * @spec openspec/changes/ai-chat-approval-wording/specs/ai-chat-approval-wording/spec.md#requirement-an-app-can-word-the-approval-card
		 */
		approvalWording() {
			return {
				titlePrefix: this.tr(this.content.approvalTitlePrefix),
				allow: this.tr(this.content.allowLabel),
				deny: this.tr(this.content.denyLabel),
			}
		},
	},

	mounted() {
		this.onMenu([])
	},

	mounted() {
		this.loadNoteRow()
	},

	methods: {
		/**
		 * Read the row `noteFrom` names; a failed read leaves `note` in place.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/ai-chat-note-from/specs/ai-chat-note-from/spec.md#requirement-the-chat-note-can-read-its-facts-from-an-endpoint
		 */
		async loadNoteRow() {
			const from = this.content.noteFrom
			if (!from || !from.url) {
				return
			}
			try {
				const { data } = await axios.get(generateUrl(from.url))
				const list = from.path ? readPath(data, from.path) : data
				this.noteRow = matchingRows(Array.isArray(list) ? list : [], from.match)[0] || null
			} catch {
				this.noteRow = null
			}
		},

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
