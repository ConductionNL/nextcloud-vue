/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @module utils/filterQueryParams
 */

/**
 * A resolved OpenRegister filter as list query params: an operator object as
 * `key[op]`, a plain value as `key`, an empty value left out.
 *
 * @param {object} filter The filter, its tokens resolved.
 * @return {object} The query params.
 * @spec openspec/changes/conflict-resolve-card/specs/conflict-resolve-card/spec.md#requirement-a-card-shows-both-versions-of-each-differing-field
 */
export function filterQueryParams(filter) {
	const params = {}
	for (const [key, value] of Object.entries(filter)) {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			for (const [op, operand] of Object.entries(value)) {
				params[`${key}[${op}]`] = operand
			}
		} else if (value !== '' && value !== null && value !== undefined) {
			params[key] = value
		}
	}
	return params
}
