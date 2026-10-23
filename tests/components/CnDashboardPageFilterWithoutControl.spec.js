/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page filter with `control: "none"` holds its value for the widgets and
 * the description, and draws nothing (DqDoorlooptijd's fixed period).
 *
 * @spec openspec/changes/page-filter-without-control/specs/page-filter-without-control/spec.md#requirement-a-page-filter-can-hold-a-value-without-drawing-a-control
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div />', props: ['layout'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcLoadingIcon: { template: '<div />' },
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options'], template: '<div class="nc-select-stub" />' },
	CnSegmentedControl: { template: '<div class="segmented-stub" />' },
}

const PERIOD = { key: 'period', control: 'none', placement: 'description', default: '12m', options: [{ value: '12m', months: 12 }] }

describe('CnDashboardPage: a page filter without a control', () => {
	beforeAll(() => {
		jest.useFakeTimers({ now: new Date(2026, 9, 7, 12) })
	})
	afterAll(() => {
		jest.useRealTimers()
	})

	it('names its period in the description and draws no control', () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'Processing time', description: '{filter.period}', layout: [], widgets: [], pageFilters: [PERIOD] },
			global: { stubs },
		})
		expect(w.find('[data-testid="cn-dashboard-page-subtitle"]').text()).toContain('November 2025 through October 2026')
		expect(w.find('[data-testid="cn-page-filter-period"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-dashboard-page-page-filters"]').exists()).toBe(false)
		expect(w.vm.workspaceContext.period).toBe('12m')
	})

	it('also draws nothing outside the description', () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'Processing time', layout: [], widgets: [], pageFilters: [{ ...PERIOD, placement: undefined }] },
			global: { stubs },
		})
		expect(w.find('[data-testid="cn-dashboard-page-page-filters"]').exists()).toBe(false)
		expect(w.vm.workspaceContext.period).toBe('12m')
	})
})
