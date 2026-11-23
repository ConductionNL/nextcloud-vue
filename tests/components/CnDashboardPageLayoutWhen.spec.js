/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard can arrange its cards differently while a page control's value
 * holds: PqWerkplekKlant draws three columns while a call is on (who is it on
 * the left, this contact and the open matters in the middle, the knowledge
 * base, tasks and earlier contact on the right) and its own dashboard
 * otherwise.
 *
 * @spec openspec/changes/dashboard-layout-when/specs/dashboard-layout-when/spec.md#requirement-a-dashboard-can-arrange-its-cards-by-the-pages-workspace
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const stubs = {
	CnDashboardGrid: { template: '<div />', props: ['layout'] },
	CnWidgetWrapper: { template: '<div />' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const widgets = [{ id: 'who', type: 'text' }, { id: 'form', type: 'text' }]
const layout = [
	{ id: 'a', widgetId: 'form', gridX: 8, gridY: 0, gridWidth: 4, gridHeight: 4 },
	{ id: 'b', widgetId: 'who', gridX: 8, gridY: 4, gridWidth: 4, gridHeight: 2 },
]
const inCall = [
	{ id: 'b', widgetId: 'who', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 },
	{ id: 'a', widgetId: 'form', gridX: 4, gridY: 0, gridWidth: 4, gridHeight: 4 },
]
const layoutWhen = [{ when: { workspace: 'callActive', op: 'eq', value: true }, layout: inCall }]

describe('CnDashboardPage: a layout from the workspace', () => {
	it('draws the workspace layout while its condition holds, the page layout otherwise', async () => {
		const w = mount(CnDashboardPage, { propsData: { title: 'Werkplek', layoutWhen, widgets, layout }, stubs })
		expect(w.vm.renderedLayout).toEqual(layout)
		w.vm.workspaceContext.callActive = true
		await w.vm.$nextTick()
		expect(w.vm.renderedLayout).toEqual(inCall)
		w.vm.workspaceContext.callActive = false
		await w.vm.$nextTick()
		expect(w.vm.renderedLayout).toEqual(layout)
	})

	it('ignores an entry without a workspace condition or a layout', () => {
		const odd = [{ when: { field: 'x' }, layout: inCall }, { when: { workspace: 'callActive' } }]
		const w = mount(CnDashboardPage, { propsData: { title: 'Werkplek', layoutWhen: odd, widgets, layout }, stubs })
		w.vm.workspaceContext.callActive = true
		expect(w.vm.renderedLayout).toEqual(layout)
	})
})
