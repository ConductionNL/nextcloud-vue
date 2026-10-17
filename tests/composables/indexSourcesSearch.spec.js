/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The search index source (index-search-source): one term over several
 * OpenRegister schemas and the reader's files, with a quick filter per kind
 * and its count (DqZoekresultaten).
 *
 * @spec openspec/changes/index-search-source/specs/index-page/spec.md#requirement-an-index-page-can-search-several-schemas-and-files
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url, params = {}) => `/index.php${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
	generateOcsUrl: (url) => `/ocs/v2.php/${url}`,
}))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

const CONFIG = {
	term: 'Lindelaan',
	kinds: [
		{ id: 'cases', label: 'Zaken', register: 'dossiq', schema: 'case', subtitleField: 'identifier', statusField: 'status', href: '/apps/dossiq/cases/{id}' },
		{ id: 'objects', label: 'Objecten', register: 'dossiq', schema: 'asset' },
		{ id: 'documents', label: 'Documenten', files: true },
	],
}

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockImplementation(async (url, { params }) => {
		if (url.includes('/case')) {
			return { data: { total: 9, results: [{ id: 'c1', title: 'Verlichting fietspad Lindelaan', identifier: '2026-0082', status: 'In behandeling' }] } }
		}
		if (url.includes('/asset')) {
			return { data: { total: 14, results: [{ id: 'a1', title: 'Lantaarnpaal LP-2231' }] } }
		}
		if (url.includes('search/providers/files')) {
			expect(params.term).toBe('Lindelaan')
			return { data: { ocs: { data: { entries: [{ title: 'besluit.pdf', subline: '/Zaken', resourceUrl: '/f/12' }] } } } }
		}
		throw new Error('unexpected ' + url)
	})
})

describe('search index source', () => {
	it('builds a quick filter per kind from the config', () => {
		const source = resolveIndexSource('search', CONFIG)
		expect(source.quickFilters.map((tab) => tab.label)).toEqual(['All', 'Zaken', 'Objecten', 'Documenten'])
		expect(source.quickFilters[1].filter).toEqual({ kind: 'cases' })
	})

	it('searches every kind with the term and counts each', async () => {
		const source = resolveIndexSource('search', CONFIG)
		await source.load({ ...CONFIG, kind: 'all' })
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/dossiq/case', { params: { _search: 'Lindelaan', _limit: 20 } })
		expect(source.rows().map((row) => row.title)).toEqual(['Verlichting fietspad Lindelaan', 'Lantaarnpaal LP-2231', 'besluit.pdf'])
		expect(source.tabCounts()).toEqual({ 0: 24, 1: 9, 2: 14, 3: 1 })
		const caseRow = source.rows()[0]
		expect(caseRow).toMatchObject({ kindLabel: 'Zaken', subtitle: '2026-0082', status: 'In behandeling', href: '/index.php/apps/dossiq/cases/c1' })
	})

	it('shows only the picked kind, and a failed kind leaves the others', async () => {
		const source = resolveIndexSource('search', CONFIG)
		await source.load({ ...CONFIG, kind: 'objects' })
		expect(source.rows().map((row) => row.kindLabel)).toEqual(['Objecten'])
		mockGet.mockImplementation(async (url) => {
			if (url.includes('/case')) {
				throw new Error('500')
			}
			return { data: { total: 1, results: [{ id: 'a1', title: 'Paal' }] } }
		})
		await source.load({ ...CONFIG, kinds: CONFIG.kinds.slice(0, 2), kind: 'all' })
		expect(source.tabCounts()[1]).toBeUndefined()
		expect(source.rows().map((row) => row.title)).toContain('Paal')
	})

	it('searches nothing without a term', async () => {
		const source = resolveIndexSource('search', { kinds: CONFIG.kinds })
		await source.load({ kinds: CONFIG.kinds })
		expect(mockGet).not.toHaveBeenCalled()
		expect(source.rows()).toEqual([])
	})
})
