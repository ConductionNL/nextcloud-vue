import { buildHeaders, buildQueryString } from '../utils/headers.js'
import { parseResponseError, networkError } from '../utils/errors.js'

/**
 * Standard empty paginated response shape used by all sub-resource plugins.
 *
 * @param {number} [limit] Default page size
 * @return {object} Empty paginated state
 */
export function emptyPaginated(limit = 20) {
	return { results: [], total: 0, page: 1, pages: 0, limit, offset: 0 }
}

/**
 * Capitalize the first letter of a string.
 *
 * @param {string} str Input string
 * @return {string} Capitalized string
 */
function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Create a sub-resource plugin for the object store.
 *
 * Generates state, getters, and actions for a standard OpenRegister sub-resource
 * endpoint that returns paginated results. The generated plugin follows the
 * naming convention: fetch{Name}, clear{Name}, get{Name}, is{Name}Loading, etc.
 *
 * @param {string} name Camel-case name for the sub-resource (e.g. 'auditTrails')
 * @param {string} endpoint URL path segment appended to the object URL (e.g. 'audit-trails')
 * @param {object} [options] Plugin options
 * @param {number} [options.limit] Default page size
 * @return {Function} Plugin factory that returns the plugin definition
 *
 * @example
 * // Simple read-only sub-resource
 * export const auditTrailsPlugin = createSubResourcePlugin('auditTrails', 'audit-trails')
 *
 * @example
 * // With custom limit
 * export const contractsPlugin = createSubResourcePlugin('contracts', 'contracts', { limit: 50 })
 *
 * @example
 * // Usage in store creation
 * const useStore = createObjectStore('object', {
 *   plugins: [auditTrailsPlugin()],
 * })
 * const store = useStore()
 * await store.fetchAuditTrails('case', caseId)
 * console.log(store.auditTrails.results)
 */
export function createSubResourcePlugin(name, endpoint, options = {}) {
	const cap = capitalize(name)
	const limit = options.limit || 20

	return () => ({
		name,

		state: () => ({
			[name]: emptyPaginated(limit),
			[`${name}Loading`]: false,
			[`${name}Error`]: null,
		}),

		getters: {
			[`get${cap}`]: (state) => state[name],
			[`is${cap}Loading`]: (state) => state[`${name}Loading`],
			[`get${cap}Error`]: (state) => state[`${name}Error`],
		},

		actions: {
			/**
			 * Fetch the sub-resource collection for an object.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The parent object ID
			 * @param {object} [params] Query parameters (_search, _limit, _page)
			 * @return {Promise<Array>} The fetched results
			 */
			async [`fetch${cap}`](type, objectId, params = {}) {
				this[`${name}Loading`] = true
				this[`${name}Error`] = null

				try {
					const url = this._buildUrl(type, objectId)
						+ '/' + endpoint
						+ buildQueryString(params)

					const response = await fetch(url, {
						method: 'GET',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						this[`${name}Error`] = await parseResponseError(response, name)
						console.error(`Error fetching ${name} for ${type}/${objectId}:`, this[`${name}Error`])
						return []
					}

					const data = await response.json()

					this[name] = {
						results: data.results || data,
						total: data.total || (data.results || data).length,
						page: data.page || 1,
						pages: data.pages || 0,
						limit: params._limit || limit,
						offset: data.offset || 0,
					}

					return this[name].results
				} catch (error) {
					this[`${name}Error`] = error.name === 'TypeError'
						? networkError(error)
						: { status: null, message: error.message, details: null, isValidation: false, fields: null, toString() { return this.message } }
					console.error(`Error fetching ${name} for ${type}/${objectId}:`, error)
					return []
				} finally {
					this[`${name}Loading`] = false
				}
			},

			/**
			 * Clear all sub-resource state back to empty defaults.
			 */
			[`clear${cap}`]() {
				this[name] = emptyPaginated(limit)
				this[`${name}Loading`] = false
				this[`${name}Error`] = null
			},
		},
	})
}
