<!--
  CnWidgetObjectTable — built-in v2 widget wrapping CnDataTable.

  Referenced in v2 manifests via `widgetKey: "object-table"`. Renders the
  table on the shared CnWidgetWrapper chrome (title + standard overflow
  Actions menu: Refresh / Documentation / Request a feature) and forwards
  all data props to CnDataTable so the table itself is a transparent
  pass-through.

  ADR-049 enrichment: a declarative token-resolved `source` drives
  CnDataTable's existing self-fetch (externally supplied `rows` always win),
  the compact-list surface (hideHeader / borderless / rowRoute /
  viewAllRoute / emptyText / rowIcon / #footer) passes straight through,
  and a declarative `actions[]` renders row-scoped actions via CnRowActions
  plus widget-scoped `object-op` create affordances in the footer.

  Spec: REQ-MVR-006 (manifest-v2-renderer) — built-in widget: object-table
  Spec: openspec/changes/list-widget-enrichment/specs/manifest-v2-renderer/spec.md
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId"
		:documentation-url="documentationUrl"
		flush>
		<div class="cn-widget-object-table">
			<CnDataTable ref="dataTable" v-bind="innerProps" v-on="$listeners">
				<!-- Forward every host-supplied CnDataTable scoped slot verbatim
				     (#footer { total, shown }, #empty, #column-<key>, …). The
				     #row-actions slot is NOT forwarded while the widget renders
				     its own declarative actions[] menu. -->
				<template v-for="(_, name) in forwardedScopedSlots" #[name]="slotData">
					<!-- @slot Any CnDataTable scoped slot, forwarded verbatim — e.g. #footer ({ total, shown }), #empty, #column-<key>. #row-actions is withheld while the declarative actions[] menu renders. -->
					<slot :name="name" v-bind="slotData" />
				</template>
				<template v-if="rowScopedActions.length > 0" #row-actions="{ row }">
					<CnRowActions :actions="mappedRowActions" :row="row" />
				</template>
			</CnDataTable>

			<!-- Widget-scoped object-op create affordance: `create` has no row
			     to mutate, so it renders in the list footer, never inside the
			     per-row actions menu (ADR-049 / list-widget-enrichment). -->
			<div v-if="createActions.length > 0" class="cn-widget-object-table__footer">
				<NcButton
					v-for="action in createActions"
					:key="action.id || action.label"
					variant="tertiary"
					:data-testid="`cn-widget-create-${action.id || 'action'}`"
					@click="onActionTriggered(action, null)">
					<template v-if="action.icon" #icon>
						<CnIcon :name="action.icon" :size="20" />
					</template>
					{{ action.label }}
				</NcButton>
			</div>

			<!-- A rejected write (OpenRegister RBAC) surfaces here — local row
			     state is never mutated on failure (the store only writes its
			     caches on success). -->
			<p v-if="opError" class="cn-widget-object-table__error" data-testid="cn-widget-object-table-error">
				{{ opError }}
			</p>

			<CnConfirmDialog
				v-if="confirmAction"
				ref="confirmDialog"
				:dialog-title="confirmAction.label"
				:message="confirmMessage"
				:variant="confirmAction.op === 'delete' ? 'error' : 'primary'"
				:confirm-label="confirmAction.label"
				@confirm="onConfirmConfirmed"
				@close="closeConfirm" />
		</div>
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import CnDataTable from '../CnDataTable/CnDataTable.vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'
import { CnRowActions } from '../CnRowActions/index.js'
import { CnIcon } from '../CnIcon/index.js'
import CnConfirmDialog from '../../dialogs/CnConfirmDialog.vue'
import { dispatchAction, resolveObjectOpType } from '../../utils/actionsDispatcher.js'
import { resolveFilterTokens, hasUnresolvedTokens, dropOptionalUnresolved } from '../../utils/resolveFilterTokens.js'
import { useObjectStore } from '../../store/useObjectStore.js'

/**
 * CnWidgetObjectTable — built-in v2 widget wrapping CnDataTable.
 *
 * Renders a data table on the shared CnWidgetWrapper chrome, which supplies
 * the widget title and the standard overflow Actions menu (Refresh /
 * Documentation / Request a feature). All data props are forwarded to the
 * inner CnDataTable; the chrome props (`title`, `documentationUrl`,
 * `widgetId`) are consumed by the wrapper and not passed down.
 *
 * A declarative `source` makes the widget self-fetch from OpenRegister:
 * `source.filter` is token-resolved with the shared `resolveFilterTokens`
 * grammar (`@me`, `@today`, `@workspace.*`, `?`-optional clauses dropped
 * when unresolved via `dropOptionalUnresolved`), `source.order` /
 * `source.limit` drive the fetch, and an `@resolve:` register sentinel is
 * passed through unexpanded (resolution is the host loader's job).
 * Externally supplied `rows` always win — the pre-existing pass-through
 * interface is unchanged.
 *
 * A declarative `actions[]` array renders `patch` / `delete` `object-op`
 * actions (and reused `handler` / `open-modal` / `open-page` / `navigate`
 * actions) per row through `CnRowActions`; an `object-op` `create` action
 * renders as a widget-scoped footer affordance. `delete` is ALWAYS
 * confirm-gated through `CnConfirmDialog`; `patch` / `create` confirm only
 * on `confirm: true`. Mutations dispatch via the shared object store —
 * the manifest declares intent only, OpenRegister RBAC is the authority,
 * and a rejected write surfaces as an error without local mutation.
 */
export default {
	name: 'CnWidgetObjectTable',

	components: { CnDataTable, CnWidgetWrapper, CnRowActions, CnIcon, NcButton, CnConfirmDialog },

	inject: {
		/**
		 * Detail-page object context (`{ objectId, object, register, schema }`)
		 * provided by CnDetailPage — enables `@objectId` / `@object.<field>`
		 * tokens in `source.filter`. Null on dashboards.
		 */
		cnObjectContext: { default: null },
		/**
		 * Page-level workspace context (reactive `ref({})`) provided by
		 * CnDashboardPage — enables `@workspace.<key>` tokens in
		 * `source.filter`. Null on pages that don't provide it.
		 */
		cnWorkspaceContext: { default: null },
		/**
		 * Pre-bound `dispatchAction` provided by CnPageRenderer (router,
		 * registry, handlers, openModal already wired). Used for the reused
		 * non-mutating action types; falls back to a direct `dispatchAction`
		 * call when mounted outside a CnPageRenderer tree.
		 */
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * Widget title shown in the CnWidgetWrapper header.
		 */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Table'),
		},
		/**
		 * Documentation link surfaced in the widget's overflow Actions menu.
		 * Empty (the default) hides the Documentation item; the Refresh and
		 * Request-a-feature items always render.
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * Stable id forwarded to the widget chrome for the Refresh /
		 * Request-a-feature payloads.
		 */
		widgetId: {
			type: String,
			default: '',
		},
		/** Register slug. Forwarded to CnDataTable. */
		register: {
			type: String,
			default: null,
		},
		/** Schema slug. Forwarded to CnDataTable. */
		schema: {
			type: String,
			default: null,
		},
		/**
		 * Column definitions. Forwarded to CnDataTable — bare string keys OR
		 * the object form (`{ key, label, sortable, width, cellClass,
		 * formatter, widget, format, aggregate }`) both pass straight through.
		 * @type {Array<object|string>}
		 */
		columns: {
			type: Array,
			default: () => [],
		},
		/** Rows array. Forwarded to CnDataTable. External rows always win over `source`. */
		rows: {
			type: Array,
			default: () => [],
		},
		/** Loading state. Forwarded to CnDataTable. */
		loading: {
			type: Boolean,
			default: false,
		},
		/**
		 * Declarative self-fetch source (ADR-049). When set and no external
		 * `rows` are supplied, the widget resolves `filter` @-tokens and
		 * drives CnDataTable's existing self-fetch with the resolved filter,
		 * `order`, and `limit`. `register` MAY carry an `@resolve:` sentinel —
		 * it is passed through unexpanded. Default `null` keeps the
		 * pre-existing pass-through behaviour byte-for-byte.
		 * @type {{register?: string, schema?: string, filter?: object, order?: object, limit?: number}|null}
		 */
		source: {
			type: Object,
			default: null,
		},
		/**
		 * Declarative actions (unified manifest action shape — `handler` |
		 * `open-modal` | `open-page` | `navigate` | `object-op`). `object-op`
		 * `patch` / `delete` (and every non-mutating type) render per row via
		 * CnRowActions; `object-op` `create` renders as a widget-scoped footer
		 * affordance. `delete` always confirms; `patch` / `create` confirm on
		 * `confirm: true`. Authorization-shaped fields on an action have no
		 * effect — OpenRegister RBAC is the only authority.
		 * @type {Array<object>}
		 */
		actions: {
			type: Array,
			default: () => [],
		},
		/**
		 * Hide the column-header row. Forwarded to CnDataTable — the compact
		 * dashboard-list surface.
		 */
		hideHeader: {
			type: Boolean,
			default: false,
		},
		/**
		 * Drop CnDataTable's card chrome (border, radius, shadow) so the table
		 * sits flush inside the widget card. Forwarded to CnDataTable.
		 */
		borderless: {
			type: Boolean,
			default: false,
		},
		/**
		 * Route NAME for row-click navigation. Mapped onto CnDataTable's
		 * `rowClickRoute` as `{ name: rowRoute, params: { id } }` with the
		 * row's `id` (or `@self.id`). Empty (the default) = no navigation.
		 */
		rowRoute: {
			type: String,
			default: '',
		},
		/**
		 * vue-router route object for the "View all" footer link. Forwarded
		 * to CnDataTable (footer shows when the rows are a `limit`-ed subset).
		 * @type {object|null}
		 */
		viewAllRoute: {
			type: Object,
			default: null,
		},
		/** Pre-translated "View all" footer label. Forwarded to CnDataTable. */
		viewAllLabel: {
			type: String,
			default: undefined,
		},
		/** Text shown when there are no rows. Forwarded to CnDataTable. */
		emptyText: {
			type: String,
			default: undefined,
		},
		/**
		 * Leading per-row icon: a static MDI icon name string, or a function
		 * `(row) => iconName`. Forwarded to CnDataTable.
		 * @type {string|Function|null}
		 */
		rowIcon: {
			type: [String, Function],
			default: null,
		},
	},

	data() {
		return {
			/** Error message from the last rejected object-op write ('' = none). */
			opError: '',
			/** @type {object|null} The object-op action awaiting confirmation (null = no dialog). */
			confirmAction: null,
			/** @type {object|null} The row the pending confirm-gated action targets. */
			confirmRow: null,
		}
	},

	computed: {
		/**
		 * The unwrapped detail-page object context for token resolution, or
		 * null on surfaces (dashboards) that don't provide one.
		 * @return {object|null}
		 */
		objectCtx() {
			const c = this.cnObjectContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/**
		 * The unwrapped workspace context bag (or null). Vue 2.7 inject may
		 * hand back a raw ref; unwrap `.value` for token resolution.
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
		 * @return {object}
		 */
		tokenCtx() {
			const base = this.objectCtx ? { ...this.objectCtx } : {}
			base.workspace = this.workspaceCtx || {}
			return base
		},
		/**
		 * `source.filter` with every @-token resolved against `tokenCtx`, then
		 * with any UNRESOLVED OPTIONAL clause (`@workspace.<key>?`) dropped —
		 * an optional clause simply shows all rows until its context is set.
		 * @return {object}
		 */
		resolvedFilter() {
			return dropOptionalUnresolved(resolveFilterTokens((this.source && this.source.filter) || {}, this.tokenCtx))
		},
		/**
		 * Whether a REQUIRED context token in `source.filter` is still
		 * unresolved — the widget then skips the fetch instead of querying the
		 * whole register.
		 * @return {boolean}
		 */
		waitingForContext() {
			return !!this.source && hasUnresolvedTokens(this.resolvedFilter)
		},
		/**
		 * Whether the declarative `source` drives a self-fetch: a usable
		 * source, no external rows (external rows always win), and no
		 * unresolved required token.
		 * @return {boolean}
		 */
		selfFetchActive() {
			return !!(this.source && this.source.register && this.source.schema)
				&& (!this.rows || this.rows.length === 0)
				&& !this.waitingForContext
		},
		/**
		 * Query params handed to CnDataTable's self-fetch: the resolved filter
		 * as direct field params (OpenRegister object-search shape),
		 * `_order[field]` entries from `source.order`, and — when
		 * `source.limit` is set — `_limit` of limit + 1 so CnDataTable's
		 * View-all footer can detect that more rows exist while the display
		 * caps at `limit`.
		 * @return {object}
		 */
		resolvedFetchParams() {
			const src = this.source || {}
			const params = {}
			for (const [field, dir] of Object.entries(src.order || {})) {
				params[`_order[${field}]`] = dir === 'desc' ? 'desc' : 'asc'
			}
			if (typeof src.limit === 'number' && src.limit > 0) {
				params._limit = src.limit + 1
			}
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
			return params
		},
		/**
		 * `$props` minus the chrome props (`title`, `documentationUrl`,
		 * `widgetId`) and the widget-only props (`source`, `actions`,
		 * `rowRoute`), so they are consumed here and never forwarded to the
		 * inner CnDataTable. `undefined` values are dropped so CnDataTable's
		 * own prop defaults apply. When the declarative `source` is active it
		 * supplies `register` / `schemaId` / `fetchParams` / `limit`; an
		 * `@resolve:` register sentinel passes through unexpanded.
		 * @return {object}
		 */
		innerProps() {
			// eslint-disable-next-line no-unused-vars
			const { title, documentationUrl, widgetId, source, actions, rowRoute, ...rest } = this.$props
			const inner = {}
			for (const [k, v] of Object.entries(rest)) {
				if (v !== undefined) inner[k] = v
			}
			if (this.selfFetchActive) {
				inner.register = this.source.register
				inner.schemaId = this.source.schema
				inner.fetchParams = this.resolvedFetchParams
				if (typeof this.source.limit === 'number' && this.source.limit > 0) {
					inner.limit = this.source.limit
				}
			}
			if (this.rowRoute) {
				inner.rowClickRoute = this.rowRouteFn
			}
			return inner
		},
		/**
		 * Row-click navigation function derived from the `rowRoute` route
		 * name (CnDataTable's `rowClickRoute` shape).
		 * @return {Function}
		 */
		rowRouteFn() {
			return (row) => {
				const id = row && (row.id || (row['@self'] && row['@self'].id))
				return id ? { name: this.rowRoute, params: { id: String(id) } } : null
			}
		},
		/**
		 * Actions rendered per row: every non-`object-op` type plus
		 * `object-op` `patch` / `delete` (they mutate THAT row's object).
		 * @return {Array<object>}
		 */
		rowScopedActions() {
			return (this.actions || []).filter((a) => a && (a.type !== 'object-op' || a.op === 'patch' || a.op === 'delete'))
		},
		/**
		 * `object-op` `create` actions — widget-scoped (no row to mutate), so
		 * they render in the list footer, never in the row menu.
		 * @return {Array<object>}
		 */
		createActions() {
			return (this.actions || []).filter((a) => a && a.type === 'object-op' && a.op === 'create')
		},
		/**
		 * Row-scoped actions mapped onto the CnRowActions shape: label + icon
		 * pass through, `object-op` `delete` renders destructive, and the
		 * handler routes back through the widget's confirm-gated dispatcher.
		 * @return {Array<object>}
		 */
		mappedRowActions() {
			return this.rowScopedActions.map((action) => ({
				label: action.label,
				icon: action.icon,
				destructive: action.type === 'object-op' && action.op === 'delete',
				handler: (row) => this.onActionTriggered(action, row),
			}))
		},
		/**
		 * Host-supplied CnDataTable scoped slots to forward (keys only). The
		 * `row-actions` slot is withheld while the widget renders its own
		 * declarative actions menu.
		 * @return {object}
		 */
		forwardedScopedSlots() {
			const out = {}
			for (const name of Object.keys(this.$scopedSlots || {})) {
				if (name === 'row-actions' && this.rowScopedActions.length > 0) continue
				out[name] = true
			}
			return out
		},
		/**
		 * Confirmation question for the pending confirm-gated action —
		 * destructive copy for `delete`, a generic confirm otherwise.
		 * @return {string}
		 */
		confirmMessage() {
			if (this.confirmAction && this.confirmAction.op === 'delete') {
				return t('nextcloud-vue', 'Are you sure you want to delete this item? This action cannot be undone.')
			}
			return t('nextcloud-vue', 'Are you sure you want to continue?')
		},
	},

	methods: {
		/**
		 * Entry point for every declarative action trigger (row menu or
		 * footer create button). `object-op` `delete` ALWAYS confirms;
		 * `patch` / `create` confirm only when the action sets
		 * `confirm: true`; everything else dispatches immediately.
		 *
		 * @param {object} action The manifest action.
		 * @param {object|null} row The row for row-scoped actions (null for create).
		 * @return {Promise<void>|void}
		 */
		onActionTriggered(action, row) {
			if (action && action.type === 'object-op' && (action.op === 'delete' || action.confirm === true)) {
				this.confirmAction = action
				this.confirmRow = row
				return
			}
			return this.runAction(action, row)
		},

		/**
		 * Confirm-dialog primary button: run the pending action and report
		 * the outcome back into the dialog's result phase.
		 * @return {Promise<void>}
		 */
		async onConfirmConfirmed() {
			const outcome = await this.runAction(this.confirmAction, this.confirmRow)
			const dialog = this.$refs.confirmDialog
			if (dialog) {
				dialog.setResult(outcome.ok ? { success: true } : { error: outcome.error })
			}
		},

		/**
		 * Close/cancel the confirm dialog and clear the pending action.
		 */
		closeConfirm() {
			this.confirmAction = null
			this.confirmRow = null
		},

		/**
		 * Dispatch an action. Non-mutating types go through the page's
		 * pre-bound `cnDispatchAction` (falling back to a bare
		 * `dispatchAction`); for `handler` actions the row is appended as the
		 * final handler argument so row context reaches the registry function.
		 * `object-op` actions dispatch via the shared object store — a
		 * rejected (RBAC) write surfaces `opError` and mutates NO local state;
		 * a success clears the error and refreshes the self-fetched rows.
		 *
		 * @param {object} action The manifest action.
		 * @param {object|null} row The target row (null for create).
		 * @return {Promise<{ok: boolean, error?: string}>}
		 */
		async runAction(action, row) {
			if (!action) return { ok: false, error: '' }
			if (action.type !== 'object-op') {
				const wrapped = (!action.type || action.type === 'handler')
					? { ...action, args: [...(action.args || []), row] }
					: action
				if (typeof this.cnDispatchAction === 'function') {
					this.cnDispatchAction(wrapped)
				} else {
					dispatchAction(wrapped, { router: this.$router || null })
				}
				return { ok: true }
			}

			const store = this.getObjectStore()
			const result = await dispatchAction(action, {
				objectStore: store,
				source: this.source,
				row,
			})
			const ok = !(result === null || result === false || result === undefined)
			if (!ok) {
				const error = this.readStoreError(store)
				this.opError = error
				return { ok: false, error }
			}
			this.opError = ''
			this.refresh()
			/**
			 * @event object-op Emitted after a successful declarative mutation
			 * so a host that supplies external `rows` can refetch them.
			 * @type {{action: object, row: (object|null), result: *}}
			 */
			this.$emit('object-op', { action, row, result })
			return { ok: true }
		},

		/**
		 * Re-run the inner CnDataTable's self-fetch (no-op when the widget is
		 * fed external rows).
		 */
		refresh() {
			const table = this.$refs.dataTable
			if (this.selfFetchActive && table && typeof table.fetchData === 'function') {
				table.fetchData()
			}
		},

		/**
		 * The shared object store instance, or null when no Pinia is active
		 * (`dispatchAction` then warns and no-ops).
		 * @return {object|null}
		 */
		getObjectStore() {
			try {
				return useObjectStore()
			} catch (e) {
				return null
			}
		},

		/**
		 * Human-readable message for the last store error on this widget's
		 * source type (RBAC rejection, network failure, …).
		 *
		 * @param {object|null} store The object store used for the dispatch.
		 * @return {string}
		 */
		readStoreError(store) {
			try {
				if (store && this.source) {
					const type = resolveObjectOpType(store, this.source)
					const err = store.errors && store.errors[type]
					if (err && err.message) return err.message
				}
			} catch (e) {
				// fall through to the generic message
			}
			return t('nextcloud-vue', 'The operation was rejected')
		},
	},
}
</script>

<style scoped>
.cn-widget-object-table {
	width: 100%;
}

.cn-widget-object-table__footer {
	display: flex;
	gap: 4px;
	padding: 4px 8px;
	border-top: 1px solid var(--color-border);
}

.cn-widget-object-table__error {
	color: var(--color-error);
	font-size: 0.85em;
	margin: 4px 8px 0;
}
</style>
