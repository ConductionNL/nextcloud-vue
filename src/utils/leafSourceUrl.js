/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The anchors a leaf card (notes, events, audit trail) can read from besides
 * an OpenRegister object, by `source.kind`, each as the path under the
 * OpenRegister API that holds its leaves.
 *
 * @type {Record<string, string>}
 */
const SOURCE_PATHS = Object.freeze({
	'flow-task': 'flow-tasks',
})

/**
 * Where a leaf card reads its rows when it is not anchored on an
 * OpenRegister object: a plain `endpoint` (with `{id}` filled in), or a
 * `source` such as `{ kind: 'flow-task', id }`, which reads
 * `${apiBase}/flow-tasks/{id}/{leaf}`. `source.id` may be left out or written
 * `@objectId` to take the page's record id.
 *
 * @param {object} options The card's settings.
 * @param {{kind?: string, id?: (string|number)}|null} [options.source] The anchor.
 * @param {string} [options.endpoint] A URL that replaces the anchor's own.
 * @param {string} [options.apiBase] The OpenRegister API base.
 * @param {string|number} [options.objectId] The page's record id.
 * @param {string} leaf The leaf: `notes`, `events` or `audit`.
 * @return {string|null} The URL, '' when the anchor has no id yet, or null when the card reads its object.
 * @spec openspec/changes/leaf-cards-read-a-source/specs/leaf-cards-read-a-source/spec.md#requirement-a-leaf-card-reads-a-source-or-an-endpoint
 */
export function leafSourceUrl({ source = null, endpoint = '', apiBase = '/apps/openregister/api', objectId = '' } = {}, leaf) {
	const id = sourceId(source, objectId)
	if (typeof endpoint === 'string' && endpoint !== '') {
		return endpoint.replace('{id}', encodeURIComponent(id))
	}
	if (!source || typeof source !== 'object' || !Object.hasOwn(SOURCE_PATHS, source.kind)) {
		return null
	}
	if (id === '') {
		return ''
	}
	return `${apiBase}/${SOURCE_PATHS[source.kind]}/${encodeURIComponent(id)}/${leaf}`
}

/**
 * The record a source names: its `id`, or the page's record for an empty id
 * or `@objectId`.
 *
 * @param {{id?: (string|number)}|null} source The anchor.
 * @param {string|number} objectId The page's record id.
 * @return {string} The id, or ''.
 */
function sourceId(source, objectId) {
	const written = source && typeof source === 'object' ? String(source.id ?? '').trim() : ''
	if (written === '' || written === '@objectId') {
		return String(objectId ?? '').trim()
	}
	return written
}
