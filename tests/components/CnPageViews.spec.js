/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Page views: a dashboard or detail page declares `views`, each its own
 * widget grid, and a segmented control swaps the region below. The address
 * (`?view=`) wins over the stored choice, which wins over `defaultView`. A
 * greeting header widget with `options[].view` draws the switch instead of
 * the page. An empty view says so instead of leaving a blank area.
 *
 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnHeaderWidget from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'

const VIEWS = [
	{
		id: 'mine',
		label: 'My work',
		widgets: [{ id: 'my-cases', type: 'custom', title: 'My cases' }],
		layout: [{ id: 'm1', widgetId: 'my-cases', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
	},
	{
		id: 'team',
		label: 'My team',
		widgets: [{ id: 'team-cases', type: 'custom', title: 'Team cases' }],
		layout: [{ id: 't1', widgetId: 'team-cases', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
	},
	{ id: 'empty', label: 'Archive', widgets: [], layout: [] },
]

const gridStub = {
	props: ['layout', 'editable', 'columns', 'cellHeight', 'margin', 'columnOpts'],
	template: '<div class="grid"><div v-for="it in layout" :key="it.id" class="cell" :data-widget="it.widgetId"><slot name="widget" :item="it" /></div></div>',
}

const dashStubs = {
	CnDashboardGrid: gridStub,
	CnWidgetWrapper: { props: ['widgetId'], template: '<div class="ww" :data-id="widgetId"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { props: ['description'], template: '<div class="empty">{{ description }}</div>' },
	NcLoadingIcon: { template: '<div />' },
	CnActionsMenu: { template: '<div />' },
	CnBuildiqEditButton: { template: '<div />' },
}

function routerMocks(query = {}) {
	const route = { name: 'Dashboard', query }
	const replace = jest.fn(async (to) => {
		route.query = to.query
	})
	return { $route: route, $router: { replace, push: jest.fn() } }
}

function mountDashboard(props = {}, { query = {}, provide = {}, attachTo } = {}) {
	const mocks = routerMocks(query)
	const wrapper = mount(CnDashboardPage, {
		propsData: {
			title: 'Dashboard',
			pageId: 'dash',
			widgets: [],
			layout: [],
			views: VIEWS,
			...props,
		},
		slots: {
			'widget-my-cases': '<p class="body">mine</p>',
			'widget-team-cases': '<p class="body">team</p>',
			'widget-greeting': '<p class="body">greeting</p>',
		},
		attachTo,
		global: { stubs: dashStubs, mocks, provide },
	})
	return { wrapper, mocks }
}

const SWITCH = '[data-testid="cn-dashboard-page-view-switch"]'
const REGION = '[data-testid="cn-dashboard-page-view-region"]'
const regionWidgets = (w) => w.findAll(`${REGION} .cell`).map((c) => c.attributes('data-widget'))
const radios = (w, sel = SWITCH) => w.findAll(`${sel} [role="radio"]`)

beforeEach(() => {
	localStorage.clear()
})

describe('CnDashboardPage: views', () => {
	it('draws no switch and no region without views', () => {
		const { wrapper } = mountDashboard({
			views: [],
			widgets: [{ id: 'my-cases', type: 'custom', title: 'My cases' }],
			layout: [{ id: '1', widgetId: 'my-cases', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
		})
		expect(wrapper.find(SWITCH).exists()).toBe(false)
		expect(wrapper.find(REGION).exists()).toBe(false)
		expect(wrapper.findAll('.cell').map((c) => c.attributes('data-widget'))).toEqual(['my-cases'])
	})

	it('opens on the first view and renders its widgets', () => {
		const { wrapper } = mountDashboard()
		expect(radios(wrapper).map((r) => r.text())).toEqual(['My work', 'My team', 'Archive'])
		expect(radios(wrapper)[0].attributes('aria-checked')).toBe('true')
		expect(regionWidgets(wrapper)).toEqual(['my-cases'])
	})

	it('opens on defaultView when nothing else decides', () => {
		const { wrapper } = mountDashboard({ defaultView: 'team' })
		expect(radios(wrapper)[1].attributes('aria-checked')).toBe('true')
		expect(regionWidgets(wrapper)).toEqual(['team-cases'])
	})

	it('switching renders the other view\'s widgets and writes the address and the store', async () => {
		const { wrapper, mocks } = mountDashboard({}, { query: { tab: 'x' } })
		await radios(wrapper)[1].trigger('click')
		await nextTick()
		expect(regionWidgets(wrapper)).toEqual(['team-cases'])
		expect(wrapper.text()).not.toContain('mine')
		expect(mocks.$router.replace).toHaveBeenCalledWith({ query: { tab: 'x', view: 'team' } })
		expect(JSON.parse(localStorage.getItem('cn-preference::cn_page_view:dash'))).toBe('team')
	})

	it('opens on the stored view when the address names none', () => {
		localStorage.setItem('cn-preference::cn_page_view:dash', JSON.stringify('team'))
		const { wrapper } = mountDashboard()
		expect(regionWidgets(wrapper)).toEqual(['team-cases'])
	})

	it('lets the address win over the stored view', () => {
		localStorage.setItem('cn-preference::cn_page_view:dash', JSON.stringify('team'))
		const { wrapper } = mountDashboard({}, { query: { view: 'mine' } })
		expect(regionWidgets(wrapper)).toEqual(['my-cases'])
	})

	it('ignores an address view that names no view', () => {
		const { wrapper } = mountDashboard({ defaultView: 'team' }, { query: { view: 'nope' } })
		expect(regionWidgets(wrapper)).toEqual(['team-cases'])
	})

	it('shows a sentence for a view with no widgets, never a blank area', async () => {
		const { wrapper } = mountDashboard({}, { query: { view: 'empty' } })
		const empty = wrapper.find('[data-testid="cn-dashboard-page-view-empty"]')
		expect(empty.exists()).toBe(true)
		expect(empty.text()).toBe('This view has no widgets yet.')
		expect(wrapper.find(REGION).exists()).toBe(false)
	})

	it('uses the view\'s own emptyText', () => {
		const views = [{ id: 'a', label: 'A', emptyText: 'Nobody in your team has open cases.', widgets: [], layout: [] }]
		const { wrapper } = mountDashboard({ views })
		expect(wrapper.find('[data-testid="cn-dashboard-page-view-empty"]').text()).toBe('Nobody in your team has open cases.')
	})

	it('keeps the page\'s own grid above the view region', () => {
		const { wrapper } = mountDashboard({
			widgets: [{ id: 'greeting', type: 'custom', title: 'Greeting' }],
			layout: [{ id: 'g', widgetId: 'greeting', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
		})
		const grids = wrapper.findAll('.grid')
		expect(grids).toHaveLength(2)
		expect(grids[0].attributes('role')).toBeUndefined()
		expect(grids[0].find('.cell').attributes('data-widget')).toBe('greeting')
		expect(grids[1].attributes('role')).toBe('region')
	})

	it('points every option at the region and names the region after the view', () => {
		const { wrapper } = mountDashboard({ viewsLabel: 'Whose work' })
		const region = wrapper.find(REGION)
		expect(region.attributes('role')).toBe('region')
		expect(region.attributes('aria-label')).toBe('My work')
		const id = region.attributes('id')
		expect(id).toMatch(/^cn-page-view-region-/)
		expect(radios(wrapper).every((r) => r.attributes('aria-controls') === id)).toBe(true)
		expect(wrapper.find(`${SWITCH}`).attributes('aria-label')).toBe('Whose work')
	})

	it('keeps focus on the control after an arrow key switches the view', async () => {
		const { wrapper } = mountDashboard({}, { attachTo: document.body })
		const first = radios(wrapper)[0]
		first.element.focus()
		await first.trigger('keydown', { key: 'ArrowRight' })
		await nextTick()
		expect(regionWidgets(wrapper)).toEqual(['team-cases'])
		expect(document.activeElement).toBe(radios(wrapper)[1].element)
		wrapper.unmount()
	})

	it('draws the switch in a row of its own when the header row is off', () => {
		const { wrapper } = mountDashboard({ showHeader: false })
		expect(wrapper.find('.cn-dashboard-page__view-switch ' + SWITCH).exists()).toBe(true)
	})
})

describe('CnHeaderWidget: options that select page views', () => {
	const headerStubs = { ...dashStubs }
	delete headerStubs.CnWidgetWrapper

	function mountWithHeader(options) {
		const widgets = [{ id: 'greeting', type: 'header', title: 'Greeting', content: { greeting: true, ground: true, views: { ariaLabel: 'Whose work', options } } }]
		const layout = [{ id: 'g', widgetId: 'greeting', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }]
		const mocks = routerMocks()
		const wrapper = mount(CnDashboardPage, {
			propsData: { title: 'Dashboard', pageId: 'dash', showHeader: false, widgets, layout, views: VIEWS },
			global: {
				stubs: { ...headerStubs, CnWidgetWrapper: { template: '<div><slot /></div>' } },
				mocks,
			},
		})
		return { wrapper, mocks }
	}

	it('selects the view from the header and the page draws no second switch', async () => {
		const { wrapper, mocks } = mountWithHeader([{ label: 'My work', view: 'mine' }, { label: 'My team', view: 'team' }])
		expect(wrapper.find(SWITCH).exists()).toBe(false)
		const header = wrapper.findComponent(CnHeaderWidget)
		expect(header.exists()).toBe(true)
		const options = radios(wrapper, '[data-testid="cn-header-widget-views"]')
		expect(options.map((o) => o.text())).toEqual(['My work', 'My team'])
		expect(options[0].attributes('aria-checked')).toBe('true')
		expect(options[0].attributes('aria-controls')).toBe(wrapper.find(REGION).attributes('id'))
		await options[1].trigger('click')
		await nextTick()
		expect(regionWidgets(wrapper)).toEqual(['team-cases'])
		expect(mocks.$router.push).not.toHaveBeenCalled()
		expect(radios(wrapper, '[data-testid="cn-header-widget-views"]')[1].attributes('aria-checked')).toBe('true')
	})

	it('drops a view option that names no view of the page', () => {
		const { wrapper } = mountWithHeader([{ label: 'My work', view: 'mine' }, { label: 'Ghost', view: 'ghost' }])
		const options = radios(wrapper, '[data-testid="cn-header-widget-views"]')
		expect(options.map((o) => o.text())).toEqual(['My work'])
	})

	it('keeps route options navigating', async () => {
		const { wrapper, mocks } = mountWithHeader([{ label: 'My work', view: 'mine' }, { label: 'Queue', route: 'Queue' }])
		const options = radios(wrapper, '[data-testid="cn-header-widget-views"]')
		await options[1].trigger('click')
		expect(mocks.$router.push).toHaveBeenCalledWith({ name: 'Queue' })
	})
})

describe('CnDetailPage: views', () => {
	const store = {
		objects: { 'reg-case': { 'id-1': { name: '2026-0082' } } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
	const detailStubs = {
		CnDashboardGrid: gridStub,
		CnDetailWidgetHost: { props: ['widget'], template: '<div class="host" :data-widget="widget && widget.id" />' },
		NcEmptyContent: { props: ['description'], template: '<div class="empty">{{ description }}</div>' },
	}
	const DETAIL_VIEWS = [
		{ id: 'overview', label: 'Overview', widgets: [{ id: 'case-data', type: 'data', title: 'Data' }], layout: [{ id: 'o1', widgetId: 'case-data', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }] },
		{ id: 'documents', label: 'Documents', widgets: [{ id: 'case-files', type: 'files', title: 'Files' }], layout: [{ id: 'd1', widgetId: 'case-files', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }] },
		{ id: 'notes', label: 'Notes', widgets: [], layout: [] },
	]

	function mountDetail(query = {}) {
		const mocks = routerMocks(query)
		mocks.$route.name = 'CaseDetail'
		const wrapper = mount(CnDetailPage, {
			propsData: { title: 'Case', register: 'reg', schema: 'case', objectId: 'id-1', objectStore: store, views: DETAIL_VIEWS },
			global: { stubs: detailStubs, mocks },
		})
		return { wrapper, mocks }
	}
	const DSWITCH = '[data-testid="cn-detail-page-view-switch"]'
	const DREGION = '[data-testid="cn-detail-page-view-region"]'
	const hosts = (w) => w.findAll(`${DREGION} .host`).map((h) => h.attributes('data-widget'))

	it('draws the switch in the page header and swaps the region', async () => {
		const { wrapper, mocks } = mountDetail()
		const header = wrapper.find('[data-testid="cn-detail-page-header"]')
		expect(header.find(DSWITCH).exists()).toBe(true)
		expect(hosts(wrapper)).toEqual(['case-data'])
		await radios(wrapper, DSWITCH)[1].trigger('click')
		await nextTick()
		expect(hosts(wrapper)).toEqual(['case-files'])
		expect(mocks.$router.replace).toHaveBeenCalledWith({ query: { view: 'documents' } })
		expect(JSON.parse(localStorage.getItem('cn-preference::cn_page_view:CaseDetail'))).toBe('documents')
	})

	it('opens the view the address names', () => {
		const { wrapper } = mountDetail({ view: 'documents' })
		expect(hosts(wrapper)).toEqual(['case-files'])
	})

	it('shows a sentence for an empty view', () => {
		const { wrapper } = mountDetail({ view: 'notes' })
		const empty = wrapper.find('[data-testid="cn-detail-page-view-empty"]')
		expect(empty.text()).toBe('This view has no widgets yet.')
		expect(empty.attributes('role')).toBe('region')
		expect(radios(wrapper, DSWITCH)[2].attributes('aria-controls')).toBe(empty.attributes('id'))
	})
})
