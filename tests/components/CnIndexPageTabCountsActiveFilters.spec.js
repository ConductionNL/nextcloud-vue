/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * DqTeamwachtrij: the quick-filter counts count the list as it is filtered.
 * "Alle typen 11" over a team queue of 11; :8080 counted 78, every unassigned
 * case, because the tab counts read only the page's own filter and not the
 * active ones (the team). A saved view's count stays its own query.
 *
 * @spec openspec/changes/quick-filter-counts-within-active-filters/specs/index-page/spec.md#requirement-a-quick-filter-counts-within-the-active-filters
 */
jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	fetchFilterCounts: jest.fn(async () => ({ 'tab:0': 11, 'tab:1': 4, 'view:v1': 30 })),
	fetchListTotal: jest.fn(),
}))

const { fetchFilterCounts } = require('../../src/utils/fetchFilterCounts.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

/**
 * @return {object} A stand-in for the page.
 */
function ctx() {
	const c = {
		isNamedSource: false,
		register: 'dossiq',
		exportSchemaSlug: 'case',
		filter: { assignee: 'IS NULL' },
		effectiveActiveFilters: { assignedGroup: 'woo', caseType: 'bezwaar' },
		countEntries: [
			{ key: 'tab:0', filter: {} },
			{ key: 'tab:1', filter: { caseType: 'woo-type' } },
			{ key: 'view:v1', filter: { status: 'open' } },
		],
		$route: { params: {} },
		selfFetchTokenCtx: () => ({}),
	}
	c.countRequestKey = 'k'
	return c
}

describe('quick-filter counts', () => {
	it('count within the active filters, the tab\'s own field its own', async () => {
		const c = ctx()
		await CnIndexPage.methods.loadFilterCounts.call(c)
		const { entries, baseFilter } = fetchFilterCounts.mock.calls[0][0]
		expect(baseFilter).toEqual({ assignee: 'IS NULL' })
		expect(entries).toEqual([
			{ key: 'tab:0', filter: { assignedGroup: 'woo', caseType: 'bezwaar' } },
			{ key: 'tab:1', filter: { assignedGroup: 'woo', caseType: 'woo-type' } },
			{ key: 'view:v1', filter: { status: 'open' } },
		])
		expect(c.tabCounts).toEqual({ 0: 11, 1: 4 })
	})
})
