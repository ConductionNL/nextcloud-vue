/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * One chip per range: the two ends of a range filter, written in the person's
 * locale, the month once when both ends share it. Several values read as a
 * list in that locale.
 *
 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-range-is-one-chip
 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-several-values-read-as-a-list
 */
import { listText, rangeChipText, rangeEnds } from '../../src/utils/filterRangeLabel.js'

const NL = {
	'{from} through {to}': '{from} tot en met {to}',
	'from {from}': 'vanaf {from}',
	'up to {to}': 'tot en met {to}',
}
const nl = (text, vars) => (NL[text] || text).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m))
const en = (text, vars) => text.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m))
const NOW = new Date(2026, 9, 22)

describe('rangeEnds', () => {
	it('reads a {from, to} value', () => {
		expect(rangeEnds({ from: '2026-10-01', to: '2026-10-31' })).toEqual({ from: '2026-10-01', to: '2026-10-31' })
	})

	it('reads gte/lte and gt/lt objects', () => {
		expect(rangeEnds({ gte: 1, lte: 5 })).toEqual({ from: 1, to: 5 })
		expect(rangeEnds({ gt: 1 })).toEqual({ from: 1, to: null })
		expect(rangeEnds({ lt: 9 })).toEqual({ from: null, to: 9 })
	})

	it('is null for anything that is not a range', () => {
		expect(rangeEnds('open')).toBe(null)
		expect(rangeEnds(['a'])).toBe(null)
		expect(rangeEnds({ foo: 1 })).toBe(null)
		expect(rangeEnds(null)).toBe(null)
	})
})

describe('rangeChipText', () => {
	it('writes the month once when both ends share it, in Dutch', () => {
		expect(rangeChipText('2026-10-01', '2026-10-31', { locale: 'nl', now: NOW, translate: nl })).toBe('1 tot en met 31 oktober')
	})

	it('writes both months when they differ, in English', () => {
		expect(rangeChipText('2026-10-01', '2026-11-15', { locale: 'en-US', now: NOW, translate: en })).toBe('October 1 through November 15')
	})

	it('adds the year when an end is not in the current year', () => {
		expect(rangeChipText('2025-12-20', '2026-01-10', { locale: 'nl', now: NOW, translate: nl })).toBe('20 december 2025 tot en met 10 januari 2026')
	})

	it('writes an open end as from or up to', () => {
		expect(rangeChipText('2026-10-01', null, { locale: 'nl', now: NOW, translate: nl })).toBe('vanaf 1 oktober')
		expect(rangeChipText(null, '2026-10-31', { locale: 'nl', now: NOW, translate: nl })).toBe('tot en met 31 oktober')
	})

	it('keeps values that are not dates as written', () => {
		expect(rangeChipText(10, 20, { locale: 'nl', now: NOW, translate: nl })).toBe('10 tot en met 20')
	})
})

describe('listText', () => {
	it('joins values as a conjunction list in the locale', () => {
		expect(listText(['actief', 'verlopend'], 'nl')).toBe('actief en verlopend')
		expect(listText(['a', 'b', 'c'], 'nl')).toBe('a, b en c')
		expect(listText(['active', 'ending'], 'en')).toBe('active and ending')
	})

	it('keeps one value as it is', () => {
		expect(listText(['Open'], 'nl')).toBe('Open')
	})

	it('joins with commas without Intl.ListFormat', () => {
		const original = Intl.ListFormat
		Intl.ListFormat = undefined
		try {
			expect(listText(['a', 'b'], 'nl')).toBe('a, b')
		} finally {
			Intl.ListFormat = original
		}
	})
})
