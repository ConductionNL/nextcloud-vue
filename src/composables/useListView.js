import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useObjectStore } from '../store/index.js'

/**
 * Composable for managing list view state with full objectStore integration.
 *
 * When called with an `objectType` string, connects to the objectStore and handles
 * schema loading, collection fetching, sidebar wiring, and all event handlers
 * automatically. Everything a `CnIndexPage`-based list view needs is returned
 * directly — no additional computed properties or methods required in the component.
 *
 * Backward-compatible: existing `useListView(options)` and `useListView()` calls
 * continue to work without modification.
 *
 * @param {string|object} [objectTypeOrOptions] Object type slug (new API) or legacy options object
 * @param {object} [options] Options (new API only)
 * @param {object|null} [options.objectStore] Custom object store instance (from createObjectStore). When provided, uses this store instead of the default useObjectStore(). Required when the app uses createObjectStore with a custom store ID.
 * @param {object|null} [options.sidebarState] Sidebar state object from `inject('sidebarState')`. When provided, the composable wires and unwires the sidebar automatically on mount/unmount.
 * @param {number} [options.defaultPageSize] Default `_limit` sent to the API
 * @param {number} [options.debounceMs] Search debounce in milliseconds
 * @param {object} [options.defaultSort] Default sort applied on mount e.g. `{ key: 'createdAt', order: 'desc' }`
 * @return {object} Reactive state and event handlers
 *
 * @example
 * // New API — minimal
 * const { schema, objects, loading, pagination,
 *         onSearch, onSort, onFilterChange, onPageChange, refresh } = useListView('client')
 *
 * @example
 * // New API — with sidebar wiring
 * const list = useListView('client', {
 *   sidebarState: inject('sidebarState', null),
 * })
 *
 * @example
 * // Legacy API — still works
 * const { searchTerm, filters, onSearchInput, toggleSort } = useListView({
 *   objectType: 'client',
 *   fetchFn: (type, params) => objectStore.fetchCollection(type, params),
 * })
 */
export function useListView(objectTypeOrOptions, options) {
	// Backward compat: if first arg is an object or absent, delegate to legacy implementation
	if (!objectTypeOrOptions || typeof objectTypeOrOptions === 'object') {
		return useLegacyListView(objectTypeOrOptions || {})
	}

	// ── New API ──────────────────────────────────────────────────────────
	const objectType = objectTypeOrOptions
	const opts = options || {}
	const sidebarState = opts.sidebarState || null

	const objectStore = opts.objectStore || useObjectStore()

	// ── State refs ───────────────────────────────────────────────────────
	const schema = ref(null)
	const searchTerm = ref('')
	const sortKey = ref(opts.defaultSort?.key || null)
	const sortOrder = ref(opts.defaultSort?.order || 'asc')
	const activeFilters = ref({})
	const visibleColumns = ref(null)
	const pageSize = ref(opts.defaultPageSize || 20)

	// ── Computed refs from the store ─────────────────────────────────────
	const objects = computed(() => objectStore.collections[objectType] || [])
	const loading = computed(() => objectStore.loading[objectType] || false)
	const pagination = computed(
		() => objectStore.pagination[objectType] || { total: 0, page: 1, pages: 1, limit: 20 },
	)

	let searchTimeout = null

	// ── Param construction ───────────────────────────────────────────────

	/**
	 * Build API fetch params from current reactive state.
	 *
	 * @param {number} page Page number to request
	 * @return {object} Params object ready to pass to fetchCollection
	 */
	function buildParams(page) {
		const params = { _limit: pageSize.value, _page: page }

		if (searchTerm.value) {
			params._search = searchTerm.value
		}

		if (sortKey.value) {
			params._order = { [sortKey.value]: sortOrder.value }
		}

		for (const [key, values] of Object.entries(activeFilters.value)) {
			if (values && values.length > 0) {
				// Single-value arrays are unwrapped to scalar params
				params[key] = values.length === 1 ? values[0] : values
			}
		}

		return params
	}

	// ── Fetch ────────────────────────────────────────────────────────────

	/**
	 * Fetch the collection using current state params and update sidebar facet data.
	 *
	 * @param {number} [page] Page to fetch
	 * @return {Promise<void>}
	 */
	async function refresh(page = 1) {
		await objectStore.fetchCollection(objectType, buildParams(page))
	}

	// ── Event handlers ───────────────────────────────────────────────────

	/**
	 * Handle search input. Debounced by `options.debounceMs` (default 300 ms).
	 *
	 * @param {string} value New search string
	 */
	function onSearch(value) {
		searchTerm.value = value
		clearTimeout(searchTimeout)
		searchTimeout = setTimeout(() => refresh(1), opts.debounceMs || 300)
	}

	/**
	 * Handle sort change. Updates sort state and triggers refresh.
	 *
	 * @param {{key: string, order: string}} sort New sort definition
	 */
	function onSort({ key, order }) {
		sortKey.value = key
		sortOrder.value = order || 'asc'
		refresh(1)
	}

	/**
	 * Handle filter change for a single key. Empty arrays remove the key.
	 *
	 * @param {string} key Filter key (maps to API param name)
	 * @param {Array} values Selected filter values
	 */
	function onFilterChange(key, values) {
		if (!values || values.length === 0) {
			const updated = { ...activeFilters.value }
			delete updated[key]
			activeFilters.value = updated
		} else {
			activeFilters.value = { ...activeFilters.value, [key]: values }
		}
		refresh(1)
	}

	/**
	 * Handle page navigation.
	 *
	 * @param {number} page Page number to navigate to
	 */
	function onPageChange(page) {
		refresh(page)
	}

	/**
	 * Handle page-size change. Resets to page 1.
	 *
	 * @param {number} size New page size
	 */
	function onPageSizeChange(size) {
		pageSize.value = size
		refresh(1)
	}

	// ── Sidebar wiring ───────────────────────────────────────────────────

	function setupSidebar() {
		if (!sidebarState) return
		sidebarState.active = true
		sidebarState.schema = schema.value
		sidebarState.searchValue = searchTerm.value
		sidebarState.activeFilters = {}
		sidebarState.onSearch = onSearch
		sidebarState.onColumnsChange = (cols) => {
			visibleColumns.value = cols
		}
		sidebarState.onFilterChange = ({ key, values }) => onFilterChange(key, values)
	}

	function teardownSidebar() {
		if (!sidebarState) return
		sidebarState.active = false
		sidebarState.schema = null
		sidebarState.activeFilters = {}
		sidebarState.facetData = {}
		sidebarState.onSearch = null
		sidebarState.onColumnsChange = null
		sidebarState.onFilterChange = null
	}

	// Push facet data to sidebar after each store update
	if (sidebarState) {
		watch(
			() => objectStore.facets[objectType],
			(facets) => {
				sidebarState.facetData = facets || {}
			},
		)
	}

	// ── Lifecycle ────────────────────────────────────────────────────────

	onMounted(async () => {
		schema.value = await objectStore.fetchSchema(objectType)
		if (sidebarState) {
			setupSidebar()
		}
		await refresh(1)
	})

	onBeforeUnmount(() => {
		clearTimeout(searchTimeout)
		teardownSidebar()
	})

	// ── Return value ─────────────────────────────────────────────────────

	return {
		// Store-derived
		schema,
		objects,
		loading,
		pagination,
		// Local state
		searchTerm,
		sortKey,
		sortOrder,
		activeFilters,
		visibleColumns,
		pageSize,
		// Event handlers
		onSearch,
		onSort,
		onFilterChange,
		onPageChange,
		onPageSizeChange,
		// Explicit fetch
		refresh,
	}
}

// ── Legacy implementation ─────────────────────────────────────────────────────

/**
 * Legacy `useListView(options)` implementation.
 * Preserved verbatim for backward compatibility.
 *
 * @param {object} options Legacy options object
 * @param {string} [options.objectType] The registered object type slug
 * @param {Function} [options.fetchFn] Function to call: (type, params) => Promise<Array>
 * @param {number} [options.debounceMs] Search debounce in milliseconds
 * @param {number} [options.pageSize] Default page size
 * @param {object} [options.defaultSort] Default sort: { key: string, order: 'asc'|'desc' }
 * @return {object} Reactive state and methods
 */
function useLegacyListView(options) {
	const searchTerm = ref('')
	const filters = ref({})
	const sortKey = ref(options.defaultSort?.key || null)
	const sortOrder = ref(options.defaultSort?.order || 'asc')
	const currentPage = ref(1)
	const pageSize = ref(options.pageSize || 20)

	let searchTimeout = null

	function buildFetchParams() {
		const params = {
			_limit: pageSize.value,
			_page: currentPage.value,
		}

		if (searchTerm.value) {
			params._search = searchTerm.value
		}

		if (sortKey.value) {
			params._order = { [sortKey.value]: sortOrder.value }
		}

		for (const [key, value] of Object.entries(filters.value)) {
			if (value !== null && value !== '' && value !== false) {
				params[key] = value
			}
		}

		return params
	}

	async function fetchData(page) {
		if (page !== undefined) {
			currentPage.value = page
		}
		const params = buildFetchParams()
		if (options.fetchFn) {
			return options.fetchFn(options.objectType, params)
		}
	}

	function onSearchInput(value) {
		searchTerm.value = value
		clearTimeout(searchTimeout)
		searchTimeout = setTimeout(() => fetchData(1), options.debounceMs || 300)
	}

	function toggleSort(key) {
		if (sortKey.value === key) {
			if (sortOrder.value === 'asc') {
				sortOrder.value = 'desc'
			} else {
				sortKey.value = null
				sortOrder.value = 'asc'
			}
		} else {
			sortKey.value = key
			sortOrder.value = 'asc'
		}
		fetchData(1)
	}

	function setFilter(key, value) {
		filters.value = { ...filters.value, [key]: value }
		fetchData(1)
	}

	function clearAllFilters() {
		searchTerm.value = ''
		filters.value = {}
		sortKey.value = options.defaultSort?.key || null
		sortOrder.value = options.defaultSort?.order || 'asc'
		fetchData(1)
	}

	function goToPage(page) {
		currentPage.value = page
		fetchData()
	}

	onBeforeUnmount(() => clearTimeout(searchTimeout))

	return {
		searchTerm,
		filters,
		sortKey,
		sortOrder,
		currentPage,
		pageSize,
		onSearchInput,
		toggleSort,
		setFilter,
		clearAllFilters,
		goToPage,
		fetch: fetchData,
		buildFetchParams,
	}
}
