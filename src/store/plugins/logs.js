import { genericError, networkError, parseResponseError } from '../../utils/errors.js'
import { buildHeaders, buildQueryString } from '../../utils/headers.js'

/**
 * Logs sub-resource plugin for createCrudStore.
 *
 * Many apps expose a logs collection keyed off the parent resource ID, via a
 * flat endpoint like `/sources/logs?source_id=<id>`. This plugin generates the
 * standard state, getters, and actions for that pattern so consumer stores
 * don't have to re-implement the same fetch/refresh logic.
 *
 * **Contributed state**
 * - `logs` — last fetched response (raw array or `{ results, ... }` shape)
 * - `logsLoading` — per-store loading flag
 * - `logsError` — last error (`ApiError` or null)
 *
 * **Contributed getters**
 * - `getLogs`, `isLogsLoading`, `getLogsError`
 *
 * **Contributed actions**
 * - `refreshLogs(filters?)` — fetch and store; returns `{ response, data }`
 * - `setLogs(data)` — replace state directly
 * - `clearLogs()` — reset to empty
 *
 * When `autoRefreshOnItemChange: true`, the plugin registers a
 * `store.$onAction` subscriber in its `setup` hook that observes `setItem`
 * and triggers `refreshLogs()` / `clearLogs()` after the action resolves.
 * This composes cleanly with other plugins that also want to observe
 * `setItem` — none of them have to override the action.
 *
 * **URL construction**
 * - `this._options.baseApiUrl + '/' + path` → e.g. `/sources/logs`
 * - Query params: `{ [parentIdParam]: item.id, ...defaultSort, ...filters }` —
 *   caller-supplied filters always win.
 *
 * @param {object} options Plugin options
 * @param {string} options.parentIdParam Required. Query param name carrying the
 *   parent resource's id — e.g. `'source_id'` for a sources store.
 * @param {string} [options.path] Path segment appended to the store's base API
 *   URL. Default: `'logs'`.
 * @param {object} [options.defaultSort] Default query params merged before
 *   user filters. Default: `{ '_sort[created]': 'desc' }`.
 * @param {boolean} [options.autoRefreshOnItemChange] When true, overrides
 *   `setItem` so selecting a new item automatically refreshes logs. Default:
 *   `false`.
 * @return {object} Plugin definition consumed by `createCrudStore`.
 *
 * @example
 * import { createCrudStore, logsPlugin } from '@conduction/nextcloud-vue'
 *
 * export const useSourceStore = createCrudStore('source', {
 *     endpoint: 'sources',
 *     entity: Source,
 *     plugins: [logsPlugin({ parentIdParam: 'source_id', autoRefreshOnItemChange: true })],
 * })
 *
 * // Later
 * const store = useSourceStore()
 * await store.refreshLogs({ '_limit': 50 })
 * console.log(store.logs, store.logsLoading)
 */
export function logsPlugin(options = {}) {
	const {
		parentIdParam,
		path = 'logs',
		defaultSort = { '_sort[created]': 'desc' },
		autoRefreshOnItemChange = false,
	} = options

	if (!parentIdParam) {
		throw new Error('logsPlugin: options.parentIdParam is required')
	}

	const actions = {
		/**
		 * Fetch logs for the current item from the logs endpoint.
		 *
		 * @param {object} [filters] Extra query params (override defaults).
		 * @return {Promise<{ response: Response, data: unknown }>}
		 */
		async refreshLogs(filters = {}) {
			this.logsLoading = true
			this.logsError = null

			try {
				const params = { ...defaultSort }
				if (!(parentIdParam in filters) && this.item?.id !== null && this.item?.id !== undefined) {
					params[parentIdParam] = String(this.item.id)
				}
				Object.assign(params, filters)

				const url = this._options.baseApiUrl + '/' + path + buildQueryString(params)
				const response = await fetch(url, {
					method: 'GET',
					headers: buildHeaders(),
				})

				if (!response.ok) {
					this.logsError = await parseResponseError(response, 'logs')
					return { response, data: null }
				}

				const data = await response.json()
				this.logs = data
				return { response, data }
			} catch (error) {
				this.logsError = error?.name === 'TypeError'
					? networkError(error)
					: genericError(error)
				throw error
			} finally {
				this.logsLoading = false
			}
		},

		/**
		 * Replace the logs state directly (e.g. when a parent action returned
		 * logs as a side effect).
		 *
		 * @param {unknown} data Response data (array or `{ results, ... }`).
		 */
		setLogs(data) {
			this.logs = data
		},

		/**
		 * Reset logs state back to empty defaults.
		 */
		clearLogs() {
			this.logs = []
			this.logsLoading = false
			this.logsError = null
		},
	}

	const plugin = {
		name: 'logs',

		state: () => ({
			logs: [],
			logsLoading: false,
			logsError: null,
		}),

		getters: {
			getLogs: (state) => state.logs,
			isLogsLoading: (state) => state.logsLoading,
			getLogsError: (state) => state.logsError,
		},

		actions,
	}

	if (autoRefreshOnItemChange) {
		plugin.setup = function setup(store) {
			store.$onAction(({ name, after }) => {
				if (name !== 'setItem') return
				after(() => {
					if (store.item?.id !== null && store.item?.id !== undefined) {
						store.refreshLogs().catch((error) => {
							console.error('logsPlugin: auto-refresh failed:', error)
						})
					} else {
						store.clearLogs()
					}
				})
			})
		}
	}

	return plugin
}
