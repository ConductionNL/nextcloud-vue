<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-object-list-widget">
		<p v-if="waitingForContext" class="cn-object-list-widget__prompt">
			{{ promptText }}
		</p>
		<!-- Compact empty state (ADR-062): one muted line, never a full-height
		     void — an empty collection cell should be DESIGNED small, and this
		     keeps whatever height it has quiet. -->
		<p v-else-if="!loading && rows.length === 0" class="cn-object-list-widget__empty">
			{{ emptyText }}
		</p>
		<template v-else>
			<div class="cn-object-list-widget__table">
				<CnDataTable
					:columns="resolvedColumns"
					:rows="visibleRows"
					:loading="loading"
					:empty-text="emptyText"
					borderless
					@row-click="onRowClick" />
			</div>
			<!-- Fit-to-cell footer (ADR-062: the cell is the budget — rows adapt
			     to the cell, the remainder is one click away, never a scrollbar).
			     A navigating button when `viewAllRoute` is configured; a quiet
			     "+N more" line otherwise. -->
			<button
				v-if="hiddenCount > 0 && content.viewAllRoute"
				type="button"
				class="cn-object-list-widget__view-all"
				@click="onViewAll">
				{{ viewAllLabel }}
			</button>
			<p v-else-if="hiddenCount > 0" class="cn-object-list-widget__more">
				{{ moreLabel }}
			</p>
		</template>
		<p v-if="error" class="cn-object-list-widget__error">
			{{ error }}
		</p>
		<!-- Create affordance (ADR-062): every collection carries its Add at
		     the bottom of the widget; the host card's Actions menu calls the
		     same openCreate() through the public method. -->
		<button
			v-if="allowCreate && !waitingForContext"
			type="button"
			class="cn-object-list-widget__add"
			@click="openCreate">
			+ {{ addLabel }}
		</button>
		<CnFormDialog
			v-if="showCreate && createSchema"
			ref="createDialog"
			:schema="createSchema"
			:item="null"
			:register="content.register"
			:initial-data="createInitialData"
			:locked-fields="createLockedFields"
			@confirm="onCreateConfirm"
			@close="showCreate = false" />
	</div>
</template>

<script>
import CnDataTable from '../CnDataTable/CnDataTable.vue'
import CnFormDialog from '../CnFormDialog/CnFormDialog.vue'
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

	components: { CnDataTable, CnFormDialog },

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
		 * The widget's persisted configuration blob. `limit` is a fetch cap
		 * (default 25) — the rendered row count fits the host cell (ADR-062).
		 * `viewAllRoute` / `viewAllQuery` configure the "View all (N)" footer
		 * navigation; `viewAllQuery` values are token-resolved (`@objectId`).
		 * @type {{register?: string, schema?: string, filter?: object, sort?: {field?: string, dir?: string}, limit?: number, columns?: Array, rowRoute?: string, prompt?: string, emptyText?: string, viewAllRoute?: string, viewAllQuery?: object}}
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
			/** Server-side total for the resolved filter (drives "View all (N)"). */
			total: 0,
			/** Rows that fit the host cell; null = unconstrained (dashboards). */
			fitRows: null,
			/** Whether the create dialog is open. */
			showCreate: false,
			/** Target schema definition fetched for the create dialog. */
			createSchema: null,
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
		 * Create-form seed values derived from the list's resolved filter: every
		 * scalar filter entry (e.g. `{ lead: '<uuid>' }` on a detail-page related
		 * list) pre-links a new child to the record the list is scoped to.
		 *
		 * @return {Record<string, string|number>}
		 */
		createInitialData() {
			const out = {}
			const f = this.resolvedFilter || {}
			for (const key of Object.keys(f)) {
				const v = f[key]
				if (typeof v === 'string' || typeof v === 'number') out[key] = v
			}
			return out
		},
		/**
		 * The seeded parent-reference keys, rendered read-only in the create form
		 * so a child can't be repointed away from the record it was added under.
		 *
		 * @return {string[]}
		 */
		createLockedFields() {
			return Object.keys(this.createInitialData)
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
		/** Empty-state text (overridable via `content.emptyText`). */
		emptyText() {
			return this.content.emptyText || t('nextcloud-vue', 'No items')
		},
		/**
		 * The rows actually rendered: capped to what fits the host grid cell
		 * (ADR-062 — content adapts to the cell, never a nested scrollbar).
		 * Unconstrained on surfaces without a fixed-height cell (dashboards
		 * measure null and render every fetched row, as before).
		 *
		 * @return {Array<object>}
		 */
		visibleRows() {
			return this.fitRows ? this.rows.slice(0, this.fitRows) : this.rows
		},
		/**
		 * How many matching objects are NOT rendered (server total minus the
		 * visible slice). Drives the "View all (N)" footer.
		 *
		 * @return {number}
		 */
		hiddenCount() {
			return Math.max((this.total || this.rows.length) - this.visibleRows.length, 0)
		},
		/** Pre-translated "View all (N)" footer label. */
		viewAllLabel() {
			return t('nextcloud-vue', 'View all ({total})', { total: this.total || this.rows.length })
		},
		/** Pre-translated "+N more" footer label (no viewAllRoute configured). */
		moreLabel() {
			return t('nextcloud-vue', '+{count} more', { count: this.hiddenCount })
		},
		/** Whether the create affordance renders (on by default; `content.allowCreate: false` opts out). */
		allowCreate() {
			const c = this.content || {}
			return c.allowCreate !== false && Boolean(c.register) && Boolean(c.schema)
		},
		/** Pre-translated Add label (overridable via `content.addLabel`). */
		addLabel() {
			return this.content.addLabel || t('nextcloud-vue', 'Add')
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
				limit: c.limit || 25,
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
		// Observe the host grid cell so the visible row count re-fits on
		// resize/layout changes. Only detail-grid cells constrain height;
		// on dashboards the closest() lookup misses and fitRows stays null.
		const cell = this.$el.closest && this.$el.closest('.grid-stack-item-content')
		if (cell && typeof ResizeObserver !== 'undefined') {
			this._fitObserver = new ResizeObserver(() => this.measureFit())
			this._fitObserver.observe(cell)
		}
		this.$nextTick(() => this.measureFit())
	},

	beforeDestroy() {
		if (this._fitObserver) this._fitObserver.disconnect()
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
				// `limit` is a FETCH CAP (ADR-062), not a render promise — the
				// visible count fits the cell; fetch enough to fill big cells.
				const params = { _limit: c.limit || 25 }
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
				this.total = (res && res.data && typeof res.data.total === 'number') ? res.data.total : this.rows.length
				this.$nextTick(() => this.measureFit())
			} catch (e) {
				this.error = (e && e.message) || 'error'
				this.rows = []
				this.total = 0
			} finally {
				this.loading = false
			}
		},

		/**
		 * Fit the visible row count to the host grid cell (ADR-062 — the cell
		 * is the budget). Measures the cell's remaining height below the table
		 * top, reserves room for the "View all" footer, and derives the row
		 * budget from the first rendered row's height. No-ops (fitRows null =
		 * render all fetched rows) outside a fixed-height cell.
		 *
		 * @return {void}
		 */
		measureFit() {
			const cell = this.$el && this.$el.closest && this.$el.closest('.grid-stack-item-content')
			if (!cell) { this.fitRows = null; return }
			const table = this.$el.querySelector('.cn-object-list-widget__table table')
			if (!table) return
			const cellRect = cell.getBoundingClientRect()
			const tableRect = table.getBoundingClientRect()
			const firstRow = table.querySelector('tbody tr')
			const rowH = (firstRow && firstRow.getBoundingClientRect().height) || 44
			const head = table.querySelector('thead')
			const headH = (head && head.getBoundingClientRect().height) || 40
			// Room for the "View all" footer AND the Add button (ADR-062).
			const footerReserve = 68
			const available = cellRect.bottom - tableRect.top - footerReserve
			const fit = Math.floor((available - headH) / rowH)
			this.fitRows = Math.max(fit, 1)
		},

		/**
		 * Open the create dialog for the list's target schema. PUBLIC — the
		 * host card's Actions-menu "Add" entry calls this through a ref, the
		 * widget's own footer button calls it directly (ADR-062: both
		 * affordances, one dialog).
		 *
		 * @return {Promise<void>}
		 */
		async openCreate() {
			const c = this.content || {}
			if (!c.schema) return
			try {
				if (!this.createSchema) {
					const [{ default: axios }, { generateUrl }] = await Promise.all([
						import('@nextcloud/axios'),
						import('@nextcloud/router'),
					])
					const url = generateUrl('/apps/openregister/api/schemas/{sch}', { sch: c.schema })
					const res = await axios.get(url)
					this.createSchema = (res && res.data) || null
				}
				this.showCreate = true
			} catch (e) {
				this.error = (e && e.message) || 'error'
			}
		},

		/**
		 * Persist the create-dialog form: the resolved scalar filter values
		 * are merged in as defaults (an FK-scoped list creates PRE-LINKED
		 * children — a task added on a case detail already carries the case).
		 *
		 * @param {object} formData Confirmed form values.
		 * @return {Promise<void>}
		 */
		async onCreateConfirm(formData) {
			const c = this.content || {}
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const payload = { ...formData }
				const filter = this.resolvedFilter || {}
				for (const [k, v] of Object.entries(filter)) {
					if (v && typeof v !== 'object' && (payload[k] === undefined || payload[k] === null || payload[k] === '')) {
						payload[k] = v
					}
				}
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: c.register, schema: c.schema })
				await axios.post(url, payload)
				if (this.$refs.createDialog) this.$refs.createDialog.setResult({ success: true })
				/**
				 * @event created Emitted after a successful create with the sent payload.
				 * @type {object}
				 */
				this.$emit('created', payload)
				this.fetchRows()
			} catch (e) {
				if (this.$refs.createDialog) this.$refs.createDialog.setResult({ error: (e && e.message) || 'error' })
			}
		},

		/**
		 * "View all (N)" footer click: emits `view-all` and, when the content
		 * blob names a `viewAllRoute`, navigates there with `viewAllQuery`
		 * (its values token-resolved, so `{"case": "@objectId"}` carries the
		 * current object scope into the target index page).
		 *
		 * @return {void}
		 */
		onViewAll() {
			/**
			 * @event view-all Emitted when the "View all (N)" footer is clicked.
			 * @type {{ total: number }}
			 */
			this.$emit('view-all', { total: this.total })
			const route = this.content.viewAllRoute
			if (route && this.$router) {
				const query = resolveFilterTokens(this.content.viewAllQuery || {}, this.tokenCtx)
				this.$router.push({ name: route, query }).catch(() => {})
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
	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.cn-object-list-widget__table {
	flex: 1 1 auto;
	min-height: 0;
	overflow: hidden;
}

/* Compact empty state (ADR-062): one quiet centered line — matches the
   integration leaves' "No meetings" look — never a tall void. */
.cn-object-list-widget__empty {
	color: var(--color-text-maxcontrast);
	margin: 0;
	padding: 24px 8px;
	text-align: center;
	flex: 1 1 auto;
	display: flex;
	align-items: center;
	justify-content: center;
}

.cn-object-list-widget__view-all {
	align-self: flex-start;
	background: none;
	border: none;
	color: var(--color-primary-element);
	cursor: pointer;
	font: inherit;
	margin-top: 4px;
	padding: 4px;
}

.cn-object-list-widget__view-all:hover,
.cn-object-list-widget__view-all:focus-visible {
	text-decoration: underline;
}

.cn-object-list-widget__more {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	margin: 4px 0 0;
	padding: 4px;
}

/* Footer Add — same pattern as the integration leaves' footer action
   ("Open in Calendar"): full-width, centered, divider-topped, pinned to
   the card bottom. */
.cn-object-list-widget__add {
	align-self: stretch;
	background: none;
	border: none;
	border-top: 1px solid var(--color-border);
	color: var(--color-primary-element);
	cursor: pointer;
	font: inherit;
	font-weight: 600;
	/* Bleed through the host card's 16px content padding so the divider
	   spans edge-to-edge, exactly like the integration leaves' footer.
	   !important: Nextcloud server ships `#app-content button { margin:
	   3px … }` — an id-selector rule no scoped class can outrank. */
	margin: auto -16px -16px !important;
	padding: 12px 8px;
	text-align: center;
}

.cn-object-list-widget__add:hover,
.cn-object-list-widget__add:focus-visible {
	text-decoration: underline;
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
