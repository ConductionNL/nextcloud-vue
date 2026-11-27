/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The number a KPI widget's miniature draws from its sample content
 * (`preview`), or null when the sample holds none.
 *
 * @param {unknown} value The sample value.
 * @return {number|null} The finite number, else null.
 */
export function sampleNumber(value) {
	if (value === null || value === undefined || value === '') {
		return null
	}
	const number = Number(value)
	return Number.isFinite(number) ? number : null
}
