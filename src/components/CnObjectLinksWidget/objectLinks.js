/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The OpenRegister object URLs the object-links widget and its dialog use.
 */

/**
 * The objects URL of a register and schema, or of one object in it.
 *
 * @param {string} register The register slug.
 * @param {string} schema The schema slug.
 * @param {string} [id] One object's id.
 * @return {string} The app-absolute URL.
 */
export function objectsUrl(register, schema, id) {
	const base = `/apps/openregister/api/objects/${encodeURIComponent(String(register))}/${encodeURIComponent(String(schema))}`
	return id === undefined || id === null || id === '' ? base : `${base}/${encodeURIComponent(String(id))}`
}
