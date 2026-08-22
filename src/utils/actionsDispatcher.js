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
 * consumed by the rendering surface BEFORE dispatch, like object-op) |
 * agent (run a governed hermiq agent against the page object via
 * POST /apps/hermiq/api/agents/{agent}/run-on-object — hermiq#41; a
 * first-class companion to api-call that resolves the register/schema/
 * objectId context for the author and fail-closes when hermiq is absent).
 *
 * `api-call`'s request body prefers `payload` (DEEP @-token resolution at
 * any nesting depth — object/array, e.g. a DocuDesk-style
 * `{ dataRefs: [{ id: '@objectId' }] }` body) over the legacy `params`
 * (shallow, one-level filter-map resolution, kept for back-compat). Set
 * `download: true` to request a binary blob response and trigger a
 * browser file download instead of a JSON toast+refresh cycle (filename:
 * `Content-Disposition` header, else the token-resolved `filename`, else
 * `'download.pdf'`; no auto-refresh unless `refresh: true` is explicit).
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
	dropOptionalUnresolvedDeep,
	hasUnresolvedDeepTokens,
	hasUnresolvedTokens,
	resolveDeepTokens,
	resolveFilterTokens,
} from './resolveFilterTokens.js'
import { interpolateUrlTokens } from '../composables/useEndpointSource.js'
import { parseDispositionFilename, triggerBlobDownload } from '../components/CnIndexPage/selfModeIO.js'

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
 * Extract a saved OpenRegister object's id for a post-save deep-link:
 * top-level `id`, then `uuid`, then the `@self.id` metadata fallback.
 *
 * @param {object} saved The saved record returned by the object store.
 * @return {string|number|null} The object id, or null when absent.
 */
export function savedObjectId(saved) {
	if (!saved || typeof saved !== 'object') return null
	if (saved.id !== undefined && saved.id !== null) return saved.id
	if (saved.uuid !== undefined && saved.uuid !== null) return saved.uuid
	const self = saved['@self']
	if (self && typeof self === 'object' && self.id !== undefined && self.id !== null) return self.id
	return null
}

/**
 * Build the vue-router push location for an `open-form` action's
 * `onSuccessRoute`, merging the saved object's id into the route params so
 * the post-save navigation can deep-link to the created object's detail page
 * (#91).
 *
 * `onSuccessRoute` may be:
 *  - a STRING route NAME → `{ name, params: { id } }`. The saved id lands
 *    under the default `id` param; a route without an `:id` segment simply
 *    ignores the extra param, so a bare-name route keeps working unchanged
 *    (backward compatible).
 *  - an OBJECT `{ name, paramField?, objectParam? }` → the id is placed
 *    under `paramField` (default `id`), and — when `objectParam` is set —
 *    the whole saved object is passed under that param key too (so a
 *    `props: true` detail route can render the record without a refetch).
 *
 * The id is read via {@link savedObjectId} (`saved.id` → `saved.uuid` →
 * `saved['@self'].id`). Returns `null` when no route name is resolvable, so
 * the caller can skip the navigation.
 *
 * @param {(string|{name: string, paramField?: string, objectParam?: string})} onSuccessRoute The action's onSuccessRoute config.
 * @param {object} saved The saved OpenRegister object.
 * @return {{name: string, params: object}|null} The router push location, or null.
 */
export function buildOnSuccessRoute(onSuccessRoute, saved) {
	const spec = typeof onSuccessRoute === 'string'
		? { name: onSuccessRoute }
		: (onSuccessRoute && typeof onSuccessRoute === 'object' ? onSuccessRoute : null)
	if (!spec || typeof spec.name !== 'string' || spec.name === '') {
		return null
	}
	const params = {}
	const id = savedObjectId(saved)
	if (id !== null && id !== undefined) {
		params[spec.paramField || 'id'] = id
	}
	if (spec.objectParam && saved && typeof saved === 'object') {
		params[spec.objectParam] = saved
	}
	return { name: spec.name, params }
}

/**
 * Run a manifest-authored toast message through the host translate function.
 *
 * `successMessage` / `errorMessage` are English source strings authored in the
 * manifest (ADR-007), so they need the SAME translator the rest of the page
 * chrome uses — the consumer's bound `t()`, handed to the dispatcher by the
 * rendering surface as `context.translate` (which itself comes from the
 * `cnTranslate` CnAppRoot provides).
 *
 * A pure pass-through: with no translator, no message, or a catalogue that
 * lacks the key, the message is returned byte-identical. Server-supplied
 * messages are data and are never routed through here.
 *
 * @param {*} message The manifest-authored message (may be undefined).
 * @param {object} context The dispatch context (`context.translate` optional).
 * @return {*} The translated message, or the input unchanged.
 */
function translateMessage(message, context) {
	const fn = context && context.translate
	if (!message || typeof fn !== 'function') return message
	return fn(message)
}

/**
 * Interpolate the `api-call` URL/filename token grammar inside a string:
 * the `{objectId}` BRACE convention (a literal placeholder some manifests
 * use for path templates, matching the OpenRegister credential-broker path
 * style) as well as the full `@objectId` / `@object.<field>` /
 * `@workspace.<key>` / `@config.<key>` grammar {@link interpolateUrlTokens}
 * already understands. Unresolved `@`-tokens and an unresolved
 * `{objectId}` both collapse to an empty string (never leak a literal
 * placeholder into a request URL or a downloaded filename).
 *
 * @param {string} str The raw string (an action's `url` or `filename`).
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} ctx Token context.
 * @return {string} The interpolated string.
 */
function interpolateActionString(str, ctx) {
	if (typeof str !== 'string') return str
	const braced = str.replace(/\{objectId\}/g, () => {
		const id = ctx.objectId
		return (id === undefined || id === null) ? '' : String(id)
	})
	return interpolateUrlTokens(braced, ctx)
}

/**
 * Execute a Wave-3 `api-call` action: POST/PUT the configured app endpoint
 * (URL + body run the SAME @-token grammar endpoint sources use), toast the
 * outcome via @nextcloud/dialogs, then — unless `action.refresh` is `false`
 * (or, for a `download` action, unless `action.refresh` is explicitly
 * `true`) — bump the page-level refresh signal so every endpoint-bound
 * widget refetches. Confirm-gating is the RENDERING SURFACE's job (the
 * `confirm` field is intent, object-op precedent): this runs after any
 * confirmation already happened.
 *
 * The request body prefers `action.payload` (DEEP token resolution, any
 * nesting — {@link resolveDeepTokens}) over the legacy `action.params`
 * (shallow, one-level filter-map resolution — unchanged for back-compat).
 * A required token left unresolved anywhere in the body BLOCKS the call
 * (error toast) rather than sending a literal `@objectId` to the server.
 *
 * `action.download === true` requests the response as a binary blob
 * (`responseType: 'blob'`) and triggers a browser file download — the
 * filename comes from the response's `Content-Disposition` header, else
 * the token-resolved `action.filename`, else `'download.pdf'`.
 *
 * Never throws: a failed call resolves `{ ok: false, error }` after the
 * error toast (so a confirm dialog can await the outcome).
 *
 * @param {object} action The api-call action (`url`, `method?`, `payload?`,
 *   `params?`, `download?`, `filename?`, `successMessage?`, `errorMessage?`,
 *   `refresh?`).
 * @param {object} context Runtime context; `context.tokenCtx` is the token
 *   context (`{ objectId?, object?, workspace?, config? }`) the URL/body
 *   resolve against.
 * @return {Promise<{ok: boolean, data?: *, error?: *}>} The call outcome.
 */
async function executeApiCall(action, context) {
	const tokenCtx = context.tokenCtx || {}
	const url = interpolateActionString(action.url || '', tokenCtx)

	const hasPayload = action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
	const body = hasPayload
		? dropOptionalUnresolvedDeep(resolveDeepTokens(action.payload, tokenCtx))
		: dropOptionalUnresolved(resolveFilterTokens(action.params || {}, tokenCtx))
	const bodyBlocked = hasPayload ? hasUnresolvedDeepTokens(body) : hasUnresolvedTokens(body)

	if (!url || bodyBlocked) {
		// eslint-disable-next-line no-console
		console.warn('[dispatchAction] api-call is missing its url or a required token is unresolved — skipping.', action)
		return { ok: false, error: new Error('api-call blocked') }
	}
	const method = String(action.method || 'POST').toUpperCase() === 'PUT' ? 'put' : 'post'
	const isDownload = action.download === true
	const [{ default: axios }, { generateUrl }, dialogs] = await Promise.all([
		import('@nextcloud/axios'),
		import('@nextcloud/router'),
		import('@nextcloud/dialogs'),
	])
	const target = /^https?:\/\//i.test(url) ? url : generateUrl(url)
	try {
		// Only pass a third axios config arg for a download call — an
		// explicit `undefined` third argument would otherwise change the
		// call shape for every existing (non-download) api-call consumer/test.
		const res = isDownload
			? await axios[method](target, body, { responseType: 'blob' })
			: await axios[method](target, body)
		if (isDownload) {
			const filename = parseDispositionFilename(
				res && res.headers && res.headers['content-disposition'],
				interpolateActionString(action.filename, tokenCtx) || 'download.pdf',
			)
			triggerBlobDownload(res.data, filename)
		}
		if (typeof dialogs.showSuccess === 'function') {
			dialogs.showSuccess(translateMessage(action.successMessage, context) || t('nextcloud-vue', 'Action completed.'))
		}
		const shouldRefresh = isDownload ? action.refresh === true : action.refresh !== false
		if (shouldRefresh) emit(PAGE_REFRESH_CHANNEL, {})
		return { ok: true, data: res && res.data }
	} catch (error) {
		const serverMessage = error && error.response && error.response.data
			&& (error.response.data.error || error.response.data.message)
		if (typeof dialogs.showError === 'function') {
			dialogs.showError(translateMessage(action.errorMessage, context) || serverMessage || t('nextcloud-vue', 'Action failed.'))
		}
		return { ok: false, error }
	}
}

/**
 * Resolve an agent-action object reference (`register` / `schema` / `objectId`):
 * an explicitly-declared action value WINS (it may itself be an @-token string,
 * interpolated against the token context), otherwise it falls back to the page
 * object context default (`tokenCtx.register` / `.schema` / `.objectId`). An
 * unresolved token collapses to an empty string (never leaks a literal `@objectId`
 * to the server); a `{ slug | id }` object (a schema holder) is flattened to its
 * slug/id.
 *
 * @param {*} actionVal The action's explicit value (may be undefined or an @-token).
 * @param {*} ctxDefault The page-context default (`tokenCtx.<field>`).
 * @param {object} tokenCtx The token context the @-tokens resolve against.
 * @return {string} The resolved reference, or '' when unresolved/absent.
 */
function resolveAgentRef(actionVal, ctxDefault, tokenCtx) {
	let v = actionVal
	if (v === undefined || v === null || v === '') {
		v = ctxDefault
	} else if (typeof v === 'string') {
		v = interpolateActionString(v, tokenCtx)
	}
	if (v && typeof v === 'object') return String(v.slug || v.id || '')
	if (v === undefined || v === null) return ''
	return String(v)
}

/**
 * Execute an `agent` action: run a governed hermiq agent against the page's
 * OpenRegister object. Resolves the object context (`register` / `schema` /
 * `objectId` — explicit action fields override, else default to the page's
 * `@register` / `@schema` / `@objectId` context) and POSTs
 * `{ register, schema, objectId, resultField?, skill?, prompt? }` to hermiq's
 * object-RBAC-scoped run endpoint `/apps/hermiq/api/agents/{agent}/run-on-object`
 * (hermiq#41), which dispatches the governed `AgentRunRequestedEvent`.
 *
 * A first-class companion to `type:"api-call"` — the author declares "run agent
 * here" without hand-wiring the URL/body. `type:"api-call"` remains the escape
 * hatch for a bespoke body.
 *
 * Fail-closed. An unresolved REQUIRED `@objectId` (or a missing agent/register/
 * schema) BLOCKS the call (warn) rather than POSTing a literal token. On the
 * server's 202 it toasts `successMessage` (default 'Run queued') and — unless
 * `refresh: false` — bumps the page refresh signal. A 403 / 404 with a structured
 * error body fail-closes with that message; a 404 with NO structured body is read
 * as "hermiq absent" and toasts a graceful 'agent runtime unavailable' — the
 * dispatcher NEVER hard-requires hermiq to be installed. Never throws.
 *
 * @param {object} action The agent action (`agent`, `skill?`, `prompt?`,
 *   `resultField?`, `register?`, `schema?`, `objectId?`, `successMessage?`,
 *   `errorMessage?`, `refresh?`).
 * @param {object} context Runtime context; `context.tokenCtx` is the token
 *   context (`{ objectId?, object?, register?, schema?, workspace?, config? }`).
 * @return {Promise<{ok: boolean, data?: *, error?: *}>} The call outcome.
 */
async function executeAgentAction(action, context) {
	const tokenCtx = context.tokenCtx || {}
	const agent = resolveAgentRef(action.agent, undefined, tokenCtx)
	const register = resolveAgentRef(action.register, tokenCtx.register, tokenCtx)
	const schema = resolveAgentRef(action.schema, tokenCtx.schema, tokenCtx)
	const objectId = resolveAgentRef(action.objectId, tokenCtx.objectId, tokenCtx)

	if (!agent || !register || !schema || !objectId) {
		// eslint-disable-next-line no-console
		console.warn('[dispatchAction] agent action is missing its agent or a required object-context token (register/schema/objectId) is unresolved — skipping.', action)
		return { ok: false, error: new Error('agent action blocked') }
	}

	const body = { register, schema, objectId }
	const resultField = resolveAgentRef(action.resultField, undefined, tokenCtx)
	if (resultField) body.resultField = resultField
	const skill = resolveAgentRef(action.skill, undefined, tokenCtx)
	if (skill) body.skill = skill
	if (typeof action.prompt === 'string' && action.prompt !== '') {
		body.prompt = interpolateActionString(action.prompt, tokenCtx)
	}

	const [{ default: axios }, { generateUrl }, dialogs] = await Promise.all([
		import('@nextcloud/axios'),
		import('@nextcloud/router'),
		import('@nextcloud/dialogs'),
	])
	const target = generateUrl(`/apps/hermiq/api/agents/${encodeURIComponent(agent)}/run-on-object`)
	try {
		const res = await axios.post(target, body)
		if (typeof dialogs.showSuccess === 'function') {
			dialogs.showSuccess(translateMessage(action.successMessage, context) || t('nextcloud-vue', 'Run queued'))
		}
		if (action.refresh !== false) emit(PAGE_REFRESH_CHANNEL, {})
		return { ok: true, data: res && res.data }
	} catch (error) {
		const response = error && error.response
		const status = response && response.status
		const serverMessage = response && response.data
			&& (response.data.error || response.data.message)
		// A 404 with NO structured error body = hermiq is not installed (the app
		// route 404s at the NC level) — surface a graceful "runtime unavailable"
		// rather than a fail-closed authorization message.
		const hermiqAbsent = status === 404 && !serverMessage
		if (typeof dialogs.showError === 'function') {
			const msg = hermiqAbsent
				? t('nextcloud-vue', 'Agent runtime unavailable')
				: (translateMessage(action.errorMessage, context) || serverMessage || t('nextcloud-vue', 'Action failed.'))
			dialogs.showError(msg)
		}
		return { ok: false, error }
	}
}

/**
 * Dispatch a v2 manifest action.
 *
 * @param {object} action The action object from the manifest.
 * @param {string} [action.type] Dispatch type: "handler" | "open-modal" | "open-page" | "navigate" |
 *   "object-op" | "export" | "open-form" | "refresh" | "api-call" | "agent".
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
 *   (`@objectId`, `@object.<field>`, `@workspace.<key>`, `@config.<key>`, and the
 *   `{objectId}` brace form).
 * @param {string} [action.method] "api-call" only: "POST" (default) | "PUT".
 * @param {object} [action.payload] "api-call" only: the JSON body — preferred over `params`.
 *   Values resolve the shared `@`-token grammar RECURSIVELY at any nesting depth (objects
 *   and arrays of objects, e.g. `{ dataRefs: [{ id: '@objectId' }] }`); optional (`…?`)
 *   tokens drop when unresolved anywhere in the tree, an unresolved REQUIRED token blocks
 *   the call. When set, `params` is ignored.
 * @param {object} [action.params] "api-call" only: legacy JSON body (ignored when `payload`
 *   is set). Values pass the shared filter-token grammar ONE level deep; optional (`…?`)
 *   tokens drop when unresolved, an unresolved REQUIRED token blocks the call.
 * @param {boolean} [action.download] "api-call" only: request the response as a binary blob
 *   (`responseType: 'blob'`) and trigger a browser file download instead of a JSON
 *   toast+refresh cycle. Default `false`.
 * @param {string} [action.filename] "api-call" `download: true` only: fallback filename when
 *   the response carries no `Content-Disposition` header (falls back further to
 *   `'download.pdf'`). Interpolates the same token grammar as `url`.
 * @param {string} [action.successMessage] "api-call" / "open-form": pre-translated success
 *   toast text (a library default applies when absent).
 * @param {string} [action.errorMessage] "api-call" / "open-form": pre-translated error toast
 *   text (falls back to the server's `error`/`message`, then a library default).
 * @param {boolean} [action.refresh] "api-call" / "agent" only: bump the `cn:page:refresh` signal
 *   after a successful call. Default `true` — EXCEPT for a `download: true` api-call, whose
 *   default is `false` (a file download normally shouldn't also force-refetch every widget); set
 *   the flag explicitly either way to override.
 * @param {string} [action.agent] "agent" only (REQUIRED): the hermiq agent uuid to run against
 *   the page object. POSTed to `/apps/hermiq/api/agents/{agent}/run-on-object` (hermiq#41).
 * @param {string} [action.skill] "agent" only: optional skill id folded into the governed run.
 * @param {string} [action.prompt] "agent" only: optional prompt (interpolates the shared `@`-token
 *   grammar inline — `@objectId`, `@object.<field>`, `@workspace.<key>`, `@config.<key>`).
 * @param {string} [action.resultField] "agent" only: object field the agent's result is written to.
 * @param {string} [action.register] "agent" / "open-form": OpenRegister register slug (agent:
 *   defaults to the page object context's `@register`).
 * @param {string} [action.schema] "agent" / "open-form": OpenRegister schema slug (agent: defaults
 *   to the page object context's `@schema`).
 * @param {string} [action.objectId] "agent" only: the target object id (defaults to the page
 *   object context's `@objectId`). An unresolved required token BLOCKS the call (fail-closed).
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
 *   (CnActionButtons) provides it, mirroring `openExport`. On a successful save the
 *   surface navigates to `action.onSuccessRoute` (a route NAME string, or
 *   `{name, paramField?, objectParam?}`) via {@link buildOnSuccessRoute}, which merges
 *   the saved object's id into the route params so the navigation can deep-link to the
 *   created object.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [context.tokenCtx]
 *   Token context "api-call" URLs/params resolve against (the same shape
 *   `resolveFilterTokens` / `interpolateUrlTokens` take).
 * @param {Function} [context.translate] The consumer's bound `t()` — the same
 *   `cnTranslate` CnAppRoot provides to the page chrome. Applied to the
 *   manifest-authored `successMessage` / `errorMessage` of "api-call" and
 *   "agent" so their toasts follow the user's language. Omitted (or a
 *   catalogue miss) leaves the message byte-identical.
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

	case 'agent': {
		// Run a governed hermiq agent against the page object (hermiq#41). A
		// first-class companion to api-call: resolves the object context
		// (register/schema/objectId) and POSTs run-on-object. Any `confirm`
		// on the action is INTENT the rendering surface consumed BEFORE
		// dispatch (api-call / object-op precedent) — no gating here. hermiq
		// is NOT hard-required: an app-level 404 surfaces a graceful toast.
		return executeAgentAction(action, context)
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
