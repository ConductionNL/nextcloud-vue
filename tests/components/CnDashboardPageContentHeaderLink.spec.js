/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget whose content asks for a header link (`viewAllRoute`, the tasks
 * widget's "View all") gets it on the dashboard card; a link declared on the
 * placement or the definition still wins.
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { props: ['headerLink', 'widgetId'], template: '<div class="ww" :data-id="widgetId" :data-link="JSON.stringify(headerLink)"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

function linkOf(widgets) {
	const w = mount(CnDashboardPage, {
		propsData: {
			widgets,
			layout: widgets.map((d, i) => ({ id: String(i), widgetId: d.id, gridX: 0, gridY: i * 4, gridWidth: 6, gridHeight: 4 })),
		},
		slots: Object.fromEntries(widgets.map((d) => [`widget-${d.id}`, '<div />'])),
		global: { stubs },
	})
	return Object.fromEntries(w.findAll('.ww').map((el) => [el.attributes('data-id'), JSON.parse(el.attributes('data-link'))]))
}

describe('CnDashboardPage: header link from the widget content', () => {
	it('reads viewAllRoute and viewAllLabel from the content', () => {
		const links = linkOf([{ id: 'mine', type: 'custom', title: 'My work', content: { viewAllRoute: 'Tasks', viewAllLabel: 'All my tasks' } }])
		expect(links.mine).toEqual({ label: 'All my tasks', route: 'Tasks' })
	})

	it('lets the definition win over the content, and shows nothing when neither asks', () => {
		const links = linkOf([
			{ id: 'a', type: 'custom', title: 'A', headerLink: { label: 'Own', href: '#x' }, content: { viewAllRoute: 'Tasks' } },
			{ id: 'b', type: 'custom', title: 'B', content: {} },
		])
		expect(links.a).toEqual({ label: 'Own', href: '#x' })
		expect(links.b).toBeNull()
	})
})
