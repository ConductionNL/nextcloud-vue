/**
 * The one HTTP client for Conduction Nextcloud apps (ADR-071 Decision 1).
 *
 * ADR-071 names `cnFetch` / `cnFetchJson` as library-owned and says raw
 * `fetch()` with a hand-set requesttoken in app code is review-blocking once
 * shipped. Until now the library did not actually ship them, so every app was
 * left hand-rolling the same four steps — and an ADR that mandates an
 * abstraction nobody provides produces "violations" the app cannot fix.
 *
 * This composes helpers this library already had, rather than inventing a
 * parallel idiom:
 *
 *   - {@link prefixUrl}      — Nextcloud may be served with or without
 *                              `/index.php`; an API call must use the SAME
 *                              prefix as the page or the request is rejected.
 *   - {@link buildHeaders}   — the single blessed CSRF idiom
 *                              (`requesttoken: OC.requestToken`), plus
 *                              Content-Type, the OpenRegister organisation
 *                              header and the translation-target header.
 *   - {@link buildQueryString} — consistent query serialisation.
 *
 * The shape is exactly what `visibleWhen.js` (and a dozen call sites like it)
 * already wrote by hand:
 *
 *     const response = await fetch(prefixUrl(url), { headers: buildHeaders() })
 *     if (!response.ok) throw new Error(`endpoint returned ${response.status}`)
 *     const data = await response.json()
 *
 * @module utils/cnFetch
 */

import { buildHeaders, buildQueryString, prefixUrl } from './headers.js'

/**
 * An HTTP error carrying the status and the parsed body, so a caller can
 * branch on the status without re-reading a consumed stream.
 *
 * A bare `Error(message)` loses the status, which is the single most useful
 * fact about a failed request — callers then re-parse the message string to
 * recover it, and that is how a 404-vs-403 distinction gets lost.
 */
export class CnHttpError extends Error {

	/**
	 * @param {string} message Human-readable message.
	 * @param {number} status  HTTP status code.
	 * @param {*}      body    Parsed response body, or the raw text when it was not JSON.
	 * @param {string} url     The requested URL, for logs.
	 */
	constructor(message, status, body, url) {
		super(message)
		this.name = 'CnHttpError'
		this.status = status
		this.body = body
		this.url = url
	}

}

/**
 * `fetch` with Nextcloud's URL prefix and headers applied.
 *
 * Returns the raw `Response` untouched — it does NOT throw on a non-2xx, so a
 * caller that legitimately expects a 404 (a probe) can read `response.status`
 * without exception handling. Use {@link cnFetchJson} for the common case.
 *
 * @param {string} url                 App-absolute path, e.g. `/apps/openregister/api/objects`.
 * @param {object} [options]           Standard `fetch` options.
 * @param {object} [options.query]     Serialised via {@link buildQueryString} and appended.
 * @param {object|string|null} [options.headerOptions] Passed to {@link buildHeaders}.
 * @return {Promise<Response>} The raw response.
 */
export async function cnFetch(url, options = {}) {
	const { query, headerOptions, headers, ...rest } = options
	const qs = query ? buildQueryString(query) : ''
	// Caller-supplied headers win, so a one-off Content-Type or Accept does not
	// require bypassing this helper entirely — bypassing is how apps end up
	// hand-setting requesttoken again.
	const merged = { ...buildHeaders(headerOptions), ...(headers || {}) }
	return fetch(prefixUrl(`${url}${qs}`), { ...rest, headers: merged })
}

/**
 * `cnFetch` + JSON parsing + error normalisation.
 *
 * Throws {@link CnHttpError} on a non-2xx, carrying the status and the parsed
 * body. Returns the parsed body on success.
 *
 * A 204 (and any empty body) resolves to `null` rather than throwing on an
 * empty JSON parse — DELETE endpoints in this stack answer 204, and making the
 * happy path throw is how callers learn to wrap everything in try/catch and
 * swallow real errors along the way.
 *
 * @param {string} url       App-absolute path.
 * @param {object} [options] As {@link cnFetch}.
 * @throws {CnHttpError} When the response status is not 2xx.
 * @return {Promise<*>} Parsed JSON body, or null for an empty body.
 */
export async function cnFetchJson(url, options = {}) {
	const response = await cnFetch(url, options)

	// Read the body ONCE. A Response body is a stream and can only be consumed
	// a single time, so the error path must reuse what was already read rather
	// than calling .json() again on a spent stream.
	const raw = await response.text()
	let parsed = null
	if (raw !== '') {
		try {
			parsed = JSON.parse(raw)
		} catch (e) {
			parsed = raw
		}
	}

	if (!response.ok) {
		const detail
			= parsed && typeof parsed === 'object' && typeof parsed.error === 'string'
				? parsed.error
				: response.statusText || 'request failed'
		throw new CnHttpError(
			`${url} returned ${response.status}: ${detail}`,
			response.status,
			parsed,
			url,
		)
	}

	return parsed
}
