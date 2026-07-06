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
 * nextcloud-vue#91; the host page provides `context.openExport`) |
 * open-form (Wave 3 — schema-driven create dialog; the rendering host
 * provides `context.openForm`) | refresh (Wave 3 — bumps the page-level
 * refresh signal on the `cn:page:refresh` event-bus channel) | api-call
 * (Wave 3 — POST/PUT a configured app endpoint with success/error toasts
 * and an automatic page refresh; any `confirm` on the action is INTENT
 * consumed by the rendering surface BEFORE dispatch, like object-op).
 *
 * `toggle` (Wave 3) is deliberately NOT dispatchable: a toggle is a
 * stateful two-way control (GET state on mount, write on click) rendered
 * by the header-actions surface (CnActionButtons); dispatching it here
 * warns and no-ops.
 *
 * Spec: REQ-MVR-011 (manifest-v2-renderer) — unified actions dispatcher
 * / ADR-036 Decision 7 / ADR-049 Decision 2 / #91 Wave 3
 */

import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import {
	dropOptionalUnresolved,
	hasUnresolvedTokens,
	resolveFilterTokens,
} from './resolveFilterTokens.js'
import { interpolateUrlTokens } from '../composables/useEndpointSource.js'

/** Event-bus channel the page-level Refresh signal broadcasts on (Wave 2). */
const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'

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
 * Execute a Wave-3 `api-call` action: POST/PUT the configured app endpoint
 * (URL + params run the SAME @-token grammar endpoint sources use), toast
 * the outcome via @nextcloud/dialogs, then — unless `action.refresh` is
 * `false` — bump the page-level refresh signal so every endpoint-bound
 * widget refetches. Confirm-gating is the RENDERING SURFACE's job (the
 * `confirm` field is intent, object-op precedent): this runs after any
 * confirmation already happened.
 *
 * Never throws: a failed call resolves `{ ok: false, error }` after the
 * error toast (so a confirm dialog can await the outcome).
 *
 * @param {object} action The api-call action (`url`, `method?`, `params?`,
 *   `successMessage?`, `errorMessage?`, `refresh?`).
 * @param {object} context Runtime context; `context.tokenCtx` is the token
 *   context (`{ objectId?, object?, workspace?, config? }`) the URL/params
 *   resolve against.
 * @return {Promise<{ok: boolean, data?: *, error?: *}>} The call outcome.
 */
async function executeApiCall(action, context) {
	const tokenCtx = context.tokenCtx || {}
	const url = interpolateUrlTokens(action.url || '', tokenCtx)
	const params = dropOptionalUnresolved(resolveFilterTokens(action.params || {}, tokenCtx))
	if (!url || hasUnresolvedTokens(params)) {
		// eslint-disable-next-line no-console
		console.warn('[dispatchAction] api-call is missing its url or a required token is unresolved — skipping.', action)
		return { ok: false, error: new Error('api-call blocked') }
	}
	const method = String(action.method || 'POST').toUpperCase() === 'PUT' ? 'put' : 'post'
	const [{ default: axios }, { generateUrl }, dialogs] = await Promise.all([
		import('@nextcloud/axios'),
		import('@nextcloud/router'),
		import('@nextcloud/dialogs'),
	])
	const target = /^https?:\/\//i.test(url) ? url : generateUrl(url)
	try {
		const res = await axios[method](target, params)
		if (typeof dialogs.showSuccess === 'function') {
			dialogs.showSuccess(action.successMessage || t('nextcloud-vue', 'Action completed.'))
		}
		if (action.refresh !== false) emit(PAGE_REFRESH_CHANNEL, {})
		return { ok: true, data: res && res.data }
	} catch (error) {
		const serverMessage = error && error.response && error.response.data
			&& (error.response.data.error || error.response.data.message)
		if (typeof dialogs.showError === 'function') {
			dialogs.showError(action.errorMessage || serverMessage || t('nextcloud-vue', 'Action failed.'))
		}
		return { ok: false, error }
	}
}

/**
 * Dispatch a v2 manifest action.
 *
 * @param {object} action The action object from the manifest.
 * @param {string} [action.type] Dispatch type: "handler" | "open-modal" | "open-page" | "navigate" |
 *   "object-op" | "export" | "open-form" | "refresh" | "api-call".
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
 * @param {string} [action.url] "api-call" only: the app endpoint — app-relative (routed
 *   through generateUrl) or absolute. May interpolate the shared URL tokens
 *   (`@objectId`, `@object.<field>`, `@workspace.<key>`, `@config.<key>`).
 * @param {string} [action.method] "api-call" only: "POST" (default) | "PUT".
 * @param {object} [action.params] "api-call" only: the JSON body. Values pass the shared
 *   filter-token grammar; optional (`…?`) tokens drop when unresolved, an unresolved
 *   REQUIRED token blocks the call.
 * @param {string} [action.successMessage] "api-call" / "open-form": pre-translated success
 *   toast text (a library default applies when absent).
 * @param {string} [action.errorMessage] "api-call" / "open-form": pre-translated error toast
 *   text (falls back to the server's `error`/`message`, then a library default).
 * @param {boolean} [action.refresh] "api-call" only: bump the `cn:page:refresh` signal after
 *   a successful call (default true; set `false` to skip).
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
 * @param {Function} [context.openForm] Function `(action)` that opens the schema-driven
 *   create dialog. Required for "open-form" type — the rendering surface
 *   (CnActionButtons) provides it, mirroring `openExport`.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [context.tokenCtx]
 *   Token context "api-call" URLs/params resolve against (the same shape
 *   `resolveFilterTokens` / `interpolateUrlTokens` take).
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
 *   surfaces via the store's `errors[type]` without any local state change. For "api-call":
 *   a promise of `{ ok, data?, error? }` (toasts + refresh already handled). All other types
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

	case 'open-form': {
		// Schema-driven create dialog (Wave 3, nextcloud-vue#91): the
		// rendering surface (CnActionButtons) mounts the shared
		// CnAdvancedFormDialog and handles the save — mirroring how
		// `export` delegates to the host's CnMassExportDialog.
		if (typeof context.openForm !== 'function') {
			// eslint-disable-next-line no-console
			console.warn('[dispatchAction] open-form requires context.openForm to be a function.')
			return
		}
		context.openForm(action)
		break
	}

	case 'refresh': {
		// Page-level refresh (Wave 3, nextcloud-vue#91): bump the SAME
		// `cn:page:refresh` event-bus signal the page overflow menu's
		// Refresh item broadcasts — every endpoint-bound / bus-subscribed
		// widget on the page force-refetches past its shared cache.
		emit(PAGE_REFRESH_CHANNEL, {})
		break
	}

	case 'api-call': {
		// POST/PUT an app endpoint + toast + refresh (Wave 3). Any
		// `confirm` on the action is INTENT the rendering surface consumed
		// BEFORE calling the dispatcher (object-op precedent) — no gating
		// happens here.
		return executeApiCall(action, context)
	}

	case 'toggle': {
		// A toggle is a stateful two-way control (GET state on mount,
		// write on click) — it is RENDERED by the header-actions surface
		// (CnActionButtons), never dispatched as a one-shot action.
		// eslint-disable-next-line no-console
		console.warn('[dispatchAction] "toggle" is a stateful header-actions control rendered by CnActionButtons — it cannot be dispatched.')
		return
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
