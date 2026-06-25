import { defineStore } from 'pinia'
import { buildHeaders, buildQueryString, prefixUrl, capitalize } from '../utils/headers.js'
import { parseResponseError, networkError, genericError } from '../utils/errors.js'
import { extractId } from '../utils/id.js'
import { mergePluginState, mergePluginGetters, mergePluginActions } from './pluginMerge.js'

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

// Coalesces concurrent identical fetch-by-id requests into a single network
// call: callers asking for an object already in flight share the pending
// promise instead of firing a duplicate request. The entry clears once the
// request settles. Module-scoped (not reactive state) so it never triggers
// re-renders.
//
// The key is `${storeId}::${type}::${id}`, NOT the URL alone: the resolved
// store write target is `objects[type][id]` on a specific store instance, and
// each `_requestObject` writes only its own store. Coalescing across different
// stores (e.g. the library default store vs an app's own createObjectStore)
// or different type slugs would let one caller's request satisfy another whose
// cache then never gets written — leaving that store's `objects[type][id]`
// empty. Keying by (store, type, id) dedupes only truly-identical operations.
const _inflightObjectFetches = new Map()

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
		/** @type {{baseUrl: string, organisationUuidGetter: Function|null, languageGetter: Function|null, targetLanguageGetter: Function|null}} */
		_options: {
			baseUrl,
			organisationUuidGetter: null,
			languageGetter: null,
			targetLanguageGetter: null,
		},
		/**
		 * Active tenant UUID — written by `setActiveTenantOrganisation()`
		 * and read by `_resolveOrganisationUuid()` when no
		 * `organisationUuidGetter` was passed to the factory.
		 * `null` means "no tenant header on outgoing requests".
		 *
		 * @type {string|null}
		 */
		activeTenantOrganisationUuid: null,
	}
}

// ── Base getters ────────────────────────────────────────────────────────

const baseGetters = {
	/**
	 * Get all registered object type slugs.
	 * @param {object} state Pinia state
	 * @return {string[]}
	 */
	objectTypes: (state) => Object.keys(state.objectTypeRegistry),

	/**
	 * Get the collection array for a type.
	 * @param {object} state Pinia state
	 * @return {Function} (type: string) => Array
	 */
	getCollection: (state) => (type) => state.collections[type] || [],

	/**
	 * Get a single cached object by type and ID.
	 * @param {object} state Pinia state
	 * @return {Function} (type: string, id: string) => object|null
	 */
	getObject: (state) => (type, id) => state.objects[type]?.[id] || null,

	/**
	 * Alias for getObject — check cache without fetching.
	 * @param {object} state Pinia state
	 * @return {Function} (type: string, id: string) => object|null
	 */
	getCachedObject: (state) => (type, id) => state.objects[type]?.[id] || null,

	/**
	 * Check if a type is currently loading.
	 * @param {object} state Pinia state
	 * @return {Function} (type: string) => boolean
	 */
	isLoading: (state) => (type) => state.loading[type] || false,

	/**
	 * Get the current error for a type.
	 * @param {object} state Pinia state
	 * @return {Function} (type: string) => ApiError|null
	 */
	getError: (state) => (type) => state.errors[type] || null,

	/**
	 * Get pagination state for a type.
	 * @param {object} state Pinia state
	 * @return {Function} (type: string) => {total, page, pages, limit}
	 */
	getPagination: (state) => (type) =>
		state.pagination[type] || { total: 0, page: 1, pages: 1, limit: 20 },

	/**
	 * Get the current search term for a type.
	 * @param {object} state Pinia state
	 * @return {Function} (type: string) => string
	 */
	getSearchTerm: (state) => (type) => state.searchTerms[type] || '',

	/**
	 * Get a cached schema for a type.
	 * @param {object} state Pinia state
	 * @return {Function} (type: string) => object|null
	 */
	getSchema: (state) => (type) => state.schemas[type] || null,

	/**
	 * Get a cached register for a type.
	 * @param {object} state Pinia state
	 * @return {Function} (type: string) => object|null
	 */
	getRegister: (state) => (type) => state.registers[type] || null,

	/**
	 * Get facet data for a type (CnIndexSidebar-compatible format).
	 * @param {object} state Pinia state
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
	 * The optional fourth argument allows callers to supply canonical OR slugs
	 * at registration time, avoiding a lazy fetch on first `subscribe()` call.
	 * Omitting it is fully back-compatible — slugs default to `null` and are
	 * lazily resolved by liveUpdatesPlugin when needed.
	 *
	 * @param {string} slug Short name for the type (e.g. 'client', 'case')
	 * @param {string} schemaId OpenRegister schema ID
	 * @param {string} registerId OpenRegister register ID
	 * @param {object} [slugs] Optional slug hints for live-updates transport
	 * @param {string|null} [slugs.registerSlug] Canonical register slug (e.g. 'zaken')
	 * @param {string|null} [slugs.schemaSlug]   Canonical schema slug (e.g. 'meldingen')
	 */
	registerObjectType(slug, schemaId, registerId, slugs = {}) {
		const { registerSlug = null, schemaSlug = null } = slugs
		// Replace entire objects so Vue 2 reactivity detects the change
		// (Vue 2 cannot track new properties added to existing reactive objects)
		this.objectTypeRegistry = {
			...this.objectTypeRegistry,
			[slug]: {
				schema: schemaId,
				register: registerId,
				registerSlug,
				schemaSlug,
			},
		}
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
		const omit = (obj, key) => {
			const { [key]: _, ...rest } = obj
			return rest
		}
		this.objectTypeRegistry = omit(this.objectTypeRegistry, slug)
		this.collections = omit(this.collections, slug)
		this.objects = omit(this.objects, slug)
		this.loading = omit(this.loading, slug)
		this.errors = omit(this.errors, slug)
		this.pagination = omit(this.pagination, slug)
		this.searchTerms = omit(this.searchTerms, slug)
		this.schemas = omit(this.schemas, slug)
		this.registers = omit(this.registers, slug)
		this.facets = omit(this.facets, slug)
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
	 * Resolve the active organisation UUID for the next outgoing request.
	 *
	 * Resolution order (multi-tenancy-context):
	 *   1. `_options.organisationUuidGetter()` — when set at store init.
	 *   2. `activeTenantOrganisationUuid` — written by `setActiveTenantOrganisation`.
	 *   3. `null` — no tenant header is stamped.
	 *
	 * Errors thrown by a custom getter are caught and downgraded to
	 * `null` so a buggy getter never breaks an outbound request.
	 *
	 * @return {string|null}
	 */
	_resolveOrganisationUuid() {
		const getter = this._options.organisationUuidGetter
		if (typeof getter === 'function') {
			try {
				const v = getter()
				return typeof v === 'string' && v.length > 0 ? v : null
			} catch {
				return null
			}
		}
		return this.activeTenantOrganisationUuid || null
	},

	/**
	 * Resolve the active read-side language for the next outgoing request.
	 *
	 * Wired via `createObjectStore(id, { languageGetter })`. When set, the
	 * resolved value is appended to read URLs as `?_lang=<value>` so OR's
	 * `i18n-api-language-negotiation` contract returns the localised
	 * projection. A null/empty getter return — or a throwing getter — is
	 * downgraded to `null` and the query parameter is skipped.
	 *
	 * @return {string|null}
	 */
	_resolveLanguage() {
		const getter = this._options.languageGetter
		if (typeof getter !== 'function') return null
		try {
			const v = getter()
			return typeof v === 'string' && v.length > 0 ? v : null
		} catch {
			return null
		}
	},

	/**
	 * Resolve the active write-side target language for the next outgoing
	 * request.
	 *
	 * Wired via `createObjectStore(id, { targetLanguageGetter })`. When set,
	 * the resolved value is stamped on writes as
	 * `X-Translation-Target-Language: <value>` so OR's `i18n-source-of-truth`
	 * contract authors the payload into `_translations[<value>]` instead
	 * of overwriting the canonical source row. A null/empty return — or a
	 * throwing getter — is downgraded to `null` and the header is skipped.
	 *
	 * @return {string|null}
	 */
	_resolveTargetLanguage() {
		const getter = this._options.targetLanguageGetter
		if (typeof getter !== 'function') return null
		try {
			const v = getter()
			return typeof v === 'string' && v.length > 0 ? v : null
		} catch {
			return null
		}
	},

	/**
	 * Build outbound headers stamped with the active tenant UUID, if any,
	 * and the active write-side target language, if any.
	 * Plugins MUST call this helper (not the bare `buildHeaders()` import)
	 * so a single store instance stamps the same UUID + target language on
	 * every request.
	 *
	 * @param {string} [contentType] Content-Type header value
	 * @return {object} Headers object for use with fetch()
	 */
	_buildHeaders(contentType = 'application/json') {
		return buildHeaders({
			contentType,
			organisationUuid: this._resolveOrganisationUuid() || undefined,
			targetLanguage: this._resolveTargetLanguage() || undefined,
		})
	},

	/**
	 * Set the active tenant organisation. Stamps `X-OpenRegister-Organisation`
	 * on every subsequent outgoing request and clears the in-memory
	 * `collections` + `objects` caches so a re-fetch hits the new tenant.
	 *
	 * No-op when the new UUID equals the currently-active one.
	 *
	 * @param {string|null} uuid The new tenant UUID
	 */
	setActiveTenantOrganisation(uuid) {
		const next = (typeof uuid === 'string' && uuid.length > 0) ? uuid : null
		if (this.activeTenantOrganisationUuid === next) return

		this.activeTenantOrganisationUuid = next

		// Cache reset — by tenant the same object slug can refer to a
		// completely different row set, so old cache entries are wrong.
		this.collections = {}
		this.objects = {}
		this.facets = {}
		this.pagination = {}
		// Errors + loading flags are per-fetch and don't need a reset.
	},

	/**
	 * Build the API URL for a type and optional object ID.
	 *
	 * When a `languageGetter` is wired and returns a non-empty string the
	 * URL stamps `?_lang=<value>` so OR returns the localised projection
	 * per the `i18n-api-language-negotiation` contract. Callers that
	 * subsequently append their own `buildQueryString(params)` MUST use
	 * `_buildUrlWithParams(type, params, id)` instead so the two query
	 * strings reconcile cleanly.
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
		const lang = this._resolveLanguage()
		if (lang) {
			url += buildQueryString({ _lang: lang })
		}
		return url
	},

	/**
	 * Build the API URL for a type, an optional object ID, and an extra
	 * params object that's already destined for `buildQueryString`. The
	 * helper merges the active `languageGetter` value (when set) into the
	 * params bag so the two query strings produce a single, well-formed
	 * URL (instead of duplicating `?_lang=`).
	 *
	 * @param {string} type The type slug
	 * @param {object} [params] Extra query parameters
	 * @param {string|null} [id] Optional object ID
	 * @return {string} Full API URL path including query string
	 */
	_buildUrlWithParams(type, params = {}, id = null) {
		const config = this._getTypeConfig(type)
		let url = `${this._options.baseUrl}/${config.register}/${config.schema}`
		if (id) {
			url += `/${id}`
		}
		const lang = this._resolveLanguage()
		const merged = lang ? { ...params, _lang: lang } : params
		url += buildQueryString(merged)
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
				{ method: 'GET', headers: this._buildHeaders() },
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
				{ method: 'GET', headers: this._buildHeaders() },
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

			const url = this._buildUrlWithParams(type, fetchParams)

			const response = await fetch(url, {
				method: 'GET',
				headers: this._buildHeaders(),
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
		const url = this._buildUrl(type, id)
		// Share a single in-flight request across concurrent callers asking
		// for the same object on this store, instead of firing a duplicate
		// network call. Scoped to (store, type, id) so it never starves a
		// different store's cache — see `_inflightObjectFetches` above.
		const key = `${this.$id}::${type}::${id}`
		const existing = _inflightObjectFetches.get(key)
		if (existing) {
			return existing
		}
		const request = this._requestObject(type, id, url)
		_inflightObjectFetches.set(key, request)
		try {
			return await request
		} finally {
			_inflightObjectFetches.delete(key)
		}
	},

	/**
	 * Perform the actual fetch-by-id network request and cache the result.
	 * Wrapped by `fetchObject`, which de-duplicates concurrent calls.
	 *
	 * @param {string} type The registered type slug
	 * @param {string} id The object id
	 * @param {string} url The pre-built request URL
	 * @return {Promise<object|null>} The object or null on error
	 */
	async _requestObject(type, id, url) {
		this.loading = { ...this.loading, [type]: true }
		this.errors = { ...this.errors, [type]: null }

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: this._buildHeaders(),
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
				headers: this._buildHeaders(),
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
				headers: this._buildHeaders(),
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
						headers: this._buildHeaders(),
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
	 * @return {Promise<{[key: string]: object}>} Map of id -> object
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
						headers: this._buildHeaders(),
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
function defineObjectStore(storeId, plugins = [], baseUrl = DEFAULT_BASE_URL, extraOptions = {}) {
	const pluginState = mergePluginState(plugins)
	const pluginGetters = mergePluginGetters(plugins)
	const pluginActions = mergePluginActions(plugins)
	const setupPlugins = plugins.filter((p) => typeof p.setup === 'function')
	const initialized = new WeakSet()
	const factoryOrganisationUuidGetter = typeof extraOptions.organisationUuidGetter === 'function'
		? extraOptions.organisationUuidGetter
		: null
	const factoryLanguageGetter = typeof extraOptions.languageGetter === 'function'
		? extraOptions.languageGetter
		: null
	const factoryTargetLanguageGetter = typeof extraOptions.targetLanguageGetter === 'function'
		? extraOptions.targetLanguageGetter
		: null

	const useStore = defineStore(storeId, {
		state: () => {
			const base = baseState(baseUrl)
			if (factoryOrganisationUuidGetter) {
				base._options.organisationUuidGetter = factoryOrganisationUuidGetter
			}
			if (factoryLanguageGetter) {
				base._options.languageGetter = factoryLanguageGetter
			}
			if (factoryTargetLanguageGetter) {
				base._options.targetLanguageGetter = factoryTargetLanguageGetter
			}
			return {
				...base,
				...pluginState,
			}
		},

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

	if (setupPlugins.length === 0) {
		return useStore
	}

	return function useObjectStoreWithSetup(pinia) {
		const store = useStore(pinia)
		if (!initialized.has(store)) {
			initialized.add(store)
			for (const plugin of setupPlugins) {
				plugin.setup(store)
			}
		}
		return store
	}
}

/**
 * Default object store instance with ID 'conduction-objects'.
 *
 * @example
 * import { useObjectStore } from '@conduction/nextcloud-vue'
 * const store = useObjectStore()
 */
export const useObjectStore = defineObjectStore(DEFAULT_STORE_ID, [], prefixUrl(DEFAULT_BASE_URL))

/**
 * Factory function to create an object store with a custom Pinia store ID
 * and optional plugins for sub-resources.
 *
 * @param {string} storeId Custom Pinia store identifier
 * @param {object} [options] Configuration options
 * @param {Array} [options.plugins] Array of sub-resource plugins
 * @param {string} [options.baseUrl] Base API URL override
 * @param {Function} [options.organisationUuidGetter] `() => string|null` — when set, every
 *   request stamps `X-OpenRegister-Organisation: <uuid>` for multi-tenancy.
 *   See the `multi-tenancy-context` change.
 * @param {Function} [options.languageGetter] `() => string|null` — when set, every read URL
 *   stamps `?_lang=<bcp47>` so OR returns the localised projection per the
 *   `i18n-api-language-negotiation` contract. Returning `null` or an empty
 *   string skips the parameter. A throwing getter is downgraded to `null`.
 *   See the `i18n-language-negotiation-getters` change.
 * @param {Function} [options.targetLanguageGetter] `() => string|null` — when set, every
 *   write request stamps `X-Translation-Target-Language: <bcp47>` so OR
 *   authors the payload into `_translations[<bcp47>]` instead of overwriting
 *   the canonical source row, per the `i18n-source-of-truth` contract.
 *   Returning `null` or an empty string skips the header. A throwing getter
 *   is downgraded to `null`.
 *   See the `i18n-language-negotiation-getters` change.
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
 *
 * @example
 * // With custom baseUrl
 * const useMyStore = createObjectStore('object', {
 *   baseUrl: '/apps/myapp/api/objects',
 * })
 *
 * @example
 * // With i18n language negotiation (i18n-language-negotiation-getters)
 * import { useUserLanguage } from './composables/useUserLanguage.js'
 * const userLang = useUserLanguage()
 * const useMyStore = createObjectStore('object', {
 *   languageGetter:       () => userLang.value, // read stamps ?_lang=
 *   targetLanguageGetter: () => userLang.value, // write stamps X-Translation-Target-Language
 * })
 */
export function createObjectStore(storeId, options = {}) {
	return defineObjectStore(
		storeId,
		options.plugins || [],
		options.baseUrl || prefixUrl(DEFAULT_BASE_URL),
		{
			organisationUuidGetter: options.organisationUuidGetter || null,
			languageGetter: options.languageGetter || null,
			targetLanguageGetter: options.targetLanguageGetter || null,
		},
	)
}
