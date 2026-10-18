/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The search source as DqZoekresultaten draws it: the kind ("Soort") in the
 * user's language, a status that is a reference shown by its label as a pill,
 * a "Gekoppeld" column per kind, the term for the title and count line, the
 * active kind's total, and header filters on kind, link and status.
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url, params = {}) => `/index.php${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
	generateOcsUrl: (url) => `/ocs/v2.php/${url}`,
}))
const mockFetchReferences = jest.fn()
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ fetchReferenceObjects: (...a) => mockFetchReferences(...a) }))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

const CONFIG = {
	term: 'Lindelaan',
	statusColorMap: { 'In behandeling': 'purple' },
	linkedLabel: 'Linked to',
	kinds: [
		{ id: 'cases', label: 'Cases', register: 'dossiq', schema: 'case', statusField: 'status', statusResolve: { schema: 'status', labelField: 'name' }, linkedField: 'assigneeName' },
		{ id: 'objects', label: 'Objects', register: 'dossiq', schema: 'asset', linkedTemplate: '{caseCount} zaken' },
	],
}
const translate = (text) => ({ Cases: 'Zaken', Objects: 'Objecten', 'Linked to': 'Gekoppeld' })[text] || text

beforeEach(() => {
	mockGet.mockReset()
	mockFetchReferences.mockReset()
	mockFetchReferences.mockResolvedValue([{ id: 'st-2', name: 'In behandeling' }])
	mockGet.mockImplementation(async (url) => {
		if (url.includes('/case')) {
			return { data: { total: 9, results: [{ id: 'c1', title: 'Verlichting fietspad Lindelaan', status: 'st-2', assigneeName: 'Pieter Jansen' }] } }
		}
		return { data: { total: 14, results: [{ id: 'a1', title: 'Lantaarnpaal LP-2231', caseCount: 2 }] } }
	})
})

describe('search source, board columns', () => {
	it('shows the kind in the user\'s language, in the cell and on the quick filters', async () => {
		const source = resolveIndexSource('search', CONFIG, { translate })
		expect(source.quickFilters.map((tab) => tab.label)).toEqual(['All', 'Zaken', 'Objecten'])
		await source.load({ ...CONFIG, kind: 'all' })
		expect(source.rows().map((row) => row.kindLabel)).toEqual(['Zaken', 'Objecten'])
	})

	it('shows a referenced status by its label, as a pill coloured by statusColorMap', async () => {
		const source = resolveIndexSource('search', CONFIG, { translate })
		await source.load({ ...CONFIG, kind: 'all' })
		expect(mockFetchReferences).toHaveBeenCalledWith({ register: 'dossiq', schema: 'status' })
		expect(source.rows()[0].status).toBe('In behandeling')
		const status = source.columns.find((column) => column.key === 'status')
		expect(status).toMatchObject({ widget: 'badge', widgetProps: { colorMap: { 'In behandeling': 'purple' } } })
	})

	it('fills the Linked column per kind, from a field or a template, under the page\'s label', async () => {
		const source = resolveIndexSource('search', CONFIG, { translate })
		await source.load({ ...CONFIG, kind: 'all' })
		expect(source.rows().map((row) => row.linked)).toEqual(['Pieter Jansen', '2 zaken'])
		expect(source.columns.find((column) => column.key === 'linked').label).toBe('Gekoppeld')
		expect(resolveIndexSource('search', { kinds: [{ id: 'cases', register: 'r', schema: 's' }] }).columns.some((column) => column.key === 'linked')).toBe(false)
	})

	it('reports the term and the active kind\'s total', async () => {
		const source = resolveIndexSource('search', CONFIG, { translate })
		await source.load({ ...CONFIG, kind: 'all' })
		expect(source.term()).toBe('Lindelaan')
		expect(source.total()).toBe(23)
		await source.load({ ...CONFIG, kind: 'objects' })
		expect(source.total()).toBe(14)
	})

	it('narrows the answer by the header filters, which offer the kinds', async () => {
		const source = resolveIndexSource('search', CONFIG, { translate })
		await source.load({ ...CONFIG, kind: 'all', kindLabel: ['Objecten'] })
		expect(source.rows().map((row) => row.title)).toEqual(['Lantaarnpaal LP-2231'])
		await source.load({ ...CONFIG, kind: 'all', linked: 'Pieter Jansen' })
		expect(source.rows().map((row) => row.title)).toEqual(['Verlichting fietspad Lindelaan'])
		expect(source.columns.find((column) => column.key === 'kindLabel').enum).toEqual(['Zaken', 'Objecten'])
	})

	it('fills {term} in the page title and count line, and counts the source total', () => {
		const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
		const ctx = {
			isNamedSource: true,
			namedSource: { term: () => 'Lindelaan', total: () => 23 },
			pagination: null,
			selfFetchFailed: false,
			cnTranslate: (text) => text.replace('Search: {term}', 'Zoeken: {term}'),
			presented: (key) => ({ title: 'Search: {term}' })[key],
		}
		ctx.sourceTerm = CnIndexPage.computed.sourceTerm.call(ctx)
		expect(CnIndexPage.computed.shownTitle.call(ctx)).toBe('Zoeken: Lindelaan')
		expect(CnIndexPage.computed.effectivePagination.call(ctx).total).toBe(23)
	})

	it('leaves the status empty when the reference cannot be read', async () => {
		mockFetchReferences.mockRejectedValue(new Error('403'))
		const source = resolveIndexSource('search', CONFIG, { translate })
		await source.load({ ...CONFIG, kind: 'all' })
		expect(source.rows()[0].status).toBe('')
	})
})
