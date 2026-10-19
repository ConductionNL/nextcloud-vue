/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page filter that reads its options (`optionsFrom`), clearable back to
 * "all": the case-type filter of dossiq's Doorlooptijd, Process mining and
 * Termijn dashboards (DtCaseTypeFilter, PmCaseTypeFilter, TdCaseTypeFilter)
 * as manifest config.
 *
 * @spec openspec/changes/page-filter-options-from/specs/dashboard-page/spec.md#requirement-a-page-filter-can-read-its-options
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { invalidateEndpointSourceCache } from '@/composables/useEndpointSource.js'

const NcSelect = {
	name: 'NcSelect',
	props: ['modelValue', 'options', 'inputLabel', 'clearable', 'placeholder', 'loading'],
	emits: ['update:modelValue'],
	template: '<div class="nc-select-stub"><button v-for="o in options" :key="o.value" class="opt" @click="$emit(\'update:modelValue\', o)">{{ o.label }}</button><button class="clear" @click="$emit(\'update:modelValue\', null)" /></div>',
}

const stubs = {
	CnDashboardGrid: { template: '<div />' },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcLoadingIcon: { template: '<div />' },
	NcSelect,
}

/**
 * Mount a dashboard with one page filter.
 *
 * @param {object} filter The filter.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The page.
 */
async function mountDash(filter) {
	const w = mount(CnDashboardPage, {
		props: { title: 'Processing time', layout: [], widgets: [], pageFilters: [filter] },
		global: { stubs },
	})
	await flushPromises()
	return w
}

const CASE_TYPE = {
	key: 'caseType',
	label: 'Filter by case type',
	clearable: true,
	placeholder: 'All case types',
	optionsFrom: { register: 'dossiq', schema: 'caseType', filter: { hasSla: true } },
}

describe('CnDashboardPage page filter optionsFrom', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('reads OpenRegister objects as options, clearable to all', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 'ct-woo', title: 'Woo-verzoek' }, { id: 'ct-obj', name: 'Bezwaar' }, { title: 'No id' }] } })
		const w = await mountDash(CASE_TYPE)
		const [url, { params }] = axios.get.mock.calls[0]
		expect(url).toBe('/nc/apps/openregister/api/objects/dossiq/caseType')
		expect(params).toMatchObject({ hasSla: true })
		const select = w.findComponent(NcSelect)
		expect(select.props('options')).toEqual([{ value: 'ct-woo', label: 'Woo-verzoek' }, { value: 'ct-obj', label: 'Bezwaar' }])
		expect(select.props('clearable')).toBe(true)
		expect(select.props('placeholder')).toBe('All case types')
		expect(w.vm.workspaceContext.caseType).toBeUndefined()
		await w.findAll('.opt')[1].trigger('click')
		expect(w.vm.workspaceContext.caseType).toBe('ct-obj')
		await w.find('.clear').trigger('click')
		expect(w.vm.workspaceContext.caseType).toBeNull()
	})

	it('reads an app endpoint with value and label fields, and seeds a non-clearable filter', async () => {
		axios.get.mockResolvedValue({ data: { caseTypes: [{ uuid: 'a', label: { nl: 'A' }, short: 'Aa' }, { uuid: 'b', short: 'Bb' }] } })
		const w = await mountDash({ key: 'caseType', optionsFrom: { url: '/apps/dossiq/api/doorlooptijd/case-types', responsePath: 'caseTypes', valueField: 'uuid', labelField: 'short' } })
		expect(w.findComponent(NcSelect).props('options')).toEqual([{ value: 'a', label: 'Aa' }, { value: 'b', label: 'Bb' }])
		expect(w.vm.workspaceContext.caseType).toBe('a')
	})

	it('keeps declared options as they were', async () => {
		const w = await mountDash({ key: 'period', options: [{ value: '3m', label: '3 months' }] })
		expect(axios.get).not.toHaveBeenCalled()
		expect(w.vm.workspaceContext.period).toBe('3m')
	})
})
