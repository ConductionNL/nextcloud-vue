/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `{dateRange}` in a dashboard description reads the dashboard's active date
 * range as a period and follows a change of it.
 *
 * @spec openspec/changes/description-period-from-date-range/specs/description-period-from-date-range/spec.md#requirement-a-dashboard-description-reads-the-active-date-range-as-a-period
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
	CnSegmentedControl: { template: '<div />' },
	CnDateRangePicker: { template: '<div />' },
}

const DATE_RANGE = {
	enabled: true,
	showHeaderPicker: false,
	default: { preset: 'month' },
	presets: [
		{ id: 'month', label: 'Current month', period: 'month' },
		{ id: 'all', label: 'All', days: null },
	],
}

describe('CnDashboardPage: the date range in the description', () => {
	beforeAll(() => {
		jest.useFakeTimers({ now: new Date(2026, 9, 7, 12) })
	})
	afterAll(() => {
		jest.useRealTimers()
	})

	it('reads the active range as a period and follows a change', async () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'Dashboard', description: 'How the team is doing · {dateRange}, all teams you are in', layout: [], widgets: [], dateRange: DATE_RANGE },
			global: { stubs },
		})
		const line = () => w.find('[data-testid="cn-dashboard-page-subtitle"]').text()
		expect(line()).toContain('How the team is doing · October 2026, all teams you are in')
		w.vm.onDateRangeChange({ from: null, to: null, preset: 'all' })
		await w.vm.$nextTick()
		expect(line()).toContain('How the team is doing · All, all teams you are in')
	})

	it('reads as empty without a date range', () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'Dashboard', description: 'Team {dateRange}', layout: [], widgets: [] },
			global: { stubs },
		})
		expect(w.find('[data-testid="cn-dashboard-page-subtitle"]').text()).toBe('Team')
	})
})
