/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `{today|<format>}` in a dashboard description reads today through a
 * template format (DqTermijnen "Week 41 · alle teams").
 *
 * @spec openspec/changes/description-today-week/specs/description-today-week/spec.md#requirement-a-template-can-name-a-dates-week-and-a-dashboard-description-can-read-today
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
}

describe('CnDashboardPage: today in the description', () => {
	beforeAll(() => {
		jest.useFakeTimers({ now: new Date(2026, 9, 7, 12) })
	})
	afterAll(() => {
		jest.useRealTimers()
	})

	it('formats today through the token\'s format', () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'Deadline monitoring', description: '{today|week} · all teams', layout: [], widgets: [] },
			global: { stubs },
		})
		expect(w.find('[data-testid="cn-dashboard-page-subtitle"]').text()).toBe('Week 41 · all teams')
	})
})
