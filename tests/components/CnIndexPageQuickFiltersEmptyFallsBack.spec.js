/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An empty `quickFilters` gives way to `quickFiltersFrom`: a saved view of a
 * page with its own lenses (DqTeamwachtrij, a view of the case list) sets
 * `quickFilters: []` and draws its case type tabs instead of the page's.
 *
 * @spec openspec/changes/index-quick-filters-from/specs/index-page/spec.md#requirement-quick-filters-can-come-from-a-field-s-values
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

function mountPage(extra = {}) {
	return shallowMount(CnIndexPage, {
		props: {
			title: 'Wachtrij',
			register: 'dossiq',
			schema: 'case',
			objects: [],
			filter: { assignee: { isnull: true } },
			quickFiltersFrom: FROM,
			...extra,
		},
		global: { mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Queue' } } },
	})
}

beforeEach(() => {
	mockGrouped.mockReset()
	mockGrouped.mockResolvedValue([{ key: 'ct-bezwaar', count: 2 }, { key: 'ct-woo', count: 4 }, { key: 'ct-omgeving', count: 3 }])
	mockResolve.mockReset()
	mockResolve.mockImplementation(async (r, s, ids) => Object.fromEntries(ids.map((id) => [id, { 'ct-woo': 'Woo-verzoek', 'ct-omgeving': 'Omgevingsvergunning', 'ct-bezwaar': 'Bezwaar' }[id] || null])))
})

describe('an empty quickFilters and quickFiltersFrom', () => {
	it('draws the tabs made from the field when quickFilters is empty', async () => {
		const w = mountPage({ quickFilters: [] })
		await flushPromises()
		expect(w.vm.effectiveQuickFilters.map((tab) => tab.label)).toEqual(['Alle typen', 'Woo-verzoek', 'Omgevingsvergunning', 'Bezwaar'])
	})

	it('keeps declared tabs ahead of the field', async () => {
		const w = mountPage({ quickFilters: [{ label: 'Alles', filter: {}, default: true }, { label: 'Mijn zaken', filter: { assignee: '@me' } }] })
		await flushPromises()
		expect(w.vm.effectiveQuickFilters.map((tab) => tab.label)).toEqual(['Alles', 'Mijn zaken'])
	})

	it('draws no tabs for an empty quickFilters without a field to make them from', async () => {
		const w = mountPage({ quickFilters: [], quickFiltersFrom: null })
		await flushPromises()
		expect(w.vm.effectiveQuickFilters).toBeNull()
	})
})
