import { reactive, ref } from 'vue'
import { networkError, parseResponseError } from '../utils/errors.js'
import { buildHeaders, buildQueryString } from '../utils/headers.js'

/**
 * Standalone composable for fetching sub-resources outside the Pinia store.
 *
 * Use this for app-specific sub-resources that don't follow the standard
 * OpenRegister pattern or don't need shared state (e.g. CalDAV tasks,
 * ICommentsManager notes). State is scoped to the component lifecycle.
 *
 * For sub-resources that need shared state across components, use store
 * plugins (filesPlugin, auditTrailsPlugin, etc.) instead.
 *
 * @param {object} store The object store instance (must have objectTypeRegistry and _options)
 * @param {string} endpoint URL path segment appended to the object URL (e.g. 'tasks')
 * @param {object} [options] Composable options
 * @param {Function} [options.transform] Transform function applied to each result item
 * @param {number} [options.limit] Default page size
 * @return {object} Reactive state and methods
 *
 * @example
 * // Basic usage
 * const tasks = useSubResource(store, 'tasks')
 * await tasks.fetch('case', caseId)
 * console.log(tasks.data.results)
 *
 * @example
 * // With transform function (e.g. CalDAV task normalization)
 * const tasks = useSubResource(store, 'tasks', {
 *   transform: (task) => ({
 *     id: task.uid || task.id,
 *     title: task.summary,
 *     deadline: task.due,
 *     status: task.status,
 *   }),
 * })
 */
export function useSubResource(store, endpoint, options = {}) {
	const limit = options.limit || 20
	const transform = options.transform || null

	const data = reactive({
		results: [],
		total: 0,
		page: 1,
		pages: 0,
		limit,
		offset: 0,
	})
	const loading = ref(false)
	const error = ref(null)

	/**
	 * Build the sub-resource URL for a given object type and ID.
	 *
	 * @param {string} type The registered object type slug
	 * @param {string} objectId The parent object ID
	 * @return {string} Full URL path
	 */
	function buildUrl(type, objectId) {
		const config = store.objectTypeRegistry[type]
		if (!config) {
			throw new Error(`Object type "${type}" is not registered in the store.`)
		}
		return `${store._options.baseUrl}/${config.register}/${config.schema}/${objectId}/${endpoint}`
	}

	/**
	 * Fetch the sub-resource collection for an object.
	 *
	 * @param {string} type The registered object type slug
	 * @param {string} objectId The parent object ID
	 * @param {object} [params] Query parameters (_search, _limit, _page)
	 * @return {Promise<Array>} The fetched results
	 */
	async function fetchData(type, objectId, params = {}) {
		loading.value = true
		error.value = null

		try {
			const url = buildUrl(type, objectId) + buildQueryString(params)

			const response = await fetch(url, {
				method: 'GET',
				headers: buildHeaders(),
			})

			if (!response.ok) {
				error.value = await parseResponseError(response, endpoint)
				console.error(`Error fetching ${endpoint} for ${type}/${objectId}:`, error.value)
				return []
			}

			const responseData = await response.json()
			let results = responseData.results || responseData

			if (Array.isArray(results) && transform) {
				results = results.map(transform)
			}

			data.results = results
			data.total = responseData.total || results.length
			data.page = responseData.page || 1
			data.pages = responseData.pages || 0
			data.limit = params._limit || limit
			data.offset = responseData.offset || 0

			return data.results
		} catch (err) {
			error.value = err.name === 'TypeError'
				? networkError(err)
				: { status: null, message: err.message, details: null, isValidation: false, fields: null, toString() { return this.message } }
			console.error(`Error fetching ${endpoint} for ${type}/${objectId}:`, err)
			return []
		} finally {
			loading.value = false
		}
	}

	/**
	 * Clear all state back to defaults.
	 */
	function clear() {
		data.results = []
		data.total = 0
		data.page = 1
		data.pages = 0
		data.limit = limit
		data.offset = 0
		loading.value = false
		error.value = null
	}

	return {
		data,
		loading,
		error,
		fetch: fetchData,
		clear,
	}
}
