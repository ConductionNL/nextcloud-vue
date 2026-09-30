import { isExternalActionTarget, resolveRegisteredHandler } from '../../utils/actionsDispatcher.js'

/**
 * Substitute `{field}` row tokens in a single manifest param value.
 *
 * A value that is exactly one token (`"{id}"`) resolves to `row.id` with its
 * type preserved, so numeric ids stay numbers. Tokens embedded in a longer
 * string (`"item-{id}"`) interpolate as text. Values without braces
 * (`"new"`) pass through verbatim — that is what keeps a literal
 * `params: { id: "new" }` working.
 *
 * @param {unknown} value The declared param value.
 * @param {object} row The row the action was triggered on.
 * @return {{ resolved: boolean, value: unknown }} `resolved` is false when a token names a field the row does not carry.
 */
function resolveRowToken(value, row) {
	if (typeof value !== 'string' || !value.includes('{')) {
		return { resolved: true, value }
	}

	const exact = value.match(/^\{([^{}]+)\}$/)
	if (exact) {
		const found = row?.[exact[1]]
		return found === undefined ? { resolved: false, value } : { resolved: true, value: found }
	}

	let resolved = true
	const interpolated = value.replace(/\{([^{}]+)\}/g, (token, field) => {
		const found = row?.[field]
		if (found === undefined) {
			resolved = false
			return token
		}
		return String(found)
	})
	return { resolved, value: resolved ? interpolated : value }
}

/**
 * The route params a `handler: "navigate"` action pushes for a row: the row id,
 * overridden by the declared `params` after the `{field}` token grammar. A
 * token naming a field the row lacks is dropped.
 *
 * @param {object} action Manifest action descriptor.
 * @param {object} row The row.
 * @param {string} rowKey The row's id field.
 * @param {boolean} warn Whether to warn about a dropped param.
 * @return {object} The params.
 */
function navigateParams(action, row, rowKey, warn) {
	const declaredParams = (action.params && typeof action.params === 'object') ? action.params : null
	const params = { id: row?.[rowKey] }
	for (const [key, declared] of Object.entries(declaredParams || {})) {
		const { resolved, value } = resolveRowToken(declared, row)
		if (resolved) {
			params[key] = value
		} else if (warn) {
			// eslint-disable-next-line no-console
			console.warn(`[CnIndexPage] action "${action.id}" param "${key}" references `
				+ `"${declared}" but the row carries no such field; dropping the param`
				+ (key === 'id' ? ' ("id" falls back to the row id).' : '.'))
		}
	}
	return params
}

/**
 * Where a navigating manifest action goes for a row, or null when the action
 * does not navigate (or is missing its target). Same resolution the
 * dispatcher uses: `type: "navigate"` → `target` (external when it leaves the
 * app), `type: "open-page"` → `{ name: target, params: { id } }`,
 * `handler: "navigate"` → `{ name: route, params }`.
 *
 * @param {object} action Manifest action descriptor.
 * @param {object} row The row.
 * @param {{rowKey: string}} ctx Dispatch context.
 * @param {boolean} [warn] Warn about params dropped for an unresolved token.
 * @return {{target: (string|object), external: boolean}|null} The target, or null.
 */
export function resolveActionTarget(action, row, ctx, warn = false) {
	if (!action || typeof action !== 'object') {
		return null
	}
	const type = (typeof action.type === 'string' && action.type.length > 0) ? action.type : 'handler'
	if (type === 'navigate' || type === 'open-page') {
		const target = action.target
		if (typeof target !== 'string' || target.length === 0) {
			return null
		}
		if (type === 'open-page') {
			return { target: { name: target, params: { id: row?.[ctx.rowKey] } }, external: false }
		}
		return { target, external: isExternalActionTarget(target) }
	}
	if (type === 'handler' && action.handler === 'navigate') {
		if (typeof action.route !== 'string' || action.route.length === 0) {
			return null
		}
		return { target: { name: action.route, params: navigateParams(action, row, ctx.rowKey, warn) }, external: false }
	}
	return null
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
 *     merged with the `action.params` map (declared params win — so a
 *     "New X" action can navigate to a detail route with `{ id: "new" }`).
 *     Param strings run the `{field}` row-token grammar: `"{id}"` resolves to
 *     `row.id` (type preserved), `"item-{id}"` interpolates, and a brace-less
 *     `"new"` stays literal. A token naming a field the row lacks is dropped
 *     with a warning instead of being pushed as a literal `%7Bid%7D` segment.
 *   - `emit` → null (page still bubbles `@action`).
 *   - `none` → no-op handler. Caller must also suppress the `@action` emit
 *     (handled via the `_dispatchSuppress` flag set in dispatchAction).
 *   - Anything else → looked up in the v2 registry, then `customComponents`;
 *     wrapped if a function.
 *
 * @param {object} action Manifest action descriptor.
 * @param {{ router: object, rowKey: string, registry?: object, customComponents: object }} ctx Dispatch context (router, rowKey, the v2 registry and the legacy customComponents map).
 * @return {((row?: object) => void)|null}
 */
export function resolveActionHandler(action, ctx) {
	const type = (typeof action.type === 'string' && action.type.length > 0) ? action.type : 'handler'

	// v2 typed dispatch (schema: type ∈ handler | open-modal | open-page | navigate).
	if (type === 'navigate') {
		const target = action.target
		if (typeof target !== 'string' || target.length === 0) {
			// eslint-disable-next-line no-console
			console.warn(`[CnIndexPage] action "${action.id}" declares type:"navigate" `
				+ 'but target is missing; falling back to @action-only.')
			return null
		}
		if (isExternalActionTarget(target)) {
			return () => window.open(target, '_blank', 'noopener,noreferrer')
		}
		return () => ctx.router.push(target)
	}

	if (type === 'open-page') {
		const target = action.target
		if (typeof target !== 'string' || target.length === 0) {
			// eslint-disable-next-line no-console
			console.warn(`[CnIndexPage] action "${action.id}" declares type:"open-page" `
				+ 'but target is missing; falling back to @action-only.')
			return null
		}
		return (row) => ctx.router.push(resolveActionTarget(action, row, ctx).target)
	}

	if (type === 'open-modal') {
		// eslint-disable-next-line no-console
		console.warn(`[CnIndexPage] action "${action.id}" type:"open-modal" is not `
			+ 'supported for index-page actions; falling back to @action-only.')
		return null
	}

	// type === 'handler' (default): the v1.3.0 handler-string path.
	const name = action.handler
	if (typeof name !== 'string' || name.length === 0) {
		return null
	}

	if (name === 'navigate') {
		const route = action.route
		if (typeof route !== 'string' || route.length === 0) {
			// eslint-disable-next-line no-console
			console.warn(`[CnIndexPage] action "${action.id}" declares handler:"navigate" `
				+ 'but route is missing; falling back to @action-only.')
			return null
		}
		// Declared params override the default row-id param, so "New X → detail
		// with id:'new'" is expressible declaratively. String values run the
		// `{field}` row-token grammar first — an unresolved token is dropped
		// rather than pushed as a literal `%7Bid%7D` path segment.
		return (row) => {
			ctx.router.push({ name: route, params: navigateParams(action, row, ctx.rowKey, true) })
		}
	}

	if (name === 'emit') {
		return null
	}
	if (name === 'none') {
		return () => {}
	}

	const fn = resolveRegisteredHandler(name, ctx.registry, ctx.customComponents)
	if (typeof fn === 'function') {
		return (row) => fn({ actionId: action.id, item: row })
	}
	if ((ctx.registry || {})[name] !== undefined || (ctx.customComponents || {})[name] !== undefined) {
		// eslint-disable-next-line no-console
		console.warn(`[CnIndexPage] action.handler "${name}" resolved to a non-function in `
			+ 'the registry or customComponents — components belong to slot '
			+ 'overrides; falling back to @action-only.')
	}
	return null
}

/**
 * The CnRowActions link fields for a navigating action, so it renders as a
 * real link: `href` + `linkTarget` for an external URL, a per-row `to` for an
 * in-app target. Empty for anything else, or when the action already carries
 * its own `href` / `to`.
 *
 * @param {object} action Manifest action descriptor.
 * @param {{rowKey: string}} ctx Dispatch context.
 * @return {object} The fields to merge onto the dispatched action.
 */
function linkFields(action, ctx) {
	if (action.href || action.to) {
		return {}
	}
	const probe = resolveActionTarget(action, null, ctx)
	if (!probe) {
		return {}
	}
	if (probe.external) {
		return { href: probe.target, linkTarget: '_blank' }
	}
	return { to: (row) => resolveActionTarget(action, row, ctx)?.target ?? null }
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
	if (typeof action.handler === 'function') {
		return action
	}

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
		if (isNone) {
			return { ...action, handler: resolved, _dispatchSuppress: true }
		}
		return { ...action, handler: resolved, ...linkFields(action, ctx) }
	}
	const { handler, ...rest } = action
	return rest
}
