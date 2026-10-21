/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * withheldValue: OpenRegister's marker for a value the reader may not see.
 *
 * A lens or a related field the reader may not read arrives as
 * `{ "@withheld": true, "reason": "access" }` instead of its value. A cell that
 * stringified it would read `[object Object]`, and an empty cell would claim
 * there is nothing there.
 *
 * @module utils/withheldValue
 */

/**
 * Whether a value is OpenRegister's withheld marker.
 *
 * @param {unknown} value The cell value.
 * @return {boolean} True for `{ "@withheld": true }`.
 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-withheld-value-reads-as-withheld
 */
export function isWithheld(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value) && value['@withheld'] === true
}

/**
 * Why a value was withheld: the marker's `reason`, or '' when it has none.
 *
 * @param {unknown} value The cell value.
 * @return {string} The reason, such as `access`.
 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-withheld-value-reads-as-withheld
 */
export function withheldReason(value) {
	return isWithheld(value) && typeof value.reason === 'string' ? value.reason : ''
}
