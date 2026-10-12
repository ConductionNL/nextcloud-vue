/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * objectWrite: the one-object PATCH the settings widgets share.
 *
 * @module utils/objectWrite
 */

import { prefixUrl } from './headers.js'

/**
 * The OpenRegister URL of one object, or '' when register, schema or id is missing.
 *
 * @param {string|object} register Register slug.
 * @param {string|object} schema Schema slug.
 * @param {string|number} id Object id.
 * @return {string} The object URL.
 */
export function objectUrlOf(register, schema, id) {
	if (typeof register !== 'string' || typeof schema !== 'string' || !register || !schema || id === undefined || id === null || id === '') {
		return ''
	}
	return `/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}/${encodeURIComponent(String(id))}`
}

/**
 * PATCH only the given fields of one object.
 *
 * @param {string} url The object URL (see objectUrlOf).
 * @param {object} patch The fields to write.
 * @return {Promise<object>} The object the server answered with.
 */
export async function patchObject(url, patch) {
	const { default: axios } = await import('@nextcloud/axios')
	const { data } = await axios.patch(prefixUrl(url), patch)
	return data && typeof data === 'object' ? data : {}
}

/**
 * The fields of `next` that differ from `base`, compared by value.
 *
 * @param {object} base What the server last held.
 * @param {object} next What the form holds.
 * @return {object} The changed fields only.
 */
export function changedFields(base, next) {
	const patch = {}
	for (const [key, value] of Object.entries(next)) {
		if (JSON.stringify(value === undefined ? null : value) !== JSON.stringify(base[key] === undefined ? null : base[key])) {
			patch[key] = value
		}
	}
	return patch
}
