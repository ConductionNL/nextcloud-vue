/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten draws the Soort column as plain text naming what one row
 * is ("Zaak", "Lantaarnpaal"), not the plural kind ("Zaken") as a pill. A
 * search page opts in with `kindAsText`; each kind names its rows with
 * `rowLabel`, a template on the found object.
 *
 * @spec openspec/changes/search-kind-as-text/specs/search-kind-as-text/spec.md
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url, params = {}) => `/index.php${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
	generateOcsUrl: (url) => `/ocs/v2.php/${url}`,
}))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

const KINDS = [
	{ id: 'cases', label: 'Cases', rowLabel: 'Case', register: 'dossiq', schema: 'case' },
	{ id: 'objects', label: 'Objects', rowLabel: '{objectType}', register: 'dossiq', schema: 'caseObject' },
	{ id: 'other', label: 'Other', register: 'dossiq', schema: 'other' },
]
const translate = (text) => ({ Cases: 'Zaken', Case: 'Zaak', Objects: 'Objecten', Other: 'Overig' })[text] || text

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockImplementation(async (url) => {
		if (url.includes('/case/') || url.endsWith('/case')) {
			return { data: { total: 1, results: [{ id: 'c1', title: 'Verlichting fietspad Lindelaan' }] } }
		}
		if (url.includes('caseObject')) {
			return { data: { total: 1, results: [{ id: 'o1', title: 'LP-2231', objectType: 'Lantaarnpaal' }] } }
		}
		return { data: { total: 1, results: [{ id: 'x1', title: 'Iets' }] } }
	})
})

describe('search source, Soort as text (kindAsText)', () => {
	it('names each row by its kind\'s rowLabel, filled from the object, else by the kind', async () => {
		const config = { term: 'Lindelaan', kindAsText: true, kinds: KINDS }
		const source = resolveIndexSource('search', config, { translate })
		await source.load({ ...config, kind: 'all' })
		expect(source.rows().map((row) => row.kindText)).toEqual(['Zaak', 'Lantaarnpaal', 'Overig'])
	})

	it('draws the column as plain text, and narrows by it', async () => {
		const config = { term: 'Lindelaan', kindAsText: true, kinds: KINDS }
		const source = resolveIndexSource('search', config, { translate })
		const column = source.columns.find((col) => col.key === 'kindText')
		expect(column).toBeTruthy()
		expect(column.enum).toBeUndefined()
		expect(column.widget).toBeUndefined()
		expect(source.columns.some((col) => col.key === 'kindLabel')).toBe(false)
		await source.load({ ...config, kind: 'all', kindText: ['Lantaarnpaal'] })
		expect(source.rows().map((row) => row.title)).toEqual(['LP-2231'])
	})

	it('keeps the kind column as it was without the opt-in', () => {
		const source = resolveIndexSource('search', { kinds: KINDS }, { translate })
		expect(source.columns.find((col) => col.key === 'kindLabel').enum).toEqual(['Zaken', 'Objecten', 'Overig'])
	})
})
