<!--
  CnStatsBlockWidget — Manifest-driven stats block.

  Thin wrapper around CnStatsBlock that pulls its count from a
  `dataSource` block on a dashboard widget definition. The
  dispatcher in CnDashboardPage mounts this when
  `widgetDef.type === 'stats-block'`.

  ADR-049 enrichment: an optional `entries[]` renders N related KPIs in one
  card, each entry self-fetching its own token-resolved count over the same
  REST /value aggregation. Exactly one of `dataSource` / `entries` must be
  provided; the single-`dataSource` path is unchanged.

  Static usage (no data fetching) is intentionally NOT supported —
  use CnStatsBlock directly when you already have a count number.
-->
<template>
	<div
		:class="['cn-stats-block-widget', iconClass, { 'cn-stats-block-widget--multi': hasEntries }]">
		<!-- Multi-entry mode: one KPI per entry, all inside this widget card.
		     An entry with hideWhenZero whose resolved count is 0 is omitted. -->
		<template v-if="hasEntries">
			<CnStatsBlock
				v-for="view in entryViews"
				:key="view.key"
				:title="view.entry.title || ''"
				:count="view.count"
				:count-label="view.entry.countLabel || ''"
				:loading="view.loading"
				:variant="view.entry.variant || 'default'"
				:show-zero-count="showZeroCount"
				:horizontal="horizontal"
				:vertical="vertical"
				:filled="filled"
				:clickable="!!view.route"
				:route="view.route || null" />
		</template>

		<!-- Single-source mode (pre-existing interface, unchanged). -->
		<CnStatsBlock
			v-else
			:title="title"
			:count="resolvedCount"
			:count-label="countLabel"
			:loading="loading"
			:variant="variant"
			:show-zero-count="showZeroCount"
			:horizontal="horizontal"
			:vertical="vertical"
			:filled="filled"
			:clickable="!!route"
			:route="route" />
	</div>
</template>

<script>
// The canonical KPI scale (`--cn-kpi-*`) lives in one stylesheet. Imported
// here as well as from css/index.css so the tokens resolve even when the
// consuming app pulls in components individually.
import '../../css/kpi-card.css'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import CnStatsBlock from '../CnStatsBlock/CnStatsBlock.vue'
import { useDataSource } from '../../composables/useDataSource.js'
import { resolveFilterTokens, dropOptionalUnresolved, hasUnresolvedTokens } from '../../utils/resolveFilterTokens.js'

/**
 * Event-bus channel the PAGE-level Refresh action broadcasts on
 * (CnDashboardPage / CnDetailPage pass it to their CnActionsMenu).
 */
const PAGE_REFRESH_BUS_CHANNEL = 'cn:page:refresh'

/**
 * CnStatsBlockWidget — Stats-block dashboard widget.
 *
 * Reads a `dataSource` block (manifest shorthand or raw GraphQL)
 * and forwards the resolved count to CnStatsBlock. Loading state
 * propagates through; resolution errors fall back to count = 0
 * with an empty-state label so the dashboard doesn't blank.
 *
 * Multi-entry mode (ADR-049 / list-widget-enrichment): an `entries[]`
 * array renders N KPIs in one card. Each entry carries the same source
 * contract as a `type:"stat"` widget (`register`, `schema`, `metric`,
 * `field`, token-resolved `filter`) plus per-entry presentation
 * (`title`, `variant`, `countLabel`), an optional `route` deep link, and
 * `hideWhenZero` (the entry is omitted when its resolved count is 0).
 * Exactly one of `dataSource` / `entries` must be provided — when
 * `entries` is absent, the single-`dataSource` path renders exactly as
 * before.
 *
 * Manifest example (decidesk dashboard):
 * ```json
 * {
 *   "id": "minutes-in-review",
 *   "type": "stats-block",
 *   "title": "Notulen ter goedkeuring",
 *   "iconClass": "icon-file",
 *   "props": { "countLabel": "notulen", "variant": "warning" },
 *   "dataSource": {
 *     "register": "decidesk",
 *     "schema": "minutes",
 *     "filter": { "lifecycle": "review" },
 *     "aggregate": "count"
 *   }
 * }
 * ```
 *
 * Multi-entry example (a grouped retention card):
 * ```json
 * {
 *   "widgetKey": "stats-block",
 *   "props": {
 *     "entries": [
 *       { "title": "Expiring soon", "register": "docudesk", "schema": "document",
 *         "filter": { "retention": { "lt": "@today+30d" } }, "variant": "warning",
 *         "route": { "name": "documents" }, "hideWhenZero": true },
 *       { "title": "Archived", "register": "docudesk", "schema": "document",
 *         "filter": { "status": "archived" } }
 *     ]
 *   }
 * }
 * ```
 */
export default {
	name: 'CnStatsBlockWidget',

	components: { CnStatsBlock },

	inject: {
		/**
		 * Detail-page object context provided by CnDetailPage — enables
		 * `@objectId` / `@object.<field>` tokens in an entry's `filter`.
		 * Null on dashboards.
		 */
		cnObjectContext: { default: null },
		/**
		 * Page-level workspace context (reactive `ref({})`) provided by
		 * CnDashboardPage — enables `@workspace.<key>` tokens in an entry's
		 * `filter`. Null on pages that don't provide it.
		 */
		cnWorkspaceContext: { default: null },
	},

	props: {
		/**
		 * Manifest dataSource block. See `useDataSource`. Exactly one of
		 * `dataSource` / `entries` must be provided — a stats-block widget
		 * without any source has no count to render (flagged with a console
		 * error at mount).
		 *
		 * @type {{
		 *   register?: string,
		 *   schema?: string,
		 *   filter?: object,
		 *   aggregate?: 'count',
		 *   graphql?: { query: string, variables?: object, selectors: object }
		 * }}
		 */
		dataSource: {
			type: Object,
			default: null,
		},

		/**
		 * Multi-entry declarative sources (ADR-049). Each entry renders one
		 * KPI within this widget's card and self-fetches its own count over
		 * the REST /value aggregation: `{ title, register, schema, metric,
		 * field, filter, route, variant, countLabel, hideWhenZero }`. Filter
		 * values use the shared @-token grammar (`@today`, `@me`,
		 * `@workspace.*`, `?`-optional clauses). An entry with `hideWhenZero`
		 * is omitted when its resolved count is 0. Mutually exclusive with
		 * `dataSource`; defaults to empty (single-source mode).
		 *
		 * @type {Array<object>}
		 */
		entries: {
			type: Array,
			default: () => [],
		},

		/** Block title (manifest `widgetDef.title`). */
		title: {
			type: String,
			default: '',
		},

		/** Label displayed next to the count. */
		countLabel: {
			type: String,
			default: '',
		},

		/** Color variant: default | primary | success | warning | error. */
		variant: {
			type: String,
			default: 'default',
		},

		/** Whether to show 0 as a real count instead of the empty label. */
		showZeroCount: {
			type: Boolean,
			default: true,
		},

		/**
		 * Lay the icon left of the content. The canonical KPI card already
		 * does this, so the prop is redundant and kept only for existing
		 * callers.
		 *
		 * @deprecated since 2.25.0, the horizontal layout is the default.
		 */
		horizontal: {
			type: Boolean,
			default: false,
		},

		/** Stack the icon above a centred number instead of beside it. */
		vertical: {
			type: Boolean,
			default: false,
		},

		/**
		 * Draw each tile's own grey box. Off by default — the widget is
		 * rendered inside a CnWidgetWrapper that already draws a card.
		 */
		filled: {
			type: Boolean,
			default: false,
		},

		/**
		 * Vue-router location to navigate to on click. When set, the
		 * inner CnStatsBlock renders as a `<router-link>`.
		 * @type {object|null}
		 */
		route: {
			type: Object,
			default: null,
		},

		/**
		 * Optional CSS class applied to the widget's outermost wrapping
		 * `<div>`. Designed for Nextcloud core icon classes (`icon-link`,
		 * `icon-mail`, `icon-history`, …) that ship with NC and render a
		 * 16×16 glyph via background-image. When empty (the default), the
		 * wrapper carries only the base `cn-stats-block-widget` class and
		 * is visually invisible.
		 *
		 * The wrapping element is a `<div>` with no layout styles of its
		 * own, so the rendered KPI tile keeps the same dimensions and
		 * spacing it had before this prop was added.
		 *
		 * MDI icon names (e.g. `'Database'`) are NOT supported here — that
		 * would require an async dynamic-import. Use `CnStatsBlock`
		 * directly when you need an MDI Vue component icon.
		 */
		iconClass: {
			type: String,
			default: '',
		},
	},

	setup(props) {
		// GraphQL count path is hidden from useDataSource when a plain
		// register+schema source is given — that case is served over REST
		// (fetchRest) against OpenRegister's /value aggregation, which is more
		// robust than the GraphQL count shorthand. Raw `graphql` still flows here.
		const dsForGraphql = () => {
			const ds = props.dataSource
			if (ds && ds.register && ds.schema && !ds.graphql) return null
			return ds
		}
		const { data, loading, error, refetch } = useDataSource(dsForGraphql)
		return { dsData: data, loading, error, dsRefetch: refetch }
	},

	data() {
		return {
			restCount: null,
			/** @type {Array<number|null>} Per-entry resolved counts (multi-entry mode; null = pending/failed). */
			entryCounts: [],
			/** @type {Array<boolean>} Per-entry fetch-in-flight flags (multi-entry mode). */
			entryFetching: [],
			/** Monotonic id used to discard a stale entries batch when `entries` changes mid-flight. */
			entriesRequestId: 0,
		}
	},

	computed: {
		/**
		 * Whether the widget runs in multi-entry mode (`entries[]` supplied).
		 *
		 * @return {boolean}
		 */
		hasEntries() {
			return Array.isArray(this.entries) && this.entries.length > 0
		},
		/**
		 * The unwrapped detail-page object context for token resolution, or
		 * null on surfaces (dashboards) that don't provide one.
		 *
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
		 *
		 * @return {object|null}
		 */
		workspaceCtx() {
			const c = this.cnWorkspaceContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/**
		 * Token-resolution context for entry filters, merged from the
		 * detail-page object context and the page-level workspace bag.
		 *
		 * @return {object}
		 */
		tokenCtx() {
			const base = this.objectCtx ? { ...this.objectCtx } : {}
			base.workspace = this.workspaceCtx || {}
			return base
		},
		/**
		 * Renderable view models for multi-entry mode: each entry paired with
		 * its fetched count and loading flag, with `hideWhenZero` entries
		 * whose resolved count is 0 omitted.
		 *
		 * @return {Array<{entry: object, key: string, count: number, loading: boolean}>}
		 */
		entryViews() {
			return (this.entries || [])
				.map((entry, i) => {
					const raw = this.entryCounts[i]
					const resolved = typeof raw === 'number'
					return {
						entry: entry || {},
						key: `${(entry && entry.register) || ''}/${(entry && entry.schema) || ''}/${i}`,
						count: resolved ? raw : 0,
						loading: !!this.entryFetching[i],
						resolved,
						// Token-resolve the deep link the same way entry.filter
						// is resolved — `route.query: { case: "@objectId" }` must
						// land on the target pre-scoped, never as a literal token
						// (ADR-062; parity with object-list's viewAllQuery).
						route: this.resolveEntryRoute(entry && entry.route),
					}
				})
				.filter((view) => !(view.entry.hideWhenZero && view.resolved && view.count === 0))
		},
		/**
		 * Stable signature of a REST-fetchable source (else null).
		 *
		 * @spec openspec/specs/dashboard-page/spec.md
		 */
		restKey() {
			const ds = this.dataSource || {}
			if (!ds.register || !ds.schema || ds.graphql) return null
			return JSON.stringify({
				register: ds.register,
				schema: ds.schema,
				metric: ds.metric || (ds.aggregate === 'count' ? 'count' : 'count'),
				field: ds.field || '',
				filter: ds.filter || {},
			})
		},
		/**
		 * Stable signature of the multi-entry sources INCLUDING their
		 * token-resolved filters, so the watcher refetches when page-level
		 * state a `@workspace.*` token reads changes.
		 *
		 * @return {string|null}
		 */
		entriesKey() {
			if (!this.hasEntries) return null
			return JSON.stringify(this.entries.map((entry) => ({
				register: (entry && entry.register) || '',
				schema: (entry && entry.schema) || '',
				metric: (entry && entry.metric) || 'count',
				field: (entry && entry.field) || '',
				filter: this.resolvedEntryFilter(entry),
			})))
		},
		resolvedCount() {
			if (typeof this.restCount === 'number') return this.restCount
			const value = this.dsData?.count
			if (typeof value === 'number') return value
			if (typeof value === 'string') {
				const parsed = Number(value)
				return Number.isFinite(parsed) ? parsed : 0
			}
			return 0
		},
	},

	watch: {
		restKey() { this.fetchRest() },
		entriesKey() { this.fetchEntries() },
	},

	created() {
		// "Exactly one of dataSource / entries" — a misconfigured widget
		// fails loudly (console error + no counts) instead of rendering an
		// ambiguous card. Vue 2 prop validators cannot see sibling props, so
		// the cross-prop rule lives here (and, for manifests, in
		// validateManifestV2's post-schema check).
		const hasDataSource = !!this.dataSource
		if (hasDataSource === this.hasEntries) {
			// eslint-disable-next-line no-console
			console.error('[CnStatsBlockWidget] Exactly one of `dataSource` / `entries` must be provided.')
		}
	},

	mounted() {
		this.fetchRest()
		this.fetchEntries()
		// Page-level Refresh. This tile is now rendered inside CnWidgetWrapper
		// like every other widget (it went flat in 2026-08-30's KPI-card
		// change, so the wrapper is what draws its card), but it is registered
		// as a CARD widget and cards carry no per-widget Actions menu — so the
		// page action is still its only refresh affordance. It reached nothing
		// before this subscription: the counts come from `fetchRest` /
		// `fetchEntries` and the useDataSource GraphQL path, none of which
		// subscribe on their own. No widgetId to match: a page refresh
		// refreshes everything on the page.
		this._onPageRefresh = () => {
			this.refresh()
		}
		subscribe(PAGE_REFRESH_BUS_CHANNEL, this._onPageRefresh)
	},

	beforeUnmount() {
		if (this._onPageRefresh) {
			unsubscribe(PAGE_REFRESH_BUS_CHANNEL, this._onPageRefresh)
			this._onPageRefresh = null
		}
	},

	methods: {
		/**
		 * Re-query the tile's counts — the REST `/value` aggregation, the
		 * per-entry counts of multi-entry mode, and the `dataSource` GraphQL
		 * path. Exposed as a ref-callable method for parity with the other data
		 * widgets, and invoked by the page-level Refresh subscription.
		 *
		 * @return {void}
		 */
		refresh() {
			if (typeof this.dsRefetch === 'function') {
				this.dsRefetch()
			}
			this.fetchRest()
			this.fetchEntries()
		},
		/**
		 * An entry's `route` deep link with `@`-tokens in `query` / `params`
		 * resolved against `tokenCtx` (same treatment as `entry.filter`), so
		 * a KPI card can deep-link to an index pre-scoped to the current
		 * object. Unresolved optional query clauses are dropped; a route
		 * whose query still carries a REQUIRED unresolved token is returned
		 * without that query entry resolution left as-is (router will show
		 * the unfiltered index rather than a broken literal-token filter).
		 *
		 * @param {object|string|null} route The entry's route location.
		 * @return {object|string|null} The token-resolved route.
		 */
		resolveEntryRoute(route) {
			if (!route || typeof route !== 'object') return route || null
			const out = { ...route }
			if (out.query && typeof out.query === 'object') {
				out.query = dropOptionalUnresolved(resolveFilterTokens(out.query, this.tokenCtx))
			}
			if (out.params && typeof out.params === 'object') {
				out.params = resolveFilterTokens(out.params, this.tokenCtx)
			}
			return out
		},

		/**
		 * An entry's filter with every @-token resolved against `tokenCtx`
		 * and UNRESOLVED OPTIONAL clauses (`@workspace.<key>?`) dropped.
		 *
		 * @param {object} entry The entry definition.
		 * @return {object} The resolved filter map.
		 */
		resolvedEntryFilter(entry) {
			return dropOptionalUnresolved(resolveFilterTokens((entry && entry.filter) || {}, this.tokenCtx))
		},

		/**
		 * Fetch one count/value over REST from OpenRegister's /value
		 * aggregation. Shared by the single-`dataSource` path and the
		 * per-entry multi-entry path. Lazily imports axios/router (the
		 * library never hard-depends on them at module load).
		 *
		 * @param {{register: string, schema: string, metric?: string, aggregate?: string, field?: string}} src The source block.
		 * @param {object} filter The ALREADY-RESOLVED filter map.
		 * @return {Promise<number|null>} The value, or null on failure.
		 */
		async fetchValue(src, filter) {
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/aggregations/{register}/{schema}/value',
					{ register: src.register, schema: src.schema },
				)
				const params = { metric: src.metric || (src.aggregate === 'count' ? 'count' : 'count') }
				if (src.field) params.field = src.field
				for (const [k, v] of Object.entries(filter || {})) {
					if (v && typeof v === 'object') {
						for (const [op, ov] of Object.entries(v)) params[`filter[${k}][${op}]`] = ov
					} else if (v !== '' && v !== null && v !== undefined) {
						params[`filter[${k}]`] = v
					}
				}
				const res = await axios.get(url, { params })
				return Number(res?.data?.value ?? 0) || 0
			} catch (e) {
				return null
			}
		},

		/**
		 * Fetch the count/value over REST when the single `dataSource` is a
		 * plain register+schema block (operator + dynamic tokens supported).
		 * No-op for raw GraphQL or multi-entry mode. Delegates the request to
		 * `fetchValue` (the per-entry refactor) — behaviour is unchanged.
		 *
		 * @return {Promise<void>}
		 */
		async fetchRest() {
			const ds = this.dataSource || {}
			if (!ds.register || !ds.schema || ds.graphql) { this.restCount = null; return }
			this.restCount = await this.fetchValue(ds, resolveFilterTokens(ds.filter || {}))
		},

		/**
		 * Fetch every entry's count in parallel (multi-entry mode). An entry
		 * whose filter still carries an unresolved REQUIRED token (e.g.
		 * `@workspace.selectedClient` with no selection) is skipped rather
		 * than counted across the whole register. A monotonic request id
		 * discards a stale batch when `entries` changes mid-flight.
		 *
		 * @return {Promise<void>}
		 */
		async fetchEntries() {
			if (!this.hasEntries) {
				this.entryCounts = []
				this.entryFetching = []
				return
			}
			const id = ++this.entriesRequestId
			const entries = this.entries
			this.entryFetching = entries.map(() => true)
			const counts = await Promise.all(entries.map(async (entry) => {
				if (!entry || !entry.register || !entry.schema) return null
				const filter = this.resolvedEntryFilter(entry)
				if (hasUnresolvedTokens(filter)) return null
				return this.fetchValue(entry, filter)
			}))
			if (id !== this.entriesRequestId) return
			this.entryCounts = counts
			this.entryFetching = entries.map(() => false)
		},
	},
}
</script>

<style scoped>
/*
 * This widget draws no KPI of its own — every tile it shows is a CnStatsBlock,
 * so the canonical card in src/css/kpi-card.css is already what a reader sees.
 * All that is left here is how N of those tiles stack inside one widget, and
 * that spacing comes from the shared `--cn-kpi-stack-gap` so a multi-entry
 * widget and a CnStatsPanel stack of the same tiles are spaced identically.
 */
/*
 * Fill the host cell rather than sizing to content.
 *
 * 🔴 WITHOUT THIS THE WIDGET COLLAPSES TO THE WIDTH OF ITS ICON, and the
 * number it exists to show is clipped to a sliver. Measured on a live
 * instance: a 282px `.cn-widget-wrapper__content` held a 20px widget, a 20px
 * `.cn-kpi-card` and a 0px `.cn-kpi-card__body`. 20px is the icon.
 *
 * The mechanism is a sizing cycle, which is why the KPI card's own CSS looks
 * correct in isolation and is. `.cn-widget-wrapper__content` is `display:
 * flex`, so this root is a flex ITEM and defaults to `flex: 0 1 auto` —
 * content-sized. Its content is `.cn-kpi-card { width: 100% }`, which resolves
 * against THIS element, which is resolving against its content. The card's
 * body carries `min-width: 0` (deliberately, so a long number can shrink
 * instead of overflowing), so the cycle settles with the body at zero and only
 * the icon's intrinsic width surviving.
 *
 * `flex: 1 1 auto` + `width: 100%` gives the card a definite width to resolve
 * against and breaks the cycle; `min-width: 0` keeps the shrink behaviour the
 * body's rule was written for.
 *
 * On the BASE class, not `--multi`: both the single-source and multi-entry
 * modes render this root, so both collapse. The bug was found on a
 * single-entry stats-block.
 */
.cn-stats-block-widget {
	flex: 1 1 auto;
	min-width: 0;
	width: 100%;
}

.cn-stats-block-widget--multi {
	display: flex;
	flex-direction: column;
	gap: var(--cn-kpi-stack-gap, 12px);
}
</style>
