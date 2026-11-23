/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The CSV of a named source's rows: the table's columns, readable cells,
 * RFC 4180 quoting and no formula injection.
 *
 * @spec openspec/changes/index-named-source-export/specs/index-named-source-export/spec.md#requirement-a-named-source-list-downloads-its-rows
 */
import { cellText, csvField, rowsToCsv } from '../../src/components/CnIndexPage/rowsToCsv.js'

describe('rowsToCsv', () => {
	it('heads the columns with their labels and leaves out keyless and action columns', () => {
		const csv = rowsToCsv([{ title: 'A', due: '2026-10-20', '@self': { owner: 'pieter' } }], [
			{ key: 'title', label: 'Titel' },
			{ key: 'due', label: 'Deadline' },
			{ key: 'owner', label: 'Eigenaar' },
			{ key: 'menu', label: 'Acties', widget: 'actions' },
			{ label: 'select' },
		])
		expect(csv).toBe('Titel,Deadline,Eigenaar\r\nA,2026-10-20,pieter\r\n')
	})

	it('reads a list, a record and an empty value as text', () => {
		expect(cellText(['a', null, { name: 'b' }])).toBe('a; b')
		expect(cellText({ title: 'Zaak 1', id: 7 })).toBe('Zaak 1')
		expect(cellText(undefined)).toBe('')
		expect(cellText(0)).toBe('0')
	})

	it('quotes separators, quotes and line breaks, and neutralises formulas', () => {
		expect(csvField('a,b')).toBe('"a,b"')
		expect(csvField('say "hi"')).toBe('"say ""hi"""')
		expect(csvField('line\nbreak')).toBe('"line\nbreak"')
		expect(csvField('=SUM(A1)')).toBe('\'=SUM(A1)')
		expect(csvField('-5')).toBe('\'-5')
	})
})
