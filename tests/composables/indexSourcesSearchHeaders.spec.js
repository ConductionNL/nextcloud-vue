/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten draws a sort chevron and a filter button on every column
 * header (Resultaat, Soort, Gekoppeld, Status). The search source asks for
 * header filters, makes its columns sortable and orders the rows it holds;
 * the page sorts a named source's rows when the source asks for it.
 *
 * @spec openspec/changes/search-header-sort-filter/specs/search-header-sort-filter/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url, generateOcsUrl: (url) => url }))

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { resolveIndexSource } from '../../src/composables/indexSources.js'

const KINDS = [{ id: 'cases', label: 'Cases', register: 'dossiq', schema: 'case' }]

describe('search source headers', () => {
	it('asks for header filters and for its rows to be sorted, on sortable columns', () => {
		const source = resolveIndexSource('search', { kinds: KINDS })
		expect(source.headerFilters).toBe(true)
		expect(source.sortsRows).toBe(true)
		expect(source.columns.every((column) => column.sortable === true)).toBe(true)
	})
})

describe('the index page with a named source that sorts and filters from its headers', () => {
	it('shows the header filters', () => {
		const ctx = { headerFilters: true, effectiveSchema: null, isSelfFetchMode: false, isNamedSource: true, namedSource: { headerFilters: true }, $: { vnode: { props: {} } } }
		expect(CnIndexPage.computed.tableHeaderFilters.call(ctx)).toBe(true)
		expect(CnIndexPage.computed.tableHeaderFilters.call({ ...ctx, namedSource: {} })).toBe(false)
	})

	it('keeps the order a header click asks for', () => {
		const ctx = { sortSource: { value: '' }, isSelfFetchMode: false, isNamedSource: true, namedSource: { sortsRows: true }, namedSort: { key: '', order: 'asc' }, $emit: jest.fn() }
		CnIndexPage.methods.onSortEvent.call(ctx, { key: 'title', order: 'desc' })
		expect(ctx.namedSort).toEqual({ key: 'title', order: 'desc' })
		expect(CnIndexPage.computed.effectiveSortKey.call(ctx)).toBe('title')
		expect(CnIndexPage.computed.effectiveSortOrder.call(ctx)).toBe('desc')
	})

	it('shows the rows in that order', () => {
		const rows = [{ title: 'b' }, { title: 'A' }, { title: 'c' }]
		const ctx = { isNamedSource: true, namedRows: rows, namedSource: { sortsRows: true }, namedSort: { key: 'title', order: 'asc' } }
		expect(CnIndexPage.computed.effectiveObjects.call(ctx).map((row) => row.title)).toEqual(['A', 'b', 'c'])
		expect(CnIndexPage.computed.effectiveObjects.call({ ...ctx, namedSort: { key: 'title', order: 'desc' } }).map((row) => row.title)).toEqual(['c', 'b', 'A'])
		expect(CnIndexPage.computed.effectiveObjects.call({ ...ctx, namedSort: { key: '', order: 'asc' } }).map((row) => row.title)).toEqual(['b', 'A', 'c'])
	})
})
