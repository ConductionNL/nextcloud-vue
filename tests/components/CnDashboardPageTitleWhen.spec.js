/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard's title can follow a page control's value: PqWerkplekKlant
 * reads "Gesprek met Sanne de Vries" while a call is on, "Werkplek" otherwise.
 *
 * @spec openspec/changes/dashboard-title-from-workspace/specs/dashboard-title-from-workspace/spec.md#requirement-a-dashboard-title-can-follow-the-pages-workspace
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

const titleWhen = [{ when: { workspace: 'callActive', op: 'eq', value: true }, title: 'Gesprek met {workspace.selectedClientName}' }]

describe('CnDashboardPage: a title from the workspace', () => {
	it('reads the workspace title while its condition holds and its tokens fill', async () => {
		const w = mount(CnDashboardPage, { propsData: { title: 'Werkplek', titleWhen, widgets: [], layout: [] }, stubs })
		expect(w.vm.resolvedTitle).toBe('Werkplek')
		w.vm.workspaceContext.callActive = true
		expect(w.vm.resolvedTitle).toBe('Werkplek')
		w.vm.workspaceContext.selectedClientName = 'Sanne de Vries'
		await w.vm.$nextTick()
		expect(w.vm.resolvedTitle).toBe('Gesprek met Sanne de Vries')
		expect(w.find('.cn-dashboard-page__title').text()).toBe('Gesprek met Sanne de Vries')
	})
})
