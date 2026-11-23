/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useObjectCopy — copy an OpenRegister object with the links it has.
 *
 * A copy that takes links along touches the new object, relation rows and
 * other objects' reference arrays. From the browser that is a dozen requests,
 * and a closed tab leaves a half-linked copy, so the copy is ONE request to
 * OpenRegister's copy endpoint (`POST .../{id}/copy`) carrying the new name and
 * the ticked link kinds. The composable also reads what the source is linked
 * to, for the dialog's list.
 *
 * Link kinds: `relationRows` (the source's relation rows, re-created on the
 * copy), `incoming` (objects that point at the source: the copy is added next
 * to the source in every array-valued reference; a single-valued reference is
 * never moved), `files` (the attached files).
 *
 * @spec openspec/changes/index-copy-with-relations/tasks.md#task-1
 */
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/** The link kinds a copy can take along. */
export const COPY_LINK_KINDS = Object.freeze(['relationRows', 'incoming', 'files'])

/** Where each kind is read from, relative to the object. */
const KIND_PATH = Object.freeze({ incoming: 'used', relationRows: 'relation-rows', files: 'files' })

/** How many linked items the dialog lists before it falls back to a count. */
export const COPY_LIST_LIMIT = 10

/**
 * The link kinds a page allows, without anything it does not know.
 *
 * @param {unknown} include The page's `copy.include`.
 * @return {string[]} The known kinds, once each.
 */
export function copyKindsOf(include) {
	return Array.isArray(include) ? include.filter((k, i, all) => COPY_LINK_KINDS.includes(k) && all.indexOf(k) === i) : []
}

/**
 * A readable title for a linked item.
 *
 * @param {object} item The linked item.
 * @return {string} Its title.
 */
function titleOf(item) {
	if (!item || typeof item !== 'object') {
		return String(item)
	}
	return String(item.title || item.name || item.filename || item.label || (item['@self'] && item['@self'].name) || item.id || item.uuid || '')
}

/**
 * @param {unknown} data A response body.
 * @return {{items: object[], total: number}} The items and the total.
 */
function envelope(data) {
	const items = Array.isArray(data) ? data : ((data && (data.results || data.files)) || [])
	const total = data && typeof data.total === 'number' ? data.total : items.length
	return { items, total }
}

/**
 * @param {object} [options] Options.
 * @param {string} [options.apiBase] Object API base.
 * @return {{links: Function, copy: Function, available: Function}} The composable.
 */
export function useObjectCopy({ apiBase = '/apps/openregister/api/objects' } = {}) {
	const objectUrl = (register, schema, id) => generateUrl(`${apiBase}/${encodeURIComponent(register)}/${encodeURIComponent(schema)}/${encodeURIComponent(id)}`)

	return {
		/**
		 * What the source is linked to, for the kinds the page includes only.
		 *
		 * @param {{register: string, schema: string, id: string}} source The source object's address.
		 * @param {string[]} include The kinds to read.
		 * @return {Promise<Object<string, {titles: string[], total: number}>>} Titles (first ten) and the count, per kind. A kind that could not be read counts as 0.
		 */
		async links(source, include) {
			const out = {}
			await Promise.all(copyKindsOf(include).map(async (kind) => {
				try {
					const response = await axios.get(`${objectUrl(source.register, source.schema, source.id)}/${KIND_PATH[kind]}`, { params: { _limit: COPY_LIST_LIMIT } })
					const { items, total } = envelope(response && response.data)
					out[kind] = { titles: items.slice(0, COPY_LIST_LIMIT).map(titleOf), total }
				} catch {
					out[kind] = { titles: [], total: 0 }
				}
			}))
			return out
		},

		/**
		 * Copy the source with the ticked kinds, in one request.
		 *
		 * @param {{register: string, schema: string, id: string}} source The source object's address.
		 * @param {string} name The new object's name.
		 * @param {string[]} include The kinds to take along.
		 * @param {object} [overrides] Field values for the copy (for example the name field).
		 * @return {Promise<{object: object, links: Array<{kind: string, id?: string, title?: string, ok: boolean, reason?: string}>}>} The new object and what happened to each link.
		 * @throws {Error} With `status` 404 or 405 when the server has no copy endpoint.
		 */
		async copy(source, name, include, overrides = {}) {
			const response = await axios.post(`${objectUrl(source.register, source.schema, source.id)}/copy`, {
				name,
				overrides,
				include: copyKindsOf(include),
			})
			const body = (response && response.data) || {}
			return { object: body.object || body, links: Array.isArray(body.links) ? body.links : [] }
		},

		/**
		 * Whether the server offers the copy endpoint: false on a 404 or 405.
		 *
		 * @param {{register: string, schema: string, id: string}} source Any object's address.
		 * @return {Promise<boolean>} True when the endpoint exists.
		 */
		async available(source) {
			try {
				await axios.options(`${objectUrl(source.register, source.schema, source.id)}/copy`)
				return true
			} catch (error) {
				const status = error && error.response && error.response.status
				return !(status === 404 || status === 405)
			}
		},
	}
}
