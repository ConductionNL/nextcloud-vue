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
		<div v-if="title || $slots['header-actions']" class="cn-conversation-thread__header">
			<div v-if="title" class="cn-conversation-thread__heading">
				<component
					:is="titleTag"
					:id="titleId"
					class="cn-conversation-thread__title">
					{{ title }}
				</component>
				<p v-if="subtitle" class="cn-conversation-thread__subtitle" data-testid="cn-conversation-subtitle">
					{{ subtitle }}
				</p>
			</div>
			<div v-if="$slots['header-actions']" class="cn-conversation-thread__header-actions">
				<!-- @slot header-actions Buttons beside the title, for example "Log contact". -->
				<slot name="header-actions" />
			</div>
		</div>

		<CnQuickFilterBar
			v-if="channelChips.length > 0"
			inline
			class="cn-conversation-thread__channels"
			:tabs="channelChips"
			:activeIndex="activeChannelIndex"
			@update:activeIndex="onChannelChip" />

		<p v-if="loading && rows.length === 0"
			class="cn-conversation-thread__empty"
			role="status"
			data-testid="cn-conversation-loading">
			{{ loadingText }}
		</p>
		<p v-else-if="rows.length === 0" class="cn-conversation-thread__empty" data-testid="cn-conversation-empty">
			{{ emptyText }}
		</p>

		<p v-else-if="shownRows.length === 0" class="cn-conversation-thread__empty" data-testid="cn-conversation-channel-empty">
			{{ emptyText }}
		</p>

		<ol v-else class="cn-conversation-thread__messages">
			<li
				v-for="row in shownRows"
				:key="row.key"
				class="cn-conversation-thread__message"
				:class="`cn-conversation-thread__message--${row.side}`"
				data-testid="cn-conversation-message"
				:data-side="row.side">
				<span class="cn-conversation-thread__avatar" aria-hidden="true">{{ row.initials }}</span>
				<div class="cn-conversation-thread__bubble">
					<span class="cn-conversation-thread__meta">
						<span class="hidden-visually">{{ row.directionLabel }}</span>
						<span class="cn-conversation-thread__author">{{ row.author }}</span>
						<span v-if="row.channel" class="cn-conversation-thread__channel" data-testid="cn-conversation-channel">{{ row.channel }}</span>
						<span v-if="row.status" class="cn-conversation-thread__status" data-testid="cn-conversation-status">{{ row.status }}</span>
						<span v-if="showDirection"
							class="cn-conversation-thread__direction"
							data-testid="cn-conversation-direction"
							aria-hidden="true">{{ row.directionWord }}</span>
						<time v-if="row.timeLabel" :datetime="row.datetime || null">{{ row.timeLabel }}</time>
					</span>
					<span class="cn-conversation-thread__text">{{ row.text }}</span>
					<span v-if="row.note" class="cn-conversation-thread__note" data-testid="cn-conversation-note">{{ row.note }}</span>
					<span v-if="row.actions.length > 0" class="cn-conversation-thread__message-actions">
						<NcButton
							v-for="action in row.actions"
							:key="action.id"
							variant="secondary"
							:disabled="action.disabled === true"
							:data-testid="`cn-conversation-action-${action.id}`"
							@click="$emit('message-action', { action: action.id, message: row.key })">
							{{ action.label }}
						</NcButton>
					</span>
				</div>
			</li>
		</ol>

		<form
			v-if="allowReply"
			class="cn-conversation-thread__reply"
			data-testid="cn-conversation-reply"
			@submit.prevent="onSend">
			<!-- @slot reply-tools Tools above the reply box, for example a template picker. -->
			<!-- @binding {Function} setDraft Puts a text in the reply box. -->
			<slot name="reply-tools" :setDraft="setDraft" />
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
import CnQuickFilterBar from '../CnQuickFilterBar/CnQuickFilterBar.vue'
import { prefixUrl } from '../../utils/headers.js'
import { userLocale } from '../../utils/userLocale.js'

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
		CnQuickFilterBar,
		NcButton,
	},

	props: {
		/**
		 * The messages, oldest first: `{ id?, author?, time?, text, side?, channel?, status?, actions?, note? }`.
		 * `status` is shown after the channel ("Failed"); `actions` are
		 * `{ id, label, disabled? }` buttons under the text, each emitting
		 * `message-action`.
		 * `note` is a muted line under the text.
		 * `side` is `us` or `them` (default `them`). `time` is an ISO
		 * date, or any text to show as is. `channel` is shown after the
		 * author ("E-mail", "Phone note"); `note` is a muted line under the text.
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

		/** A line under the title, such as "Oldest first, with the channel of each message". */
		subtitle: {
			type: String,
			default: '',
		},

		/** Say each message's direction in words before its time ("Incoming · 3 Oct"), not only to a screen reader. */
		showDirection: {
			type: Boolean,
			default: false,
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

		/** Whether the messages are still loading; with none yet the thread says so. */
		loading: {
			type: Boolean,
			default: false,
		},

		/**
		 * Draw channel chips above the messages: All, then one per channel
		 * with its count. Choosing one shows only that channel's messages.
		 */
		channelFilter: {
			type: Boolean,
			default: false,
		},

		/**
		 * Channel labels that always get a chip, in this order, also when no
		 * message uses them yet. Channels the messages use follow.
		 */
		channels: {
			type: Array,
			default: () => [],
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
		/** A message action was pressed. Payload: `{ action, message }`, the action id and the message key. */
		'message-action',
	],

	data() {
		conversationThreadUid += 1
		return {
			draft: '',
			/** The channel the chips narrow the thread to; '' is All. */
			activeChannel: '',
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
		 * @return {Array<{key: string, author: string, initials: string, side: string, text: string, timeLabel: string, datetime: string, channel: string, directionLabel: string, directionWord: string, note: string}>} The rows.
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
						channel: typeof message.channel === 'string' ? message.channel : '',
						status: typeof message.status === 'string' ? message.status : '',
						actions: Array.isArray(message.actions) ? message.actions.filter((action) => action && action.id && action.label) : [],
						directionLabel: side === 'us' ? t('nextcloud-vue', 'Sent message') : t('nextcloud-vue', 'Received message'),
						directionWord: side === 'us' ? t('nextcloud-vue', 'Outgoing') : t('nextcloud-vue', 'Incoming'),
						note: typeof message.note === 'string' ? message.note : '',
					}
				})
		},

		/**
		 * The channel labels with a chip: the declared ones, then the ones
		 * the messages use.
		 *
		 * @return {Array<string>} The labels, each once.
		 */
		channelLabels() {
			const declared = (Array.isArray(this.channels) ? this.channels : []).filter((label) => typeof label === 'string' && label !== '')
			return [...new Set([...declared, ...this.rows.map((row) => row.channel).filter(Boolean)])]
		},

		/**
		 * The chips: All, then each channel, each with its count. Empty
		 * without `channelFilter` or without channels.
		 *
		 * @return {Array<{label: string, count: number}>} The chips.
		 */
		channelChips() {
			if (!this.channelFilter || this.channelLabels.length === 0) {
				return []
			}
			return [
				{ label: t('nextcloud-vue', 'All'), count: this.rows.length },
				...this.channelLabels.map((label) => ({ label, count: this.rows.filter((row) => row.channel === label).length })),
			]
		},

		/** @return {number} The pressed chip: 0 for All. */
		activeChannelIndex() {
			const index = this.channelLabels.indexOf(this.activeChannel)
			return index < 0 ? 0 : index + 1
		},

		/** @return {Array<object>} The rows on the chosen channel, or all of them. */
		shownRows() {
			if (this.channelChips.length === 0 || this.activeChannelIndex === 0) {
				return this.rows
			}
			return this.rows.filter((row) => row.channel === this.activeChannel)
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

		/** @return {string} What the thread says while its messages load. */
		loadingText() {
			return t('nextcloud-vue', 'Loading messages…')
		},
	},

	methods: {
		/**
		 * Put a text in the reply box (a template a host tool picked).
		 *
		 * @param {string} text The text.
		 * @return {void}
		 */
		setDraft(text) {
			this.draft = typeof text === 'string' ? text : ''
		},

		/**
		 * Narrow the thread to the chip's channel; the All chip (0) clears it.
		 *
		 * @param {number|null} index The chip index.
		 * @return {void}
		 */
		onChannelChip(index) {
			this.activeChannel = index > 0 ? (this.channelLabels[index - 1] || '') : ''
		},

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
			const label = date.toLocaleString(userLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
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

.cn-conversation-thread__status {
	color: var(--color-text-maxcontrast);
	font-weight: 700;
}

.cn-conversation-thread__message-actions {
	display: flex;
	flex-wrap: wrap;
	gap: calc(2 * var(--default-grid-baseline));
	margin-top: calc(2 * var(--default-grid-baseline));
}

.cn-conversation-thread__header {
	align-items: flex-start;
	display: flex;
	flex-wrap: wrap;
	gap: calc(3 * var(--default-grid-baseline));
	justify-content: space-between;
}

.cn-conversation-thread__header-actions {
	display: flex;
	flex-wrap: wrap;
	gap: calc(2 * var(--default-grid-baseline));
}

.cn-conversation-thread__title {
	font-size: 1.1em;
	font-weight: 700;
	margin: 0;
}

.cn-conversation-thread__heading {
	display: flex;
	flex: 1 1 260px;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.cn-conversation-thread__subtitle {
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	margin: 0;
}

.cn-conversation-thread__direction,
.cn-conversation-thread__meta time {
	color: var(--color-text-maxcontrast);
}

.cn-conversation-thread__direction::after {
	content: ' ·';
}

.cn-conversation-thread__note {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
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
	align-items: center;
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

.cn-conversation-thread__channel {
	color: var(--color-text-maxcontrast);
}
</style>
