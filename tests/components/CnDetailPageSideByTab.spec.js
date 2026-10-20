/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Side cards per tab (DqZaaktypeVelden): the body's `tabs` widget reports the
 * open tab to CnDetailPage, and a side entry with `tabs` shows only while one
 * of those tabs is open ("Keuzelijst: Soort bouwwerk" and "Moedertype"
 * beside Velden). Entries without `tabs` show beside every tab.
 *
 * @spec openspec/changes/detail-side-cards-per-tab/specs/detail-page/spec.md#requirement-a-side-card-can-follow-the-open-tab
 */
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'overview', type: 'facts', title: 'Overview' },
	{ id: 'fields', type: 'object-list', title: 'Fields', content: { register: 'r', schema: 's' } },
	{ id: 'option-list', type: 'record-list', title: 'Option list', tabs: ['fields'] },
	{ id: 'parent-type', type: 'facts', title: 'Parent type', tabs: ['fields', 'statuses'] },
	{ id: 'audit', type: 'audit-trail', title: 'History' },
	{ id: 'deadline', type: 'facts', title: 'Deadline', notTabs: ['ai-oversight'] },
]

/**
 * Mount a case type page.
 *
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The page.
 */
async function mountPage() {
	const w = shallowMount(CnDetailPage, {
		props: {
			title: 'Case type',
			register: 'dossiq',
			schema: 'caseType',
			objectId: 'ct-1',
			objectStore: {
				objects: { 'dossiq-caseType': { 'ct-1': { id: 'ct-1' } } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
			widgets: WIDGETS,
			layout: [{ id: '0', widgetId: 'overview', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
			sideColumn: ['option-list', 'parent-type', 'audit', 'deadline'],
		},
		global: { mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'ct' }, $router: { push: jest.fn(), replace: jest.fn() } } },
	})
	await flushPromises()
	return w
}

const sideIds = (w) => w.vm.sideColumnWidgets.map((widget) => widget.id)

describe('CnDetailPage side cards per tab', () => {
	it('shows only the entries without tabs before a tab reports', async () => {
		expect(sideIds(await mountPage())).toEqual(['audit', 'deadline'])
	})

	it('shows the entries of the open tab, and follows a switch', async () => {
		const w = await mountPage()
		w.vm.$.provides.cnDetailReportTab('fields')
		await nextTick()
		expect(sideIds(w)).toEqual(['option-list', 'parent-type', 'audit', 'deadline'])
		w.vm.$.provides.cnDetailReportTab('statuses')
		await nextTick()
		expect(sideIds(w)).toEqual(['parent-type', 'audit', 'deadline'])
	})

	it('leaves out an entry with notTabs while one of those tabs is open', async () => {
		const w = await mountPage()
		w.vm.$.provides.cnDetailReportTab('ai-oversight')
		await nextTick()
		expect(sideIds(w)).toEqual(['audit'])
		w.vm.$.provides.cnDetailReportTab('fields')
		await nextTick()
		expect(sideIds(w)).toContain('deadline')
	})
})

describe('CnTabsWidget reports its open tab', () => {
	it('reports the first tab, then each switch', async () => {
		const report = jest.fn()
		const w = mount(CnTabsWidget, {
			props: { content: { tabs: [{ id: 'overview', widgetId: 'overview' }, { id: 'fields', widgetId: 'fields' }] }, availableWidgets: WIDGETS, objectId: 'ct-1' },
			global: {
				provide: { cnDetailReportTab: report },
				stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div />' } },
			},
		})
		await nextTick()
		expect(report).toHaveBeenLastCalledWith('overview')
		await w.findAll('[role="tab"]')[1].trigger('click')
		await nextTick()
		expect(report).toHaveBeenLastCalledWith('fields')
	})
})
