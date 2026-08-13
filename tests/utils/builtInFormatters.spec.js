/**
 * Tests for the built-in formatters merged into `cnFormatters` by
 * `CnAppRoot` (REQ-MIPFU-3 of `manifest-index-page-followups`).
 *
 * Locale assertions stay loose — `Intl.DateTimeFormat` output varies
 * by node version and the runtime user-agent locale. We assert
 * structural facts (no crash, non-empty for valid input, original
 * value for unparseable input, empty string for null/empty).
 */

const { formatDate, formatDateTime, formatRelativeTime, formatDaysSince, formatDaysUntil, formatCurrency, formatConditionalPhrase, formatCount, BUILT_IN_FORMATTERS } = require('../../src/utils/builtInFormatters.js')

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

	describe('formatCurrency (currency)', () => {
		it('formats a number as EUR by default with two decimals', () => {
			const out = formatCurrency(1234.5)
			expect(out).toContain('€')
			expect(out).toMatch(/1.?234/)
			expect(out).toMatch(/50/)
		})

		it('honours options.currency and options.decimals', () => {
			const out = formatCurrency(1000, {}, {}, { currency: 'USD', decimals: 0 })
			expect(out).toContain('$')
			expect(out).not.toContain('.00')
		})

		it('guards an invalid currency code back to EUR (never throws)', () => {
			expect(() => formatCurrency(10, {}, {}, { currency: 'not-a-code' })).not.toThrow()
			expect(formatCurrency(10, {}, {}, { currency: 'not-a-code' })).toContain('€')
		})

		it('follows the null-safety contract', () => {
			expect(formatCurrency(null)).toBe('')
			expect(formatCurrency(undefined)).toBe('')
			expect(formatCurrency('')).toBe('')
			expect(formatCurrency('garbage')).toBe('garbage')
		})

		it('accepts numeric strings', () => {
			expect(formatCurrency('12.5')).toMatch(/12/)
		})
	})

	describe('formatConditionalPhrase (conditionalPhrase)', () => {
		const options = {
			negative: '{n} days overdue',
			zero: 'Due today',
			positive: '{n} days remaining',
		}

		it('selects the phrase by sign and substitutes the absolute value for {n}', () => {
			expect(formatConditionalPhrase(-3, {}, {}, options)).toBe('3 days overdue')
			expect(formatConditionalPhrase(0, {}, {}, options)).toBe('Due today')
			expect(formatConditionalPhrase(7, {}, {}, options)).toBe('7 days remaining')
		})

		it('substitutes every {n} occurrence', () => {
			expect(formatConditionalPhrase(2, {}, {}, { positive: '{n} + {n}' })).toBe('2 + 2')
		})

		it('falls back to the raw value when the selected phrase is missing', () => {
			expect(formatConditionalPhrase(5, {}, {}, { negative: 'x' })).toBe('5')
			expect(formatConditionalPhrase(5, {}, {}, undefined)).toBe('5')
		})

		it('follows the null-safety contract', () => {
			expect(formatConditionalPhrase(null, {}, {}, options)).toBe('')
			expect(formatConditionalPhrase('', {}, {}, options)).toBe('')
			expect(formatConditionalPhrase('garbage', {}, {}, options)).toBe('garbage')
		})
	})

	describe('formatCount', () => {
		const frames = { singular: '{n} frame', plural: '{n} frames', zero: '—' }

		it('counts object keys — the job_log stackTrace case', () => {
			expect(formatCount({ frame_0: 'a', frame_1: 'b', frame_2: 'c' }, {}, {}, frames)).toBe('3 frames')
		})

		it('counts array entries', () => {
			expect(formatCount(['a', 'b'], {}, {}, frames)).toBe('2 frames')
		})

		it('uses the singular phrase for exactly one', () => {
			expect(formatCount({ frame_0: 'a' }, {}, {}, frames)).toBe('1 frame')
		})

		it('counts a scalar as one', () => {
			expect(formatCount('boom', {}, {}, frames)).toBe('1 frame')
		})

		it('renders the zero phrase for an empty bag', () => {
			expect(formatCount({}, {}, {}, frames)).toBe('—')
			expect(formatCount([], {}, {}, frames)).toBe('—')
		})

		it('renders the zero phrase for null / empty input', () => {
			expect(formatCount(null, {}, {}, frames)).toBe('—')
			expect(formatCount(undefined, {}, {}, frames)).toBe('—')
			expect(formatCount('', {}, {}, frames)).toBe('—')
		})

		it('falls back to the bare count when no phrases are given', () => {
			expect(formatCount({ a: 1, b: 2 })).toBe('2')
			expect(formatCount(null)).toBe('')
		})

		it('falls back to the other phrase when only one is given', () => {
			expect(formatCount({ a: 1, b: 2 }, {}, {}, { singular: '{n} frame' })).toBe('2 frame')
			expect(formatCount({ a: 1 }, {}, {}, { plural: '{n} frames' })).toBe('1 frames')
		})

		it('substitutes every {n} occurrence', () => {
			expect(formatCount([1, 2], {}, {}, { plural: '{n} of {n}' })).toBe('2 of 2')
		})

		// A scalar counts as one because it IS one entry — but an empty scalar is
		// no entries, and `0` / `false` used to reach the scalar branch and render
		// the singular of a thing that is not there ("1 retry" for a 0).
		it('renders the zero phrase for a falsy scalar', () => {
			expect(formatCount(0, {}, {}, frames)).toBe('—')
			expect(formatCount(false, {}, {}, frames)).toBe('—')
		})

		it('still counts a truthy scalar as one', () => {
			expect(formatCount('boom', {}, {}, frames)).toBe('1 frame')
			expect(formatCount(7, {}, {}, frames)).toBe('1 frame')
			expect(formatCount(true, {}, {}, frames)).toBe('1 frame')
		})

		// OpenRegister hands some property types back as a JSON string, which read
		// as a single entry however many the collection held.
		it('counts a collection persisted as a JSON string', () => {
			expect(formatCount('["a","b","c"]', {}, {}, frames)).toBe('3 frames')
			expect(formatCount('{"frame_0":"a","frame_1":"b"}', {}, {}, frames)).toBe('2 frames')
			expect(formatCount('  ["a"]  ', {}, {}, frames)).toBe('1 frame')
		})

		it('renders the zero phrase for an empty JSON-string collection', () => {
			expect(formatCount('[]', {}, {}, frames)).toBe('—')
		})

		it('leaves a string that only looks like JSON as one entry', () => {
			expect(formatCount('[unclosed', {}, {}, frames)).toBe('1 frame')
			expect(formatCount('[1, 2', {}, {}, frames)).toBe('1 frame')
			// A JSON scalar is not a collection either.
			expect(formatCount('plain text', {}, {}, frames)).toBe('1 frame')
		})
	})

	describe('BUILT_IN_FORMATTERS map', () => {
		it('exports date / datetime / relative-time entries', () => {
			expect(typeof BUILT_IN_FORMATTERS.date).toBe('function')
			expect(typeof BUILT_IN_FORMATTERS.datetime).toBe('function')
			expect(typeof BUILT_IN_FORMATTERS['relative-time']).toBe('function')
		})

		it('exports currency / conditionalPhrase entries resolvable by a column formatter name', () => {
			expect(BUILT_IN_FORMATTERS.currency).toBe(formatCurrency)
			expect(BUILT_IN_FORMATTERS.conditionalPhrase).toBe(formatConditionalPhrase)
		})

		it('exports a count entry resolvable by a column formatter name', () => {
			expect(BUILT_IN_FORMATTERS.count).toBe(formatCount)
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
