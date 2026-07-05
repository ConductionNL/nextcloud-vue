/**
 * Tests for the built-in formatters merged into `cnFormatters` by
 * `CnAppRoot` (REQ-MIPFU-3 of `manifest-index-page-followups`).
 *
 * Locale assertions stay loose — `Intl.DateTimeFormat` output varies
 * by node version and the runtime user-agent locale. We assert
 * structural facts (no crash, non-empty for valid input, original
 * value for unparseable input, empty string for null/empty).
 */

const { formatDate, formatDateTime, formatRelativeTime, formatDaysSince, formatDaysUntil, BUILT_IN_FORMATTERS } = require('../../src/utils/builtInFormatters.js')

/**
 * A date `days` whole days from today, at local noon so DST shifts and
 * midnight-boundary flakiness can't move it across a day boundary.
 *
 * @param {number} days Signed day offset from today.
 * @return {Date}
 */
function daysFromToday(days) {
	const d = new Date()
	d.setHours(12, 0, 0, 0)
	d.setDate(d.getDate() + days)
	return d
}

describe('builtInFormatters', () => {
	describe('formatDate', () => {
		it('formats an ISO string into a locale date', () => {
			const out = formatDate('2026-05-13T10:00:00Z')
			expect(typeof out).toBe('string')
			expect(out.length).toBeGreaterThan(0)
			expect(out).not.toBe('2026-05-13T10:00:00Z')
		})

		it('formats a Date instance', () => {
			const out = formatDate(new Date('2026-05-13T10:00:00Z'))
			expect(typeof out).toBe('string')
			expect(out.length).toBeGreaterThan(0)
		})

		it('formats a numeric timestamp', () => {
			const out = formatDate(Date.UTC(2026, 4, 13))
			expect(typeof out).toBe('string')
			expect(out.length).toBeGreaterThan(0)
		})

		it('returns empty string for null / undefined / empty', () => {
			expect(formatDate(null)).toBe('')
			expect(formatDate(undefined)).toBe('')
			expect(formatDate('')).toBe('')
		})

		it('returns the original value for unparseable input (no crash)', () => {
			expect(formatDate('not a date')).toBe('not a date')
			expect(formatDate(new Date('garbage'))).toBe(String(new Date('garbage')))
		})
	})

	describe('formatDateTime', () => {
		it('formats an ISO string into a locale date+time', () => {
			const out = formatDateTime('2026-05-13T10:00:00Z')
			expect(typeof out).toBe('string')
			expect(out.length).toBeGreaterThan(0)
		})

		it('returns empty for null/empty, original for unparseable', () => {
			expect(formatDateTime(null)).toBe('')
			expect(formatDateTime('')).toBe('')
			expect(formatDateTime('garbage')).toBe('garbage')
		})
	})

	describe('formatRelativeTime', () => {
		it('produces a non-empty string for a past timestamp', () => {
			const out = formatRelativeTime(new Date(Date.now() - 5 * 86400000))
			expect(typeof out).toBe('string')
			expect(out.length).toBeGreaterThan(0)
		})

		it('produces a non-empty string for a future timestamp', () => {
			const out = formatRelativeTime(new Date(Date.now() + 2 * 3600000))
			expect(typeof out).toBe('string')
			expect(out.length).toBeGreaterThan(0)
		})

		it('returns empty / original for null / unparseable', () => {
			expect(formatRelativeTime(null)).toBe('')
			expect(formatRelativeTime('garbage')).toBe('garbage')
		})
	})

	describe('formatDaysUntil (daysUntil)', () => {
		it('renders "N days remaining" for a future date (plural)', () => {
			expect(formatDaysUntil(daysFromToday(5))).toBe('5 days remaining')
		})

		it('renders the singular form for exactly one day', () => {
			expect(formatDaysUntil(daysFromToday(1))).toBe('1 day remaining')
		})

		it('renders "Due today" for today', () => {
			expect(formatDaysUntil(daysFromToday(0))).toBe('Due today')
		})

		it('renders "N days overdue" for a past date (plural + singular)', () => {
			expect(formatDaysUntil(daysFromToday(-3))).toBe('3 days overdue')
			expect(formatDaysUntil(daysFromToday(-1))).toBe('1 day overdue')
		})

		it('accepts an ISO date-only string', () => {
			const iso = daysFromToday(2).toISOString().slice(0, 10)
			// Date-only ISO parses as UTC midnight; depending on the runner's
			// timezone that is "1-2 days" out — assert the remaining phrasing.
			expect(formatDaysUntil(iso)).toMatch(/days? remaining/)
		})

		it('never throws on null / empty / unparseable input', () => {
			expect(formatDaysUntil(null)).toBe('')
			expect(formatDaysUntil(undefined)).toBe('')
			expect(formatDaysUntil('')).toBe('')
			expect(formatDaysUntil('garbage')).toBe('garbage')
		})
	})

	describe('formatDaysSince (daysSince)', () => {
		it('renders "N days ago" for a past date (plural)', () => {
			expect(formatDaysSince(daysFromToday(-7))).toBe('7 days ago')
		})

		it('renders the singular form for exactly one day ago', () => {
			expect(formatDaysSince(daysFromToday(-1))).toBe('1 day ago')
		})

		it('renders "Today" for today', () => {
			expect(formatDaysSince(daysFromToday(0))).toBe('Today')
		})

		it('renders a forward phrasing for a (nonsensical) future date instead of garbage', () => {
			expect(formatDaysSince(daysFromToday(4))).toBe('In 4 days')
			expect(formatDaysSince(daysFromToday(1))).toBe('In 1 day')
		})

		it('never throws on null / empty / unparseable input', () => {
			expect(formatDaysSince(null)).toBe('')
			expect(formatDaysSince(undefined)).toBe('')
			expect(formatDaysSince('')).toBe('')
			expect(formatDaysSince('garbage')).toBe('garbage')
		})
	})

	describe('BUILT_IN_FORMATTERS map', () => {
		it('exports date / datetime / relative-time entries', () => {
			expect(typeof BUILT_IN_FORMATTERS.date).toBe('function')
			expect(typeof BUILT_IN_FORMATTERS.datetime).toBe('function')
			expect(typeof BUILT_IN_FORMATTERS['relative-time']).toBe('function')
		})

		it('exports daysSince / daysUntil entries resolvable by a column formatter name', () => {
			expect(BUILT_IN_FORMATTERS.daysSince).toBe(formatDaysSince)
			expect(BUILT_IN_FORMATTERS.daysUntil).toBe(formatDaysUntil)
		})

		it('a consumer override (spread under, consumer wins) replaces the built-in', () => {
			const consumer = { date: (v) => 'OVERRIDE:' + v }
			const merged = { ...BUILT_IN_FORMATTERS, ...consumer }
			expect(merged.date('2026-05-13')).toBe('OVERRIDE:2026-05-13')
			// non-overridden built-ins still present
			expect(typeof merged.datetime).toBe('function')
		})
	})
})
