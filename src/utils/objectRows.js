/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The rows a record holds in one of its fields, as `objectRows` names them:
 * `{ path, where?, valuePath? }`. The list at `path`, narrowed to the entry
 * matching `where` when set (`{ name: "onderzoeksstappen" }` in a case's
 * answers), its `valuePath` taken; a JSON string is decoded. Anything that is
 * not a list of objects is no rows. The record is read as the page read it, so
 * its own read rules already decided what is in it.
 *
 * @spec openspec/changes/record-list-object-rows/specs/record-list/spec.md#requirement-a-record-list-can-list-rows-the-page-record-holds
 */
import { readPath } from './readPath.js'

/**
 * Whether a declaration names rows on a record.
 *
 * @param {unknown} spec The declaration.
 * @return {boolean}
 */
export function isObjectRowsSpec(spec) {
	return Boolean(spec && typeof spec === 'object' && typeof spec.path === 'string' && spec.path !== '')
}

/**
 * The rows a record holds where `spec` points.
 *
 * @param {object|null} object The record.
 * @param {{path: string, where?: object, valuePath?: string}} spec The declaration.
 * @return {Array<object>} The rows.
 */
export function objectRowsOf(object, spec) {
	if (!object || typeof object !== 'object' || !isObjectRowsSpec(spec)) {
		return []
	}
	const valuePath = typeof spec.valuePath === 'string' && spec.valuePath !== '' ? spec.valuePath : ''
	let value = readPath(object, spec.path)
	if (spec.where && typeof spec.where === 'object') {
		const entries = Array.isArray(value) ? value : []
		const match = entries.find((entry) => entry && typeof entry === 'object'
			&& Object.entries(spec.where).every(([key, wanted]) => entry[key] === wanted))
		value = match && valuePath ? readPath(match, valuePath) : match
	} else if (valuePath) {
		value = readPath(value, valuePath)
	}
	if (typeof value === 'string') {
		try {
			value = JSON.parse(value)
		} catch {
			value = undefined
		}
	}
	return Array.isArray(value) ? value.filter((row) => row && typeof row === 'object' && !Array.isArray(row)) : []
}
