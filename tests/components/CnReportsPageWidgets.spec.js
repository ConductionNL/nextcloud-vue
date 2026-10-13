/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A reports page can draw dashboard widgets under its cards (`widgets` +
 * `layout`), as board DcRapportages draws "Vergaderingen en efficiëntie"
 * (screens-reports-page-widgets).
 *
 * @spec openspec/changes/screens-reports-page-widgets/specs/reports-page/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

const CnDashboardPageStub = {
	name: 'CnDashboardPage',
	props: ['widgets', 'layout', 'showHeader'],
	template: '<div class="dash-stub" />',
}

const CARDS = [{ id: 'Meetings', label: 'Vergaderingen en aanwezigheid', route: 'MeetingsReport' }]

function mountPage(props) {
	return mount(CnReportsPage, {
		props: { title: 'Rapportages', cards: CARDS, ...props },
		global: {
			mocks: { $router: { push: jest.fn(), resolve: ({ name }) => ({ href: `/r/${name}` }) } },
			stubs: { CnDashboardPage: CnDashboardPageStub },
		},
	})
}

describe('CnReportsPage widgets under the cards', () => {
	it('draws the declared widgets with their layout after the card grid, without a dashboard header', async () => {
		const widgets = [{ id: 'efficiency', type: 'stat', title: 'Vergaderingen en efficiëntie' }]
		const layout = [{ id: '1', widgetId: 'efficiency', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 5 }]
		const wrapper = mountPage({ widgets, layout })
		await flushPromises()
		const dash = wrapper.findComponent(CnDashboardPageStub)
		expect(dash.exists()).toBe(true)
		expect(dash.props('widgets')).toEqual(widgets)
		expect(dash.props('layout')).toEqual(layout)
		expect(dash.props('showHeader')).toBe(false)
		// Under the cards, not above them.
		const html = wrapper.html()
		expect(html.indexOf('cn-reports-grid')).toBeLessThan(html.indexOf('cn-reports-widgets'))
	})

	it('gives each widget a full row when no layout is declared', async () => {
		const wrapper = mountPage({ widgets: [{ id: 'a', type: 'stat' }, { id: 'b', type: 'chart' }] })
		await flushPromises()
		expect(wrapper.findComponent(CnDashboardPageStub).props('layout')).toEqual([
			{ id: '1', widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 },
			{ id: '2', widgetId: 'b', gridX: 0, gridY: 4, gridWidth: 12, gridHeight: 4 },
		])
	})

	it('reads widgets from a whole page handed to it', async () => {
		const wrapper = mount(CnReportsPage, {
			props: { page: { id: 'Reports', title: 'Reports', config: { cards: CARDS, widgets: [{ id: 'a', type: 'stat' }] } } },
			global: { mocks: { $router: { push: jest.fn(), resolve: () => ({ href: '#' }) } }, stubs: { CnDashboardPage: CnDashboardPageStub } },
		})
		await flushPromises()
		expect(wrapper.findComponent(CnDashboardPageStub).exists()).toBe(true)
	})

	it('draws nothing extra without widgets', async () => {
		const wrapper = mountPage({})
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-reports-widgets"]').exists()).toBe(false)
	})
})
