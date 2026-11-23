/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard's header meta can name today (`{today}`), as DqDagAfsluiten's
 * crumb does ("Dag afsluiten, woensdag 7 oktober").
 *
 * @spec openspec/changes/record-list-notes/specs/record-list-notes/spec.md#requirement-a-dashboard-header-meta-can-name-today
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

describe('CnDashboardPage headerMeta {today}', () => {
	it('writes today\'s date in for {today}', () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'Close out your day', headerMeta: 'Close out your day, {today}', layout: [], widgets: [] },
			global: { stubs: { CnDashboardGrid: true, NcLoadingIcon: true } },
		})
		const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
		expect(w.vm.resolvedHeaderMeta).toBe(`Close out your day, ${today}`)
	})

	it('leaves a meta without {today} as written', () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'X', headerMeta: 'all teams', layout: [], widgets: [] },
			global: { stubs: { CnDashboardGrid: true, NcLoadingIcon: true } },
		})
		expect(w.vm.resolvedHeaderMeta).toBe('all teams')
	})
})
