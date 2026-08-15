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
	 * @param {object} [entry.tab] Vue component for the sidebar tab — REQUIRED in `component` mode; optional (same-major fast path) in `mount` mode.
	 * @param {object} [entry.widget] Vue component for dashboard/detail surfaces — REQUIRED in `component` mode; optional (same-major fast path) in `mount` mode.
	 * @param {object} [entry.widgetCompact] Override for `user-dashboard` surface.
	 * @param {object} [entry.widgetExpanded] Override for `detail-page` surface.
	 * @param {object} [entry.widgetEntity] Override for `single-entity` surface.
	 * @param {object} [entry.defaultSize] Default grid dimensions `{w, h}`.
	 * @param {string[]} [entry.surfaces] Explicit surface allowlist; when omitted the integration is eligible for every surface (CnIntegrationWidget contract).
	 * @param {?boolean} [entry.available] Backing-app availability hint (true/false); null when unknown — the widget then resolves availability from the OCS capability / isAppInstalled fallback.
	 * @param {?string} [entry.accentColor] Per-app brand accent hex (e.g. Deck's `#0082c9`) used by CnIntegrationWidget for the tab/header tint. Per-app waves fill these in.
	 * @param {?string} [entry.appName] Human-readable backing-app name for empty-state copy ("{App} not available"); defaults to `label` when omitted.
	 * @param {?string} [entry.docsUrl] Setup-docs URL for the empty state; defaults to `https://openregister.conduction.nl/docs/Integrations/{id}/`.
	 * @param {?object} [entry.offlineConfig] Opaque per-integration config bag forwarded verbatim to the integration's components (e.g. the field-inspection leaf's offline schema/filter config). A consuming app overrides it by pre-registering the same id.
	 * @param {'component'|'mount'} [entry.renderMode] Render strategy (openregister#2127 / ADR-066). `'component'` (default) interprets the SFC `tab`/`widget` under the host's own Vue runtime. `'mount'` hands the leaf a bare host-owned DOM element via `mount`/`unmount`, so a leaf built against a different Vue major than the host renders its own framework instance inside that element.
	 * @param {(el: Element, props: object) => any} [entry.mount] Mount hand-off. Required together with `unmount` when `renderMode` is `'mount'`; the host calls it against a bare element with the same context an SFC widget/tab receives (`{ register, schema, objectId, surface, integrationContext, … }`). May also be supplied alongside an SFC pair as a same-major fast path.
	 * @param {(el: Element) => void} [entry.unmount] Teardown hand-off, called by the host before it removes the element and on surface hide / bound-object change. Travels as a pair with `mount`.
	 *
	 * @return {?object} Normalised entry, or null on collision / malformed mount pair in prod.
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
		// renderMode gates which render pair is required (openregister#2127,
		// ADR-066). `component` (default) keeps the SFC contract — tab +
		// widget interpreted under the host's Vue. `mount` swaps in a
		// mount/unmount DOM hand-off so a cross-Vue-major leaf renders its
		// own framework instance; tab/widget become an optional same-major
		// fast path.
		const renderMode = (entry.renderMode === undefined || entry.renderMode === null)
			? 'component'
			: entry.renderMode
		if (renderMode !== 'component' && renderMode !== 'mount') {
			throw new TypeError(`[integrations] integration "${entry.id}" has invalid \`renderMode\` "${entry.renderMode}" — expected 'component' or 'mount'`)
		}

		const hasMount = typeof entry.mount === 'function'
		const hasUnmount = typeof entry.unmount === 'function'

		// The mount pair travels together — supplying one half without the
		// other is invalid in either render mode. Mirror the AD-13 duplicate
		// policy: throw in dev, warn-and-drop in prod.
		if (hasMount !== hasUnmount) {
			const message = `[integrations] integration "${entry.id}" supplies only one of \`mount\`/\`unmount\` — the mount pair must travel together`
			if (DEV) {
				throw new Error(message)
			}
			// eslint-disable-next-line no-console
			console.warn(message)
			return null
		}

		if (renderMode === 'mount') {
			// mount mode: the mount pair is the render artefact; tab/widget
			// are optional. A missing pair is a malformed descriptor.
			if (hasMount === false) {
				const message = `[integrations] integration "${entry.id}" declares renderMode 'mount' but is missing the \`mount\`/\`unmount\` pair`
				if (DEV) {
					throw new Error(message)
				}
				// eslint-disable-next-line no-console
				console.warn(message)
				return null
			}
		} else {
			// component mode: the SFC pair is required, exactly as before.
			if (entry.tab === undefined || entry.tab === null) {
				throw new TypeError(`[integrations] integration "${entry.id}" is missing required \`tab\` component`)
			}
			if (entry.widget === undefined || entry.widget === null) {
				throw new TypeError(`[integrations] integration "${entry.id}" is missing required \`widget\` component`)
			}
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
			// Render strategy + the mount hand-off pair (openregister#2127).
			// `tab`/`widget` are null when a mount-mode leaf omits the SFC
			// fast path; `mount`/`unmount` are null for component-mode leaves.
			renderMode,
			mount: hasMount ? entry.mount : null,
			unmount: hasUnmount ? entry.unmount : null,
			tab: entry.tab || null,
			widget: entry.widget || null,
			widgetCompact: entry.widgetCompact || null,
			widgetExpanded: entry.widgetExpanded || null,
			widgetEntity: entry.widgetEntity || null,
			defaultSize: entry.defaultSize || null,
			// CnIntegrationWidget contract fields (Phase: integration-widget-framework).
			// `surfaces` stays undefined-as-null so consumers can treat
			// "no allowlist" as "eligible everywhere".
			surfaces: Array.isArray(entry.surfaces) ? entry.surfaces.slice() : null,
			available: typeof entry.available === 'boolean' ? entry.available : null,
			accentColor: typeof entry.accentColor === 'string' && entry.accentColor !== '' ? entry.accentColor : null,
			appName: typeof entry.appName === 'string' && entry.appName !== '' ? entry.appName : entry.label,
			docsUrl: typeof entry.docsUrl === 'string' && entry.docsUrl !== ''
				? entry.docsUrl
				: `https://openregister.conduction.nl/docs/Integrations/${entry.id}/`,
			// Opaque per-integration config bag. The registry does not interpret
			// it — it is forwarded verbatim so an integration's components can
			// read their own settings (e.g. the field-inspection leaf's offline
			// schema/filter config) and a consuming app can override it by
			// pre-registering the same id with its own `offlineConfig`.
			offlineConfig: (entry.offlineConfig && typeof entry.offlineConfig === 'object') ? entry.offlineConfig : null,
			// Marker set by `registerBuiltinIntegrations` /
			// `registerLeafIntegrations` so `useIntegrationRegistry` can
			// distinguish lib-owned registrations (whose components must
			// resolve locally per render-bundle to avoid the ADR-019
			// cross-Vue trap, openregister#1958) from consumer-custom
			// registrations (whose components live in the consumer's own
			// bundle and must NOT be swapped).
			__libOwned: entry.__libOwned === true,
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

	// Converge, don't clobber. If another bundle already installed a REAL
	// registry (has register(), no _queue), every later caller CONVERGES
	// on that same object — otherwise each app's bundle would install its
	// own per-bundle singleton and a consuming app's useIntegrationRegistry
	// would read an empty registry while a leaf registered into a
	// different one. First bundle to install wins; all others share it.
	if (prior !== undefined
		&& prior !== integrations
		&& typeof prior.register === 'function'
		&& prior._queue === undefined
	) {
		return prior
	}

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

/**
 * Read the shared registry IF one is already installed on the global —
 * WITHOUT installing or mutating anything.
 *
 * Used by `useIntegrationRegistry` so a consuming app reads the same
 * registry OpenRegister's global bootstrap populated, instead of its own
 * per-bundle module singleton. Returns null when no real registry is
 * installed yet (a bare stub queue does NOT count) so callers fall back
 * to the module singleton — keeping unit tests that never install a
 * global on the module-singleton path.
 *
 * @param {object} [globalRef] Global to read. Defaults to `window`.
 * @return {object|null} The installed shared registry, or null.
 */
export function sharedRegistryIfInstalled(globalRef) {
	const target = globalRef || (typeof window !== 'undefined' ? window : null)
	if (target === null) {
		return null
	}
	const g = target.OCA && target.OCA.OpenRegister && target.OCA.OpenRegister.integrations
	if (g && typeof g.register === 'function' && g._queue === undefined) {
		return g
	}
	return null
}

/**
 * Resolve the canonical shared registry, INSTALLING the module singleton
 * onto the global when none exists yet (and draining any stub queue).
 *
 * This is the entry point OpenRegister's global bootstrap uses so that
 * `registerBuiltinIntegrations` / `registerLeafIntegrations` /
 * `registerIntegrationIcons` all populate the one shared registry every
 * consuming app reads via `useIntegrationRegistry`. Idempotent.
 *
 * @param {object} [globalRef] Global to resolve against. Defaults to `window`.
 * @return {object} The shared registry (always a real registry instance).
 */
export function getSharedRegistry(globalRef) {
	const existing = sharedRegistryIfInstalled(globalRef)
	if (existing !== null) {
		return existing
	}
	return installIntegrationRegistry(globalRef)
}

/**
 * Load-order-safe registration entry point for a LEAF app's bespoke
 * integration component (Path 2).
 *
 * This is the symmetric counterpart to `installIntegrationRegistry`,
 * which OpenRegister calls to install its singleton. A leaf app must
 * NOT call `installIntegrationRegistry` — that replaces the global with
 * OR's singleton and would clobber it. Instead the leaf ships a small
 * bundle, loaded globally on every Nextcloud page via the app's own
 * `\OCP\Util::addInitScript()`, that calls `registerIntegration()`.
 *
 * Behaviour by load order:
 *  - OR already installed its singleton → register the descriptor live;
 *    it appears in `integrations.list()` immediately.
 *  - OR not loaded yet (this leaf, or another leaf, ran first) →
 *    install/extend a `{ _queue, register }` stub on
 *    `window.OCA.OpenRegister.integrations` and push the descriptor. OR
 *    replays the queue when it later calls `installIntegrationRegistry`.
 *
 * Validation, collision policy (AD-13), required `tab`/`widget`, and
 * `referenceType` defaulting are unchanged — they apply identically
 * whether the call lands live or via replay, because both paths funnel
 * through the same `register()`.
 *
 * @param {object} descriptor The integration descriptor (same shape as
 *   `integrations.register()` — id, label, icon, tab, widget, etc.).
 * @param {object} [globalRef] Global object to attach to. Defaults to
 *   `window`. Injectable for tests / SSR.
 * @return {void}
 */
export function registerIntegration(descriptor, globalRef) {
	const target = globalRef || (typeof window !== 'undefined' ? window : null)
	if (target === null) {
		// No global (SSR / non-browser) — register on the module singleton
		// directly so unit tests and isomorphic callers still work.
		integrations.register(descriptor)
		return
	}

	target.OCA = target.OCA || {}
	target.OCA.OpenRegister = target.OCA.OpenRegister || {}
	const current = target.OCA.OpenRegister.integrations

	// OR's real singleton is installed when the global exposes `register`
	// and carries NO `_queue` (only the stub has a `_queue`).
	if (current === integrations || (current && typeof current.register === 'function' && current._queue === undefined)) {
		current.register(descriptor)
		return
	}

	// Not installed yet — ensure a queue stub exists, then enqueue.
	if (current === undefined || current === null) {
		target.OCA.OpenRegister.integrations = {
			_queue: [],
			register(entry) {
				this._queue.push(entry)
			},
		}
	}
	target.OCA.OpenRegister.integrations.register(descriptor)
}

export { VALID_SURFACES }
