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

	if (!isSelfFetch) {
		return {
			isSelfFetch: false,
			list: null,
			selfObjectStore: null,
			selfObjectType: '',
			activeQuickFilterIndex,
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

	const list = useListView(objectType, {
		objectStore,
		sidebarState,
		defaultSort: props.sortKey ? { key: props.sortKey, order: props.sortOrder || 'asc' } : undefined,
		defaultPageSize: (props.pagination && props.pagination.limit) || undefined,
		fixedFilters: () => {
			const route = instance && instance.proxy && instance.proxy.$route
			const params = (route && route.params) || {}
			const base = resolveFilterMap(props.filter, params)
			// Tab filter spread last so it wins over a colliding props.filter entry.
			const tabs = Array.isArray(props.quickFilters) ? props.quickFilters : null
			const activeIdx = activeQuickFilterIndex.value
			const tabFilter = (tabs && activeIdx !== null && activeIdx !== undefined) ? tabs[activeIdx]?.filter : null
			return { ...base, ...resolveFilterMap(tabFilter, params) }
		},
	})

	watch(activeQuickFilterIndex, () => {
		if (list && typeof list.refresh === 'function') list.refresh(1)
	})

	return {
		isSelfFetch: true,
		list,
		selfObjectStore: objectStore,
		selfObjectType: objectType,
		activeQuickFilterIndex,
	}
}
