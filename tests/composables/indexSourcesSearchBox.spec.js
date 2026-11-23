/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The search page keeps its term in the search box (DqZoekresultaten): the
 * box starts with the address's `?q=`, searching again from it, and the term
 * shows as a removable "Search term: …" chip on the Active line.
 *
 * @spec openspec/changes/search-source-term-in-box/specs/index-page/spec.md#requirement-the-search-page-keeps-its-term-in-the-search-box
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url, params = {}) => `/index.php${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
	generateOcsUrl: (url) => `/ocs/v2.php/${url}`,
}))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

const KINDS = [{ id: 'cases', label: 'Zaken', register: 'dossiq', schema: 'case' }]

/**
 * The `_search` each object request asked for, in order.
 *
 * @return {Array<string>} The terms.
 */
function searchedTerms() {
	return mockGet.mock.calls.map(([, options]) => options.params._search)
}

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { total: 1, results: [{ id: 'c1', title: 'Zaak' }] } })
	window.history.replaceState({}, '', '/apps/dossiq/search?q=Lindelaan')
})

describe('search source and the search box', () => {
	it('sends the box through searchParam and starts the box with the address term', () => {
		const source = resolveIndexSource('search', { kinds: KINDS })
		expect(source.searchParam).toBe('searchTerm')
		expect(source.searchChip).toBe(true)
		expect(source.initialSearch()).toBe('Lindelaan')
	})

	it('searches what the box holds, and an emptied box searches nothing', async () => {
		const source = resolveIndexSource('search', { kinds: KINDS })
		await source.load({ kinds: KINDS, kind: 'all', searchTerm: 'Lindelaan' })
		await source.load({ kinds: KINDS, kind: 'all', searchTerm: 'Molenweg' })
		expect(searchedTerms()).toEqual(['Lindelaan', 'Molenweg'])
		expect(source.term()).toBe('Molenweg')

		mockGet.mockClear()
		await source.load({ kinds: KINDS, kind: 'all' })
		expect(mockGet).not.toHaveBeenCalled()
		expect(source.term()).toBe('')
	})

	it('still reads the address term when the box was never used', async () => {
		const source = resolveIndexSource('search', { kinds: KINDS })
		await source.load({ kinds: KINDS, kind: 'all' })
		expect(searchedTerms()).toEqual(['Lindelaan'])
	})
})

describe('the search term chip', () => {
	const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

	it('shows the term as a chip on a source that asks for one', () => {
		const ctx = { namedSourceSearches: true, namedSource: { searchChip: true }, namedSearchTerm: 'Lindelaan' }
		expect(CnIndexPage.computed.searchTermChips.call(ctx)).toEqual([
			{ key: 'search-term', label: 'Search term: Lindelaan', searchTerm: true },
		])
	})

	it('shows no chip without a term or on a source that does not ask', () => {
		expect(CnIndexPage.computed.searchTermChips.call({ namedSourceSearches: true, namedSource: { searchChip: true }, namedSearchTerm: ' ' })).toEqual([])
		expect(CnIndexPage.computed.searchTermChips.call({ namedSourceSearches: true, namedSource: {}, namedSearchTerm: 'Lindelaan' })).toEqual([])
	})

	it('empties the box when the chip is removed', () => {
		const onSearchEvent = jest.fn()
		CnIndexPage.methods.onRemoveActiveFilter.call({ onSearchEvent }, { key: 'search-term', searchTerm: true })
		expect(onSearchEvent).toHaveBeenCalledWith('')
	})
})
