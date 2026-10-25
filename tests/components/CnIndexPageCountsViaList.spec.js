/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * An index page counts its chips with the list's own request, so a chip's
 * number and the list under it come from the same query (BOARD-SYNC 25 Oct:
 * "Alles 173" over a list of 111).
 *
 * @spec openspec/changes/index-counts-read-the-list-endpoint/specs/index-page/spec.md#requirement-an-index-pages-counts-come-from-the-list-request
 */
jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	fetchFilterCounts: jest.fn(async () => ({ 'tab:0': 111 })),
	fetchListTotal: jest.fn(),
}))

const { fetchFilterCounts } = require('../../src/utils/fetchFilterCounts.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

describe('index page counts', () => {
	it('ask through the list endpoint', async () => {
		const ctx = {
			isNamedSource: false,
			register: 'dossiq',
			exportSchemaSlug: 'case',
			filter: { isTemplate: false },
			effectiveActiveFilters: {},
			countEntries: [{ key: 'tab:0', filter: { isDraft: false } }],
			countRequestKey: 'k',
			$route: { params: {} },
			selfFetchTokenCtx: () => ({}),
		}
		await CnIndexPage.methods.loadFilterCounts.call(ctx)
		expect(fetchFilterCounts.mock.calls[0][0].via).toBe('list')
		expect(ctx.tabCounts).toEqual({ 0: 111 })
	})
})
