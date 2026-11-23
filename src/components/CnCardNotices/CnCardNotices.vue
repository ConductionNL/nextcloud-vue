<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="shown.length > 0" class="cn-card-notices" data-testid="cn-card-notices">
		<CnNoticeWidget
			v-for="entry in shown"
			:key="entry.key"
			:content="contentOf(entry)"
			:objectData="objectData"
			:objectId="objectId"
			:inline="true"
			@action="$emit('notice-action', $event, entry.notice)"
			@dismiss="onDismiss(entry)" />
	</div>
</template>

<script>
import { evaluateVisibleWhen, readVisibleWhenValue } from '../../utils/visibleWhen.js'
import { CnNoticeWidget } from '../CnNoticeWidget/index.js'

/**
 * Whether a notice reads its text from an endpoint (`textFrom: { endpoint, field }`).
 *
 * @param {object} notice The notice.
 * @return {boolean}
 */
function hasTextFrom(notice) {
	const from = notice && notice.textFrom
	return Boolean(from && typeof from === 'object' && typeof from.endpoint === 'string' && from.endpoint !== '' && typeof from.field === 'string' && from.field !== '')
}

/**
 * CnCardNotices: the state banners at the top of a card or dialog (R1): an
 * engine refusal, a partial result, a source that is down, a success. Each
 * entry is a `notice` content (`{ variant, role?, layout?, title?, text,
 * actions?, dismissible?, visibleWhen? }`) and shows while its `visibleWhen`
 * holds, read against the card's record (async: a `source` or `endpoint`
 * condition works too). A dismissed notice stays away until the list changes.
 * A notice with `textFrom: { endpoint, field }` takes its text from that
 * endpoint's answer and shows only while it is a non-empty string.
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
			// Notice key to the text its `textFrom` endpoint answered.
			texts: {},
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
				.filter((notice) => notice && typeof notice === 'object' && (notice.title || notice.text || hasTextFrom(notice)))
				.map((notice, index) => ({ key: notice.id || `${index}:${notice.title || ''}:${notice.text || ''}`, notice }))
		},

		/**
		 * @return {Array<{key: string, notice: object}>} The notices to draw.
		 *
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		shown() {
			return this.entries.filter((entry) => !this.dismissedKeys.includes(entry.key)
				&& (!entry.notice.visibleWhen || this.allowed[entry.key] === true)
				&& (!hasTextFrom(entry.notice) || typeof this.texts[entry.key] === 'string'))
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
			const [verdicts, texts] = await Promise.all([
				Promise.all(this.entries.map(async (entry) => [
					entry.key,
					entry.notice.visibleWhen ? await evaluateVisibleWhen(entry.notice.visibleWhen, context) : true,
				])),
				Promise.all(this.entries.filter((entry) => hasTextFrom(entry.notice)).map(async (entry) => [
					entry.key,
					await readVisibleWhenValue(entry.notice.textFrom, context).catch(() => null),
				])),
			])
			this.allowed = Object.fromEntries(verdicts)
			this.texts = Object.fromEntries(texts.filter(([, text]) => typeof text === 'string' && text.trim() !== ''))
		},

		/**
		 * The notice as drawn: its `textFrom` answer as its text.
		 *
		 * @param {{key: string, notice: object}} entry The notice.
		 * @return {object} The notice content.
		 * @spec openspec/changes/notice-text-from-endpoint/specs/card-state-notices/spec.md#requirement-a-notices-text-can-come-from-an-endpoint
		 */
		contentOf(entry) {
			if (!hasTextFrom(entry.notice)) {
				return entry.notice
			}
			const { textFrom, ...notice } = entry.notice
			return { ...notice, text: this.texts[entry.key] }
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
