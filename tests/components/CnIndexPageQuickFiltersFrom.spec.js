/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Quick filters made from the values a field holds (index-quick-filters-from):
 * DqTeamwachtrij draws "Alle typen 11 / Woo-verzoek 4 / ...", one tab per case
 * type in the list, while case type ids differ per install.
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

describe('CnIndexPage quickFiltersFrom', () => {
	it('draws All plus one tab per value, most frequent first, with counts and labels', async () => {
		const w = mountPage()
		await flushPromises()
		expect(mockGrouped).toHaveBeenCalledWith(expect.objectContaining({ register: 'dossiq', schema: 'case', groupBy: 'caseType', filter: { assignee: { isnull: true } } }), expect.anything())
		expect(w.vm.effectiveQuickFilters.map((tab) => [tab.label, tab.count])).toEqual([
			['Alle typen', 9],
			['Woo-verzoek', 4],
			['Omgevingsvergunning', 3],
			['Bezwaar', 2],
		])
		expect(w.vm.effectiveQuickFilters[1].filter).toEqual({ caseType: 'ct-woo' })
		expect(w.vm.effectiveQuickFilters[0]).toMatchObject({ filter: {}, default: true })
	})

	it('shows the raw value without a register to look labels up in', async () => {
		const w = mountPage({ quickFiltersFrom: { field: 'status' } })
		await flushPromises()
		expect(mockResolve).not.toHaveBeenCalled()
		expect(w.vm.effectiveQuickFilters.map((tab) => tab.label)).toEqual(['All', 'ct-woo', 'ct-omgeving', 'ct-bezwaar'])
	})

	it('is ignored when quickFilters is set, and draws nothing after a failed request', async () => {
		const declared = [{ label: 'Mine', filter: { assignee: '@me' } }]
		const w = mountPage({ quickFilters: declared })
		await flushPromises()
		expect(mockGrouped).not.toHaveBeenCalled()
		expect(w.vm.effectiveQuickFilters.map((tab) => tab.label)).toEqual(['Mine'])
		mockGrouped.mockRejectedValue(new Error('500'))
		const failed = mountPage()
		await flushPromises()
		expect(failed.vm.effectiveQuickFilters).toBeNull()
	})
})
