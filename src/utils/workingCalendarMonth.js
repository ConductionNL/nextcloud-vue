/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * workingCalendarMonth: the weeks of one month as a working calendar draws
 * them, Monday first, each day marked working or not and with the closures
 * that fall on it.
 *
 * Pure: the closures come in from the caller (OpenRegister's calendar preview
 * computes them), nothing here knows a holiday.
 *
 * @module utils/workingCalendarMonth
 * @spec openspec/changes/working-calendar-widget/specs/working-calendar-widget/spec.md#requirement-a-working-calendar-shows-a-month
 */

/**
 * A date as `YYYY-MM-DD`.
 *
 * @param {number} year The year.
 * @param {number} month The month, 0 to 11.
 * @param {number} day The day of the month.
 * @return {string} The date.
 */
export function isoDate(year, month, day) {
	return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * The stored exceptions of a calendar as `{ date, name }`: entries are a
 * `YYYY-MM-DD` string or an object with `date` and an optional `name`.
 *
 * @param {unknown} exceptions The stored list.
 * @return {Array<{date: string, name: string}>} The exceptions.
 */
export function normaliseExceptions(exceptions) {
	return (Array.isArray(exceptions) ? exceptions : []).map((entry) => {
		if (typeof entry === 'string') {
			return { date: entry, name: '' }
		}
		if (entry && typeof entry === 'object' && typeof entry.date === 'string') {
			return { date: entry.date, name: typeof entry.name === 'string' ? entry.name : '' }
		}
		return null
	}).filter((entry) => entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
}

/**
 * The weeks of a month, Monday first. A slot outside the month is null.
 *
 * @param {number} year The year.
 * @param {number} month The month, 0 to 11.
 * @param {object} options The calendar.
 * @param {number[]} [options.workingWeekdays] ISO weekdays that work (1 = Monday); Monday to Friday by default.
 * @param {Map<string, {name: string, kind: string}>} [options.closures] Closed dates, by `YYYY-MM-DD`.
 * @param {string} [options.today] Today as `YYYY-MM-DD`.
 * @return {Array<Array<null|{date: string, day: number, weekday: number, working: boolean, closure: (null|{name: string, kind: string}), today: boolean}>>} The weeks.
 */
export function buildMonth(year, month, { workingWeekdays = [1, 2, 3, 4, 5], closures = new Map(), today = '' } = {}) {
	const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
	const firstWeekday = ((new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7) + 1
	const slots = Array.from({ length: firstWeekday - 1 }, () => null)
	for (let day = 1; day <= days; day += 1) {
		const date = isoDate(year, month, day)
		const weekday = ((firstWeekday - 1 + day - 1) % 7) + 1
		slots.push({
			date,
			day,
			weekday,
			working: workingWeekdays.includes(weekday) && !closures.has(date),
			closure: closures.get(date) || null,
			today: date === today,
		})
	}
	while (slots.length % 7 !== 0) {
		slots.push(null)
	}
	const weeks = []
	for (let i = 0; i < slots.length; i += 7) {
		weeks.push(slots.slice(i, i + 7))
	}
	return weeks
}
