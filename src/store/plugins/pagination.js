/**
 * Pagination plugin for the object store.
 *
 * Adds per-type pagination tracking to the store. When included, `fetchCollection`
 * automatically stores the pagination response (total, page, pages, limit) keyed
 * by type slug. Without this plugin, pagination state is not tracked at all.
 *
 * State: pagination (keyed by type slug)
 * Getters: getPagination(type)
 * Actions: _initPaginationForType, _clearPaginationForType, _setPaginationFromResponse, clearPagination
 *
 * @param {object} [options] Plugin options
 * @param {number} [options.limit] Default page size (20) used when none is provided
 * @return {object} Plugin definition
 *
 * @example
 * const useStore = createObjectStore('myapp', {
 *   plugins: [paginationPlugin()],
 * })
 * const store = useStore()
 * store.registerObjectType('contact', schemaId, registerId)
 * await store.fetchCollection('contact', { _page: 1, _limit: 20 })
 * const pagination = store.getPagination('contact')
 * // { total: 42, page: 1, pages: 3, limit: 20 }
 */
export function paginationPlugin(options = {}) {
	const defaultLimit = options.limit || 20

	return {
		name: 'pagination',

		state() {
			return {
				/** @type {{string: {total: number, page: number, pages: number, limit: number}}} */
				pagination: {},
			}
		},

		getters: {
			/**
			 * Get pagination state for a type.
			 *
			 * Pinia getter — `state` is injected automatically by Pinia and is not
			 * passed by the caller. The getter returns a function so that consumers
			 * can pass a type slug: `store.getPagination('contact')`.
			 *
			 * @param {object} state Pinia store state (injected by Pinia)
			 * @return {Function} (type: string) => {total: number, page: number, pages: number, limit: number}
			 */
			getPagination: (state) => (type) =>
				state.pagination[type] || { total: 0, page: 1, pages: 1, limit: defaultLimit },
		},

		actions: {
			/**
			 * Initialise pagination state for a newly registered type.
			 * Called internally by registerObjectType when this plugin is active.
			 *
			 * @param {string} slug The type slug
			 */
			_initPaginationForType(slug) {
				this.pagination = {
					...this.pagination,
					[slug]: { total: 0, page: 1, pages: 1, limit: defaultLimit },
				}
			},

			/**
			 * Remove pagination state for an unregistered type.
			 * Called internally by unregisterObjectType when this plugin is active.
			 *
			 * @param {string} slug The type slug
			 */
			_clearPaginationForType(slug) {
				const { [slug]: _, ...remaining } = this.pagination
				this.pagination = remaining
			},

			/**
			 * Update pagination state from an API response.
			 * Called internally by fetchCollection when this plugin is active.
			 *
			 * @param {string} type The type slug
			 * @param {object} data Raw API response data
			 * @param {object} params The query params passed to fetchCollection
			 */
			_setPaginationFromResponse(type, data, params) {
				const results = data.results || data
				this.pagination = {
					...this.pagination,
					[type]: {
						total: data.total || (Array.isArray(results) ? results.length : 0),
						page: data.page || 1,
						pages: data.pages || 1,
						limit: params?._limit || defaultLimit,
					},
				}
			},

			/**
			 * Clear all pagination state.
			 */
			clearPagination() {
				this.pagination = {}
			},
		},
	}
}
