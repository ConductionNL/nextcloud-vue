/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * actionsDispatcher — unified action dispatcher for v2 manifest actions.
 *
 * Dispatches an action object against a context. All dispatch types are
 * handled without throwing — errors surface as console.warn calls.
 *
 * Spec: REQ-MVR-011 (manifest-v2-renderer) — unified actions dispatcher
 * / ADR-036 Decision 7
 */

/**
 * Dispatch a v2 manifest action.
 *
 * @param {object} action The action object from the manifest.
 * @param {string} [action.type] Dispatch type: "handler" | "open-modal" | "open-page" | "navigate".
 *   When absent, treated as "handler" for v1 backward compatibility.
 * @param {string} [action.handler] Registry key for "handler" type.
 * @param {Array} [action.args] Arguments spread to the handler function.
 * @param {string} [action.target] Target for "open-modal", "open-page", and "navigate" types.
 * @param {object} [action.props] Props forwarded to modal for "open-modal" type.
 *
 * @param {object} context Runtime context.
 * @param {object} [context.router] Vue Router instance. Required for "open-page" and "navigate".
 * @param {object} [context.registry] Component registry (Record<string, { kind, component }>).
 *   Required for "open-modal" type.
 * @param {object} [context.handlers] Map of handler name → function. Required for "handler" type.
 * @param {Function} [context.openModal] Function `(key, props)` that opens a modal.
 *   Required for "open-modal" type.
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

	default:
		// eslint-disable-next-line no-console
		console.warn(`[dispatchAction] Unknown action type "${type}".`)
	}
}
