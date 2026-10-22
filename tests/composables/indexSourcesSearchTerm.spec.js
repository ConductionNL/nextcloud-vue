/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten: the term in `?q=` stands in the search field, a
 * "Zoekterm: Lindelaan" chip on the Active line names it with its remove
 * button ("Filter verwijderen: Zoekterm: Lindelaan"), and searching again or
 * removing the chip searches for what the field holds.
 *
 * @spec openspec/changes/search-term-in-field/specs/search-term-in-field/spec.md
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url) => `/index.php${url}`,
	generateOcsUrl: (url) => `/ocs/v2.php/${url}`,
}))

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { resolveIndexSource } from '../../src/composables/indexSources.js'

const KINDS = [{ id: 'cases', label: 'Cases', register: 'dossiq', schema: 'case' }]

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { total: 1, results: [{ id: 'c1', title: 'Verlichting fietspad Lindelaan' }] } })
	window.history.replaceState({}, '', '/apps/dossiq/search?q=Lindelaan')
})

describe('search source: the term and the search field', () => {
	it('searches with the page\'s search field and offers the term in the address as its first value', () => {
		const source = resolveIndexSource('search', { kinds: KINDS })
		expect(source.searchParam).toBe('term')
		expect(source.initialSearch()).toBe('Lindelaan')
		expect(source.termChip).toBe(true)
	})

	it('searches for what the field holds, also when it is cleared', async () => {
		const source = resolveIndexSource('search', { kinds: KINDS })
		await source.load({ kinds: KINDS, kind: 'all', term: 'Lindelaan' })
		expect(source.term()).toBe('Lindelaan')
		await source.load({ kinds: KINDS, kind: 'all', term: 'Kerkplein' })
		expect(source.term()).toBe('Kerkplein')
		await source.load({ kinds: KINDS, kind: 'all' })
		expect(source.term()).toBe('')
		expect(source.rows()).toEqual([])
	})
})

describe('the Active line names the search term', () => {
	/**
	 * A board-look index page context on a named source.
	 *
	 * @param {object} extra Overrides.
	 * @return {object} The context.
	 */
	function page(extra = {}) {
		return {
			isBoardLook: true,
			effectiveSchema: null,
			quickFilterActiveChips: [],
			effectiveActiveFilters: {},
			isFixedFilter: () => false,
			activeFilterValueLabel: (key, value) => String(value),
			cnTranslate: (key) => key,
			namedSourceSearches: true,
			namedSource: { termChip: true },
			namedSearchTerm: 'Lindelaan',
			...extra,
		}
	}

	it('shows a removable "Search term" chip while a term is searched', () => {
		expect(CnIndexPage.computed.activeFilterChips.call(page())).toEqual([{ key: 'search-term', label: 'Search term: Lindelaan' }])
	})

	it('shows none without a term, or for a source that does not ask for it', () => {
		expect(CnIndexPage.computed.activeFilterChips.call(page({ namedSearchTerm: '' }))).toEqual([])
		expect(CnIndexPage.computed.activeFilterChips.call(page({ namedSource: {} }))).toEqual([])
	})

	it('clears the term when its chip is removed', () => {
		const ctx = page({ onFilterEvent: jest.fn() })
		CnIndexPage.methods.onRemoveActiveFilter.call(ctx, { key: 'search-term', label: 'Search term: Lindelaan' })
		expect(ctx.namedSearchTerm).toBe('')
		expect(ctx.onFilterEvent).not.toHaveBeenCalled()
	})
})
