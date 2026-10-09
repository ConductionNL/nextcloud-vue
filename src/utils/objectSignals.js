/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Signal that objects changed outside the surface showing them, such as files
 * uploaded or an object saved from an app's own modal. CnIndexPage listens and
 * refreshes its list when the register and schema match.
 *
 * @module utils/objectSignals
 */

export const OBJECTS_CHANGED_EVENT = 'cn:objects-changed'

/**
 * Announce that objects of a register and schema changed.
 *
 * Pass the same register and schema identifiers (slug or id) the listing page
 * uses. Leaving one out matches every page on that part.
 *
 * @param {object} [payload] What changed.
 * @param {string|number} [payload.register] The register slug or id.
 * @param {string|number} [payload.schema] The schema slug or id.
 * @param {string} [payload.id] The changed object's id, when there is one.
 * @return {boolean} True when the event was dispatched.
 */
export function dispatchObjectsChanged({ register, schema, id } = {}) {
	if (typeof window === 'undefined') {
		return false
	}
	const detail = {
		register: register === undefined || register === null || register === '' ? null : String(register),
		schema: schema === undefined || schema === null || schema === '' ? null : String(schema),
		id: id ? String(id) : null,
	}
	try {
		window.dispatchEvent(new CustomEvent(OBJECTS_CHANGED_EVENT, { detail }))
		return true
	} catch {
		return false
	}
}
