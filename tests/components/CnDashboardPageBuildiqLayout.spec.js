/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Buildiq is the layout editor (Ruben, 18 Oct). While it edits the page
 * (`cnEditingBody`), a drag writes the grid geometry into the manifest it
 * diffs, also on a page that declares `userLayout`. A user arrangement made
 * outside an in-page edit session is saved at once instead of waiting for a
 * Done that never comes.
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div class="grid-stub" />', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin', 'columnOpts'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div><slot /></div>' },
	CnBuildiqEditButton: { template: '<div />' },
	CnActionsMenu: { template: '<div />' },
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * @return {Array<object>} The manifest layout.
 */
function manifest() {
	return [
		{ id: 'kpis', widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
		{ id: 'tasks', widgetId: 'tasks', gridX: 3, gridY: 0, gridWidth: 3, gridHeight: 2 },
	]
}

/**
 * @param {object|null} record What `load` answers.
 * @return {object} A layout store double.
 */
function layoutStore(record = null) {
	return {
		loadDashboardLayout: jest.fn(async () => record),
		saveDashboardLayout: jest.fn(async () => true),
		resetDashboardLayout: jest.fn(async () => true),
	}
}

/**
 * @param {object} props Extra props.
 * @param {object} [provide] Provides.
 * @return {object} The wrapper.
 */
function mountPage(props, provide = {}) {
	return mount(CnDashboardPage, {
		props: {
			title: 'Dashboard',
			pageId: 'Dashboard',
			widgets: [{ id: 'kpis', title: 'KPIs', type: 'custom' }, { id: 'tasks', title: 'Tasks', type: 'custom' }],
			...props,
		},
		global: { stubs, provide },
	})
}

describe('CnDashboardPage with Buildiq as the layout editor', () => {
	it('writes a Buildiq drag into the manifest on a userLayout page', async () => {
		const layout = manifest()
		const store = layoutStore({ items: [{ widgetId: 'kpis', gridX: 6 }] })
		const page = mountPage({ layout, userLayout: true, appId: 'dossiq', userLayoutStore: store }, { cnEditingBody: ref(true) })
		await flush()

		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 9, gridY: 1, gridWidth: 3, gridHeight: 2 }])
		await flush()

		expect(layout[0]).toMatchObject({ gridX: 9, gridY: 1 })
		expect(store.saveDashboardLayout).not.toHaveBeenCalled()
		expect(page.emitted('layout-change').at(-1)[0][0]).toMatchObject({ widgetId: 'kpis', gridX: 9 })
	})

	it('shows Buildiq the manifest layout, not the user arrangement', async () => {
		const layout = manifest()
		const store = layoutStore({ items: [{ widgetId: 'kpis', gridX: 6 }] })
		const page = mountPage({ layout, userLayout: true, appId: 'dossiq', userLayoutStore: store }, { cnEditingBody: ref(true) })
		await flush()

		expect(page.vm.renderedLayout.find((w) => w.widgetId === 'kpis').gridX).toBe(0)
	})

	it('saves a user arrangement made outside an in-page edit session at once', async () => {
		const layout = manifest()
		const store = layoutStore(null)
		const page = mountPage({ layout, userLayout: true, appId: 'dossiq', userLayoutStore: store })
		await flush()

		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 6, gridY: 0, gridWidth: 3, gridHeight: 2 }])
		await flush()

		expect(store.saveDashboardLayout).toHaveBeenCalledTimes(1)
		expect(layout[0].gridX).toBe(0)
	})

	it('still saves once on Done inside an in-page edit session', async () => {
		const layout = manifest()
		const store = layoutStore(null)
		const page = mountPage({ layout, userLayout: true, appId: 'dossiq', userLayoutStore: store, allowEdit: true })
		await flush()

		page.vm.toggleEdit()
		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 6, gridY: 0, gridWidth: 3, gridHeight: 2 }])
		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 7, gridY: 0, gridWidth: 3, gridHeight: 2 }])
		await flush()
		expect(store.saveDashboardLayout).not.toHaveBeenCalled()

		page.vm.toggleEdit()
		await flush()
		expect(store.saveDashboardLayout).toHaveBeenCalledTimes(1)
	})

	it('writes a Buildiq drag in a view into the view\'s manifest layout', async () => {
		const views = [{
			id: 'mine',
			label: 'My work',
			widgets: [{ id: 'my-cases', type: 'custom', title: 'My cases' }],
			layout: [{ id: 'm1', widgetId: 'my-cases', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4 }],
		}]
		const store = layoutStore(null)
		const page = mount(CnDashboardPage, {
			props: { title: 'Dashboard', pageId: 'dash', appId: 'dossiq', widgets: [], layout: [], views, userLayout: true, userLayoutStore: store },
			global: {
				stubs,
				provide: { cnEditingBody: ref(true) },
				mocks: { $route: { name: 'Dashboard', query: {} }, $router: { replace: jest.fn(async () => {}), push: jest.fn() } },
			},
		})
		await flush()

		page.vm.onViewLayoutChange([{ id: 'm1', widgetId: 'my-cases', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 4 }])
		await flush()

		expect(views[0].layout[0].gridX).toBe(6)
		expect(store.saveDashboardLayout).not.toHaveBeenCalled()
	})
})
