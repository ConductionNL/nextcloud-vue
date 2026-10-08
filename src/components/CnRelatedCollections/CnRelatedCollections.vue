<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="collections.length > 0" class="cn-related-collections" data-testid="cn-related-collections">
		<section
			v-for="(col, i) in collections"
			:key="i"
			class="cn-related-collections__section"
			:data-testid="`cn-related-collection-${i}`">
			<div class="cn-related-collections__header">
				<h3 v-if="col.title" class="cn-related-collections__title" :lang="langOf(col.title)">
					{{ shown(col.title) }}
				</h3>
				<!--
					@slot section-action
					@description Right-aligned action surface in a related-collection
					section header (e.g. a "Link existing" relation-link button).
					Receives the collection descriptor + its index.
					@binding {object} collection The related-collection descriptor.
					@binding {number} index The section index.
				-->
				<slot name="section-action" :collection="col" :index="i" />
			</div>
			<CnObjectListWidget :content="contentFor(col)" @rowClick="(row) => onRowClick(col, row, i)" />
		</section>
	</div>
</template>

<script>
import CnObjectListWidget from '../CnObjectListWidget/CnObjectListWidget.vue'
import { labelLang } from '../../utils/manifestTranslate.js'

/**
 * CnRelatedCollections — declarative related-object list sections for a
 * `type:"detail"` page body.
 *
 * Each entry renders a titled section containing a `CnObjectListWidget` scoped
 * to the current detail-page object via `@objectId` / `@object.<field>` filter
 * tokens (resolved by `CnObjectListWidget` from the `cnObjectContext` inject
 * `CnDetailPage` provides). Replaces the hand-coded "running cases / contracts
 * / contacts" sections on ClientDetail, ContactDetail, MdmMasterEntityDetail.
 *
 * Mounted by `CnDetailPage` when the manifest page config declares
 * `relatedCollections`.
 *
 * Example config (consumed by CnDetailPage):
 * ```js
 * relatedCollections: [
 *   {
 *     title: 'Running cases',
 *     register: 'pipelinq', schema: 'case',
 *     filter: { client: '@objectId', status: 'open' },
 *     columns: [{ key: 'title', label: 'Case' }, { key: 'status', label: 'Status' }],
 *     limit: 10,
 *     rowRoute: 'cases-detail',
 *   },
 * ]
 * ```
 */
export default {
	name: 'CnRelatedCollections',

	components: { CnObjectListWidget },

	inject: {
		/** The label lookup from CnAppRoot, so manifest labels show in the user's language. */
		cnTranslate: { default: null },
	},

	props: {
		/**
		 * The related-collection descriptors.
		 *
		 * @type {Array<{title?: string, register: string, schema: string, filter?: object, columns?: Array, sort?: object, limit?: number, rowRoute?: string}>}
		 */
		collections: {
			type: Array,
			default: () => [],
		},
	},

	emits: ['row-click'],

	methods: {
		/**
		 * A manifest label through the injected lookup, or as written.
		 *
		 * @param {string} text The label as written.
		 * @return {string} The label in the user's language.
		 */
		shown(text) {
			return typeof this.cnTranslate === 'function' && typeof text === 'string' && text !== '' ? this.cnTranslate(text) : text
		},

		/**
		 * The `lang` of a label that fell back to its written text in another language.
		 *
		 * @param {string} text The label as written.
		 * @return {string|undefined} The source language, or undefined.
		 */
		langOf(text) {
			return labelLang(this.cnTranslate, text) || undefined
		},

		/**
		 * Map a related-collection descriptor to a `CnObjectListWidget` content
		 * blob (1:1 — the widget already understands register/schema/filter/sort/
		 * limit/columns/rowRoute and resolves `@object*` tokens).
		 *
		 * @param {object} col The collection descriptor.
		 * @return {object} The widget content blob.
		 */
		contentFor(col) {
			return {
				register: col.register,
				schema: col.schema,
				filter: col.filter || {},
				sort: col.sort || {},
				limit: col.limit || 10,
				columns: col.columns || [],
				rowRoute: col.rowRoute,
				prompt: col.prompt,
			}
		},

		/**
		 * Re-emit a row click with the owning collection descriptor + index.
		 *
		 * @param {object} col The collection descriptor.
		 * @param {object} row The clicked row.
		 * @param {number} index The section index.
		 */
		onRowClick(col, row, index) {
			/**
			 * @event row-click A row in a related-collection section was clicked.
			 * Payload is `{ collection, row, index }`. (CnObjectListWidget already
			 * navigates to `rowRoute` when set; this is for extra host handling.)
			 * @type {{ collection: object, row: object, index: number }}
			 */
			this.$emit('row-click', { collection: col, row, index })
		},
	},
}
</script>

<style scoped>
.cn-related-collections {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-related-collections__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 8px;
}

.cn-related-collections__title {
	margin: 0;
	font-size: 1.1em;
	font-weight: 600;
}
</style>
