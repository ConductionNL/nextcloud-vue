import { computed, ref, watch } from 'vue'
import { useListView } from '../../composables/index.js'
import { useObjectSubscription } from '../../composables/useObjectSubscription.js'
import { useObjectStore } from '../../store/index.js'
// Both filter resolvers live in `utils/routeFilters.js` so CnLogsPage applies
// the same two grammars (route-param interpolation + `?key=value` deep links)
// without pulling in this composable's index-only sidebar/subscription wiring.
import { withPersonalLenses } from '../../utils/personalLenses.js'
import { parseSortKeysFromQuery, resolveFilterMap, resolveQueryFilters } from '../../utils/routeFilters.js'

function resolveInitialQuickFilterIndex(quickFilters) {
	const tabs = Array.isArray(quickFilters) ? quickFilters : null
	if (!tabs || tabs.length === 0) {
		return null
	}
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
		if (!map || typeof map !== 'object') {
			continue
		}
		for (const [k, v] of Object.entries(map)) {
			if (v === undefined || v === null || v === '') {
				continue
			}
			if (!grouped[k]) {
				grouped[k] = []
			}
			for (const item of (Array.isArray(v) ? v : [v])) {
				if (!grouped[k].includes(item)) {
					grouped[k].push(item)
				}
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
 * @param {typeof import('vue').inject} inject Pass Vue's `inject`.
 * @param {{activeFolderSchema?: import('vue').Ref<?{schema: string, register?: string}>}} [extras] `activeFolderSchema`: a ref the page sets to the selected folder's `{ schema, register? }`, switching the loaded object type while it is non-null.
 * @return {object} { isSelfFetch, list, selfObjectStore, selfObjectType, activeQuickFilterIndex }
 */
export function useSelfFetchList(props, instance, inject, extras = {}) {
	const objectsProvided = !!(
		instance && instance.proxy && instance.proxy.$options && instance.proxy.$options.propsData
		&& Object.hasOwn(instance.proxy.$options.propsData, 'objects')
	)
	// A named source wins over register/schema. Without this the page would
	// fire an OpenRegister request whose rows it then discards in favour of the
	// source's — wasted, but worse than wasted if the manifest names both by
	// mistake, because the request succeeds and nothing says the two disagree.
	const isSelfFetch = !!(props.register && props.schema) && !objectsProvided && !props.entitySource

	// "Also search inside files" switch, seeded from `?contentSearch=1` so a
	// shared link reproduces the list. Only meaningful when `searchInFiles` is on.
	const routeAtSetup = instance && instance.proxy && instance.proxy.$route
	const contentSearch = ref(props.searchInFiles === true && String(routeAtSetup?.query?.contentSearch) === '1')

	const activeQuickFilterIndex = ref(resolveInitialQuickFilterIndex(withPersonalLenses(props.quickFilters, props.personalLenses)))
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
			contentSearch,
			selfFetchTokenCtx: null,
			initialQueryFilterKeys: [],
		}
	}

	// The object type follows the selected folder's own schema when it declares
	// one; otherwise the page's register and schema.
	const activeFolderSchema = extras.activeFolderSchema || null
	const resolvedTarget = computed(() => {
		const folder = activeFolderSchema && activeFolderSchema.value
		if (folder && folder.schema) {
			const register = folder.register || props.register
			return { register, schema: folder.schema, type: `${register}-${folder.schema}` }
		}
		return { register: props.register, schema: props.schema, type: `${props.register}-${props.schema}` }
	})
	const objectType = computed(() => resolvedTarget.value.type)
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
	// Runs (sync, ahead of the list's own watcher) again whenever the type switches.
	function registerTarget() {
		const { register, schema, type } = resolvedTarget.value
		if (typeof objectStore.registerObjectType === 'function') {
			objectStore.registerObjectType(type, schema, register, { registerSlug: register, schemaSlug: schema })
		}
	}
	registerTarget()
	watch(objectType, registerTarget, { flush: 'sync' })

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
	const initialSortKeys = parseSortKeysFromQuery(initialRoute)
		|| (Array.isArray(props.sortKeys) && props.sortKeys.length > 0 ? props.sortKeys : undefined)
	// Same deep-link restore for facet filters and search, so opening a
	// shared/bookmarked URL reproduces the same view (CnIndexPage persists
	// both back to the route on change).
	const initialActiveFilters = resolveQueryFilters(initialRoute && initialRoute.query, tokenCtx())
	const initialSearchTerm = (initialRoute && typeof initialRoute.query?._search === 'string') ? initialRoute.query._search : ''

	// Set right after useListView returns; the fixed-filters getter reads it lazily.
	let listHandle = null
	const list = useListView(() => objectType.value, {
		objectStore,
		sidebarState,
		defaultSort: props.sortKey ? { key: props.sortKey, order: props.sortOrder || 'asc' } : undefined,
		defaultSortKeys: initialSortKeys,
		defaultActiveFilters: initialActiveFilters,
		defaultSearchTerm: initialSearchTerm,
		defaultPageSize: (props.pagination && props.pagination.limit) || undefined,
		defaultVisibleColumns: configuredColumnKeys.length ? configuredColumnKeys : null,
		// `pages[].config.extend` → OpenRegister's repeated `_extend[]`. A
		// getter so a reactive change re-scopes the next fetch, matching how
		// `fixedFilters` is read.
		extend: () => (Array.isArray(props.extend) ? props.extend : []),
		fixedFilters: () => {
			const route = instance && instance.proxy && instance.proxy.$route
			const params = (route && route.params) || {}
			const ctx = tokenCtx()
			const queryFilters = resolveQueryFilters(route && route.query, ctx)
			const base = resolveFilterMap(props.filter, params, ctx)
			// A folder-sidebar scope declaring `searchFields` narrows what the
			// search box searches over while that scope is active. Read off the
			// instance, like `$route` above, because the active scope is the
			// component's own state rather than a prop — and read through the
			// one fixed-filter getter rather than a second search path.
			const scopeSearchFields = (instance && instance.proxy && instance.proxy.activeScopeSearchFields) || []
			const scopeBase = scopeSearchFields.length > 0 ? { _searchFields: scopeSearchFields } : {}
			// File-content search widens a text search, so it rides only with a term.
			const widen = props.searchInFiles === true && contentSearch.value && !!(listHandle && listHandle.searchTerm.value)
			const scope = widen ? { ...scopeBase, _content_search: 'true' } : scopeBase
			const lensed = withPersonalLenses(props.quickFilters, props.personalLenses)
			const tabs = Array.isArray(lensed) ? lensed : null
			if (!tabs) {
				return { ...queryFilters, ...scope, ...base }
			}

			// Multiple mode: OR the selected tabs' filters together (union).
			if (isMultiQuickFilter) {
				const maps = selectedQuickFilterIndices.value
					.map((i) => resolveFilterMap(tabs[i]?.filter, params, ctx))
				return { ...queryFilters, ...scope, ...base, ...unionFilterMaps(maps) }
			}

			// Single mode: the active tab's filter spread last so it wins
			// over a colliding props.filter entry.
			const activeIdx = activeQuickFilterIndex.value
			const tabFilter = (activeIdx !== null && activeIdx !== undefined) ? tabs[activeIdx]?.filter : null
			return { ...queryFilters, ...scope, ...base, ...resolveFilterMap(tabFilter, params, ctx) }
		},
	})

	listHandle = list

	// Re-fetch when the quick-filter selection changes (pre-existing), OR
	// when the workspace/app-config bag content changes (e.g. the
	// administration switcher writes a new `activeAdministrationId`) — a
	// `@workspace.<key>`/`@config.<key>` token in `props.filter` must re-scope
	// the list without a manual reload. A change to `props.filter` itself (a
	// host toggling a filter checkbox) re-fetches the same way.
	const filterSignature = computed(() => JSON.stringify(props.filter ?? null))
	watch([activeQuickFilterIndex, selectedQuickFilterIndices, contentSearch, workspaceSignature, appConfigSignature, filterSignature], () => {
		if (list && typeof list.refresh === 'function') {
			list.refresh(1)
		}
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
	useObjectSubscription(objectStore, () => objectType.value, null, {
		enabled: () => props.subscribe !== false,
	})

	return {
		isSelfFetch: true,
		list,
		selfObjectStore: objectStore,
		selfObjectType: objectType,
		activeQuickFilterIndex,
		selectedQuickFilterIndices,
		contentSearch,
		// The page persists the view state back into the query, and needs both
		// to do it without trampling the rest of it: the keys it adopted from
		// the query on load (the only non-`_` ones it may clear), and the ctx
		// those keys' `@`-tokens resolve against.
		selfFetchTokenCtx: tokenCtx,
		initialQueryFilterKeys: Object.keys(initialActiveFilters),
	}
}
