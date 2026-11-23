/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The search page's All tab reads as the app's other lists read it: "Alles" in
 * dossiq (DqZoekresultaten), where the library alone says "Alle".
 *
 * @spec openspec/changes/index-search-source/specs/index-page/spec.md#requirement-an-index-page-can-search-several-schemas-and-files
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url, generateOcsUrl: (url) => url }))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

const CONFIG = { kinds: [{ id: 'cases', label: 'Cases', register: 'dossiq', schema: 'case' }] }

describe('the search source\'s All tab', () => {
	it('takes the app\'s word for All', () => {
		const translate = (text) => ({ All: 'Alles', Cases: 'Zaken' })[text] || text
		const source = resolveIndexSource('search', CONFIG, { translate })
		expect(source.quickFilters.map((tab) => tab.label)).toEqual(['Alles', 'Zaken'])
	})

	it('keeps the library\'s word when the app has none', () => {
		const source = resolveIndexSource('search', CONFIG, { translate: (text) => text })
		expect(source.quickFilters[0].label).toBe('All')
	})
})
