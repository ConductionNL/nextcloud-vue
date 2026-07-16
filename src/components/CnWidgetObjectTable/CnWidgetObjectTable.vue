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
	<component
		:is="hideWrapper ? 'CnWidgetHostShell' : 'CnWidgetWrapper'"
		v-bind="hideWrapper ? {} : { title, widgetId, documentationUrl, flush: true }">
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
	</component>
</template>

<script>
import { inject, ref } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import CnDataTable from '../CnDataTable/CnDataTable.vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'
import { CnRowActions } from '../CnRowActions/index.js'
import { CnIcon } from '../CnIcon/index.js'
import CnConfirmDialog from '../../dialogs/CnConfirmDialog.vue'
import { dispatchAction, resolveObjectOpType } from '../../utils/actionsDispatcher.js'
import { resolveFilterTokens, hasUnresolvedTokens, dropOptionalUnresolved } from '../../utils/resolveFilterTokens.js'
import { readVisibleWhenPath, compareVisibleWhen } from '../../utils/visibleWhen.js'
import { useEndpointSource } from '../../composables/useEndpointSource.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'
import { useObjectStore } from '../../store/useObjectStore.js'
// Chrome-less pass-through used when `hideWrapper` is set (see hostShell.js
// for why it lives in its own module).
import { CnWidgetHostShell } from './hostShell.js'

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
 * Wave 2 (#91): a declarative `endpointSource` (`{ url, method?, params?,
 * responsePath? }`) is the alternative to the OpenRegister `source` — rows
 * come from an app REST endpoint's payload at `responsePath`, fetched by the
 * shared `useEndpointSource` engine (token-resolved params, request dedup +
 * short-TTL cache, `cn:page:refresh` / `cn:widget:refresh` subscription).
 * Exactly one of `source` | `endpointSource`; columns / formatters /
 * `rowRoute` / `actions` apply unchanged on top of endpoint rows.
 *
 * A declarative `actions[]` array renders `patch` / `delete` `object-op`
 * actions (and reused `handler` / `open-modal` / `open-page` / `navigate`
 * actions) per row through `CnRowActions`; an `object-op` `create` action
 * renders as a widget-scoped footer affordance. `delete` is ALWAYS
 * confirm-gated through `CnConfirmDialog`; `patch` / `create` confirm only
 * on `confirm: true`. Mutations dispatch via the shared object store —
 * the manifest declares intent only, OpenRegister RBAC is the authority,
 * and a rejected write surfaces as an error without local mutation.
 *
 * A declarative `rowClass` (#91) — `[{ when: { field, op?, value }, class }]` reusing
 * the shared `visibleWhen` predicate grammar — is compiled into CnDataTable's
 * `rowClass` function so overdue / at-risk rows can be highlighted from the manifest
 * (a host-supplied `rowClass` FUNCTION still passes straight through).
 */
export default {
	name: 'CnWidgetObjectTable',

	components: { CnDataTable, CnWidgetWrapper, CnWidgetHostShell, CnRowActions, CnIcon, NcButton, CnConfirmDialog },

	inject: {
		/**
		 * Detail-page object context (`{ objectId, object, register, schema }`)
		 * provided by CnDetailPage — enables `@objectId` / `@object.<field>`
		 * tokens in `source.filter`. Null on dashboards.
		 */
		cnObjectContext: { default: null },
		/**
		 * v2 slot-grid detail context holder (`{ value: { objectData, schema,
		 * objectType, objectId, register, store } | null }`) provided by
		 * CnPageRenderer — backfills the object token context so
		 * `@objectId` / `@object.<field>` resolve on detail surfaces where
		 * CnDetailPage is not an ancestor (#91 Wave 3).
		 */
		cnDetailObjectContext: { default: null },
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
		/**
		 * Render content-only, WITHOUT the widget's own CnWidgetWrapper
		 * chrome. Set by hosts that already provide the card chrome — e.g.
		 * CnDashboardPage's dashboard widget grid, whose registry branch
		 * wraps every catalog widget in its own CnWidgetWrapper (a naive
		 * mount would double-card). Default `false` keeps the pre-existing
		 * self-chromed v2 rendering byte-for-byte.
		 */
		hideWrapper: {
			type: Boolean,
			default: false,
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
		 * it is passed through unexpanded. `extend` (#91 Wave 3) forwards
		 * OpenRegister `_extend[]` values (e.g. `["calculations"]`) on the
		 * fetch so virtual/declarative calc fields ride along and render as
		 * ordinary columns. Default `null` keeps the pre-existing
		 * pass-through behaviour byte-for-byte.
		 * @type {{register?: string, schema?: string, filter?: object, order?: object, limit?: number, extend?: string[]}|null}
		 */
		source: {
			type: Object,
			default: null,
		},
		/**
		 * Endpoint data binding (Wave 2, #91) — the alternative to the
		 * OpenRegister `source` for rows an app REST endpoint computes (e.g. a
		 * per-source performance report). Rows come from the payload at
		 * `responsePath` (a dot-path; the plucked value must be an array —
		 * anything else renders as empty). `params` values use the shared
		 * filter-token grammar (`@workspace.dateFrom?`, `@me`, `@today±Nd`, …)
		 * and re-resolve + refetch when the page context changes. Requests are
		 * deduped + short-TTL cached per (url+params) by the shared
		 * `useEndpointSource` engine, which also subscribes to
		 * `cn:page:refresh` / `cn:widget:refresh`. Exactly one of `source` |
		 * `endpointSource` (validator-enforced); external `rows` still win
		 * over both. `columns` / formatters / `rowRoute` / `actions` apply
		 * unchanged on top of endpoint rows.
		 * @type {{url: string, method?: string, params?: object, responsePath?: string}|null}
		 */
		endpointSource: {
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
		/**
		 * Per-row CSS class binding (#91). Two forms:
		 *  - a FUNCTION `(row) => string` — passed straight through to
		 *    CnDataTable's `rowClass` (the pre-existing host-supplied contract).
		 *  - an ARRAY of declarative rules `[{ when: { field, op?, value }, class }]`
		 *    compiled here into that function. Each rule adds its `class` to a
		 *    row when the shared `visibleWhen` predicate holds against the row:
		 *    `field` is a dot-path into the row, `op` is `eq|neq|gt|gte|lt|lte`
		 *    (default `eq`), `value` is the literal right-hand side. Rules are
		 *    evaluated in order and every matching `class` is space-joined, so an
		 *    overdue / at-risk row can be highlighted declaratively from a
		 *    manifest with no bespoke function. Default `null` = no row class.
		 * @type {Function|Array<{when: {field: string, op?: string, value: *}, class: string}>|null}
		 */
		rowClass: {
			type: [Function, Array],
			default: null,
		},
	},

	setup(props) {
		// Endpoint binding (Wave 2, #91): the shared useEndpointSource engine
		// owns token resolution, request dedup + TTL caching, and the
		// cn:page:refresh / cn:widget:refresh subscriptions (the widget's own
		// `widgetId` is matched against widget-scoped refresh payloads).
		// No-op while `endpointSource` is null, so the OpenRegister `source`
		// self-fetch path is untouched. Injects re-read in setup (same
		// resolution as the Options `inject` block).
		const objectCtxRaw = inject('cnObjectContext', null)
		const detailCtxRaw = inject('cnDetailObjectContext', null)
		const workspaceRaw = inject('cnWorkspaceContext', ref(null))
		const appConfigRaw = inject('cnAppConfig', ref({}))
		const unwrap = (v) => ((v && typeof v === 'object' && 'value' in v) ? v.value : v)
		// External rows always win — and suppress the request entirely (the
		// pre-existing "when rows are provided, no API calls are made"
		// contract), so the getter resolves to null while `rows` are supplied.
		const { data, loading, error, refetch } = useEndpointSource(
			() => ((props.rows && props.rows.length > 0) ? null : props.endpointSource),
			{
				ctx: () => ({
					...(resolveObjectTokenContext(objectCtxRaw, detailCtxRaw) || {}),
					workspace: unwrap(workspaceRaw) || {},
					config: unwrap(appConfigRaw) || {},
				}),
				widgetId: () => props.widgetId,
			},
		)
		return { epData: data, epLoading: loading, epError: error, epRefetch: refetch }
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
		 * The merged detail-page object context for token resolution — both
		 * detail-surface injects, holder fields backfilling (#91 Wave 3) —
		 * or null on surfaces (dashboards) that don't provide one.
		 * @return {object|null}
		 */
		objectCtx() {
			return resolveObjectTokenContext(this.cnObjectContext, this.cnDetailObjectContext)
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
		 * Whether the Wave-2 `endpointSource` drives the rows: a usable
		 * endpoint config and no external rows (external rows always win).
		 * @return {boolean}
		 */
		endpointActive() {
			return !!(this.endpointSource && this.endpointSource.url)
				&& (!this.rows || this.rows.length === 0)
		},
		/**
		 * Rows resolved from the endpoint payload. The payload (after the
		 * `responsePath` pluck the shared engine applies) must be an ARRAY;
		 * anything else renders as an empty table rather than crashing the
		 * column renderer.
		 * @return {Array<object>}
		 */
		endpointRows() {
			return Array.isArray(this.epData) ? this.epData : []
		},
		/**
		 * Whether the declarative `source` drives a self-fetch: a usable
		 * source, no external rows (external rows always win), no active
		 * endpoint binding (exactly-one-of — endpointSource wins when both
		 * slip past the validator), and no unresolved required token.
		 * @return {boolean}
		 */
		selfFetchActive() {
			return !!(this.source && this.source.register && this.source.schema)
				&& (!this.rows || this.rows.length === 0)
				&& !this.endpointActive
				&& !this.waitingForContext
		},
		/**
		 * Query params handed to CnDataTable's self-fetch: the resolved filter
		 * as direct field params (OpenRegister object-search shape),
		 * `_order[field]` entries from `source.order`, and — when
		 * `source.limit` is set — `_limit` of limit + 1 so CnDataTable's
		 * View-all footer can detect that more rows exist while the display
		 * caps at `limit`.
		 *
		 * IN-lists: an ARRAY filter value (either directly on the field or via
		 * the `{ in: [...] }` operator form) is emitted as the bare field with
		 * the array value, which axios serializes as repeated bracket params
		 * (`field[]=a&field[]=b`) — the same shape `buildQueryString` /
		 * `useObjectStore` send and the only IN form OpenRegister parses (a
		 * `field[in]`-style key is NOT understood server-side). Empty arrays
		 * are skipped (no constraint).
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
			// `source.extend` (#91 Wave 3): forwarded as OR's repeated
			// `_extend[]` param so virtual/declarative fields (e.g.
			// `calculations` — procest daysOverdue) ride the fetch and are
			// displayable as ordinary columns. Serialized by the shared
			// query builder (array value → repeated `key[]`).
			if (Array.isArray(src.extend) && src.extend.length > 0) {
				params._extend = src.extend.filter((e) => typeof e === 'string' && e !== '')
			}
			const filter = this.resolvedFilter
			if (filter && typeof filter === 'object') {
				for (const [k, v] of Object.entries(filter)) {
					if (Array.isArray(v)) {
						if (v.length > 0) params[k] = v
					} else if (v && typeof v === 'object') {
						for (const [op, ov] of Object.entries(v)) {
							if (op === 'in' && Array.isArray(ov)) {
								// OR's IN form is the bare repeated field param.
								if (ov.length > 0) params[k] = ov
							} else {
								params[`${k}[${op}]`] = ov
							}
						}
					} else if (v !== '' && v !== null && v !== undefined) {
						params[k] = v
					}
				}
			}
			return params
		},
		/**
		 * `$props` minus the chrome props (`title`, `documentationUrl`,
		 * `widgetId`, `hideWrapper`) and the widget-only props (`source`,
		 * `endpointSource`, `actions`, `rowRoute`), so they are consumed here
		 * and never forwarded to the inner CnDataTable. `undefined` values are
		 * dropped so CnDataTable's own prop defaults apply. When the
		 * declarative `source` is active it supplies `register` / `schemaId` /
		 * `fetchParams` / `limit`; an `@resolve:` register sentinel passes
		 * through unexpanded. When the Wave-2 `endpointSource` is active it
		 * supplies the resolved `rows` + `loading` instead — columns,
		 * formatters, and row navigation apply unchanged on top.
		 * @return {object}
		 */
		innerProps() {
			// eslint-disable-next-line no-unused-vars
			const { title, documentationUrl, widgetId, hideWrapper, source, endpointSource, actions, rowRoute, rowClass, ...rest } = this.$props
			const inner = {}
			for (const [k, v] of Object.entries(rest)) {
				if (v !== undefined) inner[k] = v
			}
			// `rowClass` is consumed here (function or declarative rules[]) and
			// forwarded to CnDataTable as a compiled `(row) => class` function.
			if (this.compiledRowClass) {
				inner.rowClass = this.compiledRowClass
			}
			if (this.selfFetchActive) {
				inner.register = this.source.register
				inner.schemaId = this.source.schema
				inner.fetchParams = this.resolvedFetchParams
				if (typeof this.source.limit === 'number' && this.source.limit > 0) {
					inner.limit = this.source.limit
				}
			}
			if (this.endpointActive) {
				inner.rows = this.endpointRows
				inner.loading = this.epLoading || this.loading
			}
			if (this.rowRoute) {
				inner.rowClickRoute = this.rowRouteFn
			}
			return inner
		},
		/**
		 * The effective `rowClass` function forwarded to CnDataTable. A
		 * host-supplied FUNCTION passes straight through; a declarative
		 * rules[] array is compiled into a `(row) => string` that space-joins
		 * every rule whose shared `visibleWhen` predicate holds against the
		 * row (`field` dot-path + `op` + `value`). Null when `rowClass` is
		 * unset or an empty array — the widget then forwards nothing so
		 * CnDataTable's own default applies.
		 * @return {Function|null}
		 */
		compiledRowClass() {
			const rc = this.rowClass
			if (typeof rc === 'function') {
				return rc
			}
			if (!Array.isArray(rc) || rc.length === 0) {
				return null
			}
			const rules = rc
			return (row) => {
				const classes = []
				for (const rule of rules) {
					if (!rule || !rule.class) continue
					const when = rule.when || {}
					const actual = readVisibleWhenPath(row, when.field)
					if (compareVisibleWhen(actual, when.op || 'eq', when.value)) {
						classes.push(rule.class)
					}
				}
				return classes.join(' ')
			}
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
		 * Re-run the active fetch: the endpoint binding (force-refetch past
		 * the shared cache) or the inner CnDataTable's self-fetch. No-op when
		 * the widget is fed external rows.
		 */
		refresh() {
			if (this.endpointActive) {
				this.epRefetch()
				return
			}
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
