/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * labelsByField: the label of each record whose `field` holds one of the given
 * values, in one list request. For a list whose rows name another record by a
 * field other than its id (a slug, a code), so a tab or a cell can read the
 * record's name instead of the raw value.
 *
 * @module utils/labelsByField
 */

/**
 * Read a dot-path off a record.
 *
 * @param {object} row The record.
 * @param {string} path The dot-path.
 * @return {unknown} The value, or undefined.
 */
function readPath(row, path) {
	return String(path).split('.').reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), row)
}

/**
 * Label by value for the records of `register`/`schema` whose `field` is one
 * of `values`. A value no record carries is left out; a failed request
 * answers `{}`, so the caller shows the raw value.
 *
 * @param {object} source What to look up.
 * @param {string} source.register The register slug.
 * @param {string} source.schema The schema slug.
 * @param {string} source.field The field the values are matched on.
 * @param {string[]} source.values The values to label.
 * @param {string} [source.labelField] The field holding the label; else title, then name.
 * @param {(url: string, config: object) => Promise<{data: object}>} [get] HTTP GET; defaults to @nextcloud/axios.
 * @return {Promise<Object<string, string>>} Label by value.
 * @spec openspec/changes/quick-filters-from-value-field/specs/index-page/spec.md#requirement-quick-filter-tabs-can-name-a-record-matched-on-another-field
 */
export async function labelsByField(source, get) {
	const s = source || {}
	const values = [...new Set((s.values || []).filter((v) => v !== null && v !== undefined && v !== '').map(String))]
	if (!s.register || !s.schema || !s.field || values.length === 0) {
		return {}
	}
	const [{ generateUrl }, fetcher] = await Promise.all([
		import('@nextcloud/router'),
		get ? Promise.resolve(get) : import('@nextcloud/axios').then((m) => m.default.get.bind(m.default)),
	])
	const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: s.register, schema: s.schema })
	let rows
	try {
		const res = await fetcher(url, { params: { [s.field]: values, _limit: values.length } })
		rows = Array.isArray(res?.data?.results) ? res.data.results : []
	} catch {
		return {}
	}
	const out = {}
	for (const row of rows) {
		const key = readPath(row, s.field)
		if (key === undefined || key === null || !values.includes(String(key))) {
			continue
		}
		const label = (s.labelField ? readPath(row, s.labelField) : undefined) ?? row?.title ?? row?.name
		if (label !== undefined && label !== null && String(label) !== '') {
			out[String(key)] = String(label)
		}
	}
	return out
}
