/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The fields of a conflict record that differ between the two versions it
 * holds: the one written on this device and the one stored elsewhere.
 *
 * @module utils/conflictFields
 */

import { readPath } from './readPath.js'

/**
 * Bookkeeping keys of an object snapshot, never a conflicting value.
 *
 * @type {string[]}
 */
export const SNAPSHOT_KEYS = Object.freeze(['@self', 'id', 'uuid', 'created', 'updated', 'version'])

/**
 * A value as the text a person reads.
 *
 * @param {unknown} value The value.
 * @return {string} The text, empty for no value.
 * @spec openspec/changes/conflict-resolve-card/specs/conflict-resolve-card/spec.md#requirement-a-card-shows-both-versions-of-each-differing-field
 */
export function valueText(value) {
	if (value === null || value === undefined) {
		return ''
	}
	if (typeof value === 'object') {
		return JSON.stringify(value)
	}
	return String(value)
}

/**
 * @param {unknown} value A snapshot.
 * @return {object} The snapshot, or an empty object.
 */
function asObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

/**
 * @param {unknown} list A list of field paths.
 * @return {string[]} The non-empty string entries.
 */
function pathList(list) {
	return Array.isArray(list) ? list.filter((path) => typeof path === 'string' && path !== '') : []
}

/**
 * The top-level keys of both snapshots, without bookkeeping keys.
 *
 * @param {object} local The local snapshot.
 * @param {object} office The other snapshot.
 * @return {string[]} The keys, sorted.
 */
function snapshotKeys(local, office) {
	return [...new Set([...Object.keys(local), ...Object.keys(office)])]
		.filter((key) => !SNAPSHOT_KEYS.includes(key) && !key.startsWith('_'))
		.sort()
}

/**
 * The differing fields of one conflict record.
 *
 * The fields are, in order of preference: `options.fields`, the list the
 * record names at `options.fieldsPath`, or every top-level key of the two
 * snapshots. A field whose two values read the same is left out.
 *
 * @param {object} record The conflict record.
 * @param {object} [options] Where to read.
 * @param {string} [options.localPath] Path to the device's snapshot.
 * @param {string} [options.officePath] Path to the other snapshot.
 * @param {string} [options.fieldsPath] Path to the record's list of field paths.
 * @param {string[]} [options.fields] Field paths that win over the record's.
 * @return {Array<{path: string, local: string, office: string}>} The differing fields.
 * @spec openspec/changes/conflict-resolve-card/specs/conflict-resolve-card/spec.md#requirement-a-card-shows-both-versions-of-each-differing-field
 */
export function conflictFields(record, options = {}) {
	const local = asObject(readPath(record, options.localPath || 'clientVersion'))
	const office = asObject(readPath(record, options.officePath || 'serverVersion'))
	const named = pathList(options.fields)
	const listed = named.length > 0 ? named : pathList(readPath(record, options.fieldsPath || 'conflictFields'))
	const paths = listed.length > 0 ? listed : snapshotKeys(local, office)
	return paths
		.map((path) => ({ path, local: valueText(readPath(local, path)), office: valueText(readPath(office, path)) }))
		.filter((field) => field.local !== field.office)
}
