import { ref, watch } from 'vue'
import { useListView } from '../../composables/index.js'
import { useObjectStore } from '../../store/index.js'

function resolveFilterMap(filterMap, params) {
	if (!filterMap || typeof filterMap !== 'object') return {}
	const out = {}
	for (const [k, v] of Object.entries(filterMap)) {
		if (typeof v === 'string' && v.startsWith('@route.')) out[k] = params[v.slice('@route.'.length)]
		else if (typeof v === 'string' && v.startsWith(':')) out[k] = params[v.slice(1)]
		else out[k] = v
	}
	return out
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

	const list = useListView(objectType, {
		objectStore,
		sidebarState,
		defaultSort: props.sortKey ? { key: props.sortKey, order: props.sortOrder || 'asc' } : undefined,
		defaultPageSize: (props.pagination && props.pagination.limit) || undefined,
		defaultVisibleColumns: configuredColumnKeys.length ? configuredColumnKeys : null,
		fixedFilters: () => {
			const route = instance && instance.proxy && instance.proxy.$route
			const params = (route && route.params) || {}
			const base = resolveFilterMap(props.filter, params)
			const tabs = Array.isArray(props.quickFilters) ? props.quickFilters : null
			if (!tabs) return { ...base }

			// Multiple mode: OR the selected tabs' filters together (union).
			if (isMultiQuickFilter) {
				const maps = selectedQuickFilterIndices.value
					.map((i) => resolveFilterMap(tabs[i]?.filter, params))
				return { ...base, ...unionFilterMaps(maps) }
			}

			// Single mode: the active tab's filter spread last so it wins
			// over a colliding props.filter entry.
			const activeIdx = activeQuickFilterIndex.value
			const tabFilter = (activeIdx !== null && activeIdx !== undefined) ? tabs[activeIdx]?.filter : null
			return { ...base, ...resolveFilterMap(tabFilter, params) }
		},
	})

	watch([activeQuickFilterIndex, selectedQuickFilterIndices], () => {
		if (list && typeof list.refresh === 'function') list.refresh(1)
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
