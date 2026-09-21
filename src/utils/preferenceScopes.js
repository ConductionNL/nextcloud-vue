/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A preference set for everything, or for one case domain or record type.
 *
 * "Tell me when a term expires" is usually too much. "Tell me when a term
 * expires on a bezwaar" is the setting somebody actually wants, and without
 * scopes they get the choice between everything and nothing, so they choose
 * nothing and then miss the one that mattered.
 *
 * 🔴 THE NARROWER SETTING WINS, AND ONLY WHERE IT APPLIES. A scoped row is not
 * a different preference: it is the same preference asked a narrower question.
 * A notification about a bezwaar reads the bezwaar row; anything else still
 * reads the global one. A scope that replaced the global row would silence
 * every other domain the moment somebody narrowed one.
 *
 * 🔴 A PREFERENCE FOR AN EVENT THE CATALOGUE NO LONGER HAS IS NOT SHOWN, AND
 * IS DROPPED ON THE NEXT WRITE. Showing it would offer a switch for something
 * that can no longer happen. Keeping it silently would grow a store of rows
 * nobody can see and nobody can delete, and on the day the event name is
 * reused it would come back to life carrying a decision somebody made years
 * ago about something else.
 *
 * THE SHAPE IS NESTED, NOT A JOINED KEY. `{ event: { channel: { scope: value } } }`
 * with the empty string for global. A delimiter-joined key would need a
 * character that can appear in neither an event id nor a scope, and a scope is
 * a case domain or a record type chosen by whoever configured the app: there
 * is no such character anybody can promise. It also keeps the store's shape
 * the same as the component's props, so no adapter sits between them to drift.
 *
 * Pure: no store, no fetch, no Vue.
 */

/** The scope a row with no narrower answer belongs to. */
export const GLOBAL_SCOPE = ''

/**
 * The value that applies to one notification.
 *
 * @param {object} options - The call.
 * @param {object} [options.values] - `{ event: { channel: { scope: boolean } } }`.
 * @param {string} options.eventId - The event.
 * @param {string} options.channelId - The channel.
 * @param {string} [options.scope] - The scope the notification is about.
 *
 * @return {{value: ?boolean, scope: string}} The value and the scope it came
 *   from, so a surface can say which row is the one in force.
 */
export function valueForScope({ values = {}, eventId, channelId, scope = GLOBAL_SCOPE } = {}) {
	const byScope = values?.[eventId]?.[channelId] || {}

	// The narrower row first, and ONLY when one was set. An absent scoped row
	// is not a scoped "no": it means nobody has answered the narrower
	// question, so the global answer still stands.
	if (scope !== GLOBAL_SCOPE) {
		const narrow = byScope[scope]
		if (narrow !== undefined && narrow !== null) {
			return { value: narrow, scope }
		}
	}

	const global = byScope[GLOBAL_SCOPE]
	if (global !== undefined && global !== null) {
		return { value: global, scope: GLOBAL_SCOPE }
	}

	return { value: null, scope: GLOBAL_SCOPE }
}

/**
 * The rows to render for one event: the global one, then its scopes.
 *
 * @param {object} options - The call.
 * @param {object} [options.values] - The values.
 * @param {string} options.eventId - The event.
 *
 * @return {Array<object>} `{ scope, isGlobal }`, global first then scopes by name.
 */
export function scopeRowsFor({ values = {}, eventId } = {}) {
	const scopes = new Set()
	for (const byScope of Object.values(values?.[eventId] || {})) {
		for (const scope of Object.keys(byScope || {})) {
			if (scope !== GLOBAL_SCOPE) {
				scopes.add(scope)
			}
		}
	}

	// The global row ALWAYS, even when every value is scoped. It is the row
	// somebody widens back to, and a screen that hid it would leave them
	// unable to undo a narrowing.
	return [
		{ scope: GLOBAL_SCOPE, isGlobal: true },
		...[...scopes]
			.sort((left, right) => left.localeCompare(right))
			.map((scope) => ({ scope, isGlobal: false })),
	]
}

/**
 * Set one value, without disturbing the others.
 *
 * Returns a new object rather than mutating: the store hands its state to a
 * component as props, and a mutation in place would change what a component
 * is rendering before the write that justifies it has succeeded.
 *
 * @param {object} options - The call.
 * @param {object} [options.values] - The values.
 * @param {string} options.eventId - The event.
 * @param {string} options.channelId - The channel.
 * @param {string} [options.scope] - The scope.
 * @param {?boolean} options.value - The new value, or null to clear the row.
 *
 * @return {object} The new values.
 */
export function setValue({ values = {}, eventId, channelId, scope = GLOBAL_SCOPE, value } = {}) {
	const next = { ...values, [eventId]: { ...(values[eventId] || {}) } }
	next[eventId][channelId] = { ...(next[eventId][channelId] || {}) }

	if (value === null || value === undefined) {
		// Clearing is not the same as setting false. It means "go back to
		// following whatever is above me", and a row left at false would keep
		// overriding a group default somebody has since changed.
		delete next[eventId][channelId][scope]
	} else {
		next[eventId][channelId][scope] = value === true
	}

	return next
}

/**
 * The rows worth writing back.
 *
 * @param {object} options - The call.
 * @param {object} [options.values] - The values.
 * @param {Array<object>} [options.catalogue] - The events that still exist.
 *
 * @return {{kept: object, pruned: Array<string>}} What to store, and which
 *   events were dropped, so the caller can say how many rather than doing it
 *   silently.
 */
export function pruneToCatalogue({ values = {}, catalogue = [] } = {}) {
	const known = new Set(catalogue.map((event) => String(event?.id ?? '')))
	const kept = {}
	const pruned = []

	for (const [eventId, byChannel] of Object.entries(values)) {
		if (known.has(eventId) === true) {
			kept[eventId] = byChannel
			continue
		}
		pruned.push(eventId)
	}

	return { kept, pruned }
}

/**
 * The values flattened to what the matrix renders for one scope.
 *
 * The component takes `{ event: { channel: boolean } }` and knows nothing
 * about scopes: it renders one scope at a time, which is what keeps the matrix
 * a matrix rather than a three-dimensional thing nobody can read.
 *
 * @param {object} options - The call.
 * @param {object} [options.values] - The values.
 * @param {string} [options.scope] - The scope being rendered.
 *
 * @return {object} `{ event: { channel: boolean } }`.
 */
export function flattenForScope({ values = {}, scope = GLOBAL_SCOPE } = {}) {
	const flat = {}

	for (const [eventId, byChannel] of Object.entries(values)) {
		for (const channelId of Object.keys(byChannel || {})) {
			const { value } = valueForScope({ values, eventId, channelId, scope })
			if (value === null) {
				continue
			}
			flat[eventId] = flat[eventId] || {}
			flat[eventId][channelId] = value
		}
	}

	return flat
}
