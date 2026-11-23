/**
 * Tests for resolveScopeLayout (index-columns-per-scope).
 *
 * The page's declared columns decide membership; a scope and a schema row
 * decide presentation. The scope's own value wins over the row's, and neither
 * can name a column the page no longer declares.
 */

import { columnKeyOf, resolveScopeLayout } from '../../src/utils/scopeListLayout.js'

const PAGE_COLUMNS = [
	{ key: 'identifier', label: 'Number' },
	{ key: 'requester', label: 'Requester' },
	{ key: 'deadline', label: 'Deadline' },
	{ key: 'status', label: 'Status' },
]

describe('columnKeyOf', () => {
	it('reads both column shapes and gives up on neither', () => {
		expect(columnKeyOf('deadline')).toBe('deadline')
		expect(columnKeyOf({ key: 'deadline', label: 'Due' })).toBe('deadline')
		expect(columnKeyOf({ label: 'Due' })).toBe('')
		expect(columnKeyOf(null)).toBe('')
	})
})

describe('resolveScopeLayout', () => {
	it('returns null columns when nothing declares any, so the page stands', () => {
		const out = resolveScopeLayout({ scope: { id: 'complaint' }, pageColumns: PAGE_COLUMNS })
		expect(out.columns).toBeNull()
		expect(out.sortKeys).toEqual([])
		expect(out.searchFields).toEqual([])
	})

	it('takes the scope columns in the scope order', () => {
		const out = resolveScopeLayout({
			scope: { id: 'permit', columns: ['deadline', 'identifier'] },
			pageColumns: PAGE_COLUMNS,
		})
		expect(out.columns.map(columnKeyOf)).toEqual(['deadline', 'identifier'])
	})

	it('keeps the page definition of a column the scope merely names', () => {
		const out = resolveScopeLayout({
			scope: { columns: [{ key: 'deadline', label: 'Whatever the scope calls it' }] },
			pageColumns: PAGE_COLUMNS,
		})
		expect(out.columns[0]).toBe(PAGE_COLUMNS[2])
		expect(out.columns[0].label).toBe('Deadline')
	})

	it('drops a scope column the page no longer declares', () => {
		// A scope written while the page still had a "location" column cannot
		// put it back: the page's declaration is the membership list.
		const out = resolveScopeLayout({
			scope: { columns: ['identifier', 'location'] },
			pageColumns: PAGE_COLUMNS,
		})
		expect(out.columns.map(columnKeyOf)).toEqual(['identifier'])
	})

	it('drops a row-carried column the page no longer declares', () => {
		const out = resolveScopeLayout({
			scope: { id: 'permit' },
			row: { 'x-index': { columns: ['location', 'status'] } },
			pageColumns: PAGE_COLUMNS,
		})
		expect(out.columns.map(columnKeyOf)).toEqual(['status'])
	})

	it('takes the scope columns as written when the page declares none', () => {
		const out = resolveScopeLayout({ scope: { columns: ['anything'] }, pageColumns: [] })
		expect(out.columns).toEqual(['anything'])
	})

	it('reads columns off the row when the scope declares none', () => {
		const out = resolveScopeLayout({
			scope: { id: 'permit' },
			row: { 'x-index': { columns: ['identifier', 'deadline'] } },
			pageColumns: PAGE_COLUMNS,
		})
		expect(out.columns.map(columnKeyOf)).toEqual(['identifier', 'deadline'])
	})

	it('lets the declared folder win over the row', () => {
		const out = resolveScopeLayout({
			scope: { id: 'permit', columns: ['identifier'] },
			row: { 'x-index': { columns: ['identifier', 'deadline'] } },
			pageColumns: PAGE_COLUMNS,
		})
		expect(out.columns.map(columnKeyOf)).toEqual(['identifier'])
	})

	it('lets the declared folder win per key, not per block', () => {
		const out = resolveScopeLayout({
			scope: { id: 'permit', columns: ['identifier'] },
			row: { 'x-index': { searchFields: ['requester'], defaultSort: { key: 'deadline', order: 'desc' } } },
			pageColumns: PAGE_COLUMNS,
		})
		expect(out.columns.map(columnKeyOf)).toEqual(['identifier'])
		expect(out.searchFields).toEqual(['requester'])
		expect(out.sortKeys).toEqual([{ key: 'deadline', order: 'desc' }])
	})

	it('normalises a single sort entry and both of its spellings', () => {
		expect(resolveScopeLayout({ scope: { defaultSort: { key: 'deadline' } } }).sortKeys)
			.toEqual([{ key: 'deadline', order: 'asc' }])
		expect(resolveScopeLayout({ scope: { defaultSort: { field: 'deadline', order: 'desc' } } }).sortKeys)
			.toEqual([{ key: 'deadline', order: 'desc' }])
		expect(resolveScopeLayout({ scope: { defaultSort: [{ key: 'a' }, { field: 'b', order: 'desc' }] } }).sortKeys)
			.toEqual([{ key: 'a', order: 'asc' }, { key: 'b', order: 'desc' }])
	})

	it('drops a sort entry naming no column rather than sending an empty key', () => {
		expect(resolveScopeLayout({ scope: { defaultSort: [{ order: 'desc' }, { key: 'deadline' }] } }).sortKeys)
			.toEqual([{ key: 'deadline', order: 'asc' }])
	})

	it('keeps only string search fields', () => {
		const out = resolveScopeLayout({ scope: { searchFields: ['identifier', '', 3, null, 'requester'] } })
		expect(out.searchFields).toEqual(['identifier', 'requester'])
	})

	it('survives being called with nothing at all', () => {
		expect(resolveScopeLayout()).toEqual({ columns: null, sortKeys: [], searchFields: [] })
	})
})
