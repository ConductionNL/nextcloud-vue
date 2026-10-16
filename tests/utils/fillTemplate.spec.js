/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Row templates of the record list (screens-relation-pages).
 */
import { fillTemplate, firstFilled, formatBoardDateTime } from '../../src/utils/fillTemplate.js'

jest.mock('@nextcloud/l10n', () => ({
	getLanguage: () => 'nl',
	getCanonicalLocale: () => 'nl-NL',
	translate: (_app, s, vars) => s.replace(/\{(\w+)\}/g, (match, key) => (vars && key in vars ? String(vars[key]) : match)),
}))

const NOW = new Date('2026-10-11T12:00:00')
const row = { identifier: '2026-0082', type: { title: 'Woo-verzoek' }, deadline: '2026-11-01', closedAt: null, startTime: '2026-10-04T10:52:00' }

describe('fillTemplate', () => {
	it('fills dot paths', () => {
		expect(fillTemplate('{identifier} · {type.title}', row, NOW)).toBe('2026-0082 · Woo-verzoek')
	})

	it('formats a date in the board short form', () => {
		expect(fillTemplate('Termijn {deadline|date}', row, NOW)).toBe('Termijn 1 nov')
		expect(fillTemplate('{d|date}', { d: '2025-11-18' }, NOW)).toBe('18 nov 2025')
	})

	it('formats a moment with its time', () => {
		expect(fillTemplate('{startTime|datetime}', row, NOW)).toBe('4 okt, 10:52')
		expect(formatBoardDateTime('nope', NOW)).toBe('')
	})

	it('writes a date with its short weekday', () => {
		expect(fillTemplate('{d|weekday}', { d: '2026-10-05T08:45:00' }, NOW)).toBe('ma 5 okt')
		expect(fillTemplate('{d|weekday}', { d: '2024-10-07T08:45:00' }, NOW)).toBe('ma 7 okt 2024')
		expect(fillTemplate('{d|weekday}', { d: 'nope' }, NOW)).toBe('')
	})

	it('puts "Today" before today\'s weekday date only when asked', () => {
		expect(fillTemplate('{d|weekday:today}', { d: '2026-10-11T08:45:00' }, NOW)).toBe('Today, zo 11 okt')
		expect(fillTemplate('{d|weekday}', { d: '2026-10-11T08:45:00' }, NOW)).toBe('zo 11 okt')
		expect(fillTemplate('{d|weekday:today}', { d: '2026-10-12T08:45:00' }, NOW)).toBe('ma 12 okt')
	})

	it('writes the time of day', () => {
		expect(fillTemplate('{a|time} tot {b|time}', { a: '2026-10-05T08:45:00', b: '2026-10-05T09:00:00' }, NOW)).toBe('08:45 tot 09:00')
		expect(fillTemplate('{a|time}', { a: '' }, NOW)).toBe('')
	})

	it('empties the whole template when a token has no value', () => {
		expect(fillTemplate('Klaar {closedAt|date}', row, NOW)).toBe('')
		expect(fillTemplate('{missing}', row, NOW)).toBe('')
		expect(fillTemplate('{type}', row, NOW)).toBe('')
	})

	it('returns a constant template as written', () => {
		expect(fillTemplate('Secretaris van', row, NOW)).toBe('Secretaris van')
		expect(fillTemplate('', row, NOW)).toBe('')
	})
})

describe('firstFilled', () => {
	it('takes the first template that fills', () => {
		const list = ['Klaar {closedAt|date}', 'Termijn {deadline|date}']
		expect(firstFilled(list, row, (k) => k, NOW)).toBe('Termijn 1 nov')
		expect(firstFilled(list, { ...row, closedAt: '2025-11-18' }, (k) => k, NOW)).toBe('Klaar 18 nov 2025')
	})

	it('translates each template first and accepts one string', () => {
		expect(firstFilled('Due {deadline|date}', row, (k) => k.replace('Due', 'Termijn'), NOW)).toBe('Termijn 1 nov')
		expect(firstFilled(['{missing}'], row, (k) => k, NOW)).toBe('')
	})
})
