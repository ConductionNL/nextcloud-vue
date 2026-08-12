<!--
  CnLogsPage — Read-only audit-trail / activity-log surface.

  Wraps CnDataTable with server-side sorting, pagination and filtering.
  Reads its data source from `config`:
    - { register, schema } → fetched via the OpenRegister object store
    - { source: '/api/url' } → fetched via axios.get(source)

  In store mode the list state (params, paging, sort, filters) is owned by
  the shared `useListView` composable, so a `?jobId=<uuid>`-style deep link
  lands the page pre-filtered — the same behaviour CnIndexPage has.

  Mounted by CnPageRenderer when a manifest page declares
  `type: "logs"`. Honours `headerComponent`, `actionsComponent`, and
  the generic `slots` map from `pages[]` (forwarded by the renderer
  through scoped slots; this component just exposes `#header`,
  `#actions`, and `#row-actions` slots which the renderer fills).

  Backwards-compat: when neither `register+schema` nor `source` is
  set, the component renders an empty-state with a console warning
  rather than throwing — this keeps a misconfigured manifest from
  breaking the app shell.
-->
<template>
	<div class="cn-logs-page" data-testid="cn-logs-page">
		<!-- @slot Replaces the default CnPageHeader. CnPageRenderer fills it from `pages[].headerComponent` / `slots.header`. -->
		<!-- @binding {string} title The page title. -->
		<!-- @binding {string} description The page description. -->
		<!-- @binding {string} icon The header's MDI icon name. -->
		<slot
			name="header"
			:title="title"
			:description="description"
			:icon="icon">
			<CnPageHeader
				v-if="title"
				:title="title"
				:description="description"
				:icon="icon"
				:visually-hidden="!showTitle" />
		</slot>

		<div v-if="$slots.actions" class="cn-logs-page__actions">
			<!-- @slot Right-aligned action area (refresh, export, …). CnPageRenderer fills it from `pages[].actionsComponent`. -->
			<slot name="actions" />
		</div>

		<!-- Body -->
		<div class="cn-logs-page__body">
			<!-- Loading state -->
			<div v-if="loading" class="cn-logs-page__loading">
				<NcLoadingIcon :size="32" />
			</div>

			<!-- The error block below is a SIBLING of this chain, not part of it, so
			     BOTH guards here are load-bearing and neither is sufficient alone.
			     A failed fetch leaves the collection empty, so:
			       - without `&& !error`, this branch renders "no log entries"
			         stacked above "could not load log entries";
			       - without the `rows.length > 0` guard on the table branch, the
			         `v-else` catches that same state instead and mounts CnDataTable
			         with zero rows, which renders its OWN empty row from the same
			         `emptyText` — the identical contradiction, just inside a table.
			     So: error + no rows shows the error alone; no error + no rows shows
			     this block; rows present shows the table, with the error beneath it
			     when a refresh failed over a still-populated collection. -->
			<div v-else-if="rows.length === 0 && !error" class="cn-logs-page__empty">
				<!-- @slot Replaces the empty-state block shown when there are no log entries. -->
				<slot name="empty">
					<NcEmptyContent :name="emptyText">
						<template #icon>
							<HistoryIcon :size="64" />
						</template>
					</NcEmptyContent>
				</slot>
			</div>

			<!-- Table. `v-else-if="rows.length > 0"` rather than a bare `v-else` —
			     see the guard note above. -->
			<template v-else-if="rows.length > 0">
				<CnDataTable
					:schema="tableSchema"
					:columns="resolvedColumns"
					:rows="rows"
					:row-key="rowKey"
					:fixed-layout="fixedLayout"
					:sort-key="effectiveSortKey"
					:sort-order="effectiveSortOrder"
					:sort-keys="effectiveSortKeys"
					:empty-text="emptyText"
					@sort="onSort"
					@row-click="onRowClick">
					<template
						v-for="col in slotColumns"
						#[`column-${col}`]="{ row, value }">
						<!-- @slot Per-column cell renderer (`#column-<key>`), one per configured column key. -->
						<!-- @binding {object} row The log entry being rendered. -->
						<!-- @binding {*} value The cell's resolved value. -->
						<slot :name="'column-' + col" :row="row" :value="value" />
					</template>
					<template v-if="$slots['row-actions']" #row-actions="{ row }">
						<!-- @slot Per-row action menu cell. Supplying it adds the trailing actions column. -->
						<!-- @binding {object} row The log entry for this row. -->
						<slot name="row-actions" :row="row" />
					</template>
				</CnDataTable>

				<CnPagination
					v-if="paginationState && paginationState.pages > 1"
					class="cn-logs-page__pagination"
					:current-page="paginationState.page || 1"
					:total-pages="paginationState.pages || 1"
					:total-items="paginationState.total || 0"
					:current-page-size="paginationState.limit || 20"
					@page-changed="onPageChange"
					@page-size-changed="onPageSizeChange" />
			</template>

			<div v-if="error" class="cn-logs-page__error">
				<!-- @slot Replaces the error block shown when the fetch fails. -->
				<!-- @binding {*} error The recorded fetch error. -->
				<slot name="error" :error="error">
					<NcEmptyContent :name="errorText">
						<template #icon>
							<AlertCircleOutline :size="64" />
						</template>
					</NcEmptyContent>
				</slot>
			</div>
		</div>

		<!-- Row-detail dialog (opt-in via `rowDetail`). A log row's interesting
		     payload is usually a nested object (a stack trace, an argument bag)
		     that a table cell can only summarise. -->
		<NcDialog
			v-if="detailRow"
			:open="true"
			:name="detailTitle"
			size="large"
			@update:open="closeDetail">
			<!-- @slot Replaces the built-in row-detail dialog body. -->
			<!-- @binding {object} row The clicked log row. -->
			<slot name="row-detail" :row="detailRow">
				<div class="cn-logs-page__detail">
					<CnDetailGrid
						v-if="detailScalarItems.length > 0"
						layout="horizontal"
						:items="detailScalarItems" />
					<template v-for="block in detailObjectBlocks" :key="block.key">
						<h4 class="cn-logs-page__detail-heading">
							{{ block.label }}
						</h4>
						<CnDetailGrid
							v-if="block.items"
							layout="horizontal"
							:items="block.items" />
						<pre v-else class="cn-logs-page__detail-json">{{ block.json }}</pre>
					</template>
				</div>
			</slot>
			<template #actions>
				<NcButton @click="closeDetail">
					{{ closeLabel }}
				</NcButton>
			</template>
		</NcDialog>
	</div>
</template>

<script>
import { computed, getCurrentInstance, inject } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import axios from '@nextcloud/axios'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import HistoryIcon from 'vue-material-design-icons/History.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import { CnDataTable } from '../CnDataTable/index.js'
import { CnDetailGrid } from '../CnDetailGrid/index.js'
import { CnPageHeader } from '../CnPageHeader/index.js'
import { CnPagination } from '../CnPagination/index.js'
import { useListView } from '../../composables/index.js'
import { useObjectStore } from '../../store/index.js'
import { multiKeySort } from '../../utils/multiKeySort.js'
import { resolveFilterMap, resolveQueryFilters } from '../../utils/routeFilters.js'

/**
 * Legacy default columns. Retained ONLY for `source` mode and for a store
 * mode whose schema could not be loaded — see `resolvedColumns`. They match
 * no OpenRegister log schema, so a store-backed page derives its columns
 * from the schema instead.
 *
 * A function, not a constant: `t()` at module scope would resolve before the
 * consuming app calls `registerTranslations()`, pinning the labels to English.
 *
 * @return {Array<{key: string, label: string, sortable?: boolean}>} The legacy column set.
 */
function legacyDefaultColumns() {
	return [
		{ key: 'timestamp', label: t('nextcloud-vue', 'Timestamp'), sortable: true },
		{ key: 'actor', label: t('nextcloud-vue', 'Actor'), sortable: true },
		{ key: 'action', label: t('nextcloud-vue', 'Action'), sortable: true },
		{ key: 'target', label: t('nextcloud-vue', 'Target') },
		{ key: 'details', label: t('nextcloud-vue', 'Details') },
	]
}

/**
 * CnLogsPage — Read-only audit-trail / activity-log page.
 *
 * Renders a CnDataTable of log entries with server-side sorting,
 * pagination and filtering. Columns come from `columns` (manifest:
 * `pages[].config.columns`); when none are given, a store-backed page
 * derives them from the schema.
 *
 * Two data-fetch modes:
 *  - `register` + `schema`: fetched via `useObjectStore` as a regular
 *    OpenRegister collection. The store registers the type as
 *    `${register}-${schema}` per existing convention. List state is
 *    owned by `useListView`, so `_limit` / `_page` / `_order` and any
 *    `$route.query` / `filter` entries are sent with every request.
 *  - `source`: a custom URL fetched via `axios.get(source)`. The
 *    response shape may be either `{ results: [...] }` or a bare
 *    array; the component handles both. This escape hatch supports
 *    apps whose log surface is not OR-backed (e.g. a flat file).
 *    Sorting is applied client-side; there is no pagination.
 *
 * Filtering (store mode) merges two sources, `filter` winning a collision:
 *  1. `$route.query` — every non-`_`-prefixed entry becomes a filter, so
 *     `/jobs/logs?jobId=<uuid>` lands the page scoped to one job.
 *  2. `filter` — the manifest's own scoping, with `@route.<param>` /
 *     `:<param>` / `@me` / `@today±Nd` tokens resolved at fetch time.
 *
 * Slots:
 *  - `#header` — Replaces the default CnPageHeader.
 *  - `#actions` — Renders a right-aligned action area (refresh,
 *    export, etc.). The CnPageRenderer wires this from
 *    `pages[].actionsComponent` when present.
 *  - `#empty` — Replaces the empty-state block.
 *  - `#error` — Replaces the error block. Scope: `{ error }`.
 *  - `#row-actions` — Per-row action menu in the table. Scope:
 *    `{ row }`.
 *  - `#row-detail` — Replaces the row-detail dialog body. Scope: `{ row }`.
 *  - `#column-<key>` — Per-column custom cell renderer. Scope:
 *    `{ row, value }`.
 *
 * Props are intentionally permissive — every default has a sensible
 * fallback, so a manifest entry as small as
 * `{ type: "logs", config: { source: "/api/logs" } }` renders.
 */
export default {
	name: 'CnLogsPage',

	components: {
		NcButton,
		NcDialog,
		NcEmptyContent,
		NcLoadingIcon,
		HistoryIcon,
		AlertCircleOutline,
		CnDataTable,
		CnDetailGrid,
		CnPageHeader,
		CnPagination,
	},

	props: {
		/** Page title. Defaults to "Activity log" so a bare manifest entry still renders meaningfully. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Activity log'),
		},
		/** Description shown under the title when `showTitle` is set. */
		description: {
			type: String,
			default: '',
		},
		/**
		 * Whether to render the inline page header VISIBLY. Defaults to true:
		 * unlike CnIndexPage (which surfaces the title in its sidebar header
		 * when this is false), a logs page has no sidebar fallback, so a false
		 * default left the page with no heading at all. Setting it to false is
		 * now safe for accessibility either way — the `<h1>` is still rendered
		 * visually-hidden, so the `<main>` landmark keeps its accessible
		 * heading (WCAG 2.4.6 / 1.3.1).
		 */
		showTitle: {
			type: Boolean,
			default: true,
		},
		/** MDI icon name for the header. */
		icon: {
			type: String,
			default: '',
		},
		/**
		 * OpenRegister register slug. Required (with `schema`) for store-backed
		 * mode. Changing it after mount requires a remount — CnPageRenderer keys
		 * the dispatched page on register+schema, so a manifest page swap already
		 * remounts.
		 */
		register: {
			type: String,
			default: '',
		},
		/**
		 * OpenRegister schema slug. Required (with `register`) for store-backed
		 * mode. Changing it after mount requires a remount (see `register`).
		 */
		schema: {
			type: String,
			default: '',
		},
		/** Custom log source URL — used when `register`+`schema` is not set. */
		source: {
			type: String,
			default: '',
		},
		/**
		 * Column definitions for the table. When omitted, a store-backed page
		 * derives its columns from the loaded schema; a `source`-backed page
		 * (or one whose schema failed to load) falls back to
		 * `[timestamp, actor, action, target, details]`.
		 * Pass either an array of strings (treated as keys + auto-labels)
		 * OR an array of `{ key, label, sortable, width }` objects.
		 *
		 * @type {Array<string|{key: string, label: string}>}
		 */
		columns: {
			type: Array,
			default: () => [],
		},
		/**
		 * Fixed filter map merged into every fetch, ABOVE the `$route.query`
		 * deep-link filters so the page's own scoping wins on a key collision.
		 * Values support the shared token grammar: `@route.<param>` / `:<param>`
		 * (route params), `@me`, `@today±Nd`, `@workspace.<key>`. Null = no fixed
		 * filter. Store mode only.
		 *
		 * @type {object|null}
		 */
		filter: {
			type: Object,
			default: null,
		},
		/**
		 * Pagination config; only `limit` is read, as the page size sent as
		 * `_limit`. Null = the store default of 20. Store mode only.
		 *
		 * @type {{limit?: number}|null}
		 */
		pagination: {
			type: Object,
			default: null,
		},
		/**
		 * Initial sort column. Null (the default) sends no `_order`, leaving the
		 * server's own ordering in place.
		 */
		sortKey: {
			type: String,
			default: null,
		},
		/** Initial sort direction. Inert while `sortKey` is null. */
		sortOrder: {
			type: String,
			default: 'asc',
			validator: (v) => v === null || ['asc', 'desc'].includes(v),
		},
		/**
		 * Initial MULTI-column sort as an ordered priority list. Takes precedence
		 * over `sortKey`/`sortOrder` when non-empty; empty (the default) is inert.
		 *
		 * @type {Array<{key: string, order: 'asc'|'desc'}>}
		 */
		sortKeys: {
			type: Array,
			default: () => [],
		},
		/**
		 * Make the columns' declared `width` authoritative (`table-layout: fixed`)
		 * instead of a hint the browser may override from cell content. Worth
		 * setting on a log table: message text and long unbreakable values like a
		 * PHP FQCN otherwise dictate the column widths between them. Long values
		 * then wrap inside their cell rather than overflowing it. Default false
		 * keeps the previous auto layout.
		 */
		fixedLayout: {
			type: Boolean,
			default: false,
		},
		/**
		 * Open a read-only detail dialog when a row is clicked, rendering the
		 * entry's fields — including nested bags like a stack trace or an
		 * argument map that a table cell can only summarise. Default false
		 * keeps a row click inert, as before. Ignored when `rowRoute` is set:
		 * a purpose-built page beats a generic dialog.
		 */
		rowDetail: {
			type: Boolean,
			default: false,
		},
		/**
		 * Manifest page id (route name) to open on a row click, pushed as
		 * `{ name: rowRoute, params: { id: row[rowKey] } }` — the same shape
		 * CnIndexPage's `open-page` actions use. For a log whose detail surface
		 * is a real page (a step timeline, a replay action) rather than a
		 * read-only dump. Takes precedence over `rowDetail`.
		 */
		rowRoute: {
			type: String,
			default: '',
		},
		/** Row identifier property. Defaults to `id` (matches OR + most custom log shapes). */
		rowKey: {
			type: String,
			default: 'id',
		},
		/** Text shown when there are no log entries. */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No log entries to show'),
		},
		/** Text shown when the fetch fails. */
		errorText: {
			type: String,
			default: () => t('nextcloud-vue', 'Could not load log entries'),
		},
		/** Label for the row-detail dialog's close button. */
		closeLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Close'),
		},
		/**
		 * Override the object store. Useful when the consuming app calls
		 * `createObjectStore` with a custom ID. When null, the default
		 * `useObjectStore()` is used. The component skips store wiring
		 * entirely when in `source` mode.
		 *
		 * @type {object|null}
		 */
		store: {
			type: Object,
			default: null,
		},
	},

	emits: [
		/**
		 * @event action Declared for hosts that dispatch log-row actions through
		 * the `#row-actions` slot. Never emitted by this component itself; kept
		 * in the surface because consumers may already listen for it.
		 */
		'action',
		/**
		 * @event row-click Emitted when a log row's body is clicked, whether or
		 * not `rowDetail` opened the detail dialog — so a host can navigate
		 * instead of (or as well as) showing the dialog.
		 * @type {object}
		 */
		'row-click',
	],

	setup(props) {
		// Always returned, even when the composable is not used: Vue warns when
		// a computed reads a key setup() omitted, and `source` mode reads these.
		// The two signatures are included for the same reason — the watchers
		// below target them by name, and `source` mode takes this early return.
		const NO_LIST = {
			list: null,
			objectType: '',
			listStore: null,
			workspaceSignature: '',
			appConfigSignature: '',
		}
		if (!props.register || !props.schema) return NO_LIST

		const store = props.store || useObjectStore()
		// The `store` prop has always accepted a hand-rolled object, but
		// useListView assumes a full OpenRegister store (pagination/errors/
		// fetchSchema). Duck-type it and fall back to the legacy no-params
		// fetch rather than throwing on a partial store.
		if (typeof store.fetchCollection !== 'function' || !store.pagination) return NO_LIST

		const objectType = `${props.register}-${props.schema}`
		// Must run synchronously: useListView's onMounted calls fetchSchema(),
		// which throws when the type is not registered yet. Positional
		// signature: (slug, schemaId, registerId).
		if (typeof store.registerObjectType === 'function') {
			store.registerObjectType(objectType, props.schema, props.register)
		}

		const instance = getCurrentInstance()

		// Token-resolution context for the `filter` prop's `@workspace.<key>` /
		// `@config.<key>` / `@object.<field>` tokens. Same injects + unwrap shape
		// as useSelfFetchList's `tokenCtx`. Without it `resolveFilterMap` was
		// called with no ctx, and `resolveFilterValue` returns an unresolvable
		// token VERBATIM — so a page declaring `filter: { client:
		// '@workspace.selectedClient' }` sent the literal string
		// "@workspace.selectedClient" to OpenRegister as a property filter and got
		// an empty table with no error, despite the prop doc naming that token.
		// All three default to absent, so an app that never provides them is
		// unaffected.
		const objectCtxRaw = inject('cnObjectContext', null)
		const workspaceCtxRaw = inject('cnWorkspaceContext', null)
		const appConfigRaw = inject('cnAppConfig', null)
		const unwrapCtx = (v) => ((v && typeof v === 'object' && 'value' in v) ? v.value : v)
		const tokenCtx = () => {
			const objCtx = unwrapCtx(objectCtxRaw)
			const base = (objCtx && typeof objCtx === 'object') ? { ...objCtx } : {}
			base.workspace = unwrapCtx(workspaceCtxRaw) || {}
			base.config = unwrapCtx(appConfigRaw) || {}
			return base
		}
		// `fixedFilters` is a plain getter called at fetch time, NOT auto-tracked
		// by Vue, so a change to either bag would otherwise never re-scope the
		// list — the token would resolve once on mount and stay stale. Stringified
		// so the watchers below fire on real content changes, not identity.
		const workspaceSignature = computed(() => JSON.stringify(unwrapCtx(workspaceCtxRaw) || {}))
		const appConfigSignature = computed(() => JSON.stringify(unwrapCtx(appConfigRaw) || {}))

		const list = useListView(objectType, {
			objectStore: store,
			defaultPageSize: (props.pagination && props.pagination.limit) || undefined,
			defaultSort: props.sortKey ? { key: props.sortKey, order: props.sortOrder || 'asc' } : undefined,
			defaultSortKeys: props.sortKeys.length > 0 ? props.sortKeys : undefined,
			// A getter, not a plain map: it is re-read on every fetch, so a
			// `?jobId=` change re-scopes the list without re-creating the list.
			fixedFilters: () => {
				const route = instance && instance.proxy && instance.proxy.$route
				return {
					...resolveQueryFilters(route && route.query),
					...resolveFilterMap(props.filter, (route && route.params) || {}, tokenCtx()),
				}
			},
		})

		return { list, objectType, listStore: store, workspaceSignature, appConfigSignature }
	},

	data() {
		return {
			localRows: [],
			localLoading: false,
			localError: null,
			localSortKeys: [],
			detailRow: null,
		}
	},

	computed: {
		/** Whether the component fetches via the object store + useListView. */
		usesStore() {
			return !!this.list
		},
		/**
		 * Whether the component should fetch via axios. Store mode needs BOTH
		 * `register` and `schema`, so a half-configured pair with a `source` set
		 * still falls back to the URL rather than the empty state.
		 */
		usesSource() {
			return !(this.register && this.schema) && !!this.source
		},
		/** Loading state of the active fetch mode. */
		loading() {
			// `list` is a bag of refs returned from setup(); only TOP-LEVEL setup
			// refs are auto-unwrapped, so every read below goes through `.value`.
			return this.list ? this.list.loading.value : this.localLoading
		},
		/**
		 * Fetch error. `fetchCollection` records failures on the store rather
		 * than throwing, so store mode reads them from there — without this the
		 * `#error` slot never rendered for a store-backed page.
		 */
		error() {
			if (this.localError) return this.localError
			if (this.list && this.listStore) return this.listStore.errors[this.objectType] || null
			return null
		},
		/** Rows to render: the store collection, or locally sorted axios rows. */
		rows() {
			if (this.list) return this.list.objects.value
			// Legacy-store fallback: read the store's collection LIVE rather than
			// the snapshot `fetch()` took. `rows` used to reach the collection
			// through a computed; snapshotting into `localRows` meant a store that
			// REPLACES the array (rather than mutating it in place) no longer
			// reached the table. Only `this.store` is consulted — in this path it is
			// the partial store prop that made setup() bail — so `source` mode,
			// which has no store, still falls through to localRows.
			const live = (this.register && this.schema && this.store)
				? this.store.collections?.[`${this.register}-${this.schema}`]
				: null
			const base = Array.isArray(live) ? live : this.localRows
			if (this.localSortKeys.length === 0) return base
			// CnDataTable is presentational — it never sorts its own rows — so
			// `source` mode has to apply the header sort itself.
			return multiKeySort(base, this.localSortKeys.map((k) => ({ field: k.key, order: k.order })))
		},
		/**
		 * Server pagination STATE (`{ total, page, pages, limit }`); null in
		 * source mode, which has no paging. Distinct from the `pagination`
		 * prop, which is the manifest's page-size config.
		 */
		paginationState() {
			return this.list ? this.list.pagination.value : null
		},
		/**
		 * The LOADED schema object (not the `schema` slug prop), forwarded to
		 * CnDataTable for type-aware cell rendering and schema-derived columns.
		 */
		tableSchema() {
			return (this.list && this.list.schema.value) || null
		},
		/** Active ordered sort keys, from the composable or local source state. */
		effectiveSortKeys() {
			return this.list ? this.list.sortKeys.value : this.localSortKeys
		},
		/** Primary sort key (mirrors `effectiveSortKeys[0]`) for CnDataTable. */
		effectiveSortKey() {
			return this.effectiveSortKeys[0]?.key ?? null
		},
		/** Primary sort direction (mirrors `effectiveSortKeys[0]`). */
		effectiveSortOrder() {
			return this.effectiveSortKeys[0]?.order ?? 'asc'
		},
		/**
		 * Resolved columns. A consumer-provided list wins. Otherwise, when a
		 * schema is loaded, return `[]` so CnDataTable derives the columns from
		 * it — the legacy `timestamp/actor/action/target/details` default matched
		 * no OpenRegister log schema and rendered five blank cells. `source` mode
		 * and a failed schema load still get that legacy default.
		 */
		resolvedColumns() {
			if (this.columns.length > 0) {
				return this.columns.map((c) => (typeof c === 'string' ? { key: c, label: this.humanise(c) } : c))
			}
			if (this.tableSchema) return []
			return legacyDefaultColumns()
		},
		/** Column slot names that the parent has provided (for pass-through). */
		slotColumns() {
			return Object.keys(this.$slots || {})
				.filter((name) => name.startsWith('column-'))
				.map((name) => name.replace('column-', ''))
		},
		/** Dialog heading: the entry's message when it has one, else its id. */
		detailTitle() {
			if (!this.detailRow) return ''
			const message = this.detailRow.message
			if (typeof message === 'string' && message !== '') return message
			const id = this.detailRow[this.rowKey]
			return id ? String(id) : t('nextcloud-vue', 'Log entry')
		},
		/** The clicked row's primitive fields, as CnDetailGrid items. */
		detailScalarItems() {
			return this.detailEntries
				.filter(([, value]) => !this.isBag(value))
				.map(([key, value]) => ({ label: this.propertyLabel(key), value: String(value) }))
		},
		/**
		 * The clicked row's nested fields. A bag of primitives (a stack trace's
		 * frames, an argument map) renders as its own labelled grid; anything
		 * deeper falls back to pretty-printed JSON.
		 */
		detailObjectBlocks() {
			return this.detailEntries
				.filter(([, value]) => this.isBag(value))
				.map(([key, value]) => {
					const entries = Object.entries(value)
					const flat = entries.every(([, v]) => v === null || typeof v !== 'object')
					return {
						key,
						label: this.propertyLabel(key),
						items: flat ? entries.map(([k, v]) => ({ label: this.humanise(k), value: String(v) })) : null,
						json: flat ? null : JSON.stringify(value, null, 2),
					}
				})
		},
		/** The clicked row's renderable entries — `@self` and empties dropped. */
		detailEntries() {
			if (!this.detailRow) return []
			return Object.entries(this.detailRow)
				.filter(([key, value]) => key !== '@self' && value !== null && value !== undefined && value !== '')
		},
	},

	watch: {
		// A same-path query change (e.g. a "View logs" row action pushing
		// `?jobId=<uuid>` onto an already-mounted page) must re-scope the list.
		// `fixedFilters` re-reads $route on every fetch, so a refresh is all
		// that's needed. No `immediate` — useListView owns the initial fetch.
		'$route.query': {
			deep: true,
			handler() {
				if (this.list) this.list.refresh(1)
			},
		},
		'$route.params': {
			deep: true,
			handler() {
				if (this.list) this.list.refresh(1)
			},
		},
		// Same reason as the route watchers above: `fixedFilters` re-reads the
		// token ctx on every fetch, so a refresh is all that's needed when the
		// workspace / app-config bag behind a `@workspace.<key>` / `@config.<key>`
		// filter token changes. Without these the token resolves once and the list
		// never re-scopes.
		workspaceSignature() {
			if (this.list) this.list.refresh(1)
		},
		appConfigSignature() {
			if (this.list) this.list.refresh(1)
		},
		register() { if (!this.list) this.fetch() },
		schema() { if (!this.list) this.fetch() },
		source() { if (!this.list) this.fetch() },
	},

	mounted() {
		// In store mode useListView's own onMounted owns the initial fetch;
		// calling fetch() here too would double-request on every page load.
		if (!this.list) this.fetch()
	},

	methods: {
		/**
		 * Capitalise + space a snake_case / camelCase key for a default column label.
		 *
		 * @param {string} key A log-entry property name, e.g. `'created_at'` or `'userAgent'`.
		 * @return {string} The sentence-cased label, e.g. `'Created at'` / `'User agent'`.
		 */
		humanise(key) {
			const spaced = String(key).replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()
			return spaced.charAt(0).toUpperCase() + spaced.slice(1)
		},

		/**
		 * Label for a row property — the schema's own title when one is loaded.
		 *
		 * @param {string} key The property name.
		 * @return {string} The display label.
		 */
		propertyLabel(key) {
			const title = this.tableSchema?.properties?.[key]?.title
			return (typeof title === 'string' && title !== '') ? title : this.humanise(key)
		},

		/**
		 * Whether a value is a nested bag (object/array) rather than a scalar.
		 *
		 * @param {*} value The value to test.
		 * @return {boolean} True for non-null objects and arrays.
		 */
		isBag(value) {
			return value !== null && typeof value === 'object'
		},

		/**
		 * Fetch log entries from the resolved data source.
		 *
		 * Only used in `source` mode and in the legacy store fallback — the
		 * composable owns fetching whenever it is active.
		 */
		async fetch() {
			if (this.register && this.schema) {
				// Legacy fallback: a partial `store` prop that useListView
				// cannot drive (see setup). Unfiltered + unpaginated, as before.
				const store = this.store || useObjectStore()
				this.localLoading = true
				this.localError = null
				try {
					if (typeof store.registerObjectType === 'function') {
						store.registerObjectType(`${this.register}-${this.schema}`, this.schema, this.register)
					}
					if (typeof store.fetchCollection === 'function') {
						await store.fetchCollection(`${this.register}-${this.schema}`)
					}
					this.localRows = store.collections?.[`${this.register}-${this.schema}`] ?? []
				} catch (err) {
					this.localError = err
				} finally {
					this.localLoading = false
				}
				return
			}
			if (this.usesSource) {
				this.localLoading = true
				this.localError = null
				try {
					const response = await axios.get(this.source)
					const body = response?.data
					if (Array.isArray(body)) {
						this.localRows = body
					} else if (body && Array.isArray(body.results)) {
						this.localRows = body.results
					} else if (body && Array.isArray(body.entries)) {
						this.localRows = body.entries
					} else {
						this.localRows = []
					}
				} catch (err) {
					this.localError = err
					this.localRows = []
				} finally {
					this.localLoading = false
				}
				return
			}
			// Misconfigured — surface a console warning so a developer notices.
			// eslint-disable-next-line no-console
			console.warn('[CnLogsPage] Neither register+schema nor source configured; rendering empty state.')
		},

		/**
		 * Apply a header sort. Server-side in store mode, client-side otherwise.
		 *
		 * @param {{key: string|null, order: string|null, keys?: Array<{key: string, order: string}>}} sort CnDataTable's sort payload.
		 */
		onSort(sort) {
			if (this.list) {
				this.list.onSort(sort)
				return
			}
			this.localSortKeys = Array.isArray(sort.keys)
				? sort.keys
				: (sort.key ? [{ key: sort.key, order: sort.order || 'asc' }] : [])
		},

		/**
		 * Navigate to a page of results.
		 *
		 * @param {number} page The 1-based page number.
		 */
		onPageChange(page) {
			this.list?.onPageChange(page)
		},

		/**
		 * Change the page size, returning to page 1.
		 *
		 * @param {number} size The new page size.
		 */
		onPageSizeChange(size) {
			this.list?.onPageSizeChange(size)
		},

		/**
		 * Handle a row-body click: navigate to `rowRoute` when one is declared,
		 * else open the detail dialog when `rowDetail` is set. Always re-emits
		 * so a host can do its own thing regardless.
		 *
		 * @param {object} row The clicked log entry.
		 */
		onRowClick(row) {
			if (this.rowRoute) {
				// `.catch` swallows vue-router's NavigationDuplicated when the
				// row is already open — a rejected push is not an error here.
				const push = this.$router?.push({ name: this.rowRoute, params: { id: row?.[this.rowKey] } })
				if (push && typeof push.catch === 'function') push.catch(() => {})
			} else if (this.rowDetail) {
				this.detailRow = row
			}
			/**
			 * @event row-click Emitted when a log row's body is clicked.
			 * @type {object}
			 */
			this.$emit('row-click', row)
		},

		/** Close the row-detail dialog. */
		closeDetail() {
			this.detailRow = null
		},

		/**
		 * Re-fetch from the source. Exposed so refresh buttons in
		 * actionsComponent can call `$parent.refresh()`.
		 *
		 * @public
		 */
		refresh() {
			if (this.list) {
				this.list.refresh(1)
				return
			}
			this.fetch()
		},
	},
}
</script>

<style scoped>
/* Padding matches CnIndexPage / CnDetailPage (see css/index-page.css and
   css/detail-page.css) — a logs page had none at all, so its table ran flush
   into both edges of the app content area. Gaps are expressed in the same
   grid-baseline unit as the rest of the fleet rather than raw pixels. */
.cn-logs-page {
	display: flex;
	flex-direction: column;
	gap: calc(4 * var(--default-grid-baseline));
	padding: calc(5 * var(--default-grid-baseline));
	box-sizing: border-box;
}

.cn-logs-page__actions {
	display: flex;
	justify-content: flex-end;
	gap: calc(2 * var(--default-grid-baseline));
}

.cn-logs-page__loading,
.cn-logs-page__empty,
.cn-logs-page__error {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
}

.cn-logs-page__pagination {
	margin-top: calc(3 * var(--default-grid-baseline));
}

.cn-logs-page__detail {
	display: flex;
	flex-direction: column;
	gap: calc(2 * var(--default-grid-baseline));
	padding: 0 calc(3 * var(--default-grid-baseline)) calc(3 * var(--default-grid-baseline));
}

.cn-logs-page__detail-heading {
	margin: calc(3 * var(--default-grid-baseline)) 0 0;
	font-weight: bold;
}

.cn-logs-page__detail-json {
	margin: 0;
	padding: calc(2 * var(--default-grid-baseline));
	overflow-x: auto;
	border-radius: var(--border-radius);
	background-color: var(--color-background-dark);
	font-family: monospace;
	white-space: pre;
}

/* Same breakpoint + step-down as CnDetailPage, so the three page types stay in
   sync on narrow viewports. */
@media (max-width: 768px) {
	.cn-logs-page {
		padding: calc(3 * var(--default-grid-baseline));
	}
}
</style>
