<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-object-list-widget">
		<CnDataTable
			:columns="resolvedColumns"
			:rows="rows"
			:loading="loading"
			:empty-text="emptyText"
			@row-click="onRowClick" />
		<p v-if="error" class="cn-object-list-widget__error">{{ error }}</p>
	</div>
</template>

<script>
import CnDataTable from '../CnDataTable/CnDataTable.vue'
import { translate as t } from '@nextcloud/l10n'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

/**
 * CnObjectListWidget — an abstract, manifest-configured object list / table.
 *
 * Queries OpenRegister objects for a `register` + `schema` with a `filter`,
 * `sort`, and `limit`, then renders the chosen `columns` in a `CnDataTable`.
 * Replaces per-app coded list widgets (closing-soon, recently-won-lost,
 * renewals-due, …) — the data, columns, filter and ordering are all editable
 * through the cog modal (ADR-041). Resolved by its registry type key
 * `object-list`; configured via `CnObjectListWidgetForm`.
 *
 * Example content blob:
 * ```js
 * content: {
 *   register: 'pipelinq', schema: 'lead',
 *   filter: { status: 'open' },
 *   sort: { field: 'expectedCloseDate', dir: 'asc' },
 *   limit: 5,
 *   columns: [{ key: 'title', label: 'Deal' }, { key: 'value', label: 'Value' }],
 *   rowRoute: 'leads-detail',
 * }
 * ```
 */
export default {
	name: 'CnObjectListWidget',

	components: { CnDataTable },

	props: {
		/**
		 * The widget's persisted configuration blob.
		 * @type {{register?: string, schema?: string, filter?: object, sort?: {field?: string, dir?: string}, limit?: number, columns?: Array, rowRoute?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			rows: [],
			loading: false,
			error: '',
		}
	},

	computed: {
		/** Column definitions normalised to `{ key, label }` for CnDataTable. */
		resolvedColumns() {
			const cols = Array.isArray(this.content.columns) ? this.content.columns : []
			return cols.map((c) => (typeof c === 'string'
				? { key: c, label: c }
				: { key: c.key, label: c.label || c.key }))
		},
		/** Empty-state text. */
		emptyText() {
			return t('nextcloud-vue', 'No items')
		},
		/** Stable signature of the query so the watcher only refetches on real change. */
		sourceKey() {
			const c = this.content || {}
			return JSON.stringify({
				register: c.register || '',
				schema: c.schema || '',
				filter: c.filter || {},
				sort: c.sort || {},
				limit: c.limit || 5,
			})
		},
	},

	watch: {
		sourceKey() {
			this.fetchRows()
		},
	},

	mounted() {
		this.fetchRows()
	},

	methods: {
		/**
		 * Fetch the object rows from OpenRegister. Lazily imports the
		 * axios/router helpers (the library never hard-depends on them at module
		 * load — same pattern as CnStatWidget / CnFilesWidget).
		 *
		 * @return {Promise<void>}
		 */
		async fetchRows() {
			const c = this.content || {}
			if (!c.register || !c.schema) {
				this.rows = []
				this.error = ''
				return
			}
			this.loading = true
			this.error = ''
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/{register}/{schema}',
					{ register: c.register, schema: c.schema },
				)
				const params = { _limit: c.limit || 5 }
				if (c.sort && c.sort.field) {
					params[`_order[${c.sort.field}]`] = (c.sort.dir === 'desc' ? 'desc' : 'asc')
				}
				// The OpenRegister OBJECT-SEARCH endpoint filters on DIRECT field
				// params (`status=open`, `value[gt]=30000`) — unlike the
				// aggregation endpoints which use the nested `filter[...]` shape.
				const filter = resolveFilterTokens(c.filter || {})
				if (filter && typeof filter === 'object') {
					for (const [k, v] of Object.entries(filter)) {
						if (v && typeof v === 'object') {
							for (const [op, ov] of Object.entries(v)) params[`${k}[${op}]`] = ov
						} else if (v !== '' && v !== null && v !== undefined) {
							params[k] = v
						}
					}
				}
				const res = await axios.get(url, { params })
				this.rows = (res && res.data && res.data.results) || []
			} catch (e) {
				this.error = (e && e.message) || 'error'
				this.rows = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Navigate to a configured detail route on row click (when `rowRoute`
		 * is set and a router is available).
		 *
		 * @param {object} row The clicked object row.
		 * @return {void}
		 */
		onRowClick(row) {
			const route = this.content.rowRoute
			const id = row && (row.id || (row['@self'] && row['@self'].id))
			if (route && id && this.$router) {
				this.$router.push({ name: route, params: { id } }).catch(() => {})
			}
			/**
			 * @event row-click Emitted with the clicked object (for hosts that
			 * want to handle navigation themselves).
			 * @type {object}
			 */
			this.$emit('row-click', row)
		},
	},
}
</script>

<style scoped>
.cn-object-list-widget {
	width: 100%;
	overflow: auto;
}

/* The widget already lives inside CnWidgetWrapper's card chrome, so strip the
   CnDataTable container's own border/shadow/background — otherwise it reads as
   a card-in-a-card ("widget in widget"). */
.cn-object-list-widget :deep(.cn-table-container) {
	border: none;
	box-shadow: none;
	border-radius: 0;
	background: transparent;
}

.cn-object-list-widget__error {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	margin: 4px 0 0;
}
</style>
