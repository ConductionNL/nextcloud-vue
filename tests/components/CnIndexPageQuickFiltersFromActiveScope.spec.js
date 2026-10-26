/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Generated quick filters count within the active filters, not the field's
 * own: DqTeamwachtrij's team queue (3 unassigned Woo cases) drew "Alle typen
 * 18 / Omgevingsvergunning 5 / ..." from every case under the page filter.
 *
 * @spec openspec/changes/quick-filters-from-active-scope/specs/quick-filters-from-active-scope/spec.md#requirement-generated-quick-filters-count-within-the-active-filters
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGrouped = jest.fn()
jest.mock('../../src/utils/fetchAggregate.js', () => {
	const actual = jest.requireActual('../../src/utils/fetchAggregate.js')
	return { ...actual, fetchGroupedCounts: (...a) => mockGrouped(...a) }
})
const mockResolve = jest.fn()
jest.mock('../../src/composables/useRefLabels.js', () => {
	const actual = jest.requireActual('../../src/composables/useRefLabels.js')
	return { ...actual, createRefLabelResolver: () => ({ resolve: (...a) => mockResolve(...a), invalidate: jest.fn() }) }
})

const mockByField = jest.fn()
jest.mock('../../src/utils/labelsByField.js', () => ({ labelsByField: (...a) => mockByField(...a) }))

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const FROM = { field: 'caseType', register: 'dossiq', schema: 'caseType', labelField: 'title', allLabel: 'Alle typen' }

function mountPage(defaults) {
	return shallowMount(CnIndexPage, {
		props: {
			title: 'Wachtrij',
			register: 'dossiq',
			schema: 'case',
			objects: [],
			filter: { isDraft: false },
			defaultFilters: defaults,
			quickFiltersFrom: FROM,
		},
		global: { mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Queue' } } },
	})
}

beforeEach(() => {
	mockGrouped.mockReset()
	mockGrouped.mockResolvedValue([{ key: 'ct-woo', count: 3 }])
	mockResolve.mockReset()
	mockResolve.mockImplementation(async (r, s, ids) => Object.fromEntries(ids.map((id) => [id, 'Woo-verzoek'])))
})

describe('CnIndexPage quickFiltersFrom within the active filters', () => {
	it('groups within the page filter and the active filters', async () => {
		const w = mountPage({ assignee: 'IS NULL', assignedGroup: 'team-woo' })
		await flushPromises()
		expect(mockGrouped).toHaveBeenCalledWith(expect.objectContaining({ groupBy: 'caseType', filter: { isDraft: false, assignee: 'IS NULL', assignedGroup: 'team-woo' } }), expect.anything())
		expect(w.vm.effectiveQuickFilters.map((tab) => [tab.label, tab.count])).toEqual([['Alle typen', 3], ['Woo-verzoek', 3]])
	})

	it('leaves the field\'s own filter out, so a picked tab keeps the others', async () => {
		mountPage({ assignee: 'IS NULL', caseType: 'ct-woo' })
		await flushPromises()
		expect(mockGrouped.mock.calls.at(-1)[0].filter).toEqual({ isDraft: false, assignee: 'IS NULL' })
	})
})
