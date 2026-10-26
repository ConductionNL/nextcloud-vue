// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { applyColumnMapping, autoMapColumns, csvDelimiter, mappingChangesFile, readImportColumns, splitCsvLine } from '../../src/utils/importFile.js'

const FIELDS = [
	{ key: 'title', label: 'Title' },
	{ key: 'client', label: 'Client' },
	{ key: 'channel', label: 'Channel' },
]

describe('reading an import file', () => {
	it('reads the columns and the row count of a CSV, with either delimiter', () => {
		expect(readImportColumns('Title,Client\nA,B\nC,D\n', 'csv')).toEqual({ columns: ['Title', 'Client'], rows: 2 })
		expect(readImportColumns('﻿Title;Client;Note\r\nA;B;x\r\n', 'csv')).toEqual({ columns: ['Title', 'Client', 'Note'], rows: 1 })
	})

	it('reads the keys of a JSON array of objects in first-seen order', () => {
		expect(readImportColumns('[{"a":1},{"b":2,"a":3}]', 'json')).toEqual({ columns: ['a', 'b'], rows: 2 })
	})

	it('leaves other formats and broken files to the server', () => {
		expect(readImportColumns('xx', 'xlsx')).toBeNull()
		expect(readImportColumns('{not json', 'json')).toBeNull()
		expect(readImportColumns('{"a":1}', 'json')).toBeNull()
	})

	it('keeps a quoted delimiter and a doubled quote inside one cell', () => {
		expect(splitCsvLine('"Kerkplein, Zuiddrecht","say ""hi""",x', ',')).toEqual(['Kerkplein, Zuiddrecht', 'say "hi"', 'x'])
		expect(csvDelimiter('a;b;c,d')).toBe(';')
	})
})

describe('mapping columns to fields', () => {
	it('matches a column to a field by key or label, ignoring case and spaces', () => {
		expect(autoMapColumns(['TITLE', 'client', 'Notitie intern'], FIELDS)).toEqual({ TITLE: 'title', client: 'client', 'Notitie intern': '' })
	})

	it('knows when the file must be rewritten', () => {
		expect(mappingChangesFile({ title: 'title' })).toBe(false)
		expect(mappingChangesFile({ Onderwerp: 'title' })).toBe(true)
		expect(mappingChangesFile({ title: 'title', Note: '' })).toBe(true)
	})

	it('renames the CSV header and leaves out the unused columns', () => {
		const out = applyColumnMapping('Onderwerp;Klant;Notitie\nLosse tegels;R. Yilmaz;intern\n', 'csv', { Onderwerp: 'title', Klant: 'client', Notitie: '' })
		expect(out).toBe('title;client\nLosse tegels;R. Yilmaz\n')
	})

	it('renames JSON keys and leaves out the unused ones', () => {
		const out = applyColumnMapping('[{"Onderwerp":"A","Notitie":"x"}]', 'json', { Onderwerp: 'title', Notitie: '' })
		expect(JSON.parse(out)).toEqual([{ title: 'A' }])
	})
})
