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
 * The years a year page filter offers: the current one first, then
 * `count - 1` before it, valued and labelled `YYYY`.
 *
 * @param {number} [count] How many years to offer (default 5).
 * @param {Date} [today] The reference day (default now).
 * @return {Array<{value: string, label: string}>} The options, newest first.
 */
export function yearOptions(count = 5, today = new Date()) {
	const total = Number.isInteger(count) && count > 0 ? count : 5
	const year = today.getFullYear()
	return Array.from({ length: total }, (_, i) => ({ value: String(year - i), label: String(year - i) }))
}

/**
 * The options a page filter generates from its `type`, or null when its
 * type generates none. `type: 'quarter'` offers the last `count` quarters,
 * `type: 'year'` the last `count` years.
 *
 * @param {{type?: string, count?: number}} filter The page-filter descriptor.
 * @param {Date} [today] The reference day (default now).
 * @return {Array<{value: string, label: string}>|null} The options, or null.
 */
export function generatedPageFilterOptions(filter, today = new Date()) {
	if (filter && filter.type === 'quarter') {
		return quarterOptions(filter.count, today)
	}
	if (filter && filter.type === 'year') {
		return yearOptions(filter.count, today)
	}
	return null
}

/**
 * A month as the reader writes it, with or without its year.
 *
 * @param {Date} date A day in the month.
 * @param {boolean} withYear Whether to add the year.
 * @param {string} [locale] The locale (default the runtime's).
 * @return {string} The month, e.g. "September 2026".
 */
function monthText(date, withYear, locale) {
	const options = withYear ? { month: 'long', year: 'numeric' } : { month: 'long' }
	try {
		return new Intl.DateTimeFormat(locale || undefined, options).format(date)
	} catch {
		return new Intl.DateTimeFormat(undefined, options).format(date)
	}
}

/**
 * A run of months as text: "January through September 2026", the year
 * written once when both months share it.
 *
 * @param {Date} from A day in the first month.
 * @param {Date} to A day in the last month.
 * @param {string} [locale] The locale.
 * @return {string} The text.
 */
function monthsText(from, to, locale) {
	if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
		return monthText(to, true, locale)
	}
	const sameYear = from.getFullYear() === to.getFullYear()
	return t('nextcloud-vue', '{from} through {to}', { from: monthText(from, !sameYear, locale), to: monthText(to, true, locale) })
}

/**
 * A page filter's chosen option read as a period, for a description line
 * (`{filter.<key>}`): `months: N` as the N months ending with the current
 * one, a `YYYY-Qn` value as the quarter's months, a `YYYY` value as the
 * year, any other option as its label.
 *
 * @param {{value?: (string|number), label?: string, months?: number}|null} option The chosen option.
 * @param {Date} [today] The reference day (default now).
 * @param {string} [locale] The locale for month names.
 * @return {string} The period, '' without an option.
 * @spec openspec/changes/description-period-from-filter/specs/description-period-from-filter/spec.md#requirement-a-dashboard-description-reads-the-active-period-of-a-page-filter
 */
export function periodText(option, today = new Date(), locale = undefined) {
	if (!option || typeof option !== 'object') {
		return ''
	}
	const months = Number(option.months)
	if (Number.isInteger(months) && months > 0) {
		const from = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)
		return monthsText(from, today, locale)
	}
	const value = String(option.value ?? '')
	const quarter = value.match(/^(\d{4})-Q([1-4])$/)
	if (quarter) {
		const first = (Number(quarter[2]) - 1) * 3
		return monthsText(new Date(Number(quarter[1]), first, 1), new Date(Number(quarter[1]), first + 2, 1), locale)
	}
	if (/^\d{4}$/.test(value)) {
		return value
	}
	return typeof option.label === 'string' ? option.label : value
}

/**
 * A dashboard date range read as a period, for a description line
 * (`{dateRange}`): a calendar month preset as the month and year of the
 * range's start, a calendar quarter as its three months, a calendar year as
 * the year, any other preset as its label. A range without a preset label
 * reads as empty, so the caller can write its dates instead.
 *
 * @param {{from?: string|null, to?: string|null, preset?: string}|null} range The active range.
 * @param {{period?: string, label?: string}|null} preset The range's preset, its label already translated.
 * @param {string} [locale] The locale for month names.
 * @return {string} The period, '' when there is nothing to name.
 * @spec openspec/changes/description-period-from-date-range/specs/description-period-from-date-range/spec.md#requirement-a-dashboard-description-reads-the-active-date-range-as-a-period
 */
export function rangePeriodText(range, preset, locale = undefined) {
	if (!range || typeof range !== 'object') {
		return ''
	}
	const from = typeof range.from === 'string' && range.from !== '' ? new Date(range.from) : null
	const start = from && !Number.isNaN(from.getTime()) ? from : null
	const period = preset && preset.period
	if (start && period === 'month') {
		return monthText(start, true, locale)
	}
	if (start && period === 'quarter') {
		return monthsText(start, new Date(start.getFullYear(), start.getMonth() + 2, 1), locale)
	}
	if (start && period === 'year') {
		return String(start.getFullYear())
	}
	return preset && typeof preset.label === 'string' ? preset.label : ''
}
