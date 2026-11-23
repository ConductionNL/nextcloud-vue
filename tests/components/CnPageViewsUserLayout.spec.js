/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Per-user layouts for page views. With `userLayout` on, a user arranges the
 * grid inside each view of a dashboard or detail page, the arrangement is
 * stored per view and per user through the same user-preference record the
 * dashboard's own grid uses (the server, mirrored in the browser), and a
 * reset returns that view to its manifest layout.
 *
 * Each test drives the real preference helpers over a fake HTTP server, so a
 * key that the read and the write spell differently fails here.
 *
 * @spec openspec/changes/page-view-user-layouts/specs/view-switch-containers/spec.md
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const mockServer = { values: {}, puts: [], gets: [] }
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(async (url) => {
			mockServer.gets.push(url)
			const key = decodeURIComponent(url.split('/').pop())
			return { data: key in mockServer.values ? { value: mockServer.values[key] } : {} }
		}),
		put: jest.fn(async (url, body) => {
			const key = decodeURIComponent(url.split('/').pop())
			mockServer.puts.push({ key, value: JSON.parse(body.value) })
			mockServer.values[key] = body.value
			return { data: {} }
		}),
	},
}))

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

/**
 * The manifest views every test starts from. Fresh per call, so a test that
 * finds them mutated knows the page wrote into the manifest.
 *
 * @return {Array<object>}
 */
function views() {
	return [
		{
			id: 'mine',
			label: 'My work',
			widgets: [{ id: 'my-cases', type: 'custom', title: 'My cases' }, { id: 'my-tasks', type: 'custom', title: 'My tasks' }],
			layout: [
				{ id: 'm1', widgetId: 'my-cases', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4 },
				{ id: 'm2', widgetId: 'my-tasks', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 4 },
			],
		},
		{
			id: 'team',
			label: 'My team',
			widgets: [{ id: 'team-cases', type: 'custom', title: 'Team cases' }],
			layout: [{ id: 't1', widgetId: 'team-cases', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
		},
	]
}

const gridStub = {
	props: ['layout', 'editable', 'columns', 'cellHeight', 'margin', 'columnOpts'],
	template: '<div class="grid" :data-editable="String(editable)"><div v-for="it in layout" :key="it.id" class="cell" :data-widget="it.widgetId" :data-x="it.gridX"><slot name="widget" :item="it" /></div></div>',
}

const dashStubs = {
	CnDashboardGrid: gridStub,
	CnWidgetWrapper: { props: ['widgetId'], template: '<div class="ww"><slot /></div>' },
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcEmptyContent: { props: ['description'], template: '<div class="empty">{{ description }}</div>' },
	NcLoadingIcon: { template: '<div />' },
	CnActionsMenu: { template: '<div />' },
	CnBuildiqEditButton: { template: '<div />' },
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Router doubles. The address stays empty: a plain `$route` double is not
 * reactive, so a query written into it reads stale after a second switch.
 * The address rule has its own tests (CnPageViews.spec.js); here the user's
 * choice decides the view.
 *
 * @param {string} name The route name.
 * @return {object}
 */
function routerMocks(name) {
	return {
		$route: { name, query: {} },
		$router: { replace: jest.fn(async () => {}), push: jest.fn() },
	}
}

/**
 * Mount a dashboard with views.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper and the views it was given.
 */
function mountDashboard(props = {}) {
	const pageViews = views()
	const wrapper = mount(CnDashboardPage, {
		propsData: { title: 'Dashboard', pageId: 'dash', appId: 'dossiq', widgets: [], layout: [], views: pageViews, ...props },
		global: { stubs: dashStubs, mocks: routerMocks('Dashboard') },
	})
	return { wrapper, pageViews }
}

const REGION = '[data-testid="cn-dashboard-page-view-region"]'
const regionX = (w, widgetId) => Number(w.find(`${REGION} [data-widget="${widgetId}"]`).attributes('data-x'))
const VIEW_KEY = 'dashboard-layout.dash.view.mine'

beforeEach(() => {
	localStorage.clear()
	mockServer.values = {}
	mockServer.puts = []
	mockServer.gets = []
})

describe('CnDashboardPage: a user arranges each view', () => {
	it('renders the stored arrangement of the chosen view', async () => {
		mockServer.values[VIEW_KEY] = JSON.stringify({ items: [{ widgetId: 'my-cases', gridX: 6 }, { widgetId: 'my-tasks', gridX: 0 }] })
		const { wrapper } = mountDashboard({ userLayout: true })
		await flush()
		await nextTick()

		expect(regionX(wrapper, 'my-cases')).toBe(6)
		expect(regionX(wrapper, 'my-tasks')).toBe(0)
	})

	it('makes the view grid editable in edit mode', async () => {
		const { wrapper } = mountDashboard({ userLayout: true, allowEdit: true })
		await flush()
		wrapper.vm.toggleEdit()
		await nextTick()

		expect(wrapper.find(REGION).attributes('data-editable')).toBe('true')
	})

	it('stores a drag per view on leaving edit mode and leaves the manifest alone', async () => {
		const { wrapper, pageViews } = mountDashboard({ userLayout: true })
		await flush()

		wrapper.vm.toggleEdit()
		wrapper.vm.onViewLayoutChange([{ id: 'm1', widgetId: 'my-cases', gridX: 3 }])
		wrapper.vm.onViewLayoutChange([{ id: 'm1', widgetId: 'my-cases', gridX: 6 }])
		await nextTick()

		// Nothing is written while the user is still dragging.
		expect(mockServer.puts).toEqual([])
		expect(regionX(wrapper, 'my-cases')).toBe(6)

		wrapper.vm.toggleEdit()
		await flush()

		expect(mockServer.puts).toHaveLength(1)
		expect(mockServer.puts[0].key).toBe(VIEW_KEY)
		expect(mockServer.puts[0].value.items.find((i) => i.widgetId === 'my-cases').gridX).toBe(6)
		// 🔴 The manifest view is untouched: writing a user's drag into it
		// would rearrange the view for everybody.
		expect(pageViews[0].layout[0].gridX).toBe(0)
		// The browser mirror holds it too.
		expect(JSON.parse(localStorage.getItem(`cn-preference:dossiq:${VIEW_KEY}`)).items[0].gridX).toBe(6)
	})

	it('keeps one arrangement per view', async () => {
		const { wrapper } = mountDashboard({ userLayout: true })
		await flush()

		wrapper.vm.toggleEdit()
		wrapper.vm.onViewLayoutChange([{ id: 'm1', widgetId: 'my-cases', gridX: 6 }])
		wrapper.vm.selectView('team')
		await flush()
		await nextTick()

		// The other view shows its own manifest layout.
		expect(regionX(wrapper, 'team-cases')).toBe(0)

		wrapper.vm.toggleEdit()
		await flush()

		expect(mockServer.puts.filter((p) => p.key.startsWith('dashboard-layout.')).map((p) => p.key)).toEqual([VIEW_KEY])
	})

	it('remembers the arrangement on the next visit', async () => {
		const first = mountDashboard({ userLayout: true })
		await flush()
		first.wrapper.vm.toggleEdit()
		first.wrapper.vm.onViewLayoutChange([{ id: 'm1', widgetId: 'my-cases', gridX: 6 }])
		first.wrapper.vm.toggleEdit()
		await flush()
		first.wrapper.unmount()

		const second = mountDashboard({ userLayout: true })
		// The browser mirror puts it on screen before the server answers.
		await nextTick()
		expect(regionX(second.wrapper, 'my-cases')).toBe(6)
	})

	it('resets the chosen view to its manifest layout and keeps the other views', async () => {
		mockServer.values[VIEW_KEY] = JSON.stringify({ items: [{ widgetId: 'my-cases', gridX: 6 }] })
		mockServer.values['dashboard-layout.dash.view.team'] = JSON.stringify({ items: [{ widgetId: 'team-cases', gridX: 4 }] })
		const { wrapper } = mountDashboard({ userLayout: true, allowEdit: true })
		await flush()
		wrapper.vm.selectView('team')
		await flush()
		wrapper.vm.selectView('mine')
		await flush()
		await nextTick()
		expect(regionX(wrapper, 'my-cases')).toBe(6)

		wrapper.vm.toggleEdit()
		await nextTick()
		await wrapper.find('[data-testid="cn-dashboard-page-reset-layout"]').trigger('click')
		await flush()
		await nextTick()

		expect(regionX(wrapper, 'my-cases')).toBe(0)
		expect(JSON.parse(mockServer.values[VIEW_KEY])).toEqual({ items: [] })
		expect(wrapper.emitted('view-layout-reset')[0][0]).toEqual({ view: 'mine' })
		// The other view keeps the user's arrangement.
		expect(JSON.parse(mockServer.values['dashboard-layout.dash.view.team']).items[0].gridX).toBe(4)
	})

	it('offers no reset outside edit mode or without userLayout', async () => {
		const { wrapper } = mountDashboard({ allowEdit: true })
		wrapper.vm.toggleEdit()
		await nextTick()
		expect(wrapper.find('[data-testid="cn-dashboard-page-reset-layout"]').exists()).toBe(false)
	})

	it('reads no view arrangement and keeps writing in place without userLayout', async () => {
		const { wrapper, pageViews } = mountDashboard()
		await flush()

		expect(mockServer.gets.filter((url) => url.includes('dashboard-layout'))).toEqual([])
		wrapper.vm.onViewLayoutChange([{ id: 'm1', widgetId: 'my-cases', gridX: 6 }])
		// The in-app manifest editor depends on this write.
		expect(pageViews[0].layout[0].gridX).toBe(6)
	})
})

describe('CnDetailPage: a user arranges each view', () => {
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
		CnDetailWidgetHost: { props: ['widget'], template: '<div class="host" />' },
		NcEmptyContent: { props: ['description'], template: '<div class="empty">{{ description }}</div>' },
	}
	const DREGION = '[data-testid="cn-detail-page-view-region"]'
	const ARRANGE = '[data-testid="cn-detail-page-arrange-view"]'
	const RESET = '[data-testid="cn-detail-page-reset-view"]'
	const DKEY = 'dashboard-layout.case-detail.view.mine'

	function mountDetail(props = {}) {
		const pageViews = views()
		const wrapper = mount(CnDetailPage, {
			propsData: { title: 'Case', pageId: 'case-detail', register: 'reg', schema: 'case', objectId: 'id-1', objectStore: store, views: pageViews, ...props },
			global: { stubs: detailStubs, mocks: routerMocks('CaseDetail'), provide: { cnAppId: 'dossiq' } },
		})
		return { wrapper, pageViews }
	}

	it('offers no arrange button without userLayout', () => {
		const { wrapper } = mountDetail()
		expect(wrapper.find(ARRANGE).exists()).toBe(false)
	})

	it('arranges the chosen view, stores it on Done and leaves the manifest alone', async () => {
		const { wrapper, pageViews } = mountDetail({ userLayout: true })
		await flush()
		expect(wrapper.find(DREGION).attributes('data-editable')).toBe('false')

		await wrapper.find(ARRANGE).trigger('click')
		expect(wrapper.find(DREGION).attributes('data-editable')).toBe('true')

		wrapper.vm.onViewLayoutChange([{ id: 'm2', widgetId: 'my-tasks', gridX: 0, gridY: 4 }])
		expect(mockServer.puts).toEqual([])

		await wrapper.find(ARRANGE).trigger('click')
		await flush()

		expect(mockServer.puts.map((p) => p.key)).toEqual([DKEY])
		expect(mockServer.puts[0].value.items.find((i) => i.widgetId === 'my-tasks')).toEqual({ widgetId: 'my-tasks', gridX: 0, gridY: 4, gridWidth: 6, gridHeight: 4 })
		expect(pageViews[0].layout[1].gridX).toBe(6)
		expect(wrapper.find(DREGION).attributes('data-editable')).toBe('false')
	})

	it('resets the chosen view to its manifest layout', async () => {
		mockServer.values[DKEY] = JSON.stringify({ items: [{ widgetId: 'my-cases', gridX: 6 }] })
		const { wrapper } = mountDetail({ userLayout: true })
		await flush()
		await nextTick()
		expect(Number(wrapper.find(`${DREGION} [data-widget="my-cases"]`).attributes('data-x'))).toBe(6)

		await wrapper.find(ARRANGE).trigger('click')
		await wrapper.find(RESET).trigger('click')
		await flush()
		await nextTick()

		expect(Number(wrapper.find(`${DREGION} [data-widget="my-cases"]`).attributes('data-x'))).toBe(0)
		expect(JSON.parse(mockServer.values[DKEY])).toEqual({ items: [] })
	})
})
