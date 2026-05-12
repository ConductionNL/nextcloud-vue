/**
 * Pluggable integration registry — JS surface.
 *
 * Provides the runtime that consuming apps use to register integration
 * tabs and widgets. The registry is reactive: subscribers via
 * `onChange()` are notified whenever a provider is registered or
 * unregistered, so list views (CnObjectSidebar, CnDashboardPage,
 * CnDetailPage) update without manual refresh.
 *
 * Per design.md (AD-13 collision policy, AD-19 surface fallback):
 *   - tab + widget are REQUIRED at registration; missing throws
 *   - duplicate id throws in dev, warns + keeps first in prod
 *   - widgetCompact / widgetExpanded / widgetEntity are optional
 *   - surfaces without a dedicated widget fall back to `widget`
 *
 * The OpenRegister app's main bundle attaches a singleton to
 * `window.OCA.OpenRegister.integrations`. Consuming apps load after
 * and call `register(...)`; if they load before, the shim queues
 * calls and replays them when the real registry initialises.
 *
 * @module integrations/registry
 */

const DEV = process.env.NODE_ENV !== 'production'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * Create a fresh integration registry instance.
 *
 * Most callers want the default singleton exported as `integrations` —
 * use this factory only when you need an isolated registry (e.g. in
 * unit tests) so registrations don't leak across cases.
 *
 * @return {object} Registry API.
 */
export function createIntegrationRegistry() {
	const providers = new Map()
	const listeners = new Set()

	function notify() {
		const snapshot = list()
		for (const fn of listeners) {
			try {
				fn(snapshot)
			} catch (e) {
				// One bad subscriber shouldn't take down the rest of
				// the chain. Surface in dev so it gets noticed.
				if (DEV) {
					// eslint-disable-next-line no-console
					console.error('[integrations] onChange subscriber threw', e)
				}
			}
		}
	}

	/**
	 * Register an integration. Returns the registered descriptor on
	 * success; returns `null` (and warns) on collision in production.
	 *
	 * @param {object} entry Integration descriptor — see design.md.
	 * @param {string} entry.id Stable provider id (matches PHP-side).
	 * @param {string} entry.label Human-readable label (already translated).
	 * @param {string} [entry.icon] MDI icon name.
	 * @param {string} [entry.requiredApp] Required Nextcloud app id.
	 * @param {number} [entry.order] Numeric ordering hint (default 100).
	 * @param {?string} [entry.group] Named group (core/comms/docs/workflow/external).
	 * @param {?string} [entry.requiresPermission] Permission string.
	 * @param {?string} [entry.referenceType] Marker for schema property targeting.
	 * @param {object} entry.tab Vue component for the sidebar tab — REQUIRED.
	 * @param {object} entry.widget Vue component for dashboard/detail surfaces — REQUIRED.
	 * @param {object} [entry.widgetCompact] Override for `user-dashboard` surface.
	 * @param {object} [entry.widgetExpanded] Override for `detail-page` surface.
	 * @param {object} [entry.widgetEntity] Override for `single-entity` surface.
	 * @param {object} [entry.defaultSize] Default grid dimensions `{w, h}`.
	 *
	 * @return {?object} Normalised entry, or null on collision in prod.
	 */
	function register(entry) {
		if (entry === null || typeof entry !== 'object') {
			throw new TypeError('[integrations] register() requires an object descriptor')
		}
		if (typeof entry.id !== 'string' || entry.id === '') {
			throw new TypeError('[integrations] register() requires a non-empty string `id`')
		}
		if (typeof entry.label !== 'string' || entry.label === '') {
			throw new TypeError(`[integrations] integration "${entry.id}" requires a non-empty string \`label\``)
		}
		if (entry.tab === undefined || entry.tab === null) {
			throw new TypeError(`[integrations] integration "${entry.id}" is missing required \`tab\` component`)
		}
		if (entry.widget === undefined || entry.widget === null) {
			throw new TypeError(`[integrations] integration "${entry.id}" is missing required \`widget\` component`)
		}

		if (providers.has(entry.id)) {
			const message = `[integrations] duplicate registration for "${entry.id}" — first call wins`
			if (DEV) {
				throw new Error(message)
			}
			// eslint-disable-next-line no-console
			console.warn(message)
			return null
		}

		const normalised = {
			id: entry.id,
			label: entry.label,
			icon: entry.icon || null,
			requiredApp: entry.requiredApp || null,
			order: typeof entry.order === 'number' ? entry.order : 100,
			group: entry.group || null,
			requiresPermission: entry.requiresPermission || null,
			referenceType: entry.referenceType || null,
			tab: entry.tab,
			widget: entry.widget,
			widgetCompact: entry.widgetCompact || null,
			widgetExpanded: entry.widgetExpanded || null,
			widgetEntity: entry.widgetEntity || null,
			defaultSize: entry.defaultSize || null,
		}
		providers.set(entry.id, normalised)
		notify()
		return normalised
	}

	/**
	 * Remove a previously registered integration.
	 *
	 * @param {string} id Integration id.
	 *
	 * @return {boolean} True if removed.
	 */
	function unregister(id) {
		const removed = providers.delete(id)
		if (removed) {
			notify()
		}
		return removed
	}

	/**
	 * Snapshot of all currently registered integrations, sorted by
	 * `order` ascending then `id` ascending for stable rendering.
	 *
	 * @return {object[]} Array of normalised entries.
	 */
	function list() {
		return Array.from(providers.values()).sort((a, b) => {
			if (a.order !== b.order) {
				return a.order - b.order
			}
			return a.id.localeCompare(b.id)
		})
	}

	/**
	 * Get a single integration by id.
	 *
	 * @param {string} id Integration id.
	 *
	 * @return {?object} The entry, or null if not registered.
	 */
	function get(id) {
		return providers.get(id) || null
	}

	/**
	 * Check whether an id is currently registered.
	 *
	 * @param {string} id Integration id.
	 *
	 * @return {boolean} True if registered.
	 */
	function has(id) {
		return providers.has(id)
	}

	/**
	 * Resolve the widget component for a specific surface, applying
	 * the AD-19 fallback rule: surface-specific override wins, else
	 * the main `widget`.
	 *
	 * @param {string} id Integration id.
	 * @param {string} surface Surface name (see VALID_SURFACES).
	 *
	 * @return {?object} The Vue component, or null when unknown id.
	 */
	function resolveWidget(id, surface) {
		const entry = providers.get(id)
		if (entry === undefined) {
			return null
		}
		if (DEV && !VALID_SURFACES.includes(surface)) {
			// eslint-disable-next-line no-console
			console.warn(`[integrations] unknown surface "${surface}" — falling back to default widget`)
		}
		if (surface === 'user-dashboard' && entry.widgetCompact !== null) {
			return entry.widgetCompact
		}
		if (surface === 'detail-page' && entry.widgetExpanded !== null) {
			return entry.widgetExpanded
		}
		if (surface === 'single-entity' && entry.widgetEntity !== null) {
			return entry.widgetEntity
		}
		return entry.widget
	}

	/**
	 * Subscribe to registry changes. Subscriber receives the current
	 * snapshot on each register/unregister.
	 *
	 * @param {(snapshot: object[]) => void} fn Listener callback.
	 *
	 * @return {() => boolean} Unsubscribe function.
	 */
	function onChange(fn) {
		if (typeof fn !== 'function') {
			throw new TypeError('[integrations] onChange() requires a function')
		}
		listeners.add(fn)
		return () => listeners.delete(fn)
	}

	/**
	 * Test seam: clear all providers and listeners. Not exported on
	 * the public window shim.
	 *
	 * @return {void}
	 */
	function __resetForTests() {
		providers.clear()
		listeners.clear()
	}

	return {
		register,
		unregister,
		list,
		get,
		has,
		resolveWidget,
		onChange,
		__resetForTests,
	}
}

/**
 * Default singleton — call sites that don't need test isolation
 * should import this directly.
 */
export const integrations = createIntegrationRegistry()

/**
 * Install the singleton onto `window.OCA.OpenRegister.integrations`
 * and drain any calls that were queued by a stub before this
 * module loaded.
 *
 * Consuming apps that load before OpenRegister's main bundle install
 * a stub like:
 *
 *     window.OCA = window.OCA || {}
 *     window.OCA.OpenRegister = window.OCA.OpenRegister || {}
 *     window.OCA.OpenRegister.integrations = window.OCA.OpenRegister.integrations || {
 *         _queue: [],
 *         register(entry) { this._queue.push(entry) },
 *     }
 *
 * When the real registry installs, queued entries are replayed in
 * insertion order. This makes bootstrap order forgiving.
 *
 * @param {object} [globalRef] Global to attach to (defaults to `window`; pass an override for tests).
 *
 * @return {object} The installed registry.
 */
export function installIntegrationRegistry(globalRef) {
	const target = globalRef || (typeof window !== 'undefined' ? window : null)
	if (target === null) {
		return integrations
	}
	target.OCA = target.OCA || {}
	target.OCA.OpenRegister = target.OCA.OpenRegister || {}

	const prior = target.OCA.OpenRegister.integrations
	target.OCA.OpenRegister.integrations = integrations

	if (prior !== undefined && Array.isArray(prior._queue) === true) {
		for (const queued of prior._queue) {
			try {
				integrations.register(queued)
			} catch (e) {
				if (DEV) {
					// eslint-disable-next-line no-console
					console.error('[integrations] failed to replay queued registration', queued, e)
				}
			}
		}
	}

	return integrations
}

export { VALID_SURFACES }
