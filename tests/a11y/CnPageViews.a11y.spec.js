/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility of page views: the view switch is a named radio group whose
 * options control a named region, and an empty view is a region with a
 * sentence. axe scans both, with the real CnSegmentedControl.
 *
 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-the-view-switch-is-accessible
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const CnDashboardPage = require('../../src/components/CnDashboardPage/CnDashboardPage.vue').default

const VIEWS = [
	{
		id: 'mine',
		label: 'My work',
		widgets: [{ id: 'my-cases', type: 'custom', title: 'My cases' }],
		layout: [{ id: 'm1', widgetId: 'my-cases', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
	},
	{ id: 'team', label: 'My team', widgets: [], layout: [] },
]

const stubs = {
	CnDashboardGrid: {
		props: ['layout'],
		template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>',
	},
	CnWidgetWrapper: { template: '<section aria-label="Widget"><slot /></section>' },
	NcEmptyContent: { props: ['description'], template: '<p>{{ description }}</p>' },
	NcLoadingIcon: { template: '<div />' },
	CnActionsMenu: { template: '<div />' },
	CnBuildiqEditButton: { template: '<div />' },
}

function mountPage(query = {}) {
	return mountAttached(CnDashboardPage, {
		propsData: { title: 'Dashboard', pageId: 'dash', widgets: [], layout: [], views: VIEWS, viewsLabel: 'Whose work' },
		slots: { 'widget-my-cases': '<p>Three open cases</p>' },
		global: { stubs, mocks: { $route: { name: 'Dashboard', query }, $router: { replace: jest.fn(async () => {}) } } },
	})
}

describe('Page views: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
		localStorage.clear()
	})

	it('has no WCAG 2.1 AA violations with a view showing', async () => {
		wrapper = mountPage()
		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with an empty view showing', async () => {
		wrapper = mountPage({ view: 'team' })
		await expectAccessible(wrapper)
	})
})
