// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * The message a failed request actually came back with.
 *
 * An axios rejection's `message` is about the transport: "Request failed with
 * status code 400". The server's own sentence is in `response.data`, and it is
 * the one worth showing. Measured on a live instance: submitting a form with a
 * required field empty put "Request failed with status code 400" on screen
 * while OpenRegister had answered "The required property (status) is missing.
 * Please provide a value for this property or set it to null if allowed."
 *
 * Bodies come in several shapes, so this checks the ones our backends use and
 * gives up rather than guessing:
 *
 *   "a bare JSON string"            OpenRegister's validation errors
 *   { error: "…" }                  Nextcloud controller envelopes
 *   { message: "…" } / { detail: … } other handlers
 *
 * Anything else, including an HTML error page, falls through to the transport
 * message. A wall of markup helps nobody, and a truncated one is worse.
 *
 * @param {unknown} err The rejected value, usually an axios error.
 *
 * @return {string} The clearest message available, never empty.
 */
export function serverErrorMessage(err) {
	const fallback = (err && err.message) ? String(err.message) : String(err)
	const data = err && err.response ? err.response.data : undefined

	const usable = (v) => typeof v === 'string' && v.trim() !== '' && v.length <= 400 && !/^\s*</.test(v)

	if (usable(data)) {
		return data.trim()
	}

	if (data && typeof data === 'object') {
		for (const key of ['error', 'message', 'detail']) {
			if (usable(data[key])) {
				return data[key].trim()
			}
		}
	}

	return fallback
}
