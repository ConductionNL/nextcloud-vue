/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard hands its grid the column weights of the page, or of the
 * `layoutWhen` entry that draws the page now (PqWerkplekKlant in a call).
 *
 * @spec openspec/changes/dashboard-column-weights/specs/dashboard-column-weights/spec.md#requirement-a-dashboard-can-weigh-its-column-groups
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const stubs = {
	CnDashboardGrid: { template: '<div />', props: ['layout', 'columnWeights'] },
	CnWidgetWrapper: { template: '<div />' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const widgets = [{ id: 'who', type: 'text' }]
const layout = [{ id: 'b', widgetId: 'who', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 }]
const inCallWeights = [{ span: 4, weight: 352 }, { span: 4, weight: 435 }, { span: 4, weight: 352 }]
const pageWeights = [{ span: 6, weight: 1 }, { span: 6, weight: 1 }]
const layoutWhen = [{ when: { workspace: 'callActive', op: 'eq', value: true }, layout, gridColumnWeights: inCallWeights }]

describe('CnDashboardPage: column weights', () => {
	it('hands the grid the weights of the workspace entry while it holds, the page weights otherwise', async () => {
		const w = mount(CnDashboardPage, { propsData: { title: 'Werkplek', layoutWhen, widgets, layout, gridColumnWeights: pageWeights }, stubs })
		await w.vm.$nextTick()
		expect(w.findComponent(stubs.CnDashboardGrid).props('columnWeights')).toEqual(pageWeights)
		w.vm.workspaceContext.callActive = true
		await w.vm.$nextTick()
		expect(w.findComponent(stubs.CnDashboardGrid).props('columnWeights')).toEqual(inCallWeights)
	})

	it('hands none without weights', async () => {
		const w = mount(CnDashboardPage, { propsData: { title: 'Werkplek', widgets, layout }, stubs })
		await w.vm.$nextTick()
		expect(w.findComponent(stubs.CnDashboardGrid).props('columnWeights')).toBeNull()
	})
})
