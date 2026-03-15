import { defineStore } from 'pinia'
import { buildHeaders, buildQueryString, prefixUrl } from '../utils/headers.js'
import { parseResponseError, networkError, genericError } from '../utils/errors.js'
import { extractId } from '../utils/id.js'

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

function baseState(baseUrl = DEFAULT_BASE_URL) {
	return {
		/** @type {{string: {schema: string, register: string}}} */
		objectTypeRegistry: {},
		/** @type {{string: Array}} */
		collections: {},
		/** @type {{string: {string: object}}} */
		objects: {},
		/** @type {{string: boolean}} */
		loading: {},
		/** @type {{string: import('../utils/errors.js').ApiError|null}} */
		errors: {},
		/** @type {{string: {total: number, page: number, pages: number, limit: number}}} */
		pagination: {},
		/** @type {{string: string}} */
		searchTerms: {},
		/** @type {{string: object|null}} */
		schemas: {},
		/** @type {{string: object|null}} */
		registers: {},
		/**
		 * Facet data per type for CnIndexSidebar: { fieldName: { values: [{value, count}] } }
		 * @type {{string: object}}
		 */
		facets: {},
		/** @type {{baseUrl: string}} */
		_options: {
			baseUrl,
		},
	}
}

// ── Base getters ────────────────────────────────────────────────────────

const baseGetters = {
	/**
	 * Get all registered object type slugs.
	 * @param state
	 * @return {string[]}
	 */
	objectTypes: (state) => Object.keys(state.objectTypeRegistry),

	/**
	 * Get the collection array for a type.
	 * @param state
	 * @return {Function} (type: string) => Array
	 */
	getCollection: (state) => (type) => state.collections[type] || [],

	/**
	 * Get a single cached object by type and ID.
	 * @param state
	 * @return {Function} (type: string, id: string) => object|null
	 */
	getObject: (state) => (type, id) => state.objects[type]?.[id] || null,

	/**
	 * Alias for getObject — check cache without fetching.
	 * @param state
	 * @return {Function} (type: string, id: string) => object|null
	 */
	getCachedObject: (state) => (type, id) => state.objects[type]?.[id] || null,

	/**
	 * Check if a type is currently loading.
	 * @param state
	 * @return {Function} (type: string) => boolean
	 */
	isLoading: (state) => (type) => state.loading[type] || false,

	/**
	 * Get the current error for a type.
	 * @param state
	 * @return {Function} (type: string) => ApiError|null
	 */
	getError: (state) => (type) => state.errors[type] || null,

	/**
	 * Get pagination state for a type.
	 * @param state
	 * @return {Function} (type: string) => {total, page, pages, limit}
	 */
	getPagination: (state) => (type) =>
		state.pagination[type] || { total: 0, page: 1, pages: 1, limit: 20 },

	/**
	 * Get the current search term for a type.
	 * @param state
	 * @return {Function} (type: string) => string
	 */
	getSearchTerm: (state) => (type) => state.searchTerms[type] || '',

	/**
	 * Get a cached schema for a type.
	 * @param state
	 * @return {Function} (type: string) => object|null
	 */
	getSchema: (state) => (type) => state.schemas[type] || null,

	/**
	 * Get a cached register for a type.
	 * @param state
	 * @return {Function} (type: string) => object|null
	 */
	getRegister: (state) => (type) => state.registers[type] || null,

	/**
	 * Get facet data for a type (CnIndexSidebar-compatible format).
	 * @param state
	 * @return {Function} (type: string) => object
	 */
	getFacets: (state) => (type) => state.facets[type] || {},
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
	 * Create a standard object type slug.
	 *
	 * takes a unspecified number of props and joins them from first to left with a `-`.
	 * However it is recommended to give it 1 register and 1 schema in that order.
	 * @param {*} params - unspecified number of props
	 * @return {string}
	 */
	createObjectTypeSlug(...params) {
		const contentIds = params.map((x) => extractId(x))

		return contentIds.join('-')
	},

	/**
	 * Register an object type for CRUD operations.
	 *
	 * @param {string} slug Short name for the type (e.g. 'client', 'case')
	 * @param {string} schemaId OpenRegister schema ID
	 * @param {string} registerId OpenRegister register ID
	 */
	registerObjectType(slug, schemaId, registerId) {
		// Replace entire objects so Vue 2 reactivity detects the change
		// (Vue 2 cannot track new properties added to existing reactive objects)
		this.objectTypeRegistry = { ...this.objectTypeRegistry, [slug]: { schema: schemaId, register: registerId } }
		this.collections = { ...this.collections, [slug]: [] }
		this.objects = { ...this.objects, [slug]: {} }
		this.loading = { ...this.loading, [slug]: false }
		this.errors = { ...this.errors, [slug]: null }
		this.pagination = { ...this.pagination, [slug]: { total: 0, page: 1, pages: 1, limit: 20 } }
		this.searchTerms = { ...this.searchTerms, [slug]: '' }
		this.schemas = { ...this.schemas, [slug]: null }
		this.registers = { ...this.registers, [slug]: null }
		this.facets = { ...this.facets, [slug]: {} }
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
		delete this.schemas[slug]
		delete this.registers[slug]
		delete this.facets[slug]
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
	 * @param {string|null} [id] Optional object ID
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
		this.errors = { ...this.errors, [type]: null }
	},

	/**
	 * Set the search term for a type.
	 *
	 * @param {string} type The type slug
	 * @param {string} term The search term
	 */
	setSearchTerm(type, term) {
		this.searchTerms = { ...this.searchTerms, [type]: term }
	},

	/**
	 * Clear the search term for a type.
	 *
	 * @param {string} type The type slug
	 */
	clearSearchTerm(type) {
		this.searchTerms = { ...this.searchTerms, [type]: '' }
	},

	/**
	 * Fetch the schema definition for a registered type.
	 * Uses cache — only fetches once per type per session.
	 *
	 * @param {string} type The registered type slug
	 * @return {Promise<object|null>} The schema object or null on error
	 */
	async fetchSchema(type) {
		const config = this._getTypeConfig(type)

		if (this.schemas[type]) {
			return this.schemas[type]
		}

		try {
			const response = await fetch(
				prefixUrl(`/apps/openregister/api/schemas/${config.schema}`),
				{ method: 'GET', headers: buildHeaders() },
			)

			if (!response.ok) return null

			const schema = await response.json()
			this.schemas = { ...this.schemas, [type]: schema }
			return schema
		} catch {
			return null
		}
	},

	/**
	 * Fetch the register definition for a registered type.
	 * Uses cache — only fetches once per type per session.
	 *
	 * @param {string} type The registered type slug
	 * @return {Promise<object|null>} The register object or null on error
	 */
	async fetchRegister(type) {
		const config = this._getTypeConfig(type)

		if (this.registers[type]) {
			return this.registers[type]
		}

		try {
			const response = await fetch(
				prefixUrl(`/apps/openregister/api/registers/${config.register}`),
				{ method: 'GET', headers: buildHeaders() },
			)

			if (!response.ok) return null

			const register = await response.json()
			this.registers = { ...this.registers, [type]: register }
			return register
		} catch {
			return null
		}
	},

	/**
	 * Fetch a collection of objects for a registered type.
	 *
	 * @param {string} type The registered type slug
	 * @param {object} [params] Query parameters (_limit, _page, _search, _order, filters)
	 * @return {Promise<Array>} The fetched collection (also stored in state)
	 */
	async fetchCollection(type, params = {}) {
		this.loading = { ...this.loading, [type]: true }
		this.errors = { ...this.errors, [type]: null }

		try {
			// Auto-include _facets=extend when schema has facetable properties
			const fetchParams = { ...params }
			if (!fetchParams._facets) {
				const schema = this.schemas[type]
				const hasFacetable = schema
					&& schema.properties
					&& Object.values(schema.properties).some((p) => p.facetable)
				if (hasFacetable) {
					fetchParams._facets = 'extend'
				}
			}

			const url = this._buildUrl(type) + buildQueryString(fetchParams)

			const response = await fetch(url, {
				method: 'GET',
				headers: buildHeaders(),
			})

			if (!response.ok) {
				this.errors = { ...this.errors, [type]: await parseResponseError(response, type) }
				console.error(`Error fetching ${type} collection:`, this.errors[type])
				return []
			}

			const data = await response.json()
			const results = data.results || data

			this.collections = { ...this.collections, [type]: results }
			this.pagination = {
				...this.pagination,
				[type]: {
					total: data.total || results.length,
					page: data.page || 1,
					pages: data.pages || 1,
					limit: params._limit || 20,
				},
			}

			// Parse facet data from API response and transform to CnIndexSidebar format
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
				this.facets = { ...this.facets, [type]: transformed }
			}

			return results
		} catch (error) {
			this.errors = {
				...this.errors,
				[type]: error.name === 'TypeError'
					? networkError(error)
					: genericError(error),
			}
			console.error(`Error fetching ${type} collection:`, error)
			return []
		} finally {
			this.loading = { ...this.loading, [type]: false }
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
		this.loading = { ...this.loading, [type]: true }
		this.errors = { ...this.errors, [type]: null }

		try {
			const url = this._buildUrl(type, id)

			const response = await fetch(url, {
				method: 'GET',
				headers: buildHeaders(),
			})

			if (!response.ok) {
				this.errors = { ...this.errors, [type]: await parseResponseError(response, type) }
				console.error(`Error fetching ${type}/${id}:`, this.errors[type])
				return null
			}

			const data = await response.json()

			this.objects = {
				...this.objects,
				[type]: { ...(this.objects[type] || {}), [id]: data },
			}

			return data
		} catch (error) {
			this.errors = {
				...this.errors,
				[type]: error.name === 'TypeError'
					? networkError(error)
					: genericError(error),
			}
			console.error(`Error fetching ${type}/${id}:`, error)
			return null
		} finally {
			this.loading = { ...this.loading, [type]: false }
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
		this.loading = { ...this.loading, [type]: true }
		this.errors = { ...this.errors, [type]: null }

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
				this.errors = { ...this.errors, [type]: await parseResponseError(response, type) }
				console.error(`Error saving ${type}:`, this.errors[type])
				return null
			}

			const data = await response.json()
			const savedId = data.id || objectData.id

			this.objects = {
				...this.objects,
				[type]: { ...(this.objects[type] || {}), [savedId]: data },
			}

			return data
		} catch (error) {
			this.errors = {
				...this.errors,
				[type]: error.name === 'TypeError'
					? networkError(error)
					: genericError(error),
			}
			console.error(`Error saving ${type}:`, error)
			return null
		} finally {
			this.loading = { ...this.loading, [type]: false }
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
		this.loading = { ...this.loading, [type]: true }
		this.errors = { ...this.errors, [type]: null }

		try {
			const url = this._buildUrl(type, id)

			const response = await fetch(url, {
				method: 'DELETE',
				headers: buildHeaders(),
			})

			if (!response.ok) {
				this.errors = { ...this.errors, [type]: await parseResponseError(response, type) }
				console.error(`Error deleting ${type}/${id}:`, this.errors[type])
				return false
			}

			if (this.objects[type]) {
				const { [id]: _, ...remaining } = this.objects[type]
				this.objects = { ...this.objects, [type]: remaining }
			}
			if (this.collections[type]) {
				this.collections = {
					...this.collections,
					[type]: this.collections[type].filter((obj) => obj.id !== id),
				}
			}

			return true
		} catch (error) {
			this.errors = {
				...this.errors,
				[type]: error.name === 'TypeError'
					? networkError(error)
					: genericError(error),
			}
			console.error(`Error deleting ${type}/${id}:`, error)
			return false
		} finally {
			this.loading = { ...this.loading, [type]: false }
		}
	},

	/**
	 * Delete multiple objects by type and IDs in parallel.
	 * Each delete is run via Promise.all; partial success is reported so the UI can show which succeeded or failed.
	 *
	 * @param {string} type The registered type slug
	 * @param {string[]} ids Array of object IDs to delete
	 * @return {Promise<{ successfulIds: string[], failedIds: string[] }>} Result with successful and failed IDs
	 */
	async deleteObjects(type, ids) {
		const result = { successfulIds: [], failedIds: [] }
		if (!ids?.length) return result

		this.loading = { ...this.loading, [type]: true }
		this.errors = { ...this.errors, [type]: null }

		try {
			const runOne = async (id) => {
				try {
					const url = this._buildUrl(type, id)
					const response = await fetch(url, {
						method: 'DELETE',
						headers: buildHeaders(),
					})
					return { id, success: response.ok }
				} catch (error) {
					console.error(`Error deleting ${type}/${id}:`, error)
					return { id, success: false }
				}
			}

			const outcomes = await Promise.all(ids.map(runOne))
			for (const { id, success } of outcomes) {
				if (success) result.successfulIds.push(id)
				else result.failedIds.push(id)
			}

			if (result.successfulIds.length > 0) {
				const successSet = new Set(result.successfulIds)
				if (this.objects[type]) {
					const remaining = {}
					for (const [k, v] of Object.entries(this.objects[type])) {
						if (!successSet.has(k)) remaining[k] = v
					}
					this.objects = { ...this.objects, [type]: remaining }
				}
				if (this.collections[type]) {
					this.collections = {
						...this.collections,
						[type]: this.collections[type].filter((obj) => !successSet.has(obj.id)),
					}
				}
			}

			if (result.failedIds.length > 0) {
				this.errors = {
					...this.errors,
					[type]: genericError(new Error(`Failed to delete ${result.failedIds.length} item(s)`)),
				}
			}

			return result
		} finally {
			this.loading = { ...this.loading, [type]: false }
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
						this.objects = {
							...this.objects,
							[type]: { ...(this.objects[type] || {}), [id]: data },
						}
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
 * @param {Array} [plugins] Array of plugin definitions
 * @param {string} [baseUrl] Base API URL override
 * @return {Function} Pinia store composable
 */
function defineObjectStore(storeId, plugins = [], baseUrl = DEFAULT_BASE_URL) {
	const pluginState = mergePluginState(plugins)
	const pluginGetters = mergePluginGetters(plugins)
	const pluginActions = mergePluginActions(plugins)

	return defineStore(storeId, {
		state: () => ({
			...baseState(baseUrl),
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
 * Internal reference to the active object store composable.
 * Updated by createObjectStore() so that useObjectStore() and all
 * composables (useListView, useDetailView) always use the app's store.
 * @private
 */
let _activeStore = defineObjectStore(DEFAULT_STORE_ID)

/**
 * Returns the active object store instance.
 *
 * By default this is a bare store with ID 'conduction-objects'.
 * When an app calls createObjectStore() (with or without plugins),
 * useObjectStore is automatically updated to return that store instead.
 * This means composables like useListView and useDetailView always use
 * the app's configured store — no custom wiring needed.
 *
 * @example
 * import { useObjectStore } from '@conduction/nextcloud-vue'
 * const store = useObjectStore()
 *
 * @return {object} Pinia store instance
 */
export function useObjectStore(pinia) {
	return _activeStore(pinia)
}

/**
 * Factory function to create an object store with plugins for sub-resources.
 *
 * The created store automatically becomes the active store used by
 * useObjectStore() and all composables (useListView, useDetailView).
 * Apps should call this once at startup — typically in their store module.
 *
 * @param {string} storeId Pinia store identifier (use any unique ID per app)
 * @param {object} [options] Configuration options
 * @param {Array} [options.plugins] Array of sub-resource plugins
 * @param {string} [options.baseUrl] Base API URL override
 * @return {Function} Pinia store composable
 *
 * @example
 * // In src/store/modules/object.js
 * import { createObjectStore, filesPlugin, auditTrailsPlugin } from '@conduction/nextcloud-vue'
 * export const useObjectStore = createObjectStore('object', {
 *   plugins: [filesPlugin(), auditTrailsPlugin()],
 * })
 */
export function createObjectStore(storeId, options = {}) {
	const store = defineObjectStore(storeId, options.plugins || [], options.baseUrl || prefixUrl(DEFAULT_BASE_URL))
	_activeStore = store
	return store
}
