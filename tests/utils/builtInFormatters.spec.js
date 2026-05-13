/**
 * Tests for the built-in formatters merged into `cnFormatters` by
 * `CnAppRoot` (REQ-MIPFU-3 of `manifest-index-page-followups`).
 *
 * Locale assertions stay loose — `Intl.DateTimeFormat` output varies
 * by node version and the runtime user-agent locale. We assert
 * structural facts (no crash, non-empty for valid input, original
 * value for unparseable input, empty string for null/empty).
 */

const { formatDate, formatDateTime, formatRelativeTime, BUILT_IN_FORMATTERS } = require('../../src/utils/builtInFormatters.js')

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

	describe('BUILT_IN_FORMATTERS map', () => {
		it('exports date / datetime / relative-time entries', () => {
			expect(typeof BUILT_IN_FORMATTERS.date).toBe('function')
			expect(typeof BUILT_IN_FORMATTERS.datetime).toBe('function')
			expect(typeof BUILT_IN_FORMATTERS['relative-time']).toBe('function')
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
