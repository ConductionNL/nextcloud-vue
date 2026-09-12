/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useLifecycleTransitions: the one place that speaks OpenRegister's lifecycle
 * contract.
 *
 * Two components render the same thing differently. `CnLifecycleActions` draws
 * the allowed moves as buttons; `CnStagesWidget` draws them as a clickable
 * timeline. That difference should be the only difference between them, so
 * fetching the allowed actions, performing a transition, and turning a refusal
 * into a sentence live here rather than twice.
 *
 * The contract, which OpenRegister owns and this module does not extend:
 *
 *  - `GET /apps/openregister/api/objects/{id}/available-actions` answers
 *    `{ actions: [{ action, to, requires, description, inputs? }] }`, ALREADY
 *    filtered to the record's current state. A move that is not in the list is
 *    not available, so anything built on this fails closed by construction:
 *    there is no flag to misread, and no allowlist to get backwards.
 *  - `POST /apps/openregister/api/objects/{id}/transition` with `{ action }`,
 *    or `{ action, data }` when the action declares
 *    `inputs: [{ field, required }]` (mirroring
 *    `x-openregister-lifecycle.transitions.<action>.inputs`).
 *  - OpenRegister re-validates server-side. A 403 or 422 carries `{ error }`,
 *    which is the sentence to show the person.
 *
 * Internal helper, not a public export.
 *
 * @module composables/useLifecycleTransitions
 */

/**
 * Load axios and the url builder together.
 *
 * Both are dynamic imports so a consumer that never performs a transition does
 * not pull them into its bundle, which is how `CnLifecycleActions` already
 * loaded them.
 *
 * @return {Promise<{axios: object, generateUrl: Function}>} The two helpers.
 */
async function http() {
	const [{ default: axios }, { generateUrl }] = await Promise.all([
		import('@nextcloud/axios'),
		import('@nextcloud/router'),
	])
	return { axios, generateUrl }
}

/**
 * The moves OpenRegister allows on a record right now.
 *
 * A missing lifecycle answers 404, which means "no transitions" rather than an
 * error: a schema without a lifecycle graph is a legitimate schema. The caller
 * decides what an empty list looks like on screen.
 *
 * @param {string|number} objectId The record's id.
 * @return {Promise<Array<{action: string, to: string, requires?: *, description?: string, inputs?: Array<{field: string, required?: boolean}>}>>} The allowed actions.
 */
export async function fetchAvailableActions(objectId) {
	if (objectId === null || objectId === undefined || objectId === '') return []
	const { axios, generateUrl } = await http()
	const url = generateUrl('/apps/openregister/api/objects/{id}/available-actions', { id: String(objectId) })
	try {
		const res = await axios.get(url)
		const actions = res && res.data && res.data.actions
		return Array.isArray(actions) ? actions.filter((a) => a && typeof a === 'object' && a.action) : []
	} catch (e) {
		return []
	}
}

/**
 * Perform a transition.
 *
 * Throws the axios error through, so the caller decides where the refusal is
 * shown. `transitionError()` turns it into a sentence.
 *
 * @param {string|number} objectId The record's id.
 * @param {string} action The action key.
 * @param {object} [data] The collected inputs, when the action declared any.
 * @return {Promise<object|null>} The saved record, when the endpoint returns one.
 */
export async function performTransition(objectId, action, data) {
	const { axios, generateUrl } = await http()
	const url = generateUrl('/apps/openregister/api/objects/{id}/transition', { id: String(objectId) })
	const body = data !== undefined ? { action, data } : { action }
	const res = await axios.post(url, body)
	return (res && res.data) || null
}

/**
 * The sentence behind a refused transition.
 *
 * OpenRegister answers a 403 or 422 with `{ error: '<reason>' }`, and that
 * reason is written for a person. Anything else falls back to the transport
 * error, then to the caller's own words.
 *
 * @param {object} e The axios error.
 * @param {string} [fallback] What to say when the body says nothing usable.
 * @return {string} The reason.
 */
export function transitionError(e, fallback = '') {
	const data = e && e.response && e.response.data
	if (data && typeof data.error === 'string' && data.error.trim() !== '') return data.error
	if (data && typeof data.message === 'string' && data.message.trim() !== '') return data.message
	if (e && typeof e.userMessage === 'string' && e.userMessage !== '') return e.userMessage
	return fallback || (e && e.message) || ''
}

/**
 * Whether an action needs input collected before it may be sent.
 *
 * @param {object} action The action descriptor.
 * @return {boolean} True when it declares at least one input.
 */
export function declaresInputs(action) {
	return Boolean(action && Array.isArray(action.inputs) && action.inputs.length > 0)
}

/**
 * Index the allowed actions by the state they lead to.
 *
 * The timeline asks "can the record go to this stage", which the action list
 * answers by its `to`. When two actions reach one state the first wins, so the
 * mapping is stable across renders rather than depending on iteration order.
 *
 * @param {Array<object>} actions The allowed actions.
 * @return {Map<string, object>} The actions by target state.
 */
export function actionsByTarget(actions) {
	const byTarget = new Map()
	for (const action of Array.isArray(actions) ? actions : []) {
		if (!action || typeof action !== 'object') continue
		const to = action.to
		if (to === undefined || to === null || to === '') continue
		const key = String(to)
		if (!byTarget.has(key)) byTarget.set(key, action)
	}
	return byTarget
}

/**
 * What an action says about itself, for a person reading the stage.
 *
 * `description` is the schema's own sentence about the move. `requires` says
 * what it needs, and arrives as a string, a list of strings, or null. Neither
 * is a gate: OpenRegister has already filtered the list, and it re-validates
 * the POST. This is the text beside the stage, nothing more.
 *
 * @param {object} action The action descriptor.
 * @return {string} The note, or ''.
 */
export function actionNote(action) {
	if (!action || typeof action !== 'object') return ''
	const parts = []
	if (typeof action.description === 'string' && action.description.trim() !== '') parts.push(action.description.trim())
	const requires = action.requires
	if (typeof requires === 'string' && requires.trim() !== '') {
		parts.push(requires.trim())
	} else if (Array.isArray(requires)) {
		for (const one of requires) {
			if (typeof one === 'string' && one.trim() !== '') parts.push(one.trim())
		}
	}
	return parts.join(' ')
}
