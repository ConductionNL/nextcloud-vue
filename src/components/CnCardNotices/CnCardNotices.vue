<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="shown.length > 0" class="cn-card-notices" data-testid="cn-card-notices">
		<CnNoticeWidget
			v-for="entry in shown"
			:key="entry.key"
			:content="entry.notice"
			:objectData="objectData"
			:objectId="objectId"
			:inline="true"
			@action="$emit('notice-action', $event, entry.notice)"
			@dismiss="onDismiss(entry)" />
	</div>
</template>

<script>
import { evaluateVisibleWhen } from '../../utils/visibleWhen.js'
import { CnNoticeWidget } from '../CnNoticeWidget/index.js'

/**
 * CnCardNotices: the state banners at the top of a card or dialog (R1): an
 * engine refusal, a partial result, a source that is down, a success. Each
 * entry is a `notice` content (`{ variant, role?, layout?, title?, text,
 * actions?, dismissible?, visibleWhen? }`) and shows while its `visibleWhen`
 * holds, read against the card's record (async: a `source` or `endpoint`
 * condition works too). A dismissed notice stays away until the list changes.
 *
 * Used by CnWidgetWrapper, CnDetailCard, CnDataTable and CnDialog through
 * their `notices` prop.
 *
 * @event notice-action A notice button was pressed: `(entry, notice)`.
 * @event notice-dismiss A notice was closed: `(notice)`.
 */
export default {
	name: 'CnCardNotices',

	components: { CnNoticeWidget },

	props: {
		/**
		 * The notices, in order.
		 *
		 * @type {Array<object>}
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		notices: {
			type: Array,
			default: () => [],
		},

		/**
		 * The card's record: `visibleWhen` fields and `{path}` text placeholders read it.
		 *
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		objectData: {
			type: Object,
			default: null,
		},

		/** The record id, for `@objectId` in a condition. */
		objectId: {
			type: [String, Number],
			default: '',
		},
	},

	emits: ['notice-action', 'notice-dismiss'],

	data() {
		return {
			// Notice key to whether its condition held.
			allowed: {},
			dismissedKeys: [],
		}
	},

	computed: {
		/**
		 * @return {Array<{key: string, notice: object}>} The well-formed notices with a stable key.
		 *
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		entries() {
			return (Array.isArray(this.notices) ? this.notices : [])
				.filter((notice) => notice && typeof notice === 'object' && (notice.title || notice.text))
				.map((notice, index) => ({ key: notice.id || `${index}:${notice.title || ''}:${notice.text || ''}`, notice }))
		},

		/**
		 * @return {Array<{key: string, notice: object}>} The notices to draw.
		 *
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		shown() {
			return this.entries.filter((entry) => !this.dismissedKeys.includes(entry.key)
				&& (!entry.notice.visibleWhen || this.allowed[entry.key] === true))
		},
	},

	watch: {
		/**
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		notices() {
			this.dismissedKeys = []
			this.evaluate()
		},

		/**
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		objectData() {
			this.evaluate()
		},
	},

	created() {
		this.evaluate()
	},

	methods: {
		/**
		 * Decide every conditional notice against the card's record.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		async evaluate() {
			const context = { objectId: this.objectId, object: this.objectData || {} }
			const verdicts = await Promise.all(this.entries.map(async (entry) => [
				entry.key,
				entry.notice.visibleWhen ? await evaluateVisibleWhen(entry.notice.visibleWhen, context) : true,
			]))
			this.allowed = Object.fromEntries(verdicts)
		},

		/**
		 * @param {{key: string, notice: object}} entry The closed notice.
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		onDismiss(entry) {
			this.dismissedKeys = [...this.dismissedKeys, entry.key]
			this.$emit('notice-dismiss', entry.notice)
		},
	},
}
</script>

<style scoped>
.cn-card-notices {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
</style>
