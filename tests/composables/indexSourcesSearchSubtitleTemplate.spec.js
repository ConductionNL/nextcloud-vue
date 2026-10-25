/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten draws the line under a result as "Zaak 2026-0082" and
 * "Object · Lindelaan 40": a kind's `subtitleTemplate`, translated and filled
 * from the found object, wins over its `subtitleField`.
 *
 * @spec openspec/changes/search-subtitle-template/specs/search-subtitle-template/spec.md
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url, params = {}) => `/index.php${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
	generateOcsUrl: (url) => `/ocs/v2.php/${url}`,
}))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

const translate = (text) => ({ 'Case {identifier}': 'Zaak {identifier}', 'Object · {address}': 'Object · {address}' })[text] || text

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockImplementation(async (url) => (url.includes('caseObject')
		? { data: { total: 1, results: [{ id: 'o1', title: 'LP-2231', address: 'Lindelaan 40' }] } }
		: { data: { total: 1, results: [{ id: 'c1', title: 'Verlichting fietspad Lindelaan', identifier: '2026-0082' }] } }))
})

describe('search source, subtitleTemplate', () => {
	it('fills the line under a result from the kind\'s template, else its field', async () => {
		const config = {
			term: 'Lindelaan',
			kinds: [
				{ id: 'cases', label: 'Cases', register: 'dossiq', schema: 'case', subtitleField: 'title', subtitleTemplate: 'Case {identifier}' },
				{ id: 'objects', label: 'Objects', register: 'dossiq', schema: 'caseObject', subtitleField: 'address' },
			],
		}
		const source = resolveIndexSource('search', config, { translate })
		await source.load({ ...config, kind: 'all' })
		expect(source.rows().map((row) => row.subtitle)).toEqual(['Zaak 2026-0082', 'Lindelaan 40'])
	})
})
