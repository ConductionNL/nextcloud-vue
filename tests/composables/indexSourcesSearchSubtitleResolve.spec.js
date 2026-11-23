/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten (r29) draws the line under a case as "Zaak 2026-0110 ·
 * Woo-verzoek" and lets a long title wrap: a kind's `subtitleResolve` names a
 * reference (the case type) by its label for the subtitle template, and
 * `sourceConfig.titleWrap` wraps the Result column.
 *
 * @spec openspec/changes/search-subtitle-resolve-and-wrap/specs/search-subtitle-resolve-and-wrap/spec.md
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url, params = {}) => `/index.php${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
	generateOcsUrl: (url) => `/ocs/v2.php/${url}`,
}))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({
	fetchReferenceObjects: async () => [{ id: 'ct-woo', title: 'Woo-verzoek' }],
}))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

const translate = (text) => ({ 'Case {identifier} · {caseTypeTitle}': 'Zaak {identifier} · {caseTypeTitle}' })[text] || text

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { total: 1, results: [{ id: 'c1', title: 'Verlichting fietspad Lindelaan', identifier: '2026-0110', caseType: 'ct-woo' }] } })
})

describe('search source, subtitleResolve and titleWrap', () => {
	it('fills the subtitle with the label of the referenced object', async () => {
		const config = {
			term: 'Lindelaan',
			kinds: [{ id: 'cases', label: 'Cases', register: 'dossiq', schema: 'case', subtitleTemplate: 'Case {identifier} · {caseTypeTitle}', subtitleResolve: { field: 'caseType', schema: 'caseType', labelField: 'title', as: 'caseTypeTitle' } }],
		}
		const source = resolveIndexSource('search', config, { translate })
		await source.load({ ...config, kind: 'all' })
		expect(source.rows()[0].subtitle).toBe('Zaak 2026-0110 · Woo-verzoek')
	})

	it('wraps the Result column when the page asks for it', () => {
		const wrapped = resolveIndexSource('search', { kinds: [], titleWrap: true }, {})
		expect(wrapped.columns.find((col) => col.key === 'title').cellClass).toBe('cn-cell--wrap')
		const plain = resolveIndexSource('search', { kinds: [] }, {})
		expect(plain.columns.find((col) => col.key === 'title').cellClass).toBeUndefined()
	})
})
