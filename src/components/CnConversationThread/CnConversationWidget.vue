<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-case-widget-card">
		<CnConversationThread
			:messages="messages"
			:title="content.title || ''"
			:allowReply="content.allowReply !== false"
			:replyLabel="content.replyLabel || undefined"
			:placeholder="content.placeholder || ''"
			:sendLabel="content.sendLabel || undefined"
			:endpoint="endpoint"
			:emptyText="content.emptyText || undefined"
			@sent="onSent" />
	</div>
</template>

<script>
import CnConversationThread from './CnConversationThread.vue'
import { readPath } from '../../utils/readPath.js'

/**
 * CnConversationWidget: the `conversation` detail widget type.
 *
 * Renders CnConversationThread from a list on the bound record:
 * `content: { field, endpoint?, authorField?, timeField?, textField?, sideField?, usValue? }`.
 * `@objectId` in `endpoint` is replaced by the record's id. A reply the
 * endpoint accepts is shown at once, until the record is read again.
 * Resolved by its registry key, not exported.
 */
export default {
	name: 'CnConversationWidget',

	components: {
		CnConversationThread,
	},

	props: {
		/** The widget's content. `field` is the dot-path to the messages on the record. */
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
		}
	},

	computed: {
		/**
		 * The record's messages in the thread's shape, plus the replies sent here.
		 *
		 * @return {Array<object>} The messages.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-conversation-thread
		 */
		messages() {
			const c = this.content
			const value = readPath(this.objectData || {}, c.field || 'messages')
			const usValue = String(c.usValue === undefined ? 'us' : c.usValue)
			const stored = (Array.isArray(value) ? value : [])
				.filter((message) => message && typeof message === 'object')
				.map((message) => ({
					id: message.id,
					author: readPath(message, c.authorField || 'author'),
					time: readPath(message, c.timeField || 'time'),
					text: readPath(message, c.textField || 'text'),
					side: String(readPath(message, c.sideField || 'side')) === usValue ? 'us' : 'them',
				}))
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
	},

	watch: {
		// The record was read again, so it now holds what was sent from here.
		objectData() {
			this.sentHere = []
		},
	},

	methods: {
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
