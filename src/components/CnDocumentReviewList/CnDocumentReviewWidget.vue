<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-case-widget-card">
		<CnDocumentReviewList
			:documents="documents"
			:title="content.title || ''"
			:nameField="content.nameField || 'name'"
			:metaField="content.metaField || 'meta'"
			:statusField="content.statusField || 'reviewStatus'"
			:hrefField="content.hrefField || 'href'"
			:rowKey="content.rowKey || 'id'"
			:statuses="content.statuses || []"
			:defaultStatus="content.defaultStatus || ''"
			:rowActionLabel="rowActionLabel"
			:emptyText="content.emptyText || undefined"
			@rowAction="onRowAction" />
	</div>
</template>

<script>
import CnDocumentReviewList from './CnDocumentReviewList.vue'
import { readVisibleWhenPath } from '../../utils/visibleWhen.js'

/**
 * CnDocumentReviewWidget: the `document-review` detail widget type.
 *
 * Renders CnDocumentReviewList from a list on the bound record:
 * `content: { field, title?, statusField?, statuses?, rowAction?: { label, route } }`.
 * A row action with a `route` opens that route with the row's key as `id`.
 * Resolved by its registry key, not exported.
 */
export default {
	name: 'CnDocumentReviewWidget',

	components: {
		CnDocumentReviewList,
	},

	props: {
		/** The widget's content. `field` is the dot-path to the documents on the record. */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The bound record. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/**
		 * The documents read off the record.
		 *
		 * @return {Array<object>} The documents, or an empty list.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-document-review-list
		 */
		documents() {
			const value = readVisibleWhenPath(this.objectData || {}, this.content.field || 'documents')
			return Array.isArray(value) ? value : []
		},

		/**
		 * The row action's label. Empty, and so no button, unless the content declares one.
		 *
		 * @return {string} The label.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-document-review-list
		 */
		rowActionLabel() {
			const label = this.content.rowAction?.label
			return typeof label === 'string' ? label : ''
		},
	},

	methods: {
		/**
		 * Open the route the row action names, with the row's key as `id`.
		 *
		 * @param {object} document The row's document.
		 * @return {void}
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-document-review-list
		 */
		onRowAction(document) {
			const route = this.content.rowAction?.route
			const id = readVisibleWhenPath(document, this.content.rowKey || 'id')
			if (typeof route !== 'string' || route === '' || !this.$router || id === undefined || id === null) {
				return
			}
			this.$router.push({ name: route, params: { id: String(id) } })
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
