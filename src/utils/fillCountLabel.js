// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
import { readPath } from './readPath.js'

/**
 * Fill a list label's counts: `{total}` is the list's total, and
 * `{count:<field>=<value>}` the rows whose field reads that value
 * ("{count:status=done} van {total} stappen klaar"). The count reads the rows
 * given, so it is exact when they are the whole list. Other placeholders stay.
 *
 * @param {string} label The label, already translated.
 * @param {number} total The list's total.
 * @param {Array<object>} rows The loaded rows.
 * @return {string} The text.
 * @spec openspec/changes/widget-header-subtitle-counts/specs/widget-header-subtitle-counts/spec.md#requirement-a-list-can-say-its-counts-under-its-card-title
 */
export function fillCountLabel(label, total, rows) {
	return String(label)
		.replace(/\{total\}/g, String(total))
		.replace(/\{count:([^=}]+)=([^}]*)\}/g, (match, field, value) => {
			const wanted = value.trim()
			return String((rows || []).filter((row) => String(readPath(row, field.trim())) === wanted).length)
		})
}
