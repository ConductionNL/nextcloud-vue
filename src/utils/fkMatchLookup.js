/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Find one OpenRegister object by a property value (a person by their user
 * id), cached per register, schema, property and value for the page's life,
 * so a column of rows naming the same person asks once.
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

const cache = new Map()

/**
 * The first object of `register`/`schema` whose `field` equals `value`, or
 * null when there is none or the read fails.
 *
 * @param {string} register The register slug.
 * @param {string} schema The schema slug.
 * @param {string} field The property to match.
 * @param {string} value The value it must have.
 * @return {Promise<object|null>} The object, or null.
 * @spec openspec/changes/fk-resolve-lookup/specs/fk-resolve-lookup/spec.md#requirement-a-reference-cell-can-look-its-record-up-by-a-property
 */
export function findByMatch(register, schema, field, value) {
	const key = JSON.stringify([register, schema, field, value])
	if (!cache.has(key)) {
		const url = generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}`)
		cache.set(key, axios.get(url, { params: { [field]: value, _limit: 1 } })
			.then((response) => {
				const body = response && response.data ? response.data : {}
				const hits = Array.isArray(body.results) ? body.results : (Array.isArray(body.objects) ? body.objects : [])
				return hits[0] && typeof hits[0] === 'object' ? hits[0] : null
			})
			.catch(() => null))
	}
	return cache.get(key)
}

/** Forget every cached lookup. */
export function clearFkMatchCache() {
	cache.clear()
}
