<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<section
		class="cn-conversation-thread"
		data-testid="cn-conversation-thread"
		:aria-labelledby="title ? titleId : null"
		:aria-label="title ? null : fallbackLabel">
		<component
			:is="titleTag"
			v-if="title"
			:id="titleId"
			class="cn-conversation-thread__title">
			{{ title }}
		</component>

		<p v-if="rows.length === 0" class="cn-conversation-thread__empty" data-testid="cn-conversation-empty">
			{{ emptyText }}
		</p>

		<ol v-else class="cn-conversation-thread__messages">
			<li
				v-for="row in rows"
				:key="row.key"
				class="cn-conversation-thread__message"
				:class="`cn-conversation-thread__message--${row.side}`"
				data-testid="cn-conversation-message"
				:data-side="row.side">
				<span class="cn-conversation-thread__avatar" aria-hidden="true">{{ row.initials }}</span>
				<div class="cn-conversation-thread__bubble">
					<span class="cn-conversation-thread__meta">
						<span class="cn-conversation-thread__author">{{ row.author }}</span>
						<time v-if="row.timeLabel" :datetime="row.datetime || null">{{ row.timeLabel }}</time>
					</span>
					<span class="cn-conversation-thread__text">{{ row.text }}</span>
				</div>
			</li>
		</ol>

		<form
			v-if="allowReply"
			class="cn-conversation-thread__reply"
			data-testid="cn-conversation-reply"
			@submit.prevent="onSend">
			<label :for="inputId" class="cn-conversation-thread__reply-label">{{ replyLabel }}</label>
			<textarea
				:id="inputId"
				v-model="draft"
				class="cn-conversation-thread__input"
				rows="2"
				:placeholder="placeholder || null"
				:disabled="sending"
				:aria-describedby="errorMessage ? errorId : null"
				data-testid="cn-conversation-input"
				@keydown.ctrl.enter.prevent="onSend"
				@keydown.meta.enter.prevent="onSend" />
			<p
				v-if="errorMessage"
				:id="errorId"
				class="cn-conversation-thread__error"
				role="alert"
				data-testid="cn-conversation-error">
				{{ errorMessage }}
			</p>
			<div class="cn-conversation-thread__reply-actions">
				<!-- @slot reply-actions Extra buttons before Send, for example "Save draft". -->
				<!-- @binding {string} draft The text in the reply box. -->
				<slot name="reply-actions" :draft="draft" />
				<NcButton
					variant="primary"
					type="submit"
					:disabled="!canSend"
					data-testid="cn-conversation-send">
					{{ sendLabel }}
				</NcButton>
			</div>
		</form>
	</section>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { prefixUrl } from '../../utils/headers.js'

let conversationThreadUid = 0

/**
 * CnConversationThread: the messages between you and the other party, and a box to answer.
 *
 * Each message has an author, a time and a side: `us` for the organisation,
 * `them` for the resident or customer. The reply box emits `send`, and also
 * posts to `endpoint` when one is set. It needs no Talk and no other app:
 * where the messages are stored is the host's business.
 *
 * ```vue
 * <CnConversationThread
 *   title="Contact with the resident"
 *   reply-label="Answer to the resident"
 *   :messages="[
 *     { id: 1, author: 'Sanne de Vries', time: '2026-10-04T10:52:00', side: 'them',
 *       text: 'Thank you. I would like to see all documents.' },
 *     { id: 2, time: '2026-10-04T10:24:00', side: 'us',
 *       text: 'Construction starts in March.' },
 *   ]"
 *   @send="saveReply" />
 * ```
 *
 * The `conversation` detail widget type renders this thread from a field on
 * the record.
 */
export default {
	name: 'CnConversationThread',

	components: {
		NcButton,
	},

	props: {
		/**
		 * The messages, oldest first: `{ id?, author?, time?, text, side? }`.
		 * `side` is `us` or `them` (default `them`). `time` is an ISO
		 * date, or any text to show as is.
		 */
		messages: {
			type: Array,
			default: () => [],
		},

		/** Heading of the thread. */
		title: {
			type: String,
			default: '',
		},

		/** Element the heading renders as. */
		titleTag: {
			type: String,
			default: 'h3',
		},

		/** Whether the reply box renders. Turn it off for a closed or read-only record. */
		allowReply: {
			type: Boolean,
			default: true,
		},

		/** Label of the reply box. */
		replyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Reply'),
		},

		/** Placeholder inside the reply box. */
		placeholder: {
			type: String,
			default: '',
		},

		/** Label of the send button. */
		sendLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Send'),
		},

		/** Author shown on an `us` message that names none. */
		usLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'You'),
		},

		/**
		 * URL the reply is POSTed to as `{ message }`. Empty means the host
		 * handles `send` itself and nothing is requested.
		 */
		endpoint: {
			type: String,
			default: '',
		},

		/** Extra fields sent along with `message` when `endpoint` is set. */
		payload: {
			type: Object,
			default: () => ({}),
		},

		/** Shown when there are no messages yet. */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No messages yet.'),
		},
	},

	emits: [
		/** A reply was submitted. Payload: the text. */
		'send',
		/** The endpoint accepted the reply. Payload: the response body. */
		'sent',
		/** The endpoint refused the reply. Payload: the error. */
		'error',
	],

	data() {
		conversationThreadUid += 1
		return {
			draft: '',
			sending: false,
			errorMessage: '',
			titleId: `cn-conversation-title-${conversationThreadUid}`,
			inputId: `cn-conversation-input-${conversationThreadUid}`,
			errorId: `cn-conversation-error-${conversationThreadUid}`,
		}
	},

	computed: {
		/**
		 * The messages, with author, side, time and initials resolved.
		 *
		 * @return {Array<{key: string, author: string, initials: string, side: string, text: string, timeLabel: string, datetime: string}>} The rows.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 */
		rows() {
			return (Array.isArray(this.messages) ? this.messages : [])
				.filter((message) => message && typeof message === 'object')
				.map((message, index) => {
					const side = message.side === 'us' ? 'us' : 'them'
					const author = typeof message.author === 'string' && message.author !== ''
						? message.author
						: (side === 'us' ? this.usLabel : '')
					const time = this.formatTime(message.time)
					return {
						key: message.id === undefined || message.id === null ? `message-${index}` : String(message.id),
						author,
						initials: this.initialsOf(author),
						side,
						text: message.text === undefined || message.text === null ? '' : String(message.text),
						timeLabel: time.label,
						datetime: time.datetime,
					}
				})
		},

		/**
		 * Whether there is something to send and nothing in flight.
		 *
		 * @return {boolean} True when Send is enabled.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 */
		canSend() {
			return !this.sending && this.draft.trim() !== ''
		},

		/**
		 * Accessible name for a thread without a title.
		 *
		 * @return {string} The label.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 */
		fallbackLabel() {
			return t('nextcloud-vue', 'Conversation')
		},
	},

	methods: {
		/**
		 * Up to two initials of a name, for the avatar.
		 *
		 * @param {string} name The author.
		 * @return {string} The initials, upper case.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 */
		initialsOf(name) {
			const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
			if (parts.length === 0) {
				return ''
			}
			const first = parts[0].charAt(0)
			const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
			return (first + last).toUpperCase()
		},

		/**
		 * Turn a message time into what the reader sees and what `<time>` carries.
		 *
		 * @param {unknown} value An ISO date, a Date, or text to show as is.
		 * @return {{label: string, datetime: string}} The visible label and the machine value.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 */
		formatTime(value) {
			if (value === null || value === undefined || value === '') {
				return { label: '', datetime: '' }
			}
			const date = value instanceof Date ? value : new Date(value)
			const looksLikeDate = value instanceof Date || typeof value === 'number' || /^\d{4}-\d{2}-\d{2}/.test(String(value))
			if (!looksLikeDate || Number.isNaN(date.getTime())) {
				return { label: String(value), datetime: '' }
			}
			const label = date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
			return { label, datetime: date.toISOString() }
		},

		/**
		 * Submit the reply: tell the host, and post it when an endpoint is set.
		 *
		 * Without an endpoint the box clears straight away, because the host
		 * owns the send. With one it clears only when the request succeeds, so
		 * a refused reply is still there to try again.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 */
		async onSend() {
			if (!this.canSend) {
				return
			}
			const text = this.draft.trim()
			this.errorMessage = ''
			this.$emit('send', text)
			if (!this.endpoint) {
				this.draft = ''
				return
			}
			this.sending = true
			try {
				const response = await axios.post(prefixUrl(this.endpoint), { ...this.payload, message: text })
				this.draft = ''
				this.$emit('sent', response?.data)
			} catch (error) {
				this.errorMessage = t('nextcloud-vue', 'The message could not be sent. Try again.')
				this.$emit('error', error)
			} finally {
				this.sending = false
			}
		},
	},
}
</script>

<style scoped>
.cn-conversation-thread {
	display: flex;
	flex-direction: column;
	gap: calc(3.5 * var(--default-grid-baseline));
}

.cn-conversation-thread__title {
	font-size: 1.1em;
	font-weight: 700;
	margin: 0;
}

.cn-conversation-thread__empty {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-conversation-thread__messages {
	display: flex;
	flex-direction: column;
	gap: calc(3.5 * var(--default-grid-baseline));
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-conversation-thread__message {
	display: flex;
	gap: calc(3 * var(--default-grid-baseline));
}

.cn-conversation-thread__message--us {
	flex-direction: row-reverse;
}

.cn-conversation-thread__avatar {
	align-items: center;
	background: var(--color-background-dark);
	border-radius: 50%;
	color: var(--color-main-text);
	display: flex;
	flex: none;
	font-size: 0.8em;
	font-weight: 700;
	height: 34px;
	justify-content: center;
	width: 34px;
}

.cn-conversation-thread__bubble {
	background: var(--color-background-hover);
	border-radius: var(--border-radius-large);
	border-start-start-radius: var(--border-radius-small, 4px);
	color: var(--color-main-text);
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--default-grid-baseline);
	min-width: 0;
	padding: calc(3 * var(--default-grid-baseline)) calc(3.5 * var(--default-grid-baseline));
}

.cn-conversation-thread__message--us .cn-conversation-thread__bubble {
	background: var(--color-primary-element-light);
	border-start-end-radius: var(--border-radius-small, 4px);
	border-start-start-radius: var(--border-radius-large);
	color: var(--color-primary-element-light-text);
}

.cn-conversation-thread__meta {
	display: flex;
	flex-wrap: wrap;
	font-size: 0.9em;
	gap: calc(2 * var(--default-grid-baseline));
}

.cn-conversation-thread__author {
	font-weight: 600;
}

.cn-conversation-thread__text {
	overflow-wrap: anywhere;
	white-space: pre-wrap;
}

.cn-conversation-thread__reply {
	display: flex;
	flex-direction: column;
	gap: calc(2 * var(--default-grid-baseline));
}

.cn-conversation-thread__reply-label {
	font-weight: 600;
}

.cn-conversation-thread__input {
	box-sizing: border-box;
	margin: 0;
	resize: vertical;
	width: 100%;
}

.cn-conversation-thread__error {
	color: var(--color-error-text, var(--color-error));
	margin: 0;
}

.cn-conversation-thread__reply-actions {
	display: flex;
	flex-wrap: wrap;
	gap: calc(2.5 * var(--default-grid-baseline));
	justify-content: flex-end;
}
</style>
