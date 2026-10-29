// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * formatTermDuration — a term in words, with the extension it may get
 * (DqZaak Termijn en betaling: "4 weken, te verdagen met 2").
 *
 * @spec openspec/changes/data-widget-duration-format/specs/data-widget/spec.md
 * @spec openspec/changes/duration-time-units/specs/data-widget/spec.md#requirement-a-duration-in-hours-or-minutes-reads-in-words
 */

import { formatTermDuration } from '../../src/utils/builtInFormatters.js'

describe('formatTermDuration', () => {
	it('reads a day count of whole weeks as weeks', () => {
		expect(formatTermDuration('P28D')).toBe('4 weeks')
		expect(formatTermDuration('P10D')).toBe('10 days')
		expect(formatTermDuration('P6W')).toBe('6 weeks')
		expect(formatTermDuration('P1Y')).toBe('1 year')
	})

	it('adds the extension, saying the unit once when both share it', () => {
		expect(formatTermDuration('P28D', 'P14D')).toBe('4 weeks, extendable by 2')
		expect(formatTermDuration('P28D', 'P10D')).toBe('4 weeks, extendable by 10 days')
	})

	it('leaves out an empty or unreadable extension, and keeps an unreadable term as written', () => {
		expect(formatTermDuration('P28D', null)).toBe('4 weeks')
		expect(formatTermDuration('P28D', 'soon')).toBe('4 weeks')
		expect(formatTermDuration('P1Y2M')).toBe('P1Y2M')
		expect(formatTermDuration(null)).toBe('')
	})

	it('reads a time of hours or minutes in words, as a contact moment lasts (PqContactmoment Duur)', () => {
		expect(formatTermDuration('PT6M')).toBe('6 minutes')
		expect(formatTermDuration('PT1M')).toBe('1 minute')
		expect(formatTermDuration('PT2H')).toBe('2 hours')
		expect(formatTermDuration('PT1H30M')).toBe('PT1H30M')
	})
})
