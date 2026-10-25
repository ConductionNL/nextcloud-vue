/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten: the Gekoppeld cell of a case names its handler
 * ("Pieter Jansen", not the uid "pieter"), and the Resultaat column is wide
 * enough for a title ("Verlichting fietspad Lindelaan", about 250px) instead
 * of cutting it at 140. A kind opts in with `linkedUser`; the page sets the
 * widths with `sourceConfig.columnWidths`.
 *
 * @spec openspec/changes/search-linked-user-and-widths/specs/search-linked-user-and-widths/spec.md
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url, params = {}) => `/index.php${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
	generateOcsUrl: (url) => `/ocs/v2.php/${url}`,
}))
jest.mock('../../src/utils/userAutocomplete.js', () => ({
	resolveNextcloudUser: async (uid) => ({ id: uid, label: ({ pieter: 'Pieter Jansen' })[uid] || uid }),
}))

import { resolveIndexSource } from '../../src/composables/indexSources.js'

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { total: 2, results: [{ id: 'c1', title: 'Verlichting fietspad Lindelaan', assignee: 'pieter' }, { id: 'c2', title: 'Melding lamp', assignee: 'ghost' }] } })
})

describe('search source, linked user and column widths', () => {
	it('names a linked user by display name, else keeps the id', async () => {
		const config = { term: 'Lindelaan', kinds: [{ id: 'cases', label: 'Cases', register: 'dossiq', schema: 'case', linkedField: 'assignee', linkedUser: true }] }
		const source = resolveIndexSource('search', config, {})
		await source.load({ ...config, kind: 'all' })
		expect(source.rows().map((row) => row.linked)).toEqual(['Pieter Jansen', 'ghost'])
	})

	it('gives the columns the widths the page names', () => {
		const config = { kinds: [{ id: 'cases', label: 'Cases', register: 'dossiq', schema: 'case', linkedField: 'assignee' }], columnWidths: { title: '250px', linked: '150px' } }
		const source = resolveIndexSource('search', config, {})
		const width = (key) => source.columns.find((col) => col.key === key).width
		expect(width('title')).toBe('250px')
		expect(width('linked')).toBe('150px')
		expect(width('status')).toBeUndefined()
	})
})
