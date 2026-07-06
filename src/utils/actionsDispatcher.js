/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * actionsDispatcher — unified action dispatcher for v2 manifest actions.
 *
 * Dispatches an action object against a context. All dispatch types are
 * handled without throwing — errors surface as console.warn calls.
 * Types: handler | open-modal | open-page | navigate | object-op (the
 * declarative OpenRegister mutation verb added by ADR-049 — dispatched
 * via the shared object store, intent-only, RBAC stays server-side) |
 * export (opens the shared CnMassExportDialog export launcher configured
 * via the action's `entities[]` / `formats[]` — Wave 1 of
 * nextcloud-vue#91; the host page provides `context.openExport`).
 *
 * Spec: REQ-MVR-011 (manifest-v2-renderer) — unified actions dispatcher
 * / ADR-036 Decision 7 / ADR-049 Decision 2
 */

/**
 * Resolve the object-store type slug for a widget `source` register/schema
 * pair. Reuses an already-registered type whose config matches (so an app's
 * own caches stay coherent); otherwise registers a deterministic
 * `<register>/<schema>` slug on the fly.
 *
 * @param {object} store The object store instance (useObjectStore shape).
 * @param {{register: (string|number), schema: (string|number)}} source The widget source.
 * @return {string} The type slug to use for store CRUD calls.
 */
export function resolveObjectOpType(store, source) {
	const register = String(source.register)
	const schema = String(source.schema)
	const registry = store.objectTypeRegistry || {}
	for (const [slug, config] of Object.entries(registry)) {
		if (!config) continue
		if ((String(config.register) === register && String(config.schema) === schema)
			|| (config.registerSlug === register && config.schemaSlug === schema)) {
			return slug
		}
	}
	const slug = `${register}/${schema}`
	if (!registry[slug]) {
		store.registerObjectType(slug, schema, register)
	}
	return slug
}

/**
 * Extract an OpenRegister object's id from a row (top-level `id` wins,
 * `@self.id` metadata fallback).
 *
 * @param {object} row The row object.
 * @return {string|number|null} The object id, or null when absent.
 */
function rowObjectId(row) {
	if (!row || typeof row !== 'object') return null
	if (row.id !== undefined && row.id !== null) return row.id
	const self = row['@self']
	if (self && typeof self === 'object' && self.id !== undefined && self.id !== null) return self.id
	return null
}

/**
 * Dispatch a v2 manifest action.
 *
 * @param {object} action The action object from the manifest.
 * @param {string} [action.type] Dispatch type: "handler" | "open-modal" | "open-page" | "navigate" | "object-op" | "export".
 *   When absent, treated as "handler" for v1 backward compatibility.
 * @param {string} [action.handler] Registry key for "handler" type. For "export": the optional
 *   handler invoked by the host with the dialog's confirm payload (`{ format, entity }`).
 * @param {Array} [action.args] Arguments spread to the handler function.
 * @param {string} [action.target] Target for "open-modal", "open-page", and "navigate" types.
 * @param {object} [action.props] Props forwarded to modal for "open-modal" type.
 * @param {string} [action.op] "object-op" only: mutation verb — "patch" | "delete" | "create".
 * @param {object} [action.values] "object-op" only: the verb's payload — the partial object
 *   merged over the row for "patch", the new object's properties for "create"; ignored for "delete".
 * @param {boolean} [action.confirm] "object-op" only: confirm-gating INTENT consumed by the
 *   rendering host (CnWidgetObjectTable routes it through CnConfirmDialog) — the dispatcher
 *   itself never gates; it is called after any confirmation already happened.
 * @param {Array<{id: string, label: string}>} [action.entities] "export" only: selectable
 *   entity types offered by the export launcher (e.g. Leads / Requests). Optional — when
 *   absent the dialog shows only the format picker.
 * @param {Array<string|{id: string, label: string}>} [action.formats] "export" only: the
 *   offered export formats (bare ids like "csv" or full `{id, label}` entries). Optional —
 *   the dialog's built-in Excel/CSV defaults apply when absent.
 * @param {string} [action.description] "export" only: pre-translated description shown
 *   above the pickers.
 *
 * @param {object} context Runtime context.
 * @param {object} [context.router] Vue Router instance. Required for "open-page" and "navigate".
 * @param {object} [context.registry] Component registry (Record<string, { kind, component }>).
 *   Required for "open-modal" type.
 * @param {object} [context.handlers] Map of handler name → function. Required for "handler" type.
 * @param {Function} [context.openModal] Function `(key, props)` that opens a modal.
 *   Required for "open-modal" type.
 * @param {Function} [context.openExport] Function `(action)` that opens the shared
 *   CnMassExportDialog configured from the action. Required for "export" type —
 *   CnPageRenderer pre-binds it in the `cnDispatchAction` context.
 * @param {object} [context.objectStore] Object store instance (useObjectStore shape).
 *   Required for "object-op" type. All mutations go through `saveObject` / `deleteObject`
 *   so store caches (and their no-mutation-on-error semantics) apply.
 * @param {{register: (string|number), schema: (string|number)}} [context.source] The widget's
 *   declarative source the mutation targets. Required for "object-op" type.
 * @param {object} [context.row] The row object a row-scoped "object-op" (patch/delete) mutates.
 *
 * @return {Promise<object|boolean|null>|undefined} For "object-op": the store call's promise —
 *   the saved object (or `null` on a rejected write) for patch/create, `true`/`false` for
 *   delete. The store only mutates its local caches on SUCCESS, so a backend (RBAC) rejection
 *   surfaces via the store's `errors[type]` without any local state change. All other types
 *   return undefined.
 */
export function dispatchAction(action, context = {}) {
	if (!action || typeof action !== 'object') {
		// eslint-disable-next-line no-console
		console.warn('[dispatchAction] Received invalid action:', action)
		return
	}

	// Missing type is treated as "handler" for v1 backward compatibility
	const type = action.type || 'handler'

	switch (type) {
	case 'handler': {
		const handlerName = action.handler
		const handlers = context.handlers || {}

		if (!handlerName || typeof handlers[handlerName] !== 'function') {
			// eslint-disable-next-line no-console
			console.warn(
				`[dispatchAction] Handler "${handlerName}" not found in context.handlers.`,
			)
			return
		}
		handlers[handlerName](...(action.args ?? []))
		break
	}

	case 'open-modal': {
		const target = action.target
		const registry = context.registry || {}
		const entry = registry[target]

		if (!entry) {
			// eslint-disable-next-line no-console
			console.warn(
				`[dispatchAction] open-modal target "${target}" not found in registry.`,
			)
			return
		}

		if (entry.kind !== 'modal') {
			// eslint-disable-next-line no-console
			console.warn(
				`[dispatchAction] open-modal target "${target}" has kind "${entry.kind}" (expected "modal").`,
			)
			return
		}

		if (typeof context.openModal !== 'function') {
			// eslint-disable-next-line no-console
			console.warn(
				'[dispatchAction] open-modal requires context.openModal to be a function.',
			)
			return
		}

		context.openModal(target, action.props ?? {})
		break
	}

	case 'open-page': {
		if (!context.router) {
			// eslint-disable-next-line no-console
			console.warn(
				'[dispatchAction] open-page requires context.router to be a Vue Router instance.',
			)
			return
		}
		context.router.push({ name: action.target })
		break
	}

	case 'navigate': {
		if (!context.router) {
			// eslint-disable-next-line no-console
			console.warn(
				'[dispatchAction] navigate requires context.router to be a Vue Router instance.',
			)
			return
		}
		context.router.push(action.target)
		break
	}

	case 'export': {
		// Export launcher (Wave 1, nextcloud-vue#91): the host page opens the
		// shared CnMassExportDialog configured via the action's entities[] /
		// formats[]; the dialog's confirm payload routes to the action's
		// optional `handler` (the app's export service does the download).
		if (typeof context.openExport !== 'function') {
			// eslint-disable-next-line no-console
			console.warn('[dispatchAction] export requires context.openExport to be a function.')
			return
		}
		context.openExport(action)
		break
	}

	case 'object-op': {
		// Declarative mutation of an OpenRegister object, dispatched via the
		// shared object store (ADR-049). The manifest declares INTENT only:
		// authorization-shaped fields on the action (`role`, `allow`, …) are
		// NEVER consulted here — OpenRegister RBAC is the single authority
		// (ADR-022 / ADR-023) and a forbidden mutation is rejected server-side.
		// The store mutates its caches only on success, so a rejected write
		// surfaces as an error with no local state change.
		const op = action.op
		if (op !== 'patch' && op !== 'delete' && op !== 'create') {
			// eslint-disable-next-line no-console
			console.warn(`[dispatchAction] object-op has invalid op "${op}" (expected patch | delete | create).`)
			return
		}
		const store = context.objectStore
		if (!store || typeof store.saveObject !== 'function' || typeof store.deleteObject !== 'function') {
			// eslint-disable-next-line no-console
			console.warn('[dispatchAction] object-op requires context.objectStore (useObjectStore shape).')
			return
		}
		const source = context.source
		if (!source || !source.register || !source.schema) {
			// eslint-disable-next-line no-console
			console.warn('[dispatchAction] object-op requires context.source with register + schema.')
			return
		}
		const type = resolveObjectOpType(store, source)

		if (op === 'create') {
			return store.saveObject(type, { ...(action.values || {}) })
		}

		const row = context.row
		const id = rowObjectId(row)
		if (id === null) {
			// eslint-disable-next-line no-console
			console.warn(`[dispatchAction] object-op "${op}" is row-scoped and requires context.row with an id.`)
			return
		}
		if (op === 'delete') {
			return store.deleteObject(type, id)
		}
		// patch: the row's object merged with the action's values.
		return store.saveObject(type, { ...row, ...(action.values || {}), id })
	}

	default:
		// eslint-disable-next-line no-console
		console.warn(`[dispatchAction] Unknown action type "${type}".`)
	}
}
