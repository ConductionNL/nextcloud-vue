<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-object-list-widget">
		<p v-if="waitingForContext" class="cn-object-list-widget__prompt">
			{{ promptText }}
		</p>
		<CnDataTable
			v-else
			:columns="resolvedColumns"
			:rows="rows"
			:loading="loading"
			:empty-text="emptyText"
			borderless
			@row-click="onRowClick" />
		<p v-if="error" class="cn-object-list-widget__error">
			{{ error }}
		</p>
	</div>
</template>

<script>
import CnDataTable from '../CnDataTable/CnDataTable.vue'
import { translate as t } from '@nextcloud/l10n'
import { resolveFilterTokens, hasUnresolvedTokens, dropOptionalUnresolved } from '../../utils/resolveFilterTokens.js'

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

	inject: {
		/**
		 * Detail-page object context (`{ objectId, object, register, schema }`)
		 * provided by CnDetailPage. Enables `@objectId` / `@object.<field>`
		 * filter tokens so a detail-page list can be scoped to the current
		 * object. Null on dashboards (tokens then pass through unresolved).
		 */
		cnObjectContext: { default: null },
		/**
		 * Page-level workspace context (reactive `ref({})`) provided by
		 * CnDashboardPage. Lets `@workspace.<key>` filter tokens resolve so a
		 * list can react to state another widget on the page wrote (e.g. a
		 * client-overview list scoped to the selected client). Null on pages
		 * that don't provide it (tokens then stay unresolved and the list shows
		 * its `promptText`).
		 */
		cnWorkspaceContext: { default: null },
	},

	props: {
		/**
		 * The widget's persisted configuration blob.
		 * @type {{register?: string, schema?: string, filter?: object, sort?: {field?: string, dir?: string}, limit?: number, columns?: Array, rowRoute?: string, prompt?: string}}
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
		/**
		 * The unwrapped detail-page object context for token resolution, or null
		 * on surfaces (dashboards) that don't provide one.
		 *
		 * @return {object|null}
		 */
		objectCtx() {
			const c = this.cnObjectContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/**
		 * The unwrapped workspace context bag (or null). Vue 2.7 `setup`/inject
		 * may hand back a raw ref; unwrap `.value` so token resolution reads the
		 * plain object.
		 *
		 * @return {object|null}
		 */
		workspaceCtx() {
			const c = this.cnWorkspaceContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/**
		 * Token-resolution context merged from the detail-page object context
		 * and the page-level workspace bag (`@workspace.<key>`).
		 *
		 * @return {object}
		 */
		tokenCtx() {
			const base = this.objectCtx ? { ...this.objectCtx } : {}
			base.workspace = this.workspaceCtx || {}
			return base
		},
		/**
		 * The filter with every `@`-token resolved against `tokenCtx`, then with
		 * any UNRESOLVED OPTIONAL token (`@workspace.<key>?`) dropped — so an
		 * optional queue filter simply shows all rows until a queue is picked,
		 * while a REQUIRED token (`@workspace.selectedClient`) stays to trigger the
		 * prompt.
		 *
		 * @return {object}
		 */
		resolvedFilter() {
			return dropOptionalUnresolved(resolveFilterTokens(this.content.filter || {}, this.tokenCtx))
		},
		/**
		 * Whether a context-dependent filter token (e.g. `@workspace.selectedClient`)
		 * is still unresolved — the page state this list depends on isn't set yet,
		 * so the list renders a prompt instead of fetching the whole register.
		 *
		 * @return {boolean}
		 */
		waitingForContext() {
			return hasUnresolvedTokens(this.resolvedFilter)
		},
		/** Prompt shown while a `@workspace.*`-bound list has no selection. */
		promptText() {
			return this.content.prompt || t('nextcloud-vue', 'Select an item to see related records')
		},
		/**
		 * Column definitions normalised for CnDataTable. A string column becomes
		 * `{ key, label }`; an object column keeps its key/label AND carries the
		 * presentation hints CnDataTable forwards to CnCellRenderer — `format`
		 * (currency / duration / number / percent / date / date-time), `widget`
		 * (badge / link / swatch), `widgetProps`, `formatter`, `align`, and
		 * `width`. Without this pass-through a `relatedCollections` column's
		 * `format: 'currency'` / `'date'` would silently render as plain text.
		 */
		resolvedColumns() {
			const cols = Array.isArray(this.content.columns) ? this.content.columns : []
			return cols.map((c) => {
				if (typeof c === 'string') {
					return { key: c, label: c }
				}
				const out = { key: c.key, label: c.label || c.key }
				for (const k of ['format', 'widget', 'widgetProps', 'formatter', 'align', 'width', 'type', 'enum', 'sortable']) {
					if (c[k] !== undefined) out[k] = c[k]
				}
				return out
			})
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
				// The RESOLVED filter (workspace + object tokens applied) so the
				// watcher refetches when page-level state a token reads changes.
				filter: this.resolvedFilter,
				sort: c.sort || {},
				limit: c.limit || 5,
				objectId: this.objectCtx ? this.objectCtx.objectId : null,
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
			// A context token this list depends on (e.g. @workspace.selectedClient)
			// isn't set yet — don't fetch the whole register; the prompt shows.
			if (this.waitingForContext) {
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
				const filter = this.resolvedFilter
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
/* The widget already lives inside CnWidgetWrapper's padded card chrome. The
   table is rendered `borderless` so CnDataTable drops its own border/shadow/
   background AND its bottom margin (the `.cn-table-container--borderless`
   modifier) — otherwise it reads as a card-in-a-card with dead space below.
   Horizontal overflow is owned by `.cn-table-container` (overflow-x: auto); a
   second scroll container here would produce a nested scrollbar, so this host
   stays plain. */
.cn-object-list-widget {
	width: 100%;
}

.cn-object-list-widget__error {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	margin: 4px 0 0;
}

.cn-object-list-widget__prompt {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	padding: 16px 4px;
	margin: 0;
	text-align: center;
}
</style>
