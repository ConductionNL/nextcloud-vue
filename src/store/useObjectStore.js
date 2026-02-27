import { defineStore } from 'pinia'
import { buildHeaders, buildQueryString } from '../utils/headers.js'
import { parseResponseError, networkError, genericError } from '../utils/errors.js'

/**
 * Generic Pinia store for OpenRegister object CRUD operations.
 *
 * Provides a unified interface for managing objects across registers and schemas.
 * Apps register their object types with schema/register IDs, then use type slugs
 * for all operations. Supports plugins for sub-resources (files, audit trails, etc.).
 *
 * @example
 * // Basic usage (CRUD only)
 * import { useObjectStore } from '@conduction/nextcloud-vue'
 * const store = useObjectStore()
 *
 * @example
 * // With plugins
 * import { createObjectStore, filesPlugin, auditTrailsPlugin } from '@conduction/nextcloud-vue'
 * const useMyStore = createObjectStore('object', {
 *   plugins: [filesPlugin(), auditTrailsPlugin()],
 * })
 */

const DEFAULT_STORE_ID = 'conduction-objects'
const DEFAULT_BASE_URL = '/apps/openregister/api/objects'

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
 * Merge plugin state factories into a single state object.
 *
 * @param {Array} plugins Array of plugin definitions
 * @return {object} Merged state object
 */
function mergePluginState(plugins) {
	const merged = {}
	for (const plugin of plugins) {
		if (plugin.state) {
			Object.assign(merged, plugin.state())
		}
	}
	return merged
}

/**
 * Merge plugin getters into a single getters object.
 *
 * @param {Array} plugins Array of plugin definitions
 * @return {object} Merged getters object
 */
function mergePluginGetters(plugins) {
	const merged = {}
	for (const plugin of plugins) {
		if (plugin.getters) {
			Object.assign(merged, plugin.getters)
		}
	}
	return merged
}

/**
 * Merge plugin actions into a single actions object.
 *
 * @param {Array} plugins Array of plugin definitions
 * @return {object} Merged actions object
 */
function mergePluginActions(plugins) {
	const merged = {}
	for (const plugin of plugins) {
		if (plugin.actions) {
			Object.assign(merged, plugin.actions)
		}
	}
	return merged
}

// ── Base state ──────────────────────────────────────────────────────────

function baseState() {
	return {
		/** @type {Object<string, {schema: string, register: string}>} */
		objectTypeRegistry: {},
		/** @type {Object<string, Array>} */
		collections: {},
		/** @type {Object<string, Object<string, object>>} */
		objects: {},
		/** @type {Object<string, boolean>} */
		loading: {},
		/** @type {Object<string, import('../utils/errors.js').ApiError|null>} */
		errors: {},
		/** @type {Object<string, {total: number, page: number, pages: number, limit: number}>} */
		pagination: {},
		/** @type {Object<string, string>} */
		searchTerms: {},
		/** @type {{baseUrl: string}} */
		_options: {
			baseUrl: DEFAULT_BASE_URL,
		},
	}
}

// ── Base getters ────────────────────────────────────────────────────────

const baseGetters = {
	/**
	 * Get all registered object type slugs.
	 * @return {string[]}
	 */
	objectTypes: (state) => Object.keys(state.objectTypeRegistry),

	/**
	 * Get the collection array for a type.
	 * @return {Function} (type: string) => Array
	 */
	getCollection: (state) => (type) => state.collections[type] || [],

	/**
	 * Get a single cached object by type and ID.
	 * @return {Function} (type: string, id: string) => object|null
	 */
	getObject: (state) => (type, id) => state.objects[type]?.[id] || null,

	/**
	 * Alias for getObject — check cache without fetching.
	 * @return {Function} (type: string, id: string) => object|null
	 */
	getCachedObject: (state) => (type, id) => state.objects[type]?.[id] || null,

	/**
	 * Check if a type is currently loading.
	 * @return {Function} (type: string) => boolean
	 */
	isLoading: (state) => (type) => state.loading[type] || false,

	/**
	 * Get the current error for a type.
	 * @return {Function} (type: string) => ApiError|null
	 */
	getError: (state) => (type) => state.errors[type] || null,

	/**
	 * Get pagination state for a type.
	 * @return {Function} (type: string) => {total, page, pages, limit}
	 */
	getPagination: (state) => (type) =>
		state.pagination[type] || { total: 0, page: 1, pages: 1, limit: 20 },

	/**
	 * Get the current search term for a type.
	 * @return {Function} (type: string) => string
	 */
	getSearchTerm: (state) => (type) => state.searchTerms[type] || '',
}

// ── Base actions ────────────────────────────────────────────────────────

const baseActions = {
	/**
	 * Configure the store with custom options.
	 * Call once before using the store if you need a custom base URL.
	 *
	 * @param {object} options Configuration options
	 * @param {string} [options.baseUrl] Custom base URL for API calls
	 */
	configure(options) {
		Object.assign(this._options, options)
	},

	/**
	 * Register an object type for CRUD operations.
	 *
	 * @param {string} slug Short name for the type (e.g. 'client', 'case')
	 * @param {string} schemaId OpenRegister schema ID
	 * @param {string} registerId OpenRegister register ID
	 */
	registerObjectType(slug, schemaId, registerId) {
		this.objectTypeRegistry[slug] = { schema: schemaId, register: registerId }
		this.collections[slug] = []
		this.objects[slug] = {}
		this.loading[slug] = false
		this.errors[slug] = null
		this.pagination[slug] = { total: 0, page: 1, pages: 1, limit: 20 }
		this.searchTerms[slug] = ''
	},

	/**
	 * Unregister an object type and clean up all its state.
	 *
	 * @param {string} slug The type slug to unregister
	 */
	unregisterObjectType(slug) {
		delete this.objectTypeRegistry[slug]
		delete this.collections[slug]
		delete this.objects[slug]
		delete this.loading[slug]
		delete this.errors[slug]
		delete this.pagination[slug]
		delete this.searchTerms[slug]
	},

	/**
	 * Get the type config or throw if not registered.
	 *
	 * @param {string} type The type slug
	 * @return {{schema: string, register: string}} Type configuration
	 * @throws {Error} If the type is not registered
	 */
	_getTypeConfig(type) {
		const config = this.objectTypeRegistry[type]
		if (!config) {
			throw new Error(`Object type "${type}" is not registered in the store. Call registerObjectType('${type}', schemaId, registerId) first.`)
		}
		return config
	},

	/**
	 * Build the API URL for a type and optional object ID.
	 *
	 * @param {string} type The type slug
	 * @param {string|null} [id=null] Optional object ID
	 * @return {string} Full API URL path
	 */
	_buildUrl(type, id = null) {
		const config = this._getTypeConfig(type)
		let url = `${this._options.baseUrl}/${config.register}/${config.schema}`
		if (id) {
			url += `/${id}`
		}
		return url
	},

	/**
	 * Clear the error state for a type.
	 *
	 * @param {string} type The type slug
	 */
	clearError(type) {
		this.errors[type] = null
	},

	/**
	 * Set the search term for a type.
	 *
	 * @param {string} type The type slug
	 * @param {string} term The search term
	 */
	setSearchTerm(type, term) {
		this.searchTerms[type] = term
	},

	/**
	 * Clear the search term for a type.
	 *
	 * @param {string} type The type slug
	 */
	clearSearchTerm(type) {
		this.searchTerms[type] = ''
	},

	/**
	 * Fetch a collection of objects for a registered type.
	 *
	 * @param {string} type The registered type slug
	 * @param {object} [params={}] Query parameters (_limit, _page, _search, _order, filters)
	 * @return {Promise<Array>} The fetched collection (also stored in state)
	 */
	async fetchCollection(type, params = {}) {
		this.loading[type] = true
		this.errors[type] = null

		try {
			const url = this._buildUrl(type) + buildQueryString(params)

			const response = await fetch(url, {
				method: 'GET',
				headers: buildHeaders(),
			})

			if (!response.ok) {
				this.errors[type] = await parseResponseError(response, type)
				console.error(`Error fetching ${type} collection:`, this.errors[type])
				return []
			}

			const data = await response.json()

			this.collections[type] = data.results || data
			this.pagination[type] = {
				total: data.total || (data.results || data).length,
				page: data.page || 1,
				pages: data.pages || 1,
				limit: params._limit || 20,
			}

			return this.collections[type]
		} catch (error) {
			this.errors[type] = error.name === 'TypeError'
				? networkError(error)
				: genericError(error)
			console.error(`Error fetching ${type} collection:`, error)
			return []
		} finally {
			this.loading[type] = false
		}
	},

	/**
	 * Fetch a single object by type and ID.
	 *
	 * @param {string} type The registered type slug
	 * @param {string} id The object ID or UUID
	 * @return {Promise<object|null>} The fetched object (also cached in state)
	 */
	async fetchObject(type, id) {
		this.loading[type] = true
		this.errors[type] = null

		try {
			const url = this._buildUrl(type, id)

			const response = await fetch(url, {
				method: 'GET',
				headers: buildHeaders(),
			})

			if (!response.ok) {
				this.errors[type] = await parseResponseError(response, type)
				console.error(`Error fetching ${type}/${id}:`, this.errors[type])
				return null
			}

			const data = await response.json()

			if (!this.objects[type]) {
				this.objects[type] = {}
			}
			this.objects[type][id] = data

			return data
		} catch (error) {
			this.errors[type] = error.name === 'TypeError'
				? networkError(error)
				: genericError(error)
			console.error(`Error fetching ${type}/${id}:`, error)
			return null
		} finally {
			this.loading[type] = false
		}
	},

	/**
	 * Create or update an object. Uses POST for new objects, PUT for updates.
	 *
	 * @param {string} type The registered type slug
	 * @param {object} objectData The object data (include `id` for updates)
	 * @return {Promise<object|null>} The saved object or null on error
	 */
	async saveObject(type, objectData) {
		this.loading[type] = true
		this.errors[type] = null

		try {
			const isUpdate = !!objectData.id
			const url = isUpdate
				? this._buildUrl(type, objectData.id)
				: this._buildUrl(type)
			const method = isUpdate ? 'PUT' : 'POST'

			const response = await fetch(url, {
				method,
				headers: buildHeaders(),
				body: JSON.stringify(objectData),
			})

			if (!response.ok) {
				this.errors[type] = await parseResponseError(response, type)
				console.error(`Error saving ${type}:`, this.errors[type])
				return null
			}

			const data = await response.json()

			if (!this.objects[type]) {
				this.objects[type] = {}
			}
			const savedId = data.id || objectData.id
			this.objects[type][savedId] = data

			return data
		} catch (error) {
			this.errors[type] = error.name === 'TypeError'
				? networkError(error)
				: genericError(error)
			console.error(`Error saving ${type}:`, error)
			return null
		} finally {
			this.loading[type] = false
		}
	},

	/**
	 * Delete an object by type and ID.
	 *
	 * @param {string} type The registered type slug
	 * @param {string} id The object ID
	 * @return {Promise<boolean>} True if deleted successfully
	 */
	async deleteObject(type, id) {
		this.loading[type] = true
		this.errors[type] = null

		try {
			const url = this._buildUrl(type, id)

			const response = await fetch(url, {
				method: 'DELETE',
				headers: buildHeaders(),
			})

			if (!response.ok) {
				this.errors[type] = await parseResponseError(response, type)
				console.error(`Error deleting ${type}/${id}:`, this.errors[type])
				return false
			}

			if (this.objects[type]) {
				delete this.objects[type][id]
			}
			if (this.collections[type]) {
				this.collections[type] = this.collections[type].filter(
					(obj) => obj.id !== id,
				)
			}

			return true
		} catch (error) {
			this.errors[type] = error.name === 'TypeError'
				? networkError(error)
				: genericError(error)
			console.error(`Error deleting ${type}/${id}:`, error)
			return false
		} finally {
			this.loading[type] = false
		}
	},

	/**
	 * Batch-resolve references by fetching multiple objects by their IDs.
	 * Uses the cache first, only fetches uncached objects.
	 *
	 * @param {string} type The registered type slug
	 * @param {string[]} ids Array of object IDs to resolve
	 * @return {Promise<Object<string, object>>} Map of id -> object
	 */
	async resolveReferences(type, ids) {
		if (!ids || ids.length === 0) return {}

		const uniqueIds = [...new Set(ids.filter(Boolean))]
		const result = {}
		const toFetch = []

		for (const id of uniqueIds) {
			const cached = this.objects[type]?.[id]
			if (cached) {
				result[id] = cached
			} else {
				toFetch.push(id)
			}
		}

		if (toFetch.length > 0) {
			const fetches = toFetch.map(async (id) => {
				try {
					const url = this._buildUrl(type, id)
					const response = await fetch(url, {
						method: 'GET',
						headers: buildHeaders(),
					})
					if (response.ok) {
						const data = await response.json()
						if (!this.objects[type]) this.objects[type] = {}
						this.objects[type][id] = data
						result[id] = data
					}
				} catch {
					// Non-blocking — leave unresolved
				}
			})
			await Promise.all(fetches)
		}

		return result
	},
}

// ── Store factory ───────────────────────────────────────────────────────

/**
 * Create the object store definition with a given store ID and optional plugins.
 *
 * Plugins are merged into the store at definition time. Each plugin provides
 * additional state, getters, and actions (e.g. for sub-resources like files,
 * audit trails, relations).
 *
 * @param {string} storeId Pinia store identifier
 * @param {Array} [plugins=[]] Array of plugin definitions
 * @return {Function} Pinia store composable
 */
function defineObjectStore(storeId, plugins = []) {
	const pluginState = mergePluginState(plugins)
	const pluginGetters = mergePluginGetters(plugins)
	const pluginActions = mergePluginActions(plugins)

	return defineStore(storeId, {
		state: () => ({
			...baseState(),
			...pluginState,
		}),

		getters: {
			...baseGetters,
			...pluginGetters,
		},

		actions: {
			...baseActions,
			...pluginActions,

			/**
			 * Clear all sub-resource data from active plugins.
			 * Calls each plugin's clear method (e.g. clearFiles, clearAuditTrails).
			 */
			clearAllSubResources() {
				for (const plugin of plugins) {
					const clearFn = `clear${capitalize(plugin.name)}`
					if (typeof this[clearFn] === 'function') {
						this[clearFn]()
					}
				}
			},
		},
	})
}

/**
 * Default object store instance with ID 'conduction-objects'.
 *
 * @example
 * import { useObjectStore } from '@conduction/nextcloud-vue'
 * const store = useObjectStore()
 */
export const useObjectStore = defineObjectStore(DEFAULT_STORE_ID)

/**
 * Factory function to create an object store with a custom Pinia store ID
 * and optional plugins for sub-resources.
 *
 * @param {string} storeId Custom Pinia store identifier
 * @param {object} [options={}] Configuration options
 * @param {Array} [options.plugins=[]] Array of sub-resource plugins
 * @return {Function} Pinia store composable
 *
 * @example
 * // Basic (backwards compatible)
 * const useMyStore = createObjectStore('object')
 *
 * @example
 * // With plugins
 * import { filesPlugin, auditTrailsPlugin } from '@conduction/nextcloud-vue'
 * const useMyStore = createObjectStore('object', {
 *   plugins: [filesPlugin(), auditTrailsPlugin()],
 * })
 */
export function createObjectStore(storeId, options = {}) {
	return defineObjectStore(storeId, options.plugins || [])
}
