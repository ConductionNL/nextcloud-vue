/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The rows of a sort option with an endpoint `source`, and the search,
 * filters and paging the index page runs over them in the browser.
 *
 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
 */

import { annotateRows, filterSourceRows, pageSourceRows, rowsFromSourceBody } from '../../src/utils/sortSourceRows.js'

const QUEUE = {
	items: [
		{ itemType: 'case', id: 'c2', deadlineTier: 'overdue', score: 9, case: { id: 'c2', title: 'Bouwen aan de Dijk', identifier: 'Z-2', status: 's1', caseType: { id: 't1' } } },
		{ itemType: 'task', id: 'k1', deadlineTier: 'warning', task: { id: 'k1', title: 'Bellen' } },
		{ itemType: 'case', id: 'c1', deadlineTier: 'normal', score: 2, case: { id: 'c1', title: 'Kappen van een eik', identifier: 'Z-1', status: 's2', caseType: { id: 't2' }, deadline: '2026-11-03' } },
	],
}

describe('rowsFromSourceBody', () => {
	it('takes each entry\'s row in the endpoint\'s order, with the carried fields', () => {
		const rows = rowsFromSourceBody(QUEUE, { rowsPath: 'items', rowPath: 'case', carry: ['deadlineTier', 'score'] })
		expect(rows.map((row) => row.id)).toEqual(['c2', 'c1'])
		expect(rows[0]).toMatchObject({ title: 'Bouwen aan de Dijk', deadlineTier: 'overdue', score: 9 })
	})

	it('reads `results` by default and takes a bare array as is', () => {
		expect(rowsFromSourceBody({ results: [{ id: 'a' }] })).toEqual([{ id: 'a' }])
		expect(rowsFromSourceBody([{ id: 'b' }, null, 'x'])).toEqual([{ id: 'b' }])
	})

	it('answers no rows for a body without entries', () => {
		expect(rowsFromSourceBody({ items: 'nope' }, { rowsPath: 'items' })).toEqual([])
		expect(rowsFromSourceBody(null)).toEqual([])
	})
})

describe('filterSourceRows', () => {
	const rows = rowsFromSourceBody(QUEUE, { rowsPath: 'items', rowPath: 'case' })

	it('matches the search case-insensitively over every top-level text', () => {
		expect(filterSourceRows(rows, { search: 'DIJK' }).map((row) => row.id)).toEqual(['c2'])
		expect(filterSourceRows(rows, { search: 'z-1' }).map((row) => row.id)).toEqual(['c1'])
	})

	it('matches only the named search fields when given', () => {
		expect(filterSourceRows(rows, { search: 'z-1', searchFields: ['title'] })).toEqual([])
	})

	it('applies the sidebar filters, a reference by its id, any of the chosen values', () => {
		expect(filterSourceRows(rows, { filters: { caseType: ['t2'] } }).map((row) => row.id)).toEqual(['c1'])
		expect(filterSourceRows(rows, { filters: { status: ['s1', 's2'] } })).toHaveLength(2)
		expect(filterSourceRows(rows, { filters: { status: [] } })).toHaveLength(2)
	})

	it('applies a date range, and an empty value passes only an empty range', () => {
		expect(filterSourceRows(rows, { filters: { deadline: { from: '2026-11-01', to: '2026-11-30' } } }).map((row) => row.id)).toEqual(['c1'])
		expect(filterSourceRows(rows, { filters: { deadline: { from: '2026-12-01' } } })).toEqual([])
	})

	it('reads a field from `@self` when the row does not carry it', () => {
		expect(filterSourceRows([{ id: 'x', '@self': { owner: 'ilse' } }], { filters: { owner: ['ilse'] } })).toHaveLength(1)
	})
})

describe('pageSourceRows', () => {
	const rows = Array.from({ length: 45 }, (value, index) => ({ id: String(index) }))

	it('cuts one page and reports the pager\'s numbers', () => {
		const page = pageSourceRows(rows, 3, 20)
		expect(page.rows.map((row) => row.id)).toEqual(['40', '41', '42', '43', '44'])
		expect(page.pagination).toEqual({ page: 3, limit: 20, total: 45, pages: 3 })
	})

	it('keeps the page within range and defaults the size', () => {
		expect(pageSourceRows(rows, 9, 20).pagination.page).toBe(3)
		expect(pageSourceRows([], 1, 0).pagination).toEqual({ page: 1, limit: 20, total: 0, pages: 1 })
	})
})

describe('annotateRows', () => {
	const source = { rowsPath: 'items', rowPath: 'case', carry: ['deadlineTier'] }
	const sourceRows = rowsFromSourceBody(QUEUE, source)

	it('copies the carried fields onto the same record in another order', () => {
		const rows = annotateRows([{ id: 'c1', title: 'Kappen' }, { id: 'c9' }, { '@self': { id: 'c2' } }], sourceRows, source)
		expect(rows[0]).toEqual({ id: 'c1', title: 'Kappen', deadlineTier: 'normal' })
		expect(rows[1]).toEqual({ id: 'c9' })
		expect(rows[2].deadlineTier).toBe('overdue')
	})

	it('leaves a field the row already holds, and the rows alone without carry', () => {
		expect(annotateRows([{ id: 'c1', deadlineTier: 'own' }], sourceRows, source)[0].deadlineTier).toBe('own')
		const rows = [{ id: 'c1' }]
		expect(annotateRows(rows, sourceRows, { rowPath: 'case' })).toBe(rows)
	})
})
