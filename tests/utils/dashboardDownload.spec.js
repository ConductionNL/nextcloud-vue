/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard saves the figures it shows as CSV (dashboard-download-csv):
 * counts, chart groups and table rows, an error row for a failed widget, the
 * byte order mark, quoting and the file name.
 *
 * @spec openspec/changes/dashboard-download-csv/specs/dashboard-download-csv/spec.md#requirement-a-dashboard-can-be-downloaded-as-csv
 */

import { csvCell, downloadFileName, downloadPlanEntry, fetchTableRecords, readDownloadRows, recordLabel, toCsv } from '@/utils/dashboardDownload.js'

const stat = { id: 'pub', type: 'stat', content: { label: 'Published', source: { register: 'r', schema: 's', metric: 'count', filter: { status: 'published' } } } }
const donut = { id: 'by', type: 'chart', content: { chartKind: 'donut', dataSource: { register: 'r', schema: 's', aggregate: { groupBy: 'status', metric: 'count' } } } }
const table = { id: 'recent', type: 'object-table', content: { register: 'r', schema: 's', sort: { field: 'created', dir: 'desc' }, limit: 2, columns: [{ key: 'name' }, { key: 'appType' }, { key: 'status' }] } }

describe('dashboardDownload', () => {
	it('plans stat tiles, grouped charts and object tables, and leaves the rest out', () => {
		expect(downloadPlanEntry(stat, 'Published')).toMatchObject({ kind: 'value', label: 'Published', source: stat.content.source })
		expect(downloadPlanEntry(donut, 'By status')).toMatchObject({ kind: 'grouped', source: { register: 'r', schema: 's', groupBy: 'status', filter: {} } })
		expect(downloadPlanEntry(table, 'Most recent')).toMatchObject({ kind: 'rows', label: 'Most recent' })
		expect(downloadPlanEntry({ id: 't', type: 'text' }, 'T')).toBeNull()
		expect(downloadPlanEntry({ id: 'e', type: 'stat', content: { source: { kind: 'endpoint', url: '/x' } } }, 'E')).toBeNull()
		expect(downloadPlanEntry({ id: 'a', type: 'chart', content: { dataSource: { register: 'r', schema: 's', aggregate: { groupBy: 'x', metric: 'sum' } } } }, 'A')).toBeNull()
		expect(downloadPlanEntry(null, 'x')).toBeNull()
	})

	it('reads counts, groups and rows in plan order, and writes error for a failed widget', async () => {
		const plan = [
			downloadPlanEntry(stat, 'Published'),
			downloadPlanEntry(donut, 'By status'),
			downloadPlanEntry(table, 'Most recent'),
			downloadPlanEntry({ ...stat, id: 'broken', content: { ...stat.content, label: 'Broken' } }, 'Broken'),
		]
		let calls = 0
		const readers = {
			value: async () => {
				calls++
				if (calls === 2) {
					throw new Error('down')
				}
				return 5
			},
			grouped: async () => [{ key: 'published', count: 5 }, { key: 'draft', count: 2 }],
			rows: async () => [{ name: 'Pipelinq', appType: 'hybride', status: 'Gepubliceerd' }],
		}
		expect(await readDownloadRows(plan, readers)).toEqual([
			['Published', 'Published', 5],
			['By status', 'published', 5],
			['By status', 'draft', 2],
			['Most recent', 'Pipelinq | hybride | Gepubliceerd', ''],
			['Broken', 'Broken', 'error'],
		])
	})

	it('writes an empty value for a count the server does not give', async () => {
		const rows = await readDownloadRows([downloadPlanEntry(stat, 'Published')], { value: async () => null })
		expect(rows).toEqual([['Published', 'Published', '']])
	})

	it('writes the header, a byte order mark and quotes cells that need it', () => {
		const csv = toCsv([['Most recent', 'A, B | "x"', '']])
		expect(csv.startsWith('﻿widget,label,value\r\n')).toBe(true)
		expect(csv).toContain('Most recent,"A, B | ""x""",\r\n')
		expect(csvCell(3)).toBe('3')
		expect(csvCell(null)).toBe('')
		expect(csvCell('two\nlines')).toBe('"two\nlines"')
	})

	it('names the file after downloadName and the date', () => {
		const date = new Date(2026, 10, 4)
		expect(downloadFileName('buildiq-applications', date)).toBe('buildiq-applications-2026-11-04.csv')
		expect(downloadFileName('', date)).toBe('dashboard-2026-11-04.csv')
	})

	it('labels a record by its columns, else its title or name', () => {
		expect(recordLabel({ name: 'A', status: 'x' }, [{ key: 'name' }, 'status'])).toBe('A | x')
		expect(recordLabel({ title: 'T' }, [])).toBe('T')
	})

	it('reads a table with its filter, order and limit from the list endpoint', async () => {
		const client = { get: jest.fn(async () => ({ data: { results: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] } })) }
		const records = await fetchTableRecords({ ...table.content, filter: { status: 'published', created: { gte: '2026-01-01' }, owner: null } }, client)
		expect(records).toHaveLength(2)
		const [url, { params }] = client.get.mock.calls[0]
		expect(url).toContain('/apps/openregister/api/objects/r/s')
		expect(params).toEqual({ status: 'published', 'created[gte]': '2026-01-01', 'owner[isnull]': 'true', '_order[created]': 'desc', _limit: 2 })
	})
})
