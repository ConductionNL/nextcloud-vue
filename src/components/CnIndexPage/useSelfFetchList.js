import { ref, computed, watch } from 'vue'
import { useListView } from '../../composables/index.js'
import { useObjectSubscription } from '../../composables/useObjectSubscription.js'
import { useObjectStore } from '../../store/index.js'
import { resolveFilterTokens, dropOptionalUnresolved } from '../../utils/resolveFilterTokens.js'

/**
 * Resolve an index base/quick filter map at fetch time.
 *
 * Two grammars are applied, in order:
 *  1. Route-param interpolation — `@route.<name>` / `:<name>` string values are
 *     replaced with the matching `$route.params` entry (index-specific).
 *  2. The shared fetch-time `@`-token grammar (via `resolveFilterTokens`):
 *     `@me` (current user), `@today`/`@today±Nd`, `@monthStart`/`@quarterStart`/
 *     `@yearStart`, etc. — the same tokens widget/KPI filters use — so an index
 *     base filter can scope to the signed-in user (e.g. `{ assignee: '@me' }`)
 *     or a relative date window without a bespoke wrapper. `@workspace.<key>` /
 *     `@config.<key>` tokens resolve too, against the `ctx` the caller supplies
 *     (the page-level `cnWorkspaceContext`/`cnAppConfig` bags — see
 *     `useSelfFetchList`) — the same grammar `CnObjectListWidget` uses. An
 *     UNRESOLVED OPTIONAL token (`@workspace.<key>?`) is dropped from the
 *     result (see `dropOptionalUnresolved`) so an unset selection shows all
 *     rows instead of sending the literal token string to the API. Literals
 *     and unknown strings pass through unchanged.
 *
 * @param {object} filterMap The configured filter map.
 * @param {object} params The current `$route.params`.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] Token-resolution
 *   context for `@workspace.<key>` / `@config.<key>` / `@objectId` / `@object.<field>` tokens.
 * @return {object} The resolved filter map.
 */
function resolveFilterMap(filterMap, params, ctx) {
	if (!filterMap || typeof filterMap !== 'object') return {}
	const out = {}
	for (const [k, v] of Object.entries(filterMap)) {
		if (typeof v === 'string' && v.startsWith('@route.')) out[k] = params[v.slice('@route.'.length)]
		else if (typeof v === 'string' && v.startsWith(':')) out[k] = params[v.slice(1)]
		else out[k] = v
	}
	return dropOptionalUnresolved(resolveFilterTokens(out, ctx))
}

/**
 * Extract deep-link filters from `$route.query`. Lets a widget/link navigate to
 * `/cases?caseType=X&status=Y` and land the index pre-filtered. Reserved
 * underscore-prefixed list params (`_search`, `_page`, `_limit`, `_order`) are
 * skipped; everything else is passed through to the fetch (scalars + arrays, so
 * `?status[]=a&status[]=b` becomes an IN match). Merged BELOW the page's
 * `config.filter` so a page's own scoping still wins on a key collision.
 *
 * @param {object} query The `$route.query` object.
 * @return {object} The query-derived filter map.
 */
function resolveQueryFilters(query) {
	if (!query || typeof query !== 'object') return {}
	const out = {}
	for (const [k, v] of Object.entries(query)) {
		if (k.startsWith('_')) continue
		if (v === undefined || v === null || v === '') continue
		out[k] = v
	}
	return out
}

/**
 * Parse the persisted multi-column sort out of `$route.query._order`
 * (JSON-encoded ordered array of `{key, order}`, written by
 * `CnIndexPage.persistSortToRoute`) so a reload or a shared/bookmarked
 * link restores the same sort. Malformed or absent input yields `null`
 * (caller falls back to `props.sortKey`/`props.sortKeys`).
 *
 * @param {object} route The current `$route` (may be undefined/null).
 * @return {Array<{key: string, order: 'asc'|'desc'}>|null} The parsed ordered sort-key list, or `null`.
 */
function parseInitialSortKeysFromRoute(route) {
	const raw = route && route.query && route.query._order
	if (typeof raw !== 'string' || raw === '') return null
	let parsed
	try {
		parsed = JSON.parse(raw)
	} catch (e) {
		return null
	}
	if (!Array.isArray(parsed) || parsed.length === 0) return null
	const keys = parsed
		.filter((k) => k && typeof k.key === 'string')
		.map((k) => ({ key: k.key, order: k.order === 'desc' ? 'desc' : 'asc' }))
	return keys.length > 0 ? keys : null
}

function resolveInitialQuickFilterIndex(quickFilters) {
	const tabs = Array.isArray(quickFilters) ? quickFilters : null
	if (!tabs || tabs.length === 0) return null
	const di = tabs.findIndex((t) => t && t.default === true)
	return di >= 0 ? di : 0
}

/**
 * OR-merge several quick-filter maps into one fetch filter. Values for the
 * same key collapse to an array (deduped) when more than one tab contributes
 * it — `buildQueryString` serialises an array as `key[]=a&key[]=b`, which the
 * OpenRegister API interprets as an IN / OR match.
 *
 * @param {Array<object>} filterMaps Already route-resolved filter maps.
 * @return {object} The merged filter (scalar when a key has one value, array when many).
 */
function unionFilterMaps(filterMaps) {
	const grouped = {}
	for (const map of filterMaps) {
		if (!map || typeof map !== 'object') continue
		for (const [k, v] of Object.entries(map)) {
			if (v === undefined || v === null || v === '') continue
			if (!grouped[k]) grouped[k] = []
			for (const item of (Array.isArray(v) ? v : [v])) {
				if (!grouped[k].includes(item)) grouped[k].push(item)
			}
		}
	}
	const out = {}
	for (const [k, arr] of Object.entries(grouped)) {
		out[k] = arr.length === 1 ? arr[0] : arr
	}
	return out
}

/**
 * Self-fetch mode for CnIndexPage: when register+schema are set but no
 * `objects` prop was passed (manifest-driven pages), drive the list ourselves.
 *
 * @param {object} props CnIndexPage props.
 * @param {import('vue').ComponentInternalInstance|null} instance Pass `getCurrentInstance()`.
 * @param {Function} inject Pass Vue's `inject`.
 * @return {object} { isSelfFetch, list, selfObjectStore, selfObjectType, activeQuickFilterIndex }
 */
export function useSelfFetchList(props, instance, inject) {
	const objectsProvided = !!(
		instance && instance.proxy && instance.proxy.$options && instance.proxy.$options.propsData
		&& Object.hasOwn(instance.proxy.$options.propsData, 'objects')
	)
	const isSelfFetch = !!(props.register && props.schema) && !objectsProvided

	const activeQuickFilterIndex = ref(resolveInitialQuickFilterIndex(props.quickFilters))
	const selectedQuickFilterIndices = ref([])
	const isMultiQuickFilter = props.quickFilterMultiple === true

	if (!isSelfFetch) {
		return {
			isSelfFetch: false,
			list: null,
			selfObjectStore: null,
			selfObjectType: '',
			activeQuickFilterIndex,
			selectedQuickFilterIndices,
		}
	}

	const objectType = `${props.register}-${props.schema}`
	const sidebarState = inject('sidebarState', null) ?? inject('objectSidebarState', null)
	const objectStore = useObjectStore()

	// Token-resolution context for `@workspace.<key>` / `@config.<key>` /
	// `@objectId` / `@object.<field>` inside `props.filter` / quick-filter
	// tab filters. Same injects + unwrap shape as CnObjectListWidget's
	// `objectCtx`/`workspaceCtx`/`tokenCtx` computeds (and CnDeltaWidget) —
	// `cnWorkspaceContext` is the reactive bag a dashboard/workspace-root
	// (e.g. hrmq's App.vue for multi-administratie) provides; `cnObjectContext`
	// is a detail-page's object context (rare on an index page, but harmless
	// to support); `cnAppConfig` is the page-level app config bag. All three
	// default to null/absent so an app that never provides them is unaffected.
	const objectCtxRaw = inject('cnObjectContext', null)
	const workspaceCtxRaw = inject('cnWorkspaceContext', null)
	const appConfigRaw = inject('cnAppConfig', null)
	const unwrapCtx = (v) => ((v && typeof v === 'object' && 'value' in v) ? v.value : v)

	/**
	 * Build the current token-resolution ctx `{ objectId?, object?, workspace, config }`
	 * from the injected bags, unwrapping Vue refs. Called fresh on every fetch
	 * so it always reflects the latest workspace/config state.
	 *
	 * @return {object} The token ctx.
	 */
	function tokenCtx() {
		const objCtx = unwrapCtx(objectCtxRaw)
		const base = (objCtx && typeof objCtx === 'object') ? { ...objCtx } : {}
		base.workspace = unwrapCtx(workspaceCtxRaw) || {}
		base.config = unwrapCtx(appConfigRaw) || {}
		return base
	}

	// Reactive signature of the workspace/config bags so a change (e.g. the
	// administration switcher writing `activeAdministrationId`) triggers a
	// re-fetch below — `fixedFilters` is a plain getter called at fetch time
	// (see useListView.resolveFixedFilters), it is NOT auto-tracked by Vue,
	// so without this the list would resolve the token once on mount and
	// never again. Stringified (like CnDeltaWidget's `sourceKey`) so the
	// watcher fires on real content changes only, not object identity.
	const workspaceSignature = computed(() => JSON.stringify(unwrapCtx(workspaceCtxRaw) || {}))
	const appConfigSignature = computed(() => JSON.stringify(unwrapCtx(appConfigRaw) || {}))

	// Pass register/schema in their positional id slots (not as a {register, schema} object as
	// second arg) — that previously made fetch URLs go to `/api/objects/undefined/[object Object]`.
	if (typeof objectStore.registerObjectType === 'function') {
		objectStore.registerObjectType(
			objectType,
			props.schema,
			props.register,
			{ registerSlug: props.register, schemaSlug: props.schema },
		)
	}

	// Seed the visible-column set from the configured columns so the sidebar's
	// Columns tab reflects the curated default; null when none are configured
	// (schema-driven table — every column starts visible).
	const configuredColumnKeys = (props.columns || [])
		.map((c) => (typeof c === 'string' ? c : c && c.key))
		.filter(Boolean)

	// Restore a persisted multi-column sort from the route query first (deep
	// link / reload); fall back to a host-passed `sortKeys` prop, then the
	// legacy single-key `sortKey`/`sortOrder` props.
	const initialRoute = instance && instance.proxy && instance.proxy.$route
	const initialSortKeys = parseInitialSortKeysFromRoute(initialRoute)
		|| (Array.isArray(props.sortKeys) && props.sortKeys.length > 0 ? props.sortKeys : undefined)

	const list = useListView(objectType, {
		objectStore,
		sidebarState,
		defaultSort: props.sortKey ? { key: props.sortKey, order: props.sortOrder || 'asc' } : undefined,
		defaultSortKeys: initialSortKeys,
		defaultPageSize: (props.pagination && props.pagination.limit) || undefined,
		defaultVisibleColumns: configuredColumnKeys.length ? configuredColumnKeys : null,
		fixedFilters: () => {
			const route = instance && instance.proxy && instance.proxy.$route
			const params = (route && route.params) || {}
			const queryFilters = resolveQueryFilters(route && route.query)
			const ctx = tokenCtx()
			const base = resolveFilterMap(props.filter, params, ctx)
			const tabs = Array.isArray(props.quickFilters) ? props.quickFilters : null
			if (!tabs) return { ...queryFilters, ...base }

			// Multiple mode: OR the selected tabs' filters together (union).
			if (isMultiQuickFilter) {
				const maps = selectedQuickFilterIndices.value
					.map((i) => resolveFilterMap(tabs[i]?.filter, params, ctx))
				return { ...queryFilters, ...base, ...unionFilterMaps(maps) }
			}

			// Single mode: the active tab's filter spread last so it wins
			// over a colliding props.filter entry.
			const activeIdx = activeQuickFilterIndex.value
			const tabFilter = (activeIdx !== null && activeIdx !== undefined) ? tabs[activeIdx]?.filter : null
			return { ...queryFilters, ...base, ...resolveFilterMap(tabFilter, params, ctx) }
		},
	})

	// Re-fetch when the quick-filter selection changes (pre-existing), OR
	// when the workspace/app-config bag content changes (e.g. the
	// administration switcher writes a new `activeAdministrationId`) — a
	// `@workspace.<key>`/`@config.<key>` token in `props.filter` must re-scope
	// the list without a manual reload.
	watch([activeQuickFilterIndex, selectedQuickFilterIndices, workspaceSignature, appConfigSignature], () => {
		if (list && typeof list.refresh === 'function') list.refresh(1)
	})

	// Live collection updates (manifest-live-updates): subscribe to the
	// page's `or-collection-{register}-{schema}` scope so another user's
	// create/update/delete refreshes this list without a manual reload.
	// The subscription lifecycle (mount/unmount, in-flight dedupe, epoch
	// guard against stale async resolution) lives in useObjectSubscription;
	// the refetch-on-event (with the last fetch params, burst-coalesced)
	// lives in liveUpdatesPlugin. The `subscribe` prop (default true; from
	// a manifest: `config.subscribe: false`) is the opt-out, read through
	// a reactive getter so a runtime flip attaches/detaches accordingly.
	// Stores without live-updates support (no `subscribe` action) are a
	// silent no-op inside the composable, keeping this fully inert.
	useObjectSubscription(objectStore, objectType, null, {
		enabled: () => props.subscribe !== false,
	})

	return {
		isSelfFetch: true,
		list,
		selfObjectStore: objectStore,
		selfObjectType: objectType,
		activeQuickFilterIndex,
		selectedQuickFilterIndices,
	}
}
