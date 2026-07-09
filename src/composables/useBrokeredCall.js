// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { ref, watch, isRef } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { selectByPath } from './useGraphQL.js'

/**
 * OpenRegister credential-broker session-request path template. `{id}` is
 * replaced with the (URL-encoded) credential id. Matches the route in
 * openregister/appinfo/routes.php (`credentials#sessionRequest`).
 *
 * The endpoint is session-authenticated: `@nextcloud/axios` attaches the
 * requesttoken (CSRF) automatically, so no auth material is assembled here.
 */
export const OPENREGISTER_SESSION_REQUEST_PATH = '/apps/openregister/api/credentials/{id}/session-request'

/**
 * Build the OpenRegister session-request URL for a credential id.
 *
 * @param {string} credentialId The credential's id (owned by the current user).
 * @return {string} The generated, NC-base-prefixed URL.
 */
export function brokerSessionRequestUrl(credentialId) {
	return generateUrl(
		OPENREGISTER_SESSION_REQUEST_PATH.replace('{id}', encodeURIComponent(String(credentialId))),
	)
}

/**
 * Append a `query` object to a request path as a query string. Existing `?`
 * in the path is respected (extra params are joined with `&`). Array values
 * repeat the key (`?tag=a&tag=b`); `null` / `undefined` values are dropped.
 *
 * @param {string} path  The request path (may already contain a query string).
 * @param {object|null} [query] Key/value map of query parameters.
 * @return {string} The path with the assembled query string.
 */
export function buildBrokerPath(path, query) {
	const base = typeof path === 'string' ? path : ''
	if (!query || typeof query !== 'object' || Array.isArray(query)) return base
	const usp = new URLSearchParams()
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null) continue
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item === undefined || item === null) continue
				usp.append(key, String(item))
			}
			continue
		}
		usp.append(key, String(value))
	}
	const qs = usp.toString()
	if (!qs) return base
	return base + (base.includes('?') ? '&' : '?') + qs
}

/**
 * Parse the raw upstream response `body` string. The broker hands back the
 * upstream payload verbatim as a string; we JSON.parse it when it looks like
 * JSON (an object or array) and fall back to the raw string otherwise, so a
 * `text/plain` upstream still resolves cleanly.
 *
 * @param {*} body The `response.data.body` value (usually a string).
 * @return {*} The parsed payload, the raw string, or null.
 */
export function parseBrokeredBody(body) {
	if (body === null || body === undefined) return null
	if (typeof body !== 'string') return body
	const trimmed = body.trim()
	if (trimmed === '') return null
	if (trimmed[0] === '{' || trimmed[0] === '[') {
		try {
			return JSON.parse(trimmed)
		} catch (e) {
			return body
		}
	}
	return body
}

/**
 * Map a failure into a clean, secret-free Error. The credential secret never
 * reaches the browser (the broker holds it), but we still refuse to surface
 * the upstream body or the raw transport error verbatim — only a terse,
 * status-keyed message. 403 (broker refused) and 502 (upstream unreachable)
 * get bespoke guidance.
 *
 * @param {number|null} status The HTTP status (OR-side transport, or upstream).
 * @param {('broker'|'upstream')} origin Whether the status came from the OR call or the upstream envelope.
 * @param {Error} [cause] The original error, for a network-level fallback message only.
 * @return {Error} A clean Error safe to place in `error.value`.
 */
function cleanBrokerError(status, origin, cause) {
	if (status === 403) {
		return new Error(
			'Brokered request denied (403): the credential broker refused this request. '
			+ 'Check that you own the credential and that this app is in its allowedApps.',
		)
	}
	if (status === 502) {
		return new Error(
			'Brokered request failed (502): the external provider could not be reached '
			+ 'through the credential broker.',
		)
	}
	if (typeof status === 'number') {
		return new Error(
			origin === 'upstream'
				? `Brokered upstream responded ${status}.`
				: `Brokered request failed (${status}).`,
		)
	}
	// No status → transport/network error. The browser never held the secret,
	// so the message is safe, but keep it terse.
	return new Error('Brokered request failed: ' + ((cause && cause.message) || 'network error'))
}

/**
 * Reactive composable that fetches from an external provider THROUGH the
 * OpenRegister credential broker, so a no-code manifest app can render
 * authenticated third-party API data without ever handling the secret.
 *
 * POSTs `{ appId, method, path, headers?, body? }` to
 * `/apps/openregister/api/credentials/{credentialId}/session-request`. The
 * broker resolves the credential the current user owns, injects the secret
 * server-side, calls the upstream, and returns `{ status, headers, body }`
 * where `body` is the raw upstream response string. This composable parses
 * that body (JSON when it looks like JSON) and, when `responsePath` is set,
 * slices it with the same dot-path selector `useDataSource` uses.
 *
 * Structure mirrors `useGraphQL`: a `refetch()` that flips `loading`,
 * clears `error`, POSTs, and lands the parsed payload in `data.value`.
 * Failures (403 broker-refused, 502 upstream-unreachable, any non-2xx, or a
 * transport error) resolve into a clean, secret-free `error.value` with
 * `data.value` reset to null.
 *
 * @param {object|import('vue').Ref<object|null>|(() => object|null)} config
 *   Brokered call config. Accepts a plain object, a ref, or a getter.
 *   Shape: `{ credentialId, appId, method?, path, query?, headers?, body?, responsePath? }`.
 *   - `credentialId` (string, required): the credential the user owns.
 *   - `appId` (string, required): the manifest app id (goes to `allowedApps`).
 *   - `method` (string, default `'GET'`): upstream HTTP method.
 *   - `path` (string, required): upstream request path (may include a query string).
 *   - `query` (object, optional): appended to `path` as a query string.
 *   - `headers` (object, optional): extra upstream request headers.
 *   - `body` (string|null, optional): upstream request body.
 *   - `responsePath` (string, optional): dot-path slice of the parsed body.
 * @param {object} [options] Optional config.
 * @param {boolean} [options.immediate] Fetch on creation (default true).
 * @return {{ data: import('vue').Ref<*>, loading: import('vue').Ref<boolean>, error: import('vue').Ref<Error|null>, refetch: () => Promise<void> }}
 *   Reactive state — the SAME contract as `useGraphQL` / `useDataSource`.
 */
export function useBrokeredCall(config, options = {}) {
	const data = ref(null)
	const loading = ref(false)
	const error = ref(null)

	const immediate = options.immediate !== false

	const readConfig = () => {
		const c = isRef(config) ? config.value : (typeof config === 'function' ? config() : config)
		return c || null
	}

	const refetch = async () => {
		const c = readConfig()
		// A brokered call needs, at minimum, a credential to unlock and a path
		// to hit. Missing either is a no-op (mirrors useGraphQL's null query).
		if (!c || !c.credentialId || !c.path) {
			data.value = null
			return
		}
		loading.value = true
		error.value = null
		try {
			const url = brokerSessionRequestUrl(c.credentialId)
			const payload = {
				appId: c.appId,
				method: String(c.method || 'GET').toUpperCase(),
				path: buildBrokerPath(c.path, c.query),
			}
			if (c.headers && typeof c.headers === 'object') payload.headers = c.headers
			payload.body = c.body ?? null

			const resp = await axios.post(url, payload)
			const envelope = resp.data || {}
			const status = envelope.status

			// Non-2xx upstream status → clean error, no body leak.
			if (typeof status === 'number' && (status < 200 || status >= 300)) {
				error.value = cleanBrokerError(status, 'upstream')
				data.value = null
				return
			}

			const parsed = parseBrokeredBody(envelope.body)
			data.value = c.responsePath ? (selectByPath(parsed, c.responsePath) ?? null) : parsed
		} catch (e) {
			// OR-side transport failure (403 broker-refused, 502 upstream
			// unreachable, CSRF, network …). Never surface the raw error.
			error.value = cleanBrokerError((e && e.response && e.response.status) ?? null, 'broker', e)
			data.value = null
		} finally {
			loading.value = false
		}
	}

	if (immediate) refetch()

	// Reactive inputs re-run the request (deep — nested query/headers change).
	if (isRef(config)) watch(config, refetch, { deep: true })

	return { data, loading, error, refetch }
}
