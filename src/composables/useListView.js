import { ref, onBeforeUnmount } from 'vue'

/**
 * Composable for managing list view state: search, filters, sorting, pagination.
 *
 * Extracts the search-debounce + filter + sort + pagination pattern
 * found in every list view across Pipelinq and Procest.
 *
 * @param {object} options Configuration options
 * @param {string} options.objectType The registered object type slug
 * @param {Function} options.fetchFn Function to call: (type, params) => Promise<Array>
 * @param {number} [options.debounceMs=300] Search debounce in milliseconds
 * @param {number} [options.pageSize=20] Default page size
 * @param {object} [options.defaultSort] Default sort: { key: string, order: 'asc'|'desc' }
 * @return {object} Reactive state and methods
 *
 * @example
 * import { useListView } from '@conduction/nextcloud-vue'
 *
 * const { searchTerm, sortKey, sortOrder, currentPage, onSearchInput, toggleSort, fetch } = useListView({
 *   objectType: 'client',
 *   fetchFn: (type, params) => objectStore.fetchCollection(type, params),
 *   defaultSort: { key: 'name', order: 'asc' },
 * })
 */
export function useListView(options) {
	const searchTerm = ref('')
	const filters = ref({})
	const sortKey = ref(options.defaultSort?.key || null)
	const sortOrder = ref(options.defaultSort?.order || 'asc')
	const currentPage = ref(1)
	const pageSize = ref(options.pageSize || 20)

	let searchTimeout = null

	/**
	 * Build fetch parameters from current state.
	 * @return {object} Parameters for the fetch function
	 */
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

		// Merge active filters
		for (const [key, value] of Object.entries(filters.value)) {
			if (value !== null && value !== '' && value !== false) {
				params[key] = value
			}
		}

		return params
	}

	/**
	 * Execute a fetch with current state.
	 * @param {number} [page] Optional page override
	 * @return {Promise<Array>} Fetched results
	 */
	async function fetchData(page) {
		if (page !== undefined) {
			currentPage.value = page
		}
		const params = buildFetchParams()
		return options.fetchFn(options.objectType, params)
	}

	/**
	 * Handle search input with debouncing.
	 * @param {string} value New search value
	 */
	function onSearchInput(value) {
		searchTerm.value = value
		clearTimeout(searchTimeout)
		searchTimeout = setTimeout(() => fetchData(1), options.debounceMs || 300)
	}

	/**
	 * Toggle sort on a column. Cycles: asc -> desc -> null.
	 * @param {string} key Column key
	 */
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

	/**
	 * Set a filter value and re-fetch.
	 * @param {string} key Filter key
	 * @param {*} value Filter value
	 */
	function setFilter(key, value) {
		filters.value = { ...filters.value, [key]: value }
		fetchData(1)
	}

	/**
	 * Clear all filters and search, then re-fetch.
	 */
	function clearAllFilters() {
		searchTerm.value = ''
		filters.value = {}
		sortKey.value = options.defaultSort?.key || null
		sortOrder.value = options.defaultSort?.order || 'asc'
		fetchData(1)
	}

	/**
	 * Navigate to a specific page.
	 * @param {number} page Page number
	 */
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
