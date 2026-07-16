import type { CrudPlugin } from '../createCrudStore'

export interface LogsPluginOptions {
	/** Required. Query-param name carrying the active item's id (e.g. 'source_id'). */
	parentIdParam: string
	/** Path segment appended to the store's base API URL. Default: 'logs'. */
	path?: string
	/** Default query params merged before caller-supplied filters. Default: `{ '_sort[created]': 'desc' }`. */
	defaultSort?: Record<string, string>
	/**
	 * When true, the plugin's `setup` hook registers a `store.$onAction`
	 * subscriber that auto-fires `refreshLogs()` after every `setItem` with
	 * an id (or `clearLogs()` when the item is cleared). Composes with other
	 * plugins that observe `setItem`.
	 */
	autoRefreshOnItemChange?: boolean
}

/**
 * Create a logs sub-resource plugin for a `createCrudStore`.
 */
export function logsPlugin(options: LogsPluginOptions): CrudPlugin
