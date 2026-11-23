/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `{filter.<key>}` in a dashboard description reads the page filter's active
 * period and follows a change of it.
 *
 * @spec openspec/changes/description-period-from-filter/specs/description-period-from-filter/spec.md#requirement-a-dashboard-description-reads-the-active-period-of-a-page-filter
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
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<div class="nc-select-stub" />' },
	CnSegmentedControl: { template: '<div />' },
}

const PERIOD = { key: 'period', label: 'Period', placement: 'description', default: '12m', options: [{ value: '12m', label: 'Last 12 months', months: 12 }, { value: 'all', label: 'All time' }] }

describe('CnDashboardPage: the period in the description', () => {
	beforeAll(() => {
		jest.useFakeTimers({ now: new Date(2026, 9, 7, 12) })
	})
	afterAll(() => {
		jest.useRealTimers()
	})

	it('reads the active period and follows the filter', async () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'Process analysis', description: 'Closed cases {filter.period}', layout: [], widgets: [], pageFilters: [PERIOD] },
			global: { stubs },
		})
		const line = () => w.find('[data-testid="cn-dashboard-page-subtitle"]').text()
		expect(line()).toContain('Closed cases November 2025 through October 2026')
		await w.findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', { value: 'all', label: 'All time' })
		expect(line()).toContain('Closed cases All time')
	})

	it('leaves a description without the token as written', () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'Process analysis', description: 'Closed cases', layout: [], widgets: [], pageFilters: [PERIOD] },
			global: { stubs },
		})
		expect(w.find('[data-testid="cn-dashboard-page-subtitle"]').text()).toContain('Closed cases')
	})
})
