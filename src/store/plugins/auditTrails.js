import { createSubResourcePlugin, emptyPaginated } from '../createSubResourcePlugin.js'
import { buildHeaders, buildQueryString } from '../../utils/headers.js'
import { parseResponseError, networkError, genericError } from '../../utils/errors.js'

/**
 * Audit trails plugin for the object store.
 *
 * Extends the generic sub-resource plugin with global audit trail operations:
 * fetching all audit trails (not scoped to one object), statistics, and delete.
 *
 * **Object-scoped** (from createSubResourcePlugin):
 * State: auditTrails, auditTrailsLoading, auditTrailsError
 * Actions: fetchAuditTrails(type, objectId, params), clearAuditTrails()
 * Getters: getAuditTrails, isAuditTrailsLoading, getAuditTrailsError
 *
 * **Global** (added by this plugin):
 * State: globalAuditTrails, globalAuditTrailsLoading, globalAuditTrailsError,
 *        auditTrailStatistics, auditTrailStatisticsLoading, auditTrailStatisticsError,
 *        auditTrailItem, auditTrailFilters, auditTrailSearch
 * Actions: fetchGlobalAuditTrails(params), fetchAuditTrailStatistics(),
 *          deleteGlobalAuditTrail(id), deleteMultipleGlobalAuditTrails(ids),
 *          refreshGlobalAuditTrails(), setAuditTrailItem(item),
 *          setAuditTrailFilters(filters), setAuditTrailSearch(search),
 *          clearAuditTrailFilters(), clearGlobalAuditTrails()
 * Getters: getGlobalAuditTrails, isGlobalAuditTrailsLoading, getGlobalAuditTrailsError,
 *          getAuditTrailStatistics, isAuditTrailStatisticsLoading, getAuditTrailStatisticsError,
 *          getAuditTrailItem, getAuditTrailFilters, getAuditTrailSearch
 *
 * @param {object} [options={}] Plugin options
 * @param {number} [options.limit=20] Default page size for object-scoped queries
 * @param {number} [options.globalLimit=50] Default page size for global queries
 * @return {object} Plugin definition
 *
 * @example
 * const useStore = createObjectStore('object', {
 *   plugins: [auditTrailsPlugin()],
 * })
 * const store = useStore()
 *
 * // Object-scoped (unchanged)
 * await store.fetchAuditTrails('case', caseId)
 *
 * // Global
 * await store.fetchGlobalAuditTrails({ _limit: 50, _page: 1 })
 * await store.fetchAuditTrailStatistics()
 * await store.deleteGlobalAuditTrail(id)
 */

const GLOBAL_PATH = '/audit-trails'

const EMPTY_STATISTICS = {
	total: 0,
	create: 0,
	update: 0,
	delete: 0,
	read: 0,
}

/**
 * Build the global audit trails API URL from the store base URL.
 * e.g. /apps/openregister/api/objects -> /apps/openregister/api/audit-trails
 *
 * @param {string} baseUrl Store base URL
 * @return {string} Global audit trails endpoint URL
 */
function buildGlobalUrl(baseUrl) {
	return baseUrl.replace(/\/objects\/?$/, '') + GLOBAL_PATH
}

export function auditTrailsPlugin(options = {}) {
	const base = createSubResourcePlugin('auditTrails', 'audit-trails', options)()
	const globalLimit = options.globalLimit || 50

	return {
		...base,

		state: () => ({
			...base.state(),
			globalAuditTrails: emptyPaginated(globalLimit),
			globalAuditTrailsLoading: false,
			globalAuditTrailsError: null,
			auditTrailStatistics: { ...EMPTY_STATISTICS },
			auditTrailStatisticsLoading: false,
			auditTrailStatisticsError: null,
			auditTrailItem: null,
			auditTrailFilters: {},
			auditTrailSearch: '',
		}),

		getters: {
			...base.getters,
			getGlobalAuditTrails: (state) => state.globalAuditTrails,
			isGlobalAuditTrailsLoading: (state) => state.globalAuditTrailsLoading || false,
			getGlobalAuditTrailsError: (state) => state.globalAuditTrailsError || null,
			getAuditTrailStatistics: (state) => state.auditTrailStatistics,
			isAuditTrailStatisticsLoading: (state) => state.auditTrailStatisticsLoading || false,
			getAuditTrailStatisticsError: (state) => state.auditTrailStatisticsError || null,
			getAuditTrailItem: (state) => state.auditTrailItem || null,
			getAuditTrailFilters: (state) => state.auditTrailFilters || {},
			getAuditTrailSearch: (state) => state.auditTrailSearch || '',
		},

		actions: {
			...base.actions,

			/**
			 * Fetch audit trails from the global endpoint (not scoped to an object).
			 *
			 * @param {object} [params] Query parameters (_limit, _page, _search, _order, filters)
			 * @return {Promise<Array>} The fetched results
			 */
			async fetchGlobalAuditTrails(params = {}) {
				this.globalAuditTrailsLoading = true
				this.globalAuditTrailsError = null

				try {
					const url = buildGlobalUrl(this._options.baseUrl) + buildQueryString(params)

					const response = await fetch(url, {
						method: 'GET',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						this.globalAuditTrailsError = await parseResponseError(response, 'audit trails')
						console.error('Error fetching global audit trails:', this.globalAuditTrailsError)
						return []
					}

					const data = await response.json()
					const results = data.results || data

					this.globalAuditTrails = {
						results,
						total: data.total || results.length,
						page: data.page || 1,
						pages: data.pages || 0,
						limit: params._limit || globalLimit,
						offset: data.offset || 0,
					}

					return results
				} catch (error) {
					this.globalAuditTrailsError = error.name === 'TypeError'
						? networkError(error)
						: genericError(error)
					console.error('Error fetching global audit trails:', error)
					return []
				} finally {
					this.globalAuditTrailsLoading = false
				}
			},

			/**
			 * Fetch audit trail statistics from the global statistics endpoint.
			 *
			 * @return {Promise<object>} The statistics object
			 */
			async fetchAuditTrailStatistics() {
				this.auditTrailStatisticsLoading = true
				this.auditTrailStatisticsError = null

				try {
					const url = buildGlobalUrl(this._options.baseUrl) + '/statistics'

					const response = await fetch(url, {
						method: 'GET',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						this.auditTrailStatisticsError = await parseResponseError(response, 'audit trail statistics')
						console.error('Error fetching audit trail statistics:', this.auditTrailStatisticsError)
						return { ...EMPTY_STATISTICS }
					}

					const data = await response.json()
					this.auditTrailStatistics = { ...EMPTY_STATISTICS, ...data }
					return this.auditTrailStatistics
				} catch (error) {
					this.auditTrailStatisticsError = error.name === 'TypeError'
						? networkError(error)
						: genericError(error)
					console.error('Error fetching audit trail statistics:', error)
					return { ...EMPTY_STATISTICS }
				} finally {
					this.auditTrailStatisticsLoading = false
				}
			},

			/**
			 * Delete a single audit trail by ID.
			 *
			 * @param {string} id The audit trail ID
			 * @return {Promise<boolean>} True if deleted successfully
			 */
			async deleteGlobalAuditTrail(id) {
				this.globalAuditTrailsLoading = true
				this.globalAuditTrailsError = null

				try {
					const url = buildGlobalUrl(this._options.baseUrl) + `/${id}`

					const response = await fetch(url, {
						method: 'DELETE',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						this.globalAuditTrailsError = await parseResponseError(response, 'audit trail')
						console.error(`Error deleting audit trail ${id}:`, this.globalAuditTrailsError)
						return false
					}

					this.globalAuditTrails = {
						...this.globalAuditTrails,
						results: this.globalAuditTrails.results.filter((item) => item.id !== id),
						total: Math.max(0, this.globalAuditTrails.total - 1),
					}

					return true
				} catch (error) {
					this.globalAuditTrailsError = error.name === 'TypeError'
						? networkError(error)
						: genericError(error)
					console.error(`Error deleting audit trail ${id}:`, error)
					return false
				} finally {
					this.globalAuditTrailsLoading = false
				}
			},

			/**
			 * Delete multiple audit trails by IDs.
			 *
			 * @param {string[]} ids Array of audit trail IDs to delete
			 * @return {Promise<boolean>} True if deleted successfully
			 */
			async deleteMultipleGlobalAuditTrails(ids) {
				if (!ids?.length) return true

				this.globalAuditTrailsLoading = true
				this.globalAuditTrailsError = null

				try {
					const url = buildGlobalUrl(this._options.baseUrl)

					const response = await fetch(url, {
						method: 'DELETE',
						headers: buildHeaders(),
						body: JSON.stringify({ ids }),
					})

					if (!response.ok) {
						this.globalAuditTrailsError = await parseResponseError(response, 'audit trails')
						console.error('Error deleting audit trails:', this.globalAuditTrailsError)
						return false
					}

					const idSet = new Set(ids)
					const remaining = this.globalAuditTrails.results.filter((item) => !idSet.has(item.id))

					this.globalAuditTrails = {
						...this.globalAuditTrails,
						results: remaining,
						total: Math.max(0, this.globalAuditTrails.total - (this.globalAuditTrails.results.length - remaining.length)),
					}

					return true
				} catch (error) {
					this.globalAuditTrailsError = error.name === 'TypeError'
						? networkError(error)
						: genericError(error)
					console.error('Error deleting audit trails:', error)
					return false
				} finally {
					this.globalAuditTrailsLoading = false
				}
			},

			/**
			 * Re-fetch global audit trails with current pagination state.
			 *
			 * @return {Promise<Array>} The fetched results
			 */
			async refreshGlobalAuditTrails() {
				return this.fetchGlobalAuditTrails({
					_limit: this.globalAuditTrails.limit,
					_page: this.globalAuditTrails.page,
				})
			},

			/**
			 * Set the active audit trail item (for detail views).
			 *
			 * @param {object|null} item The audit trail item or null to clear
			 */
			setAuditTrailItem(item) {
				this.auditTrailItem = item || null
			},

			/**
			 * Set audit trail filters (merged with existing).
			 *
			 * @param {object} filters Filter key-value pairs
			 */
			setAuditTrailFilters(filters) {
				this.auditTrailFilters = { ...this.auditTrailFilters, ...filters }
			},

			/**
			 * Set the audit trail search term.
			 *
			 * @param {string} search The search term
			 */
			setAuditTrailSearch(search) {
				this.auditTrailSearch = search || ''
			},

			/**
			 * Clear all audit trail filters and search.
			 */
			clearAuditTrailFilters() {
				this.auditTrailFilters = {}
				this.auditTrailSearch = ''
			},

			/**
			 * Clear all global audit trail state back to defaults.
			 */
			clearGlobalAuditTrails() {
				this.globalAuditTrails = emptyPaginated(globalLimit)
				this.globalAuditTrailsLoading = false
				this.globalAuditTrailsError = null
				this.auditTrailStatistics = { ...EMPTY_STATISTICS }
				this.auditTrailStatisticsLoading = false
				this.auditTrailStatisticsError = null
				this.auditTrailItem = null
				this.auditTrailFilters = {}
				this.auditTrailSearch = ''
			},

			/**
			 * Clear all audit trail state (both object-scoped and global).
			 * Overrides the base clearAuditTrails so clearAllSubResources() clears everything.
			 */
			clearAuditTrails() {
				// Base sub-resource clear
				this.auditTrails = emptyPaginated(options.limit || 20)
				this.auditTrailsLoading = false
				this.auditTrailsError = null
				// Global clear
				this.clearGlobalAuditTrails()
			},
		},
	}
}
