<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-case-widget-card">
		<CnConversationThread
			:messages="messages"
			:title="tr(content.title || '')"
			:subtitle="tr(content.subtitle || '')"
			:showDirection="content.showDirection === true"
			:allowReply="content.allowReply !== false"
			:replyLabel="content.replyLabel ? tr(content.replyLabel) : undefined"
			:placeholder="tr(content.placeholder || '')"
			:sendLabel="content.sendLabel ? tr(content.sendLabel) : undefined"
			:replyHint="tr(content.replyHint || '')"
			:replyOption="replyOption"
			:endpoint="replyAction ? '' : endpoint"
			:loading="loading"
			:emptyText="content.emptyText ? tr(content.emptyText) : undefined"
			:channelFilter="content.channelChips === true"
			:channels="channelLabels"
			@send="onSend"
			@sent="onSent">
			<template v-if="headerAction" #header-actions>
				<NcButton
					data-testid="cn-conversation-header-action"
					@click="onHeaderAction">
					<template v-if="headerAction.icon" #icon>
						<CnIcon :name="headerAction.icon" :size="20" />
					</template>
					{{ tr(headerAction.label) }}
				</NcButton>
			</template>
		</CnConversationThread>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnConversationThread from './CnConversationThread.vue'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { fetchReferenceObjects } from '../../utils/boardReferenceColumns.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedDeepTokens, resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { userDisplayName } from '../../utils/userDisplayName.js'

/**
 * CnConversationWidget: the `conversation` detail widget type.
 *
 * Renders CnConversationThread from the messages of a record, oldest first.
 * The messages are a list on the bound record (`field`), or the objects of a
 * register list (`source: { register, schema, filter?, limit? }`, the filter
 * token-resolved like a record-list's: `{ "case": "@objectId" }`).
 *
 * Mapping keys name where each message keeps its parts: `textField` (alias
 * `bodyField`), `timeField` (alias `timestampField`), `authorField` (alias
 * `senderField`), `sideField` (alias `directionField`) with `usValue` (alias
 * `outValue`) for the messages the organisation sent, and `channelField` with
 * an optional `channelMap` from stored value to label ("email" to "E-mail").
 *
 * The reply box posts to `endpoint` (`@objectId` filled in), or runs
 * `replyAction`, an action descriptor the app decides the meaning of: it is
 * dispatched with `args: [{ text, objectId }]` and `props.text`. After a send
 * the source is read again.
 *
 * `channelChips: true` draws a chip per channel above the thread (every
 * `channelMap` label, in map order, then any other channel a message uses).
 * `headerAction` is a button beside the title (`{ label, icon?, ...action }`,
 * DqZaakContact's "Contact vastleggen"), dispatched like `replyAction` with
 * `args: [{ objectId }]`; after it the source is read again.
 */
export default {
	name: 'CnConversationWidget',

	components: {
		CnConversationThread,
		CnIcon,
		NcButton,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
		/** Pre-bound action dispatcher of the page, for `replyAction`. */
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * The widget's content: `field` (the dot-path to the messages on the
		 * record) or `source`, the mapping keys, `endpoint` or `replyAction`,
		 * and the texts (`title`, `replyLabel`, `placeholder`, `sendLabel`,
		 * `emptyText`, translated).
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The bound record. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The bound record's id. */
		objectId: {
			type: [String, Number],
			default: '',
		},
	},

	data() {
		return {
			/** Replies sent from this widget that the record does not hold yet. */
			sentHere: [],
			/** The messages read from `source`. */
			listed: [],
			/** Whether `source` is being read. */
			loading: false,
		}
	},

	computed: {
		/** @return {object|null} The register list the messages come from, or null. */
		source() {
			const source = this.content?.source
			return source && typeof source === 'object' && source.register && source.schema ? source : null
		},

		/** @return {object|null} The header action, or null without a label. */
		headerAction() {
			const action = this.content?.headerAction
			return action && typeof action === 'object' && typeof action.label === 'string' && action.label !== '' ? action : null
		},

		/** @return {Array<string>} The `channelMap` labels, translated, each once. */
		channelLabels() {
			const map = this.content?.channelMap && typeof this.content.channelMap === 'object' ? this.content.channelMap : {}
			return [...new Set(Object.values(map).filter((label) => typeof label === 'string' && label !== '').map((label) => this.tr(label)))]
		},

		/**
		 * `content.replyOption` with its label translated, or null.
		 *
		 * @return {{label: string, key: string, value?: boolean}|null}
		 * @spec openspec/changes/conversation-reply-option/specs/conversation-source/spec.md#requirement-a-reply-can-carry-a-hint-and-an-option
		 */
		replyOption() {
			const option = this.content?.replyOption
			return option && typeof option === 'object' && option.label && option.key
				? { ...option, label: this.tr(option.label) }
				: null
		},

		/** @return {object|null} The reply action, or null. */
		replyAction() {
			const action = this.content?.replyAction
			return action && typeof action === 'object' ? action : null
		},

		/**
		 * The messages in the thread's shape, oldest first, plus the replies
		 * sent here.
		 *
		 * @return {Array<object>} The messages.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 * @spec openspec/changes/conversation-source/specs/conversation-source/spec.md#requirement-a-conversation-reads-its-messages-from-a-list-and-maps-their-parts
		 */
		messages() {
			const c = this.content || {}
			const raw = this.source ? this.listed : readPath(this.objectData || {}, c.field || 'messages')
			const usValue = String(c.outValue ?? c.usValue ?? 'us')
			const channelMap = c.channelMap && typeof c.channelMap === 'object' ? c.channelMap : {}
			const stored = (Array.isArray(raw) ? raw : [])
				.filter((message) => message && typeof message === 'object')
				.map((message, index) => {
					const channel = c.channelField ? readPath(message, c.channelField) : undefined
					const channelKey = channel === undefined || channel === null ? '' : String(channel)
					const side = String(readPath(message, c.directionField || c.sideField || 'side')) === usValue ? 'us' : 'them'
					return {
						id: message.id ?? `message-${index}`,
						author: this.authorOf(message, side),
						note: c.noteField ? this.textOf(readPath(message, c.noteField)) : '',
						time: readPath(message, c.timestampField || c.timeField || 'time'),
						text: readPath(message, c.bodyField || c.textField || 'text'),
						side,
						channel: channelKey === '' ? '' : this.tr(Object.hasOwn(channelMap, channelKey) ? channelMap[channelKey] : channelKey),
						order: index,
					}
				})
			const at = (message) => {
				const ms = Date.parse(message.time)
				return Number.isNaN(ms) ? null : ms
			}
			stored.sort((a, b) => {
				const ta = at(a)
				const tb = at(b)
				return (ta === null || tb === null || ta === tb) ? a.order - b.order : ta - tb
			})
			return [...stored, ...this.sentHere]
		},

		/**
		 * The endpoint with the record's id filled in.
		 *
		 * @return {string} The URL, or '' when the content names none.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 */
		endpoint() {
			const url = this.content.endpoint
			if (typeof url !== 'string' || url === '') {
				return ''
			}
			return url.replace(/@objectId/g, encodeURIComponent(String(this.objectId ?? '')))
		},

		/** @return {object} The token context for `source.filter` and `replyAction`. */
		tokenCtx() {
			return { objectId: this.objectId, object: this.objectData || {} }
		},
	},

	watch: {
		// The record was read again, so it now holds what was sent from here.
		objectData() {
			this.sentHere = []
		},

		objectId: {
			immediate: true,
			handler() {
				this.loadSource()
			},
		},
	},

	methods: {
		/**
		 * Who wrote a message: `usAuthorField` / `themAuthorField` for its
		 * side, else `senderField` (`authorField`). A field written
		 * `@object.<path>` reads the bound record (the case's requester on an
		 * incoming message). With `usAuthorFormat` / `themAuthorFormat` set to
		 * `user` the value is a user id, shown by its display name.
		 *
		 * @param {object} message The message.
		 * @param {string} side `us` or `them`.
		 * @return {string} The author, or '' when the message names none.
		 * @spec openspec/changes/conversation-board-bubble/specs/conversation-source/spec.md#requirement-a-message-names-its-author-per-side-its-direction-and-a-note
		 */
		authorOf(message, side) {
			const c = this.content || {}
			const field = (side === 'us' ? c.usAuthorField : c.themAuthorField) || c.senderField || c.authorField || 'author'
			const value = typeof field === 'string' && field.startsWith('@object.')
				? readPath(this.objectData || {}, field.slice('@object.'.length))
				: readPath(message, field)
			const text = this.textOf(value)
			const format = side === 'us' ? c.usAuthorFormat : c.themAuthorFormat
			return format === 'user' && text !== '' ? (userDisplayName(text) || text) : text
		},

		/**
		 * @param {unknown} value A stored value.
		 * @return {string} It as text, or '' for none.
		 */
		textOf(value) {
			return value === undefined || value === null || typeof value === 'object' ? '' : String(value)
		},

		/**
		 * Translate through the app's translate.
		 *
		 * @param {string} key The source string.
		 * @return {string}
		 */
		tr(key) {
			return key && typeof this.cnTranslate === 'function' ? this.cnTranslate(key) : (key || '')
		},

		/**
		 * Read the messages from `source`. A filter whose token does not
		 * resolve sends no request; a failed read leaves the thread empty.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/conversation-source/specs/conversation-source/spec.md#requirement-a-conversation-reads-its-messages-from-a-list-and-maps-their-parts
		 */
		async loadSource() {
			if (!this.source) {
				return
			}
			const raw = this.source.filter || {}
			const filter = resolveDeepTokens(raw, this.tokenCtx)
			const emptied = Object.keys(raw).some((key) => typeof raw[key] === 'string' && raw[key].startsWith('@') && (filter[key] === '' || filter[key] === null || filter[key] === undefined))
			if (emptied || hasUnresolvedDeepTokens(filter)) {
				this.listed = []
				return
			}
			this.loading = true
			try {
				this.listed = await fetchReferenceObjects({ register: this.source.register, schema: this.source.schema, filter, limit: this.source.limit || 200 })
				this.sentHere = []
			} catch {
				this.listed = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Run `replyAction` with the reply, when there is one; the endpoint
		 * path is the thread's own.
		 *
		 * @param {string} text The reply.
		 * @param {object} [extras] The reply option's state, `{ [key]: boolean }`.
		 * @return {Promise<void>}
		 * @spec openspec/changes/conversation-source/specs/conversation-source/spec.md#requirement-a-reply-can-run-an-app-action
		 * @spec openspec/changes/conversation-reply-option/specs/conversation-source/spec.md#requirement-a-reply-can-carry-a-hint-and-an-option
		 */
		async onSend(text, extras = {}) {
			if (!this.replyAction) {
				return
			}
			const resolved = resolveDeepTokens(this.replyAction, this.tokenCtx)
			const action = { ...resolved, args: [{ text, objectId: this.objectId, ...extras }], props: { ...(resolved.props || {}), text, ...extras } }
			const result = typeof this.cnDispatchAction === 'function'
				? this.cnDispatchAction(action)
				: dispatchAction(action, { router: this.$router || null })
			try {
				const outcome = await result
				if (outcome === false) {
					return
				}
			} catch {
				return
			}
			if (this.source) {
				await this.loadSource()
				return
			}
			this.onSent({ text })
		},

		/**
		 * Run `headerAction` with the record id, then read the source again.
		 *
		 * @return {Promise<void>}
		 */
		async onHeaderAction() {
			if (!this.headerAction) {
				return
			}
			const { label, icon, ...rest } = resolveDeepTokens(this.headerAction, this.tokenCtx)
			const action = { ...rest, args: [{ objectId: this.objectId }] }
			try {
				const outcome = await (typeof this.cnDispatchAction === 'function'
					? this.cnDispatchAction(action)
					: dispatchAction(action, { router: this.$router || null }))
				if (outcome === false) {
					return
				}
			} catch {
				return
			}
			await this.loadSource()
		},

		/**
		 * Show an accepted reply at once, without waiting for the record.
		 *
		 * @param {object} data The endpoint's response.
		 * @return {void}
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 */
		onSent(data) {
			const text = data?.message ?? data?.text
			if (typeof text !== 'string' || text === '') {
				return
			}
			this.sentHere.push({
				id: `sent-${this.sentHere.length}`,
				time: new Date().toISOString(),
				text,
				side: 'us',
			})
		},
	},
}
</script>

<style scoped>
.cn-case-widget-card {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: calc(5 * var(--default-grid-baseline));
}
</style>
