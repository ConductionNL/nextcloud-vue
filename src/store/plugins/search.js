import { buildHeaders, buildQueryString, prefixUrl } from '../../utils/headers.js'

/**
 * The type slug used internally by the search plugin.
 * Consumers can import this constant to avoid hard-coding the string 'search'.
 *
 * @type {string}
 */
export const SEARCH_TYPE = 'search'

/**
 * Build the API URL for fetching a register by ID.
 *
 * @param {string} registerId OpenRegister register ID
 * @return {string} Full API URL path
 */
export function getRegisterApiUrl(registerId) {
	return prefixUrl(`/apps/openregister/api/registers/${registerId}`)
}

/**
 * Build the API URL for fetching a schema by ID.
 *
 * @param {string} schemaId OpenRegister schema ID
 * @return {string} Full API URL path
 */
export function getSchemaApiUrl(schemaId) {
	return prefixUrl(`/apps/openregister/api/schemas/${schemaId}`)
}

/**
 * Search plugin for the object store.
 *
 * Adds a dedicated search context to the store: a separate collection, pagination,
 * loading state, schema, register, and facet cache — all scoped to the current
 * `searchParams`. Unlike the main type-keyed collections, the search collection is
 * a single slot that is refetched whenever `refetchSearchCollection` is called.
 *
 * The plugin owns two URL-builder helpers (`getRegisterApiUrl`, `getSchemaApiUrl`)
 * that are also exported at module level for use outside the store.
 *
 * State added:
 *   - `searchParams` — Query parameters for the current search (register, schema, filters, …)
 *   - `searchVisibleColumns` — Column keys visible in the search results table
 *
 * Getters added:
 *   - `searchCollection` — Array of search result objects
 *   - `searchPagination` — `{ total, page, pages, limit }` for the last fetch
 *   - `searchLoading` — `true` while a fetch is in progress
 *   - `searchSchema` — Schema object for the current search register/schema pair
 *   - `searchRegister` — Register object for the current search register/schema pair
 *   - `searchFacets` — Facet data in CnIndexSidebar-compatible format
 *
 * Actions added:
 *   - `setSearchParams(params)` — Update search params (clears stale schema/register cache)
 *   - `setSearchVisibleColumns(columns)` — Replace the visible columns list
 *   - `clearSearchCollection()` — Reset collection, pagination, and facets
 *   - `refetchSearchCollection()` — Fetch collection using current `searchParams`
 *
 * @example
 * import { createObjectStore, searchPlugin, SEARCH_TYPE } from '@conduction/nextcloud-vue'
 *
 * const useMyStore = createObjectStore('myapp', {
 *   plugins: [searchPlugin()],
 * })
 *
 * const store = useMyStore()
 *
 * // Set params and fetch
 * store.setSearchParams({ register: 'reg-1', schema: 'schema-1', _search: 'foo' })
 * await store.refetchSearchCollection()
 *
 * // Read results
 * console.log(store.searchCollection)   // [{ id: '…', … }, …]
 * console.log(store.searchPagination)   // { total: 42, page: 1, pages: 3, limit: 20 }
 * console.log(store.searchSchema)       // { title: '…', properties: { … } }
 *
 * // Clear
 * store.clearSearchCollection()
 *
 * @return {object} Plugin definition
 */
export function searchPlugin() {
	return {
		name: 'search',

		state: () => ({
			/**
			 * Query parameters for the active search.
			 * Must include `register` and `schema` for `refetchSearchCollection` to work.
			 * All other keys are forwarded as query-string parameters (e.g. `_search`, `_page`).
			 * @type {object}
			 */
			searchParams: {},

			/**
			 * Column keys that are visible in the search results table.
			 * @type {string[]}
			 */
			searchVisibleColumns: [],

			/** @private @type {Array} */
			_searchCollection: [],

			/** @private @type {{ total: number, page: number, pages: number, limit: number }} */
			_searchPagination: { total: 0, page: 1, pages: 1, limit: 20 },

			/** @private @type {boolean} */
			_searchLoading: false,

			/** @private @type {object|null} */
			_searchSchema: null,

			/** @private @type {object|null} */
			_searchRegister: null,

			/** @private @type {object} */
			_searchFacets: {},
		}),

		getters: {
			/**
			 * The current search result objects.
			 * @param {object} state
			 * @return {Array}
			 */
			searchCollection: (state) => state._searchCollection,

			/**
			 * Pagination state for the last search fetch.
			 * @param {object} state
			 * @return {{ total: number, page: number, pages: number, limit: number }}
			 */
			searchPagination: (state) => state._searchPagination,

			/**
			 * True while a search fetch is in progress.
			 * @param {object} state
			 * @return {boolean}
			 */
			searchLoading: (state) => state._searchLoading,

			/**
			 * The schema object for the current search register/schema pair.
			 * Populated automatically by `refetchSearchCollection`.
			 * @param {object} state
			 * @return {object|null}
			 */
			searchSchema: (state) => state._searchSchema,

			/**
			 * The register object for the current search register/schema pair.
			 * Populated automatically by `refetchSearchCollection`.
			 * @param {object} state
			 * @return {object|null}
			 */
			searchRegister: (state) => state._searchRegister,

			/**
			 * Facet data from the last search fetch, in CnIndexSidebar-compatible format:
			 * `{ fieldName: { values: [{ value, count }] } }`.
			 * @param {object} state
			 * @return {object}
			 */
			searchFacets: (state) => state._searchFacets,
		},

		actions: {
			/**
			 * Update the search parameters.
			 * If `register` or `schema` changes, the cached register/schema objects are
			 * cleared so the next `refetchSearchCollection` re-fetches them.
			 *
			 * @param {object} params New search params. Must include `register` and `schema`.
			 */
			setSearchParams(params) {
				if (params.register !== this.searchParams.register) {
					this._searchRegister = null
				}
				if (params.schema !== this.searchParams.schema) {
					this._searchSchema = null
				}
				this.searchParams = { ...params }
			},

			/**
			 * Merge the given properties into the current search parameters.
			 * Only the provided keys are overwritten; all other keys remain unchanged.
			 * If `register` or `schema` changes, the cached register/schema objects are
			 * cleared so the next `refetchSearchCollection` re-fetches them.
			 *
			 * @param {object} params Partial search params to merge
			 */
			updateSearchParams(params) {
				if ('register' in params && params.register !== this.searchParams.register) {
					this._searchRegister = null
				}
				if ('schema' in params && params.schema !== this.searchParams.schema) {
					this._searchSchema = null
				}
				this.searchParams = { ...this.searchParams, ...params }
			},

			/**
			 * Replace the list of visible column keys for the search results table.
			 *
			 * @param {string[]} columns Column key array
			 */
			setSearchVisibleColumns(columns) {
				this.searchVisibleColumns = Array.isArray(columns) ? columns : []
			},

			/**
			 * Clear the search collection, pagination, and facets.
			 * Does not reset `searchParams` or `searchVisibleColumns`.
			 */
			clearSearchCollection() {
				this._searchCollection = []
				this._searchPagination = { total: 0, page: 1, pages: 1, limit: 20 }
				this._searchFacets = {}
			},

			/**
			 * Fetch the search collection using the current `searchParams`.
			 * `searchParams` must include `register` and `schema`; all other keys are
			 * forwarded as query-string parameters to the objects endpoint.
			 *
			 * Side-effects:
			 * - Fetches and caches `_searchSchema` and `_searchRegister` (non-blocking,
			 *   only when not already cached).
			 * - Updates `_searchCollection`, `_searchPagination`, and `_searchFacets`.
			 *
			 * @return {Promise<Array>} The fetched collection (empty array on error)
			 */
			async refetchSearchCollection() {
				const { register, schema, ...queryParams } = this.searchParams

				if (!register || !schema) {
					console.warn('[searchPlugin] refetchSearchCollection called without register/schema in searchParams')
					return []
				}

				this._searchLoading = true

				// Auto-register the type so saveObject/deleteObject work
				const type = this.createObjectTypeSlug(register, schema)
				if (type && !this.objectTypes.includes(type)) {
					this.registerObjectType(type, schema, register)
				}

				// Kick off schema/register fetches in parallel (non-blocking)
				if (!this._searchSchema) {
					this._fetchSearchSchema(schema)
				}
				if (!this._searchRegister) {
					this._fetchSearchRegister(register)
				}

				try {
					const baseUrl = this._options?.baseUrl || '/apps/openregister/api/objects'
					const url = `${baseUrl}/${register}/${schema}` + buildQueryString(queryParams)

					const response = await fetch(url, {
						method: 'GET',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						console.error('[searchPlugin] Failed to fetch search collection:', response.status)
						return []
					}

					const data = await response.json()
					const results = data.results || data

					this._searchCollection = results
					this._searchPagination = {
						total: data.total || results.length,
						page: data.page || 1,
						pages: data.pages || 1,
						limit: queryParams._limit || 20,
					}

					if (data.facets) {
						const transformed = {}
						for (const [key, facet] of Object.entries(data.facets)) {
							if (facet.buckets || facet.data?.buckets) {
								const buckets = facet.buckets || facet.data.buckets
								transformed[key] = {
									values: buckets.map((b) => ({
										value: b.key ?? b.value,
										count: b.count || 0,
									})),
								}
							}
						}
						this._searchFacets = transformed
					}

					return results
				} catch (error) {
					console.error('[searchPlugin] Error fetching search collection:', error)
					return []
				} finally {
					this._searchLoading = false
				}
			},

			/**
			 * Fetch and cache the schema object for the given schema ID.
			 * Internal — called by `refetchSearchCollection`.
			 *
			 * @param {string} schemaId OpenRegister schema ID
			 * @return {Promise<void>}
			 */
			async _fetchSearchSchema(schemaId) {
				try {
					const response = await fetch(getSchemaApiUrl(schemaId), {
						method: 'GET',
						headers: buildHeaders(),
					})
					if (response.ok) {
						this._searchSchema = await response.json()
					}
				} catch {
					// Non-critical — searchSchema stays null
				}
			},

			/**
			 * Fetch and cache the register object for the given register ID.
			 * Internal — called by `refetchSearchCollection`.
			 *
			 * @param {string} registerId OpenRegister register ID
			 * @return {Promise<void>}
			 */
			async _fetchSearchRegister(registerId) {
				try {
					const response = await fetch(getRegisterApiUrl(registerId), {
						method: 'GET',
						headers: buildHeaders(),
					})
					if (response.ok) {
						this._searchRegister = await response.json()
					}
				} catch {
					// Non-critical — searchRegister stays null
				}
			},
		},
	}
}
