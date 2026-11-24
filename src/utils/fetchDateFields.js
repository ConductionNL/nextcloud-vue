/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The date fields of an OpenRegister register + schema, for a widget form's
 * optional "Date field for the period": a few records are sampled and a field
 * counts as a date when every value it holds reads as an ISO date
 * (`YYYY-MM-DD`, with or without a time). Cached per `register/schema` for
 * the page lifetime.
 *
 * @module utils/fetchDateFields
 */

/** How many records are sampled. */
const SAMPLE = 5

/** An ISO date, with or without a time. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

/** @type {Map<string, Promise<string[]>>} per-(register/schema) cache. */
const _cache = new Map()

/**
 * Whether a value is empty: null, undefined or ''.
 *
 * @param {unknown} value The value.
 * @return {boolean}
 */
function isEmpty(value) {
	return value === null || value === undefined || value === ''
}

/**
 * Whether a value reads as an ISO date.
 *
 * @param {unknown} value The value.
 * @return {boolean}
 */
function isDate(value) {
	return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))
}

/**
 * The fields that hold a date in every sampled record that has a value for
 * them; `@`-prefixed metadata is left out.
 *
 * @param {Array<object>} records The sampled records.
 * @return {string[]} The field names, sorted.
 */
export function dateFieldsOf(records) {
	const verdict = new Map()
	const valued = (Array.isArray(records) ? records : [])
		.filter((record) => record && typeof record === 'object')
		.flatMap((record) => Object.entries(record))
		.filter(([field, value]) => !field.startsWith('@') && !isEmpty(value))
	for (const [field, value] of valued) {
		verdict.set(field, (verdict.get(field) ?? true) && isDate(value))
	}
	return [...verdict.entries()].filter(([, date]) => date).map(([field]) => field).sort()
}

/**
 * Fetch the date fields of a register + schema (cached); empty when either is
 * unset or the records cannot be read.
 *
 * @param {string} register The register slug.
 * @param {string} schema The schema slug.
 * @return {Promise<string[]>} The date field names.
 */
export function fetchDateFields(register, schema) {
	if (!register || !schema) {
		return Promise.resolve([])
	}
	const key = `${register}/${schema}`
	if (!_cache.has(key)) {
		_cache.set(key, Promise.all([import('@nextcloud/axios'), import('@nextcloud/router')])
			.then(([{ default: axios }, { generateUrl }]) => axios.get(
				generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register, schema }),
				{ params: { _limit: SAMPLE } },
			))
			.then((response) => dateFieldsOf(response?.data?.results))
			.catch(() => {
				_cache.delete(key)
				return []
			}))
	}
	return _cache.get(key)
}
