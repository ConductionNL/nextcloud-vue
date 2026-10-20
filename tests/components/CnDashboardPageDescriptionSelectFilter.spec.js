/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A select page filter with `placement: "description"` sits on the header's
 * description line, before the period group (DqDoorlooptijd "alle
 * zaaktypen"), and writes the workspace context like one in the filter row.
 *
 * @spec openspec/changes/dashboard-select-filter-in-description/specs/dashboard-select-filter-in-description/spec.md#requirement-a-select-page-filter-can-sit-on-the-description-line
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div class="cn-dashboard-grid-stub" />', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	CnChartWidget: { template: '<div />' },
	NcButton: { template: '<button><slot /></button>' },
	NcLoadingIcon: { template: '<div />' },
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'placeholder', 'ariaLabelCombobox', 'clearable'], emits: ['update:modelValue'], template: '<div class="nc-select-stub" />' },
}

const CASE_TYPE = {
	key: 'caseType',
	label: 'Filter by case type',
	placement: 'description',
	clearable: true,
	placeholder: 'All case types',
	options: [{ value: 'woo', label: 'Woo request' }, { value: 'bezwaar', label: 'Objection' }],
}

/**
 * Mount the page.
 *
 * @param {object} extra Extra props.
 * @return {import('@vue/test-utils').VueWrapper} The page.
 */
function mountDash(extra) {
	return mount(CnDashboardPage, {
		props: { title: 'Processing time', description: 'January to September 2026', layout: [], widgets: [], ...extra },
		global: { stubs },
	})
}

describe('CnDashboardPage — a select page filter on the description line', () => {
	it('draws the select on the description line, not in the filter row', () => {
		const w = mountDash({ pageFilters: [CASE_TYPE] })
		const line = w.find('[data-testid="cn-dashboard-page-subtitle"]')
		expect(line.text()).toContain('January to September 2026')
		const select = line.findComponent({ name: 'NcSelect' })
		expect(select.exists()).toBe(true)
		expect(select.props('placeholder')).toBe('All case types')
		expect(select.props('ariaLabelCombobox')).toBe('Filter by case type')
		expect(w.find('[data-testid="cn-dashboard-page-page-filters"]').exists()).toBe(false)
	})

	it('writes the pick into the workspace context and clears back to all', async () => {
		const w = mountDash({ pageFilters: [CASE_TYPE] })
		expect(w.vm.workspaceContext.caseType).toBeUndefined()
		const select = w.find('[data-testid="cn-dashboard-page-subtitle"]').findComponent({ name: 'NcSelect' })
		select.vm.$emit('update:modelValue', { value: 'woo', label: 'Woo request' })
		await w.vm.$nextTick()
		expect(w.vm.workspaceContext.caseType).toBe('woo')
		select.vm.$emit('update:modelValue', null)
		await w.vm.$nextTick()
		expect(w.vm.workspaceContext.caseType).toBeNull()
	})

	it('keeps a select without a placement in the filter row', () => {
		const w = mountDash({ pageFilters: [{ ...CASE_TYPE, placement: undefined }] })
		expect(w.find('[data-testid="cn-dashboard-page-page-filters"]').findComponent({ name: 'NcSelect' }).exists()).toBe(true)
	})
})
