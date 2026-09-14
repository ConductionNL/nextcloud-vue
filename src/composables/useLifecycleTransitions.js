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
 *    `{ actions: [{ action, to, requires, description, inputs?, blocked? }] }`,
 *    ALREADY filtered to the record's current state. A move that is not in the
 *    list is not available, so anything built on this fails closed by
 *    construction: there is no flag to misread, and no allowlist to get
 *    backwards.
 *  - `requires` is the dependency-injection TAG of the guard class, copied
 *    verbatim out of the schema annotation. It is an identifier, not a
 *    sentence, and it never goes in front of a person. `description` is the
 *    sentence.
 *  - `blocked: true` is the third answer, beside "in the list" and "absent". It
 *    says the move EXISTS but cannot be taken right now, and `description`
 *    carries the reason. Absent, as it is on most actions, the move is simply
 *    available.
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
 * @return {Promise<{axios: object, generateUrl: (url: string, params?: object) => string}>} The two helpers.
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
 * Returns `{ actions, failed }`, and the caller must not collapse the two.
 *
 *  - A 404 means the schema declares no lifecycle, which is a legitimate
 *    schema. `{ actions: [], failed: false }`: there are no moves, and that is
 *    an answer.
 *  - A 500, a timeout or a dropped connection is NOT an answer.
 *    `{ actions: [], failed: true }`. Returning the same empty list for both
 *    made a failed read render as a policy decision: every stage disabled,
 *    each one explaining that it is "not reachable from the current stage",
 *    when in truth nothing had been read at all.
 *
 * @param {string|number} objectId The record's id.
 * @return {Promise<{actions: Array<{action: string, to: string, requires?: unknown, description?: string, inputs?: Array<{field: string, required?: boolean}>, blocked?: boolean}>, failed: boolean}>} The allowed actions, and whether the read failed.
 */
export async function readAvailableActions(objectId) {
	if (objectId === null || objectId === undefined || objectId === '') {
		return { actions: [], failed: false }
	}
	const { axios, generateUrl } = await http()
	const url = generateUrl('/apps/openregister/api/objects/{id}/available-actions', { id: String(objectId) })
	try {
		const res = await axios.get(url)
		const actions = res && res.data && res.data.actions
		return {
			actions: Array.isArray(actions) ? actions.filter((a) => a && typeof a === 'object' && a.action) : [],
			failed: false,
		}
	} catch (e) {
		const status = e && e.response && e.response.status
		return { actions: [], failed: status !== 404 }
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
	if (data && typeof data.error === 'string' && data.error.trim() !== '') {
		return data.error
	}
	if (data && typeof data.message === 'string' && data.message.trim() !== '') {
		return data.message
	}
	if (e && typeof e.userMessage === 'string' && e.userMessage !== '') {
		return e.userMessage
	}
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
 * One exception, and it is the reason `blocked` cannot be ignored here: an
 * AVAILABLE move beats a blocked one whatever the order. The question the map
 * answers is whether the record can reach the stage, and if any move reaches
 * it the answer is yes. Taking the first regardless would let a blocked
 * duplicate disable a stage the record can actually move to, which is a
 * refusal nobody wrote.
 *
 * @param {Array<object>} actions The allowed actions.
 * @return {Map<string, object>} The actions by target state.
 */
export function actionsByTarget(actions) {
	const byTarget = new Map()
	for (const action of Array.isArray(actions) ? actions : []) {
		if (!action || typeof action !== 'object') {
			continue
		}
		const to = action.to
		if (to === undefined || to === null || to === '') {
			continue
		}
		const key = String(to)
		if (!byTarget.has(key)) {
			byTarget.set(key, action)
		} else if (isBlockedAction(byTarget.get(key)) && !isBlockedAction(action)) {
			byTarget.set(key, action)
		}
	}
	return byTarget
}

/**
 * What an action says about itself, for a person reading the stage.
 *
 * `description` is the schema's own sentence about the move, and it is the only
 * thing in the action that was written for somebody to read. It is not a gate:
 * OpenRegister has already filtered the list, and it re-validates the POST.
 * This is the text beside the stage, nothing more.
 *
 * `REQUIRES IS AN IDENTIFIER, NOT COPY`, and it used to be concatenated onto
 * the end of this note. OpenRegister's TransitionEngine copies
 * `$spec['requires']` straight out of the schema annotation, and what apps put
 * there is the dependency-injection tag of the guard class, so the sentence
 * beside a stage ended in `OCA\Learniq\Lifecycle\AdmissionsDecisionGuard`.
 * Measured across the fleet's registers: 366 transitions declare `requires`,
 * and 107 of those declare no `description` at all, which means the class name
 * was not an ugly suffix there, it was the entire note. A move that has nothing
 * a person can read now says nothing, which is the honest answer.
 *
 * @param {object} action The action descriptor.
 * @return {string} The note, or ''.
 */
export function actionNote(action) {
	if (!action || typeof action !== 'object') {
		return ''
	}
	if (typeof action.description === 'string' && action.description.trim() !== '') {
		return action.description.trim()
	}
	return ''
}

/**
 * Whether a move is offered but refused.
 *
 * The list used to have two answers about a move: it is in it, or it is not.
 * That leaves nowhere to say "this move exists, you cannot take it right now,
 * and here is why", which is exactly what an app's guards produce. A blocked
 * action keeps its place in the list, so the stage still shows what the process
 * looks like, and `actionNote()` carries the reason.
 *
 * Only a literal `true` blocks. An action that says nothing about it is
 * available, because that is what every action said before this key existed.
 *
 * @param {object} action The action descriptor.
 * @return {boolean} True when the move is offered but refused.
 */
export function isBlockedAction(action) {
	return Boolean(action && typeof action === 'object' && action.blocked === true)
}
