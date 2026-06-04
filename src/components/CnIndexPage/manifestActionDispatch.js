/**
 * Resolve a manifest-declared action's string `handler` into a `(row) => void`
 * function. Returns null when the action should fall back to the page's
 * `@action`-event-only path.
 *
 * Reserved keywords:
 *   - `navigate` → $router.push to `action.route` with `{ id: row[rowKey] }`.
 *   - `emit` → null (page still bubbles `@action`).
 *   - `none` → no-op handler. Caller must also suppress the `@action` emit
 *     (handled via the `_dispatchSuppress` flag set in dispatchAction).
 *   - Anything else → looked up in `customComponents`; wrapped if a function.
 *
 * @param {object} action Manifest action descriptor.
 * @param {{ router: object, rowKey: string, customComponents: object }} ctx
 * @return {Function|null}
 */
export function resolveActionHandler(action, ctx) {
	const name = action.handler
	if (typeof name !== 'string' || name.length === 0) return null

	if (name === 'navigate') {
		const route = action.route
		if (typeof route !== 'string' || route.length === 0) {
			console.warn(`[CnIndexPage] action "${action.id}" declares handler:"navigate" `
				+ 'but route is missing; falling back to @action-only.')
			return null
		}
		return (row) => {
			ctx.router.push({ name: route, params: { id: row[ctx.rowKey] } })
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
 * @param {{ router: object, rowKey: string, customComponents: object }} ctx
 * @return {object}
 */
export function dispatchAction(action, ctx) {
	if (typeof action.handler === 'function') return action
	if (typeof action.handler !== 'string' || action.handler.length === 0) return action

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
