<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		v-if="offered.length"
		class="cn-related-field-filters"
		data-testid="related-field-filters">
		<CnFilterBar
			:filters="barFilters"
			:showSearch="false"
			:showClearAll="false"
			@filterChange="onFilterChange" />

		<NcNoteCard
			v-if="refusal"
			type="warning"
			class="cn-related-field-filters__refusal"
			data-testid="related-field-filters-refusal">
			<p>{{ refusalHeadline }}</p>
			<p class="cn-related-field-filters__refusal-reason">
				{{ refusal.message }}
			</p>
		</NcNoteCard>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcNoteCard } from '@nextcloud/vue'
import CnFilterBar from '../CnFilterBar/CnFilterBar.vue'
import { useObjectStore } from '../../store/index.js'
import {
	buildRelatedFilters,
	controlFor,
	definitionId,
	filterableDefinitions,
	readRelatedRefusal,
	relatedKeysIn,
} from '../../utils/relatedFieldFilters.js'

/** The prefix of a definitions filter value read from the route query. */
const ROUTE_QUERY = '$route.query.'

/**
 * CnRelatedFieldFilters — a filter bar whose filters come from a type's own
 * field definitions (an EAV pair: definition rows, and value rows in a related
 * schema pointing back at the listed row). A number is asked as a range, a
 * date as a date range, a declared list as a select, anything else as text.
 *
 * IT RENDERS NOTHING UNTIL THE SCOPE IS SET. `definitions.filter` values
 * written `$route.query.<key>` read the route; while one is empty the bar is
 * hidden and its filters are cleared, because a filter on a field the listed
 * rows do not have empties the list and says nothing.
 *
 * THE FILTERS TRAVEL TWICE. The route query is the record (a shared link, a
 * whole-result bulk act); the fetch is reached through the list's
 * `sidebarState.onFilterChange`, because the index page drops every
 * `_`-prefixed route key before it builds its request.
 *
 * A REFUSED FILTER IS NOT AN EMPTY RESULT. The object store's error for
 * `storeKey` is read back and shown under the bar, naming the field.
 *
 * Manifest (index page): `config.relatedFieldFilters`
 * ```json
 * {
 *   "definitions": { "register": "dossiq", "schema": "propertyDefinition", "filter": { "caseType": "$route.query.caseType" } },
 *   "related": { "schema": "caseProperty", "backref": "case", "definitionKey": "propertyDefinition", "valueKey": "value" }
 * }
 * ```
 *
 * @spec openspec/changes/dq-abstract-forms/specs/related-field-filters/spec.md
 */
export default {
	name: 'CnRelatedFieldFilters',

	components: { CnFilterBar, NcNoteCard },

	inject: {
		/** The list's sidebar state: the one channel into the list's own fetch. */
		listSidebarState: { from: 'sidebarState', default: null },
	},

	props: {
		/**
		 * Where the definitions are read: `{ register, schema, filter }`. A
		 * filter value `$route.query.<key>` reads the route and scopes the bar.
		 */
		definitions: { type: Object, required: true },

		/**
		 * Where the values live: `{ schema, backref, definitionKey?, valueKey? }`
		 * (defaults `propertyDefinition` and `value`).
		 */
		related: { type: Object, required: true },

		/** The object store key of the list, whose recorded error may be a refusal. */
		storeKey: { type: String, default: '' },
	},

	data() {
		return {
			loaded: [],
			values: {},
			applied: {},
		}
	},

	computed: {
		/** @return {object|null} The definitions filter with route tokens read, or null while a scope is empty. */
		scopeFilter() {
			const out = {}
			for (const [key, value] of Object.entries(this.definitions.filter || {})) {
				if (typeof value === 'string' && value.startsWith(ROUTE_QUERY)) {
					const read = this.$route?.query?.[value.slice(ROUTE_QUERY.length)]
					if (typeof read !== 'string' || read === '') {
						return null
					}
					out[key] = read
				} else {
					out[key] = value
				}
			}
			return out
		},

		/** @return {string} A stable identity of the scope, '' while unscoped. */
		scopeKey() {
			return this.scopeFilter === null ? '' : JSON.stringify(this.scopeFilter)
		},

		/** @return {Array<object>} The definitions offered as filters. */
		offered() {
			return filterableDefinitions(this.loaded)
		},

		/** @return {Array<object>} The filters as CnFilterBar draws them. */
		barFilters() {
			return this.offered.map((definition) => {
				const id = definitionId(definition)
				const control = controlFor(definition)
				const entered = this.values[id] || {}
				const base = { key: id, label: String(definition.name || id), type: control, testid: `field-filter-${id}` }
				if (control === 'select') {
					return { ...base, options: definition.enumValues, value: entered.eq || null }
				}
				if (control === 'text') {
					return { ...base, value: entered.eq || '' }
				}
				return { ...base, value: { gte: entered.gte || '', lte: entered.lte || '' } }
			})
		},

		/** @return {object|null} The store, when there is one. */
		objectStore() {
			try {
				return useObjectStore()
			} catch {
				return null
			}
		},

		/** @return {{name: string, message: string}|null} The refusal to show. */
		refusal() {
			if (!this.storeKey) {
				return null
			}
			return readRelatedRefusal({
				error: this.objectStore?.errors?.[this.storeKey] ?? null,
				definitions: this.loaded,
			})
		},

		/** @return {string} The sentence above the refusal. */
		refusalHeadline() {
			if (this.refusal?.name) {
				return t('nextcloud-vue', 'The filter on {field} was refused, so this list is not an answer.', { field: this.refusal.name })
			}
			return t('nextcloud-vue', 'One of the field filters was refused, so this list is not an answer.')
		},
	},

	watch: {
		scopeKey: {
			immediate: true,
			async handler(key) {
				this.values = {}
				if (key === '') {
					this.loaded = []
					this.clearRelated()
					return
				}
				this.loaded = await this.loadDefinitions(this.scopeFilter)
			},
		},
	},

	mounted() {
		// A shared link lands with the blocks on the route; replay them into
		// the list's fetch, which would otherwise run without them.
		const query = this.$route?.query || {}
		const carried = {}
		relatedKeysIn(query).forEach((key) => {
			carried[key] = query[key]
		})
		if (Object.keys(carried).length > 0) {
			this.$nextTick(() => this.sendToList(carried))
		}
	},

	methods: {
		/**
		 * Read the definitions in scope. An unreadable list offers no filters,
		 * the same as a type that declares none: nothing was applied.
		 *
		 * @param {object} filter The scope, with bare filter keys.
		 * @return {Promise<Array<object>>} The definitions.
		 */
		async loadDefinitions(filter) {
			try {
				const { register, schema } = this.definitions
				const url = generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}`)
				const response = await axios.get(url, { params: { ...filter, _limit: 200 } })
				const body = response?.data?.results ?? response?.data ?? []
				return Array.isArray(body) ? body : []
			} catch {
				return []
			}
		},

		/**
		 * Take one control's new value and apply every filter.
		 *
		 * @param {{key: string, value: unknown}} change The change from CnFilterBar.
		 */
		onFilterChange({ key, value }) {
			const definition = this.offered.find((d) => definitionId(d) === key)
			const control = controlFor(definition)
			let entered
			if (control === 'range' || control === 'dateRange') {
				entered = { gte: value?.gte ?? '', lte: value?.lte ?? '' }
			} else {
				entered = { eq: value === null || value === undefined ? '' : String(value) }
			}
			this.values = { ...this.values, [key]: entered }
			const related = buildRelatedFilters(
				this.offered.map((d) => ({ definitionId: definitionId(d), value: this.values[definitionId(d)] || {} })),
				this.related,
			)
			this.pushQuery(related)
			this.sendToList(related)
		},

		/**
		 * Hand the compiled blocks to the list, one `onFilterChange` per key
		 * that changed; a key that has gone is sent with no values, which drops it.
		 *
		 * @param {object} related The compiled `_related` keys.
		 */
		sendToList(related) {
			const onFilterChange = this.listSidebarState?.onFilterChange
			if (typeof onFilterChange !== 'function') {
				return
			}
			const previous = this.applied
			Object.keys(previous).forEach((key) => {
				if (related[key] === undefined) {
					onFilterChange({ key, values: [] })
				}
			})
			Object.entries(related).forEach(([key, value]) => {
				if (previous[key] !== value) {
					onFilterChange({ key, values: [String(value)] })
				}
			})
			this.applied = { ...related }
		},

		/** Take every `_related` key off the route and out of the list. */
		clearRelated() {
			this.pushQuery({})
			this.sendToList({})
		},

		/**
		 * Replace the route's `_related` keys with the ones given.
		 *
		 * @param {object} related The keys to set.
		 */
		pushQuery(related) {
			const current = { ...(this.$route?.query || {}) }
			relatedKeysIn(current).forEach((key) => {
				delete current[key]
			})
			const next = { ...current, ...related }
			if (JSON.stringify(next) === JSON.stringify(this.$route?.query || {})) {
				return
			}
			this.$router?.replace({ query: next })
		},
	},
}
</script>

<style scoped>
.cn-related-field-filters {
	inline-size: 100%;
}

.cn-related-field-filters__refusal {
	margin-block-start: 8px;
}

.cn-related-field-filters__refusal-reason {
	font-family: var(--font-face-monospace, monospace);
	overflow-wrap: anywhere;
}
</style>
