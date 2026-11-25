// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.

/**
 * Resolve a canonical semantic-type URI (ADR-048) to the provider schema that
 * implements it, once per page: every form that names the same URI shares one
 * request and its answer. Which app implements a URI only changes when an app
 * is installed or removed, which reloads the page. A failed request is not
 * kept, so the next form asks again.
 *
 * @spec openspec/changes/semantic-resolve-once-per-page/specs/semantic-resolve-once-per-page/spec.md#requirement-a-semantic-type-is-resolved-once-per-page
 */

/**
 * OpenRegister semantic-type discovery endpoint. Answers HTTP 200 with
 * `{ resolved, registerSlug, schemaSlug, appId }`, also when nothing
 * implements the URI (`resolved: false`).
 */
export const SEMANTIC_RESOLVE_ENDPOINT = '/apps/openregister/api/schemas/resolve-by-implements'

/** URI -> Promise of the answer, for the lifetime of the page. */
const answers = new Map()

/**
 * The provider for a semantic-type URI. Never throws: any failure answers
 * `{ resolved: false }`, and only an answer the endpoint gave is kept.
 *
 * @param {string} uri The canonical semantic-type URI.
 * @return {Promise<{resolved: boolean, registerSlug: string|null, schemaSlug: string|null, appId: string|null}>} The provider, or `resolved: false`.
 * @spec openspec/changes/semantic-resolve-once-per-page/specs/semantic-resolve-once-per-page/spec.md#requirement-a-semantic-type-is-resolved-once-per-page
 */
export function resolveSemanticType(uri) {
	if (answers.has(uri)) {
		return answers.get(uri)
	}
	const answer = request(uri).catch((err) => {
		answers.delete(uri)
		// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
		console.error(`CnFormDialog: semantic reference resolve failed for "${uri}":`, err)
		return { resolved: false, registerSlug: null, schemaSlug: null, appId: null }
	})
	answers.set(uri, answer)
	return answer
}

/**
 * Forget every kept answer (tests, or a caller that just installed an app).
 *
 * @return {void}
 * @spec openspec/changes/semantic-resolve-once-per-page/specs/semantic-resolve-once-per-page/spec.md#requirement-a-semantic-type-is-resolved-once-per-page
 */
export function clearSemanticResolutions() {
	answers.clear()
}

/**
 * Ask the endpoint. Rejects on a transport error.
 *
 * @param {string} uri The canonical semantic-type URI.
 * @return {Promise<{resolved: boolean, registerSlug: string|null, schemaSlug: string|null, appId: string|null}>} The answer.
 */
async function request(uri) {
	const [{ default: axios }, { generateUrl }] = await Promise.all([
		import('@nextcloud/axios'),
		import('@nextcloud/router'),
	])
	const res = await axios.get(generateUrl(SEMANTIC_RESOLVE_ENDPOINT), { params: { uri } })
	const data = (res && res.data) || {}
	if (data.resolved === true && data.registerSlug && data.schemaSlug) {
		return {
			resolved: true,
			registerSlug: String(data.registerSlug),
			schemaSlug: String(data.schemaSlug),
			appId: data.appId !== null && data.appId !== undefined ? String(data.appId) : null,
		}
	}
	return { resolved: false, registerSlug: null, schemaSlug: null, appId: null }
}
