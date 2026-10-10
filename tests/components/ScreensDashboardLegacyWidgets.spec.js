/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-dashboard-legacy-widgets: a `config.widgets` dashboard (portaliq's
 * PtDashboard shape) mounts the library's catalog widgets (banner, table,
 * stat) through the widget registry, `showWidgetActions: false` drops every
 * widget menu there too, and in the board look it also drops the Add footer
 * of the list widgets. Without the board look the footer stays.
 *
 * @spec openspec/changes/screens-dashboard-legacy-widgets/specs/dashboard-page/spec.md
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

function Probe(name) {
	return {
		name,
		props: ['content', 'widgetId'],
		template: `<div class="probe" data-type="${name}" :data-id="widgetId" :data-allow-create="String(content && content.allowCreate)" />`,
	}
}

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin', 'float'] },
	CnWidgetWrapper: { props: ['showActions', 'widgetId'], template: '<div class="ww" :data-id="widgetId" :data-actions="String(showActions)"><slot /></div>' },
	CnStatsBlockWidget: { template: '<div class="stats-block-stub" />' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const widgets = [
	{ id: 'kpi-requests', type: 'stats-block', title: 'Open access requests', dataSource: { register: 'r', schema: 's', aggregate: 'count' } },
	{ id: 'first-today', type: 'banner', title: 'First today', content: { layout: 'attention', title: 'A request waits' } },
	{ id: 'requests', type: 'table', title: 'Open access requests', content: { register: 'r', schema: 's' } },
	{ id: 'submissions', type: 'table', title: 'Recent submissions', content: { register: 'r', schema: 's', allowCreate: true } },
	{ id: 'visitors', type: 'stat', title: 'Visitors', content: { label: 'Visitors' } },
]

/**
 * @param {object} props page props
 * @param {boolean} isBoard board look on
 * @return {object} wrapper
 */
function mountPage(props = {}, isBoard = true) {
	return mount(CnDashboardPage, {
		propsData: {
			widgets,
			layout: widgets.map((w, i) => ({ id: String(i), widgetId: w.id, gridX: 0, gridY: i * 2, gridWidth: 12, gridHeight: 2 })),
			...props,
		},
		provide: {
			cnRegistry: { banner: Probe('banner'), table: Probe('table'), stat: Probe('stat') },
			...(isBoard ? { cnLook: 'board' } : {}),
		},
		global: { stubs },
	})
}

const probe = (w, id) => w.find(`.probe[data-id="${id}"]`)
const actions = (w, id) => w.find(`.ww[data-id="${id}"]`).attributes('data-actions')

describe('CnDashboardPage: catalog widgets on a config.widgets dashboard', () => {
	it('mounts banner, table and stat through the registry next to a stats block', () => {
		const w = mountPage()
		expect(w.find('.stats-block-stub').exists()).toBe(true)
		expect(probe(w, 'first-today').attributes('data-type')).toBe('banner')
		expect(probe(w, 'requests').attributes('data-type')).toBe('table')
		expect(probe(w, 'visitors').attributes('data-type')).toBe('stat')
		expect(w.text()).not.toContain('unavailable')
	})

	it('resolves the library catalog itself when the app registers nothing', () => {
		const w = mount(CnDashboardPage, {
			propsData: { widgets, layout: [] },
			global: { stubs },
		})
		for (const id of ['first-today', 'requests', 'visitors']) {
			expect(w.vm.registryRenderer({ widgetId: id })).toBeTruthy()
		}
	})
})

describe('CnDashboardPage: showWidgetActions on a config.widgets dashboard', () => {
	it('drops the menu from the stats block and the registry widgets', () => {
		const w = mountPage({ showWidgetActions: false })
		for (const id of ['kpi-requests', 'first-today', 'requests', 'visitors']) {
			expect(actions(w, id)).toBe('false')
		}
	})

	it('drops the Add footer of a list widget in the board look, unless the widget sets allowCreate', () => {
		const w = mountPage({ showWidgetActions: false })
		expect(probe(w, 'requests').attributes('data-allow-create')).toBe('false')
		expect(probe(w, 'submissions').attributes('data-allow-create')).toBe('true')
	})

	it('keeps the Add footer with the menu on', () => {
		const w = mountPage()
		expect(probe(w, 'requests').attributes('data-allow-create')).toBe('undefined')
	})

	it('keeps the Add footer without the board look, as today', () => {
		const w = mountPage({ showWidgetActions: false }, false)
		expect(probe(w, 'requests').attributes('data-allow-create')).toBe('undefined')
		expect(actions(w, 'requests')).toBe('false')
	})
})
