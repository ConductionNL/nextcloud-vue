<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-index-list-widget" data-testid="cn-index-list-widget">
		<CnIndexPage
			v-if="ready"
			v-bind="indexProps"
			:register="content.register || ''"
			:schema="content.schema || null"
			:filter="resolvedFilter"
			:title="listTitle"
			:showTitle="false"
			:routeState="false" />
	</div>
</template>

<script>
import CnIndexPage from '../CnIndexPage/CnIndexPage.vue'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

/**
 * The keys of `content` the widget sets itself, so they are not passed on as
 * they stand.
 */
const OWN_KEYS = ['register', 'schema', 'filter', 'title', 'showTitle', 'routeState']

/**
 * CnIndexListWidget — a list page's list inside a detail page: the records of
 * another schema that point at this one, with the list's own toolbar (lenses
 * with counts, search, the view switch, filters, selection and the pager).
 *
 * `content` takes the keys a `type: "index"` page takes in its `config`
 * (`register`, `schema`, `columns`, `lenses`, `viewModes`, `search`,
 * `selectable`, `actions`, `emptyText`, ...), plus `filter` with the
 * `@objectId` / `@object.<field>` tokens of this record: the base filter every
 * lens and search narrows further. The list writes nothing to the address;
 * the address belongs to the detail page (PqEvenement's Aanmeldingen tab).
 *
 * @spec openspec/changes/index-list-widget/specs/index-list-widget/spec.md
 */
export default {
	name: 'CnIndexListWidget',

	components: { CnIndexPage },

	props: {
		/** The list config, as a list page's `config`, with a token `filter`. */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record this list belongs to, for `@objectId`. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The record, for `@object.<field>`. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/**
		 * The base filter with this record's tokens filled in.
		 *
		 * @return {object} The filter.
		 */
		resolvedFilter() {
			const filter = this.content && typeof this.content.filter === 'object' && this.content.filter !== null ? this.content.filter : {}
			return resolveFilterTokens(filter, { objectId: String(this.objectId || ''), object: this.objectData || {} })
		},

		/**
		 * Whether every token the filter names has a value: a list filtered on
		 * a record it does not know yet would list every record.
		 *
		 * @return {boolean} True when the list may load.
		 */
		ready() {
			return Object.values(this.resolvedFilter).every((value) => value !== undefined && value !== null && value !== '' && !(typeof value === 'string' && value.startsWith('@')))
		},

		/**
		 * The list's heading for assistive technology: the widget's title, else the schema.
		 *
		 * @return {string} The title.
		 */
		listTitle() {
			return String((this.content && (this.content.title || this.content.schema)) || '')
		},

		/**
		 * Every other content key the index page declares, passed on as given.
		 *
		 * @return {object} The props.
		 */
		indexProps() {
			const props = CnIndexPage.props || {}
			const declared = new Set(Array.isArray(props) ? props : Object.keys(props))
			const out = {}
			for (const [key, value] of Object.entries(this.content || {})) {
				if (!OWN_KEYS.includes(key) && declared.has(key)) {
					out[key] = value
				}
			}
			return out
		},
	},
}
</script>

<style scoped>
/* The list stands in the host card: no page padding of its own. */
.cn-index-list-widget :deep(.cn-index-page) {
	padding: 0;
}
</style>
