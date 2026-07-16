/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Resolve the top-level property names of an OpenRegister schema, so the widget
 * config forms can offer field DROPDOWNS instead of free-text. There is no need
 * to read the schema definition: a single object carries every populated
 * property, so we sample one (`?_limit=1`) and return its non-`@self` keys.
 * Cached per `register/schema` for the page lifetime.
 *
 * @module utils/fetchSchemaProperties
 */

/** @type {Map<string, string[]>} per-(register/schema) field cache. */
const _cache = new Map()

/**
 * Fetch the property names for a register + schema (cached).
 *
 * `id` is excluded by default — most consumers (chart / stat / object-list field
 * pickers) never want to plot or group by it. The data widget's property
 * configurator passes `{ includeId: true }` so the user can also show/hide the
 * `id` column it renders.
 *
 * @param {string} register The register slug.
 * @param {string} schema The schema slug.
 * @param {object} [options] Options.
 * @param {boolean} [options.includeId] Keep the `id` field in the result.
 * @return {Promise<string[]>} The top-level field names (empty when unresolved).
 */
export async function fetchSchemaProperties(register, schema, options = {}) {
	if (!register || !schema) return []
	const { includeId = false } = options
	const key = `${register}/${schema}/${includeId ? 'id' : 'noid'}`
	if (_cache.has(key)) return _cache.get(key)
	try {
		const [{ default: axios }, { generateUrl }] = await Promise.all([
			import('@nextcloud/axios'),
			import('@nextcloud/router'),
		])
		const url = generateUrl(
			'/apps/openregister/api/objects/{register}/{schema}',
			{ register, schema },
		)
		const res = await axios.get(url, { params: { _limit: 1 } })
		const first = ((res && res.data && res.data.results) || [])[0] || {}
		const fields = Object.keys(first).filter((k) => !k.startsWith('@') && (includeId || k !== 'id'))
		_cache.set(key, fields)
		return fields
	} catch (e) {
		return []
	}
}
