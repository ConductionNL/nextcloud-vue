/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Generated options for a period page filter.
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * The quarter a date falls in, as `YYYY-Qn`.
 *
 * @param {Date} date The date.
 * @return {string} The quarter key.
 */
export function quarterKey(date) {
	return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
}

/**
 * The quarters a quarter page filter offers: the current one first, then
 * `count - 1` before it. Each value is `YYYY-Qn`, the form a quarterly
 * report endpoint reads; each label reads "Q2 2026".
 *
 * @param {number} [count] How many quarters to offer (default 8).
 * @param {Date} [today] The reference day (default now).
 * @return {Array<{value: string, label: string}>} The options, newest first.
 */
export function quarterOptions(count = 8, today = new Date()) {
	const total = Number.isInteger(count) && count > 0 ? count : 8
	const options = []
	let year = today.getFullYear()
	let quarter = Math.floor(today.getMonth() / 3) + 1
	for (let i = 0; i < total; i++) {
		options.push({
			value: `${year}-Q${quarter}`,
			label: t('nextcloud-vue', 'Q{quarter} {year}', { quarter, year }),
		})
		quarter -= 1
		if (quarter === 0) {
			quarter = 4
			year -= 1
		}
	}
	return options
}

/**
 * The options a page filter generates from its `type`, or null when its
 * type generates none. `type: 'quarter'` offers the last `count` quarters.
 *
 * @param {{type?: string, count?: number}} filter The page-filter descriptor.
 * @param {Date} [today] The reference day (default now).
 * @return {Array<{value: string, label: string}>|null} The options, or null.
 */
export function generatedPageFilterOptions(filter, today = new Date()) {
	if (filter && filter.type === 'quarter') {
		return quarterOptions(filter.count, today)
	}
	return null
}
