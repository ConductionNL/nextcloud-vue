/**
 * True when `target` is an external/absolute URL (has a scheme + `//`, is
 * protocol-relative, or is a `mailto:`/`tel:` link) rather than an in-app path.
 *
 * @param {string} target The action target to test.
 * @return {boolean}
 */
function isExternalUrl(target) {
	return /^([a-z][a-z0-9+.-]*:)?\/\//i.test(target) || /^(mailto|tel):/i.test(target)
}

/**
 * Resolve a manifest-declared action into a `(row) => void` function. Returns
 * null when the action should fall back to the page's `@action`-event-only path.
 *
 * Dispatch is chosen by the v2 `type` discriminator (app-manifest-v2 schema);
 * when `type` is absent it defaults to `'handler'` for v1.3.0 back-compat.
 *
 * Typed dispatch (`action.type`):
 *   - `navigate` → `action.target` is a URL. External/absolute URLs open in a
 *     new tab (`window.open`, `noopener`); in-app paths go through `$router.push`.
 *   - `open-page` → `action.target` is a named route; `$router.push({ name, params:{ id } })`.
 *   - `open-modal` → not wired for index actions; falls back to `@action`.
 *
 * Handler dispatch (`type: 'handler'`, the default) reads `action.handler`:
 *   - `navigate` → $router.push to `action.route` with `{ id: row[rowKey] }`,
 *     merged with the literal `action.params` map (literals win — so a
 *     "New X" action can navigate to a detail route with `{ id: "new" }`).
 *   - `emit` → null (page still bubbles `@action`).
 *   - `none` → no-op handler. Caller must also suppress the `@action` emit
 *     (handled via the `_dispatchSuppress` flag set in dispatchAction).
 *   - Anything else → looked up in `customComponents`; wrapped if a function.
 *
 * @param {object} action Manifest action descriptor.
 * @param {{ router: object, rowKey: string, customComponents: object }} ctx Dispatch context (router, rowKey, customComponents registry).
 * @return {Function|null}
 */
export function resolveActionHandler(action, ctx) {
	const type = (typeof action.type === 'string' && action.type.length > 0) ? action.type : 'handler'

	// v2 typed dispatch (schema: type ∈ handler | open-modal | open-page | navigate).
	if (type === 'navigate') {
		const target = action.target
		if (typeof target !== 'string' || target.length === 0) {
			console.warn(`[CnIndexPage] action "${action.id}" declares type:"navigate" `
				+ 'but target is missing; falling back to @action-only.')
			return null
		}
		if (isExternalUrl(target)) {
			return () => window.open(target, '_blank', 'noopener,noreferrer')
		}
		return () => ctx.router.push(target)
	}

	if (type === 'open-page') {
		const target = action.target
		if (typeof target !== 'string' || target.length === 0) {
			console.warn(`[CnIndexPage] action "${action.id}" declares type:"open-page" `
				+ 'but target is missing; falling back to @action-only.')
			return null
		}
		return (row) => ctx.router.push({ name: target, params: { id: row?.[ctx.rowKey] } })
	}

	if (type === 'open-modal') {
		console.warn(`[CnIndexPage] action "${action.id}" type:"open-modal" is not `
			+ 'supported for index-page actions; falling back to @action-only.')
		return null
	}

	// type === 'handler' (default): the v1.3.0 handler-string path.
	const name = action.handler
	if (typeof name !== 'string' || name.length === 0) return null

	if (name === 'navigate') {
		const route = action.route
		if (typeof route !== 'string' || route.length === 0) {
			console.warn(`[CnIndexPage] action "${action.id}" declares handler:"navigate" `
				+ 'but route is missing; falling back to @action-only.')
			return null
		}
		// Literal params (e.g. `{ id: "new" }`) override the default row-id
		// param, so "New X → detail with id:'new'" is expressible declaratively.
		const literalParams = (action.params && typeof action.params === 'object') ? action.params : null
		return (row) => {
			const params = { id: row[ctx.rowKey], ...(literalParams || {}) }
			ctx.router.push({ name: route, params })
		}
	}

	if (name === 'emit') return null
	if (name === 'none') return () => {}

	const fn = ctx.customComponents[name]
	if (typeof fn === 'function') {
		return (row) => fn({ actionId: action.id, item: row })
	}
	if (fn !== undefined) {
		console.warn(`[CnIndexPage] action.handler "${name}" resolved to a non-function in `
			+ 'customComponents — components belong to slot overrides; falling '
			+ 'back to @action-only.')
	}
	return null
}

/**
 * Clone an action with its handler-string resolved to a function. Function-
 * typed handlers pass through unchanged. When the resolution fails (unknown
 * registry name, `emit` keyword), the handler is stripped so CnRowActions
 * falls through to the @action-only path.
 *
 * @param {object} action Manifest action descriptor.
 * @param {{ router: object, rowKey: string, customComponents: object }} ctx Dispatch context (router, rowKey, customComponents registry).
 * @return {object} The action with its handler resolved (or stripped on failure).
 */
export function dispatchAction(action, ctx) {
	if (typeof action.handler === 'function') return action

	const type = (typeof action.type === 'string' && action.type.length > 0) ? action.type : 'handler'
	// Nothing to resolve: the default `handler` type with no handler string
	// (a pure `@action`-emit action). Typed actions (navigate / open-page /
	// open-modal) resolve below even though they carry no `handler` string.
	if (type === 'handler' && (typeof action.handler !== 'string' || action.handler.length === 0)) {
		return action
	}

	const isNone = action.handler === 'none'
	const resolved = resolveActionHandler(action, ctx)
	if (resolved) {
		return isNone
			? { ...action, handler: resolved, _dispatchSuppress: true }
			: { ...action, handler: resolved }
	}
	const { handler, ...rest } = action
	return rest
}
