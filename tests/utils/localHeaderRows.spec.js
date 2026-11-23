/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Header sort and filter on rows the table already holds.
 */
import { localHeaderRows } from '../../src/utils/localHeaderRows.js'

const ROWS = [
	{ title: 'Openbare ruimte', properties: 9, views: ['Kaart', 'Tabel'], caseTypes: 1 },
	{ title: 'Boom', properties: 11, views: ['Kaart'], caseTypes: 3 },
	{ title: 'Lichtmast', properties: null, views: [], caseTypes: 2 },
]

describe('localHeaderRows', () => {
	it('returns the rows unchanged without a sort or filter', () => {
		expect(localHeaderRows(ROWS, null, {})).toBe(ROWS)
	})

	it('sorts text ascending and descending', () => {
		expect(localHeaderRows(ROWS, { field: 'title', dir: 'asc' }, {}).map((r) => r.title)).toEqual(['Boom', 'Lichtmast', 'Openbare ruimte'])
		expect(localHeaderRows(ROWS, { field: 'title', dir: 'desc' }, {}).map((r) => r.title)).toEqual(['Openbare ruimte', 'Lichtmast', 'Boom'])
	})

	it('sorts numbers by value and puts empty values last', () => {
		expect(localHeaderRows(ROWS, { field: 'properties', dir: 'asc' }, {}).map((r) => r.title)).toEqual(['Openbare ruimte', 'Boom', 'Lichtmast'])
	})

	it('filters a text column by a contained term, case-insensitive', () => {
		expect(localHeaderRows(ROWS, null, { 'title[like]': ['MAST'] }).map((r) => r.title)).toEqual(['Lichtmast'])
	})

	it('filters an array column on its joined items', () => {
		expect(localHeaderRows(ROWS, null, { 'views[like]': ['tabel'] }).map((r) => r.title)).toEqual(['Openbare ruimte'])
	})

	it('filters a number range and an exact value', () => {
		expect(localHeaderRows(ROWS, null, { 'caseTypes[gte]': ['2'], 'caseTypes[lte]': [] }).map((r) => r.title)).toEqual(['Boom', 'Lichtmast'])
		expect(localHeaderRows(ROWS, null, { caseTypes: ['3'] }).map((r) => r.title)).toEqual(['Boom'])
	})
})
