/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * readPath: read a dot-path off an object.
 *
 * Its own module, with no imports, so the rules that read a record's fields
 * (stage, checklist, due date) do not hang on a module a host or a test may
 * replace.
 *
 * @module utils/readPath
 */

/**
 * Read a dot-path (`'a.b.c'`) off an object.
 *
 * @param {object|null} data The source object.
 * @param {string} [path] Dot-path into the object. Empty returns the object itself.
 * @return {unknown} The value at the path, or undefined when a segment is missing.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-primary-action-follows-the-stage
 */
export function readPath(data, path) {
	if (!path) {
		return data
	}
	return String(path).split('.').reduce((value, key) => (value === null || value === undefined ? value : value[key]), data)
}
