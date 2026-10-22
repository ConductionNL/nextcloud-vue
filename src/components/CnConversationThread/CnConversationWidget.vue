<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-case-widget-card">
		<CnConversationThread
			:messages="messages"
			:title="tr(content.title || '')"
			:allowReply="content.allowReply !== false"
			:replyLabel="content.replyLabel ? tr(content.replyLabel) : undefined"
			:placeholder="tr(content.placeholder || '')"
			:sendLabel="content.sendLabel ? tr(content.sendLabel) : undefined"
			:usLabel="content.usLabel ? tr(content.usLabel) : undefined"
			:endpoint="replyAction ? '' : endpoint"
			:loading="loading"
			:emptyText="content.emptyText ? tr(content.emptyText) : undefined"
			:channelFilter="content.channelChips === true"
			:channels="channelLabels"
			:payload="replyValues"
			@send="onSend"
			@sent="onSent"
			@messageAction="onMessageAction">
			<template v-if="templates" #reply-tools="{ setDraft }">
				<CnTemplateSelect
					:url="templates.url"
					:params="templateParams"
					:inputLabel="tr(templates.inputLabel || 'Template')"
					data-testid="cn-conversation-templates"
					@apply="applyTemplate($event, setDraft)" />
			</template>
			<template v-if="replyOptions.length > 0" #reply-actions>
				<NcCheckboxRadioSwitch
					v-for="option in replyOptions"
					:key="option.key"
					v-model="replyValues[option.key]"
					:data-testid="`cn-conversation-option-${option.key}`">
					{{ tr(option.label) }}
				</NcCheckboxRadioSwitch>
			</template>
			<template v-if="headerAction || statusBadgeText" #header-actions>
				<span v-if="statusBadgeText"
					class="cn-conversation-widget__badge"
					data-testid="cn-conversation-status-badge">
					{{ statusBadgeText }}
				</span>
				<NcButton
					v-if="headerAction"
					data-testid="cn-conversation-header-action"
					@click="onHeaderAction">
					<template v-if="headerAction.icon" #icon>
						<CnIcon :name="headerAction.icon" :size="20" />
					</template>
					{{ tr(headerAction.label) }}
				</NcButton>
			</template>
		</CnConversationThread>
		<p v-if="actionError"
			class="cn-conversation-widget__error"
			role="alert"
			data-testid="cn-conversation-action-error">
			{{ actionError }}
		</p>
	</div>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnTemplateSelect from '../CnTemplateSelect/CnTemplateSelect.vue'
import CnConversationThread from './CnConversationThread.vue'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { fetchReferenceObjects } from '../../utils/boardReferenceColumns.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedDeepTokens, resolveDeepTokens } from '../../utils/resolveFilterTokens.js'

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
 * `fields: [{ field, side }]` merges several lists of the record by time,
 * each on its side (a ticket's `portalReplies` and `portalAnswers`).
 * `templates` (`{ url, params?, inputLabel, textField? }`) puts a
 * CnTemplateSelect above the reply box; picking one fills the box with the
 * option's `values[textField]` (default `text`). `replyOptions`
 * (`[{ key, label, default? }]`) are checkboxes sent with the reply: in the
 * endpoint's body and as `options` in a `replyAction`'s argument.
 * `statusField` with `statusMap` shows each message's status, and
 * `messageActions` (`[{ id, label, endpoint, method?, when?, errorText? }]`)
 * are buttons on the messages that match `when` (`{ field, in }`,
 * `{ field, equals }`, `{ field, empty: true }`, or a list of them that must
 * all hold); `{field}` in the endpoint is read from the message. `errors`
 * (`{ path, map, default, ok? }`) names an answer's refusal by its status.
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
		CnTemplateSelect,
		NcButton,
		NcCheckboxRadioSwitch,
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
		 * `usLabel`, `emptyText`, translated).
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
			/** The reply options' values, by key. */
			replyValues: this.initialReplyValues(),
			/** Why the last message action failed. */
			actionError: '',
			/** The action running, as `<action>|<message>`. */
			acting: '',
			/** The threads `statusBadge` reads. */
			badgeRows: [],
		}
	},

	computed: {
		/** @return {object|null} The register list the messages come from, or null. */
		source() {
			const source = this.content?.source
			return source && typeof source === 'object' && source.register && source.schema ? source : null
		},

		/** @return {object|null} The header action, or null without a label. */
		/** @return {string} The latest thread's status (`statusBadge`), mapped and translated; '' for none. */
		statusBadgeText() {
			const badge = this.content?.statusBadge
			if (!badge || this.badgeRows.length === 0) {
				return ''
			}
			const sortField = badge.sortField || ''
			const time = (row) => {
				const value = sortField ? Date.parse(readPath(row, sortField)) : NaN
				return Number.isNaN(value) ? 0 : value
			}
			const latest = [...this.badgeRows].sort((a, b) => time(b) - time(a))[0]
			const raw = readPath(latest, badge.path || 'status')
			if (raw === undefined || raw === null || raw === '') {
				return ''
			}
			const map = badge.map && typeof badge.map === 'object' ? badge.map : {}
			return this.tr(Object.hasOwn(map, String(raw)) ? map[String(raw)] : String(raw))
		},

		headerAction() {
			const action = this.content?.headerAction
			return action && typeof action === 'object' && typeof action.label === 'string' && action.label !== '' ? action : null
		},

		/** @return {Array<string>} The `channelMap` labels, translated, each once. */
		channelLabels() {
			const map = this.content?.channelMap && typeof this.content.channelMap === 'object' ? this.content.channelMap : {}
			return [...new Set(Object.values(map).filter((label) => typeof label === 'string' && label !== '').map((label) => this.tr(label)))]
		},

		/** @return {object|null} The template picker config, or null. */
		templates() {
			const templates = this.content?.templates
			return templates && typeof templates === 'object' && typeof templates.url === 'string' && templates.url !== '' ? templates : null
		},

		/** @return {object} The template list's params with tokens resolved. */
		templateParams() {
			return resolveDeepTokens(this.templates?.params || {}, this.tokenCtx)
		},

		/** @return {Array<object>} The reply options with a key and a label. */
		replyOptions() {
			const list = Array.isArray(this.content?.replyOptions) ? this.content.replyOptions : []
			return list.filter((option) => option && typeof option.key === 'string' && option.key !== '' && typeof option.label === 'string')
		},

		/** @return {Array<object>} The message actions with an id, a label and an endpoint. */
		messageActions() {
			const list = Array.isArray(this.content?.messageActions) ? this.content.messageActions : []
			return list.filter((action) => action && action.id && action.label && typeof action.endpoint === 'string')
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
			const usValue = String(c.outValue ?? c.usValue ?? 'us')
			const channelMap = c.channelMap && typeof c.channelMap === 'object' ? c.channelMap : {}
			const statusMap = c.statusMap && typeof c.statusMap === 'object' ? c.statusMap : {}
			const stored = this.rawMessages()
				.map(({ message, side, key }, index) => {
					const channel = c.channelField ? readPath(message, c.channelField) : undefined
					const channelKey = channel === undefined || channel === null ? '' : String(channel)
					const status = c.statusField ? readPath(message, c.statusField) : undefined
					const statusKey = status === undefined || status === null ? '' : String(status)
					return {
						id: key,
						author: readPath(message, c.senderField || c.authorField || 'author'),
						time: readPath(message, c.timestampField || c.timeField || 'time'),
						text: readPath(message, c.bodyField || c.textField || 'text'),
						side: side || (String(readPath(message, c.directionField || c.sideField || 'side')) === usValue ? 'us' : 'them'),
						channel: channelKey === '' ? '' : this.tr(Object.hasOwn(channelMap, channelKey) ? channelMap[channelKey] : channelKey),
						status: statusKey === '' ? '' : this.tr(Object.hasOwn(statusMap, statusKey) ? statusMap[statusKey] : statusKey),
						actions: this.messageActions
							.filter((action) => this.actionApplies(action, message))
							.map((action) => ({ id: action.id, label: this.tr(action.label), disabled: this.acting === `${action.id}|${key}` })),
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
				this.loadBadge()
			},
		},
	},

	mounted() {
		subscribe('cn:page:refresh', this.onPageRefresh)
	},

	beforeUnmount() {
		unsubscribe('cn:page:refresh', this.onPageRefresh)
	},

	methods: {
		/**
		 * Read the messages again when the page refreshes (a dialog sent one).
		 *
		 * @return {Promise<void>}
		 */
		async onPageRefresh() {
			await Promise.all([this.loadSource(), this.loadBadge()])
		},

		/**
		 * Read the threads whose latest status `statusBadge` shows
		 * (`{ source: { register, schema, filter?, limit? }, sortField?, path?, map? }`).
		 * A filter whose token does not resolve, or a failed read, shows no badge.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/conversation-reply-tools/specs/conversation/spec.md#requirement-a-conversation-shows-the-latest-thread-status-and-a-status-can-open-a-follow-up
		 */
		async loadBadge() {
			const source = this.content?.statusBadge?.source
			if (!source || !source.register || !source.schema) {
				this.badgeRows = []
				return
			}
			const filter = resolveDeepTokens(source.filter || {}, this.tokenCtx)
			if (hasUnresolvedDeepTokens(filter) || Object.values(filter).some((value) => value === '' || value === null || value === undefined)) {
				this.badgeRows = []
				return
			}
			try {
				const rows = await fetchReferenceObjects({ register: source.register, schema: source.schema, filter, limit: source.limit || 50 })
				this.badgeRows = Array.isArray(rows) ? rows : []
			} catch {
				this.badgeRows = []
			}
		},

		/**
		 * The stored messages with the side their list gives them: one list
		 * (`field` or `source`), or several merged (`fields`).
		 *
		 * @return {Array<{message: object, side: string, key: string}>} The messages.
		 * @spec openspec/changes/conversation-reply-tools/specs/conversation/spec.md#requirement-a-conversation-merges-several-lists-of-the-record
		 */
		rawMessages() {
			const c = this.content || {}
			const lists = !this.source && Array.isArray(c.fields) && c.fields.length > 0
				? c.fields.filter((entry) => entry && typeof entry.field === 'string').map((entry) => ({ list: readPath(this.objectData || {}, entry.field), side: entry.side === 'us' ? 'us' : 'them', prefix: entry.field }))
				: [{ list: this.source ? this.listed : readPath(this.objectData || {}, c.field || 'messages'), side: '', prefix: 'message' }]
			return lists.flatMap(({ list, side, prefix }) => (Array.isArray(list) ? list : [])
				.filter((message) => message && typeof message === 'object')
				.map((message, index) => ({ message, side, key: String(message.id ?? `${prefix}-${index}`) })))
		},

		/**
		 * Whether a message action applies to a message (`when`).
		 *
		 * @param {object} action The action.
		 * @param {object} message The stored message.
		 * @return {boolean}
		 */
		actionApplies(action, message) {
			const conditions = [].concat(action.when || [])
			return conditions.every((when) => {
				if (!when || typeof when !== 'object' || typeof when.field !== 'string') {
					return true
				}
				const value = readPath(message, when.field)
				if (when.empty === true) {
					return value === undefined || value === null || value === ''
				}
				if (Array.isArray(when.in)) {
					return when.in.map(String).includes(String(value))
				}
				return String(value) === String(when.equals)
			})
		},

		/**
		 * The reply options at their defaults.
		 *
		 * @return {object} Values by key.
		 */
		initialReplyValues() {
			const list = Array.isArray(this.content?.replyOptions) ? this.content.replyOptions : []
			return Object.fromEntries(list.filter((option) => option && option.key).map((option) => [option.key, option.default === true]))
		},

		/**
		 * Put a picked template's text in the reply box.
		 *
		 * @param {object|null} option The template option.
		 * @param {(text: string) => void} setDraft The thread's draft setter.
		 * @return {void}
		 */
		applyTemplate(option, setDraft) {
			if (!option || !option.values) {
				return
			}
			const text = option.values[this.templates.textField || 'text']
			if (typeof text === 'string') {
				setDraft(text)
			}
		},

		/**
		 * Run a message action: call its endpoint with the message's fields,
		 * then read the messages again.
		 *
		 * @param {{action: string, message: string}} event Which action on which message.
		 * @return {Promise<void>}
		 * @spec openspec/changes/conversation-reply-tools/specs/conversation/spec.md#requirement-a-message-carries-its-status-and-actions
		 */
		async onMessageAction({ action: actionId, message: key }) {
			const action = this.messageActions.find((entry) => entry.id === actionId)
			const stored = this.rawMessages().find((entry) => entry.key === key)
			if (!action || !stored || this.acting) {
				return
			}
			this.actionError = ''
			this.acting = `${actionId}|${key}`
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([import('@nextcloud/axios'), import('@nextcloud/router')])
				const path = action.endpoint
					.replace(/@objectId/g, encodeURIComponent(String(this.objectId ?? '')))
					.replace(/\{([\w.]+)\}/g, (_m, field) => encodeURIComponent(String(readPath(stored.message, field) ?? '')))
				const response = await axios.request({ method: String(action.method || 'POST').toLowerCase(), url: generateUrl(path) })
				if (await this.followUp(action, response?.data)) {
					return
				}
				const refusal = this.actionRefusal(action, response?.data)
				if (refusal) {
					this.actionError = refusal
				}
				await this.loadSource()
			} catch (error) {
				if (await this.followUp(action, error?.response?.data)) {
					return
				}
				this.actionError = this.actionRefusal(action, error?.response?.data) || this.tr(action.errorText || 'The action failed.')
			} finally {
				this.acting = ''
			}
		},

		/**
		 * Run the follow-up action a message action's answer asks for: the
		 * status at `errors.path` (default `status`) looked up in `onStatus`,
		 * dispatched like `headerAction`, tokens resolved against the record.
		 *
		 * @param {object} action The message action.
		 * @param {object|undefined} answer The response body.
		 * @return {Promise<boolean>} True when a follow-up ran.
		 * @spec openspec/changes/conversation-reply-tools/specs/conversation/spec.md#requirement-a-conversation-shows-the-latest-thread-status-and-a-status-can-open-a-follow-up
		 */
		async followUp(action, answer) {
			const map = action.onStatus
			if (!map || typeof map !== 'object' || !answer || typeof answer !== 'object') {
				return false
			}
			const status = readPath(answer, action.errors?.path || 'status')
			const next = status === undefined || status === null ? null : map[String(status)]
			if (!next || typeof next !== 'object') {
				return false
			}
			const resolved = resolveDeepTokens(next, this.tokenCtx)
			try {
				await (typeof this.cnDispatchAction === 'function'
					? this.cnDispatchAction(resolved)
					: dispatchAction(resolved, { router: this.$router || null }))
			} catch {
				return false
			}
			return true
		},

		/**
		 * The text a message action's answer names, by `errors` (`{ path, map,
		 * ok? }`): the status at `path` mapped to a text. A status listed in `ok`
		 * (default `["sent", "ok"]`) is no refusal.
		 *
		 * @param {object} action The action.
		 * @param {object|undefined} answer The response body.
		 * @return {string} The text, '' for none.
		 */
		actionRefusal(action, answer) {
			const errors = action.errors
			if (!errors || typeof errors !== 'object' || !answer || typeof answer !== 'object') {
				return ''
			}
			const status = readPath(answer, errors.path || 'status')
			if (status === undefined || status === null || (errors.ok || ['sent', 'ok']).map(String).includes(String(status))) {
				return ''
			}
			const text = (errors.map || {})[String(status)] || errors.default
			return text ? this.tr(text) : ''
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
		 * @return {Promise<void>}
		 * @spec openspec/changes/conversation-source/specs/conversation-source/spec.md#requirement-a-reply-can-run-an-app-action
		 */
		async onSend(text) {
			if (!this.replyAction) {
				return
			}
			const resolved = resolveDeepTokens(this.replyAction, this.tokenCtx)
			const options = this.replyOptions.length > 0 ? { options: { ...this.replyValues } } : {}
			const action = { ...resolved, args: [{ text, objectId: this.objectId, ...options }], props: { ...(resolved.props || {}), text, ...options } }
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
.cn-conversation-widget__badge {
	padding: 2px 10px;
	border-radius: var(--border-radius-pill);
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: var(--font-size-small, 13px);
}

.cn-conversation-widget__error {
	color: var(--color-error-text, var(--color-error));
	margin: calc(2 * var(--default-grid-baseline)) 0 0;
}

.cn-case-widget-card {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: calc(5 * var(--default-grid-baseline));
}
</style>
