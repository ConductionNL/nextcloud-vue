import { defineStore } from 'pinia'
import { buildHeaders, prefixUrl } from '../utils/headers.js'
import { parseResponseError } from '../utils/errors.js'
import { mergePluginState, mergePluginGetters, mergePluginActions } from './pluginMerge.js'

/**
 * Default fields stripped from items before POST/PUT.
 * @type {string[]}
 */
const DEFAULT_CLEAN_FIELDS = ['id', 'uuid', 'created', 'updated']

/**
 * Default base URL for the API.
 * @type {string}
 */
const DEFAULT_BASE_URL = '/apps/openregister/api'

/**
 * Default list-response parser — extracts the `results` array.
 *
 * Called with the store as `this`, so custom implementations can
 * perform side-effects (e.g. update extra state from the response).
 *
 * @param {object} json Parsed response body
 * @return {Array} The items array for setList
 */
function defaultParseListResponse(json) {
	return json.results
}

/**
 * Create a Pinia store with standard CRUD operations.
 *
 * Generates a store with list/item state, pagination, filters, and
 * async actions for fetching, creating, updating, and deleting items.
 * Domain-specific state, getters, and actions can be added via `extend`.
 *
 * @example
 * // Minimal — pure CRUD
 * import { createCrudStore } from '@conduction/nextcloud-vue'
 * import { Source } from '../../entities/index.js'
 *
 * export const useSourceStore = createCrudStore('source', {
 *   endpoint: 'sources',
 *   entity: Source,
 * })
 *
 * @example
 * // With features and extensions
 * import { createCrudStore } from '@conduction/nextcloud-vue'
 * import { Agent } from '../../entities/index.js'
 *
 * export const useAgentStore = createCrudStore('agent', {
 *   endpoint: 'agents',
 *   entity: Agent,
 *   features: { loading: true, viewMode: true },
 *   extend: {
 *     actions: {
 *       async getStats() {
 *         const response = await fetch(this._options.baseApiUrl + '/stats')
 *         if (!response.ok) throw new Error('HTTP ' + response.status)
 *         return response.json()
 *       },
 *     },
 *   },
 * })
 *
 * @param {string} name Pinia store ID (e.g. 'source', 'agent')
 * @param {object} config Store configuration
 * @param {string} config.endpoint API resource path segment (e.g. 'sources')
 * @param {string} [config.baseUrl] API base URL (before endpoint)
 * @param {Function|null} [config.entity] Entity class constructor for wrapping items, or null for raw data
 * @param {string[]} [config.cleanFields] Fields to strip in cleanForSave
 * @param {object} [config.features] Feature flags to enable optional state/getters/actions
 * @param {boolean} [config.features.loading] Add loading/error state and isLoading/getError getters
 * @param {boolean} [config.features.viewMode] Add viewMode state, getViewMode getter, setViewMode action
 * @param {Function} [config.parseListResponse] Custom response parser for refreshList.
 *   Receives the parsed JSON body with the store instance as `this`.
 *   Must return an array of items. Default: `(json) => json.results`
 * @param {Array} [config.plugins] Array of plugin definitions to merge into the store.
 *   Each plugin is `{ name, state?, getters?, actions? }` — same shape as object-store
 *   plugins. Merge order is base → plugins → extend, so `extend` can still override
 *   anything a plugin provides.
 * @param {object} [config.extend] Extra state/getters/actions to merge into the store
 * @param {Function} [config.extend.state] State factory returning extra state properties
 * @param {object} [config.extend.getters] Extra getters (or overrides of base getters)
 * @param {object} [config.extend.actions] Extra actions (or overrides of base/plugin actions)
 * @return {Function} Pinia store composable (useXxxStore)
 */
export function createCrudStore(name, config = {}) {
	const {
		endpoint,
		baseUrl = DEFAULT_BASE_URL,
		entity: Entity = null,
		cleanFields = DEFAULT_CLEAN_FIELDS,
		features = {},
		parseListResponse = defaultParseListResponse,
		plugins = [],
		extend = {},
	} = config

	if (!endpoint) {
		throw new Error(`createCrudStore("${name}"): config.endpoint is required`)
	}

	const baseApiUrl = prefixUrl(`${baseUrl}/${endpoint}`)

	const pluginState = mergePluginState(plugins)
	const pluginGetters = mergePluginGetters(plugins)
	const pluginActions = mergePluginActions(plugins)
	const setupPlugins = plugins.filter((p) => typeof p.setup === 'function')
	// Track which store instances have already been set up so plugin setup
	// hooks run exactly once per instance, even if useStore() is called many
	// times. WeakSet lets garbage collection reclaim entries when a Pinia
	// instance (and therefore its stores) are discarded — e.g. between tests
	// that call createPinia() afresh.
	const initialized = new WeakSet()

	const useStore = defineStore(name, {
		state: () => ({
			// ── Core state ──
			item: null,
			list: [],
			filters: {},
			pagination: { page: 1, limit: 20 },

			// ── Optional feature state ──
			...(features.loading ? { loading: false, error: null } : {}),
			...(features.viewMode ? { viewMode: 'cards' } : {}),

			// ── Plugin state ──
			...pluginState,

			// ── Internal config (available to extend actions and plugins) ──
			_options: { endpoint, cleanFields, baseApiUrl, entity: Entity },

			// ── Domain-specific state ──
			...(typeof extend.state === 'function' ? extend.state() : {}),
		}),

		getters: {
			// ── Optional feature getters ──
			...(features.viewMode ? { getViewMode: (state) => state.viewMode } : {}),
			...(features.loading
				? {
					isLoading: (state) => state.loading,
					getError: (state) => state.error,
				}
				: {}),

			// ── Plugin getters ──
			...pluginGetters,

			// ── Domain-specific getters ──
			...(extend.getters ?? {}),
		},

		actions: {
			// ── Setters ──

			/**
			 * Set the active item. Wraps in Entity class if configured.
			 * @param {object|null} data Raw item data or null to clear
			 */
			setItem(data) {
				this.item = data
					? (Entity ? new Entity(data) : data)
					: null
			},

			/**
			 * Set the item list. Wraps each item in Entity class if configured.
			 * @param {Array} data Array of raw item objects
			 */
			setList(data) {
				this.list = Entity
					? data.map((item) => new Entity(item))
					: [...data]
			},

			/**
			 * Set pagination parameters.
			 * @param {number} page Current page number
			 * @param {number} [limit] Items per page
			 */
			setPagination(page, limit = 20) {
				this.pagination = { page, limit }
			},

			/**
			 * Merge filter criteria into the current filters.
			 * @param {object} filters Key-value filter pairs to merge
			 */
			setFilters(filters) {
				this.filters = { ...this.filters, ...filters }
			},

			// ── Optional feature actions ──
			...(features.viewMode
				? {
					/**
					 * Set the view mode (e.g. 'cards', 'table').
					 * @param {string} mode View mode identifier
					 */
					setViewMode(mode) {
						this.viewMode = mode
					},
				}
				: {}),

			// ── CRUD actions ──

			/**
			 * Fetch the item list from the API.
			 * @param {string|null} [search] Optional search query
			 * @param {boolean} [soft] If true, don't toggle loading state
			 * @return {Promise<{response: Response, data: Array}>}
			 */
			async refreshList(search = null, soft = false) {
				if (features.loading && !soft) {
					this.loading = true
					this.error = null
				}
				try {
					let url = this._options.baseApiUrl
					if (search) {
						url += '?_search=' + encodeURIComponent(search)
					}
					const response = await fetch(url, {
						method: 'GET',
						headers: buildHeaders(),
					})
					if (!response.ok) {
						throw await parseResponseError(response, name)
					}
					const json = await response.json()
					const data = parseListResponse.call(this, json)
					this.setList(data)
					return { response, data }
				} catch (error) {
					if (features.loading) {
						this.error = error.message ?? error.toString()
					}
					throw error
				} finally {
					if (features.loading && !soft) {
						this.loading = false
					}
				}
			},

			/**
			 * Fetch a single item by ID and set it as the active item.
			 * @param {string|number} id Item ID or UUID
			 * @return {Promise<object>} The fetched item data
			 */
			async getOne(id) {
				if (features.loading) {
					this.loading = true
				}
				try {
					const response = await fetch(`${this._options.baseApiUrl}/${id}`, {
						method: 'GET',
						headers: buildHeaders(),
					})
					if (!response.ok) {
						throw await parseResponseError(response, name)
					}
					const data = await response.json()
					this.setItem(data)
					return data
				} catch (error) {
					if (features.loading) {
						this.error = error.message ?? error.toString()
					}
					throw error
				} finally {
					if (features.loading) {
						this.loading = false
					}
				}
			},

			/**
			 * Delete an item by ID. Refreshes the list and clears the active item.
			 * @param {object} item Item object (must have .id)
			 * @return {Promise<{response: Response}>}
			 */
			async deleteOne(item) {
				if (!item.id) {
					throw new Error(`No ${name} to delete`)
				}
				if (features.loading) {
					this.loading = true
				}
				try {
					const response = await fetch(`${this._options.baseApiUrl}/${item.id}`, {
						method: 'DELETE',
						headers: buildHeaders(),
					})
					if (!response.ok) {
						throw await parseResponseError(response, name)
					}
					await this.refreshList()
					this.setItem(null)
					return { response }
				} catch (error) {
					if (features.loading) {
						this.error = error.message ?? error.toString()
					}
					throw error
				} finally {
					if (features.loading) {
						this.loading = false
					}
				}
			},

			/**
			 * Strip read-only fields from an item before saving.
			 * Uses the `cleanFields` config array. Override in `extend.actions`
			 * for custom cleaning (the configured fields are in `this._options.cleanFields`).
			 * @param {object} item Raw item data
			 * @return {object} Cleaned copy safe for POST/PUT
			 */
			cleanForSave(item) {
				const cleaned = { ...item }
				for (const field of this._options.cleanFields) {
					delete cleaned[field]
				}
				return cleaned
			},

			/**
			 * Create or update an item. Determines method from presence of `.id`.
			 * @param {object} item Item data (without .id = create, with .id = update)
			 * @return {Promise<{response: Response, data: object}>}
			 */
			async save(item) {
				if (!item) {
					throw new Error(`No ${name} to save`)
				}
				if (features.loading) {
					this.loading = true
				}
				const isNew = !item.id
				const url = isNew
					? this._options.baseApiUrl
					: `${this._options.baseApiUrl}/${item.id}`
				const method = isNew ? 'POST' : 'PUT'
				const body = this.cleanForSave(item)

				try {
					const response = await fetch(url, {
						method,
						headers: buildHeaders(),
						body: JSON.stringify(body),
					})
					if (!response.ok) {
						throw await parseResponseError(response, name)
					}
					const responseData = await response.json()
					const data = Entity ? new Entity(responseData) : responseData
					this.setItem(data)
					await this.refreshList()
					return { response, data }
				} catch (error) {
					if (features.loading) {
						this.error = error.message ?? error.toString()
					}
					throw error
				} finally {
					if (features.loading) {
						this.loading = false
					}
				}
			},

			// ── Plugin actions (may override base actions) ──
			...pluginActions,

			// ── Domain-specific actions (may override base/plugin actions) ──
			...(extend.actions ?? {}),
		},
	})

	// When no plugin declares a setup hook, return Pinia's composable
	// directly — zero runtime overhead for the common case.
	if (setupPlugins.length === 0) {
		return useStore
	}

	/**
	 * Wrapped composable: resolves the Pinia store, then runs each plugin's
	 * `setup(store)` exactly once per instance. Plugins typically use the
	 * setup hook to register `store.$onAction` / `store.$subscribe`
	 * subscriptions that observe base or other plugin actions without
	 * overriding them.
	 *
	 * @param {import('pinia').Pinia} [pinia] Optional Pinia instance override
	 * @return {object} The Pinia store instance with all plugin setups applied
	 */
	return function useCrudStore(pinia) {
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
