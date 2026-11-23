/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Trailing-slash trimming, with no imports, so any module can use it.
 */

/**
 * Drop trailing `/` characters in one linear pass (a `/\/+$/` pattern
 * backtracks quadratically on a long run of slashes).
 *
 * @param {string} value The string to trim.
 * @return {string} The string without trailing slashes.
 */
export function stripTrailingSlashes(value) {
	let end = value.length
	while (end > 0 && value.charCodeAt(end - 1) === 47) {
		end--
	}
	return value.slice(0, end)
}
