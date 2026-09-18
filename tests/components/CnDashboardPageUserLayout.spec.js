/**
 * Tests for the per-user dashboard layout on CnDashboardPage.
 *
 * Four things, each of which fails invisibly if it is wrong:
 *
 * - a page WITHOUT `userLayout` makes no layout request at all. Not a request
 *   answering nothing: an absence of one, which is the only way the opt-out is
 *   free on the dashboards that never asked for this.
 * - the stored geometry wins over the manifest, and a widget without a stored
 *   entry keeps its manifest position.
 * - leaving edit mode saves ONCE. Saving per drag writes a record per pixel
 *   gesture and races the next drag.
 * - a user's arrangement NEVER writes into the `layout` prop. The in-place
 *   mutation the admin editor relies on would, for a user, rewrite the page
 *   for everybody who opens it after them.
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: {
		template: '<div class="grid-stub" />',
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
	},
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div><slot /></div>' },
}

/**
 * The manifest layout every test starts from.
 *
 * @return {Array<object>} Two widgets, side by side.
 */
function manifest() {
	return [
		{ id: 'kpis', widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
		{ id: 'tasks', widgetId: 'tasks', gridX: 3, gridY: 0, gridWidth: 3, gridHeight: 2 },
	]
}

/**
 * A layout store double recording every call.
 *
 * @param {object|null} record What `load` answers.
 * @return {object} The store, with a `calls` log.
 */
function layoutStore(record = null) {
	const calls = { load: [], save: [], reset: [] }

	return {
		calls,
		loadDashboardLayout: jest.fn(async (...a) => {
			calls.load.push(a)
			return record
		}),
		saveDashboardLayout: jest.fn(async (...a) => {
			calls.save.push(a)
			return true
		}),
		resetDashboardLayout: jest.fn(async (...a) => {
			calls.reset.push(a)
			return true
		}),
	}
}

/**
 * Mount the page.
 *
 * @param {object} props Extra props.
 * @param {Array<object>} [layout] The manifest layout.
 * @return {object} The wrapper.
 */
function mountPage(props = {}, layout = manifest()) {
	return mount(CnDashboardPage, {
		props: {
			title: 'Dashboard',
			pageId: 'Dashboard',
			widgets: [
				{ id: 'kpis', title: 'KPIs', type: 'custom' },
				{ id: 'tasks', title: 'Tasks', type: 'custom' },
			],
			layout,
			...props,
		},
		global: { stubs },
	})
}

describe('CnDashboardPage per-user layout', () => {
	it('makes no layout request when the page does not opt in', async () => {
		const store = layoutStore()
		mountPage({ appId: 'dossiq', userLayoutStore: store })
		await Promise.resolve()

		expect(store.loadDashboardLayout).not.toHaveBeenCalled()
	})

	it('makes no layout request when the app id is missing', async () => {
		// A preference has to be addressed to an app. Storing one under an
		// empty app id writes a record nothing ever reads back.
		const store = layoutStore()
		mountPage({ userLayout: true, userLayoutStore: store })
		await Promise.resolve()

		expect(store.loadDashboardLayout).not.toHaveBeenCalled()
	})

	it('renders the stored geometry over the manifest', async () => {
		const store = layoutStore({ items: [{ widgetId: 'kpis', gridX: 6 }] })
		const page = mountPage({ userLayout: true, appId: 'dossiq', userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))

		const rendered = page.vm.renderedLayout
		expect(rendered.find((w) => w.widgetId === 'kpis').gridX).toBe(6)
		// A widget with no stored entry stays where the manifest put it.
		expect(rendered.find((w) => w.widgetId === 'tasks').gridX).toBe(3)
		expect(store.calls.load[0]).toEqual(['dossiq', 'Dashboard'])
	})

	it('renders the manifest when the store cannot answer', async () => {
		const store = layoutStore()
		store.loadDashboardLayout = jest.fn(async () => {
			throw new Error('no route')
		})
		const page = mountPage({ userLayout: true, appId: 'dossiq', userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(page.vm.renderedLayout).toEqual(manifest())
	})

	it('saves once on leaving edit mode, and not while dragging', async () => {
		const store = layoutStore({ items: [{ widgetId: 'kpis', gridX: 0 }] })
		const page = mountPage({ userLayout: true, appId: 'dossiq', userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))

		page.vm.toggleEdit()
		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 1 }])
		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 2 }])
		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 6 }])

		expect(store.saveDashboardLayout).not.toHaveBeenCalled()

		page.vm.toggleEdit()
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(store.saveDashboardLayout).toHaveBeenCalledTimes(1)
		const saved = store.calls.save[0][2]
		expect(saved.find((w) => w.widgetId === 'kpis').gridX).toBe(6)
	})

	it('does not save on the way IN to edit mode', async () => {
		const store = layoutStore({ items: [{ widgetId: 'kpis', gridX: 0 }] })
		const page = mountPage({ userLayout: true, appId: 'dossiq', userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))

		// A pending change from before this session. Entering edit mode must
		// not flush it: the save belongs to leaving, and a save on entry is a
		// write the user never finished asking for.
		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 4 }])
		page.vm.toggleEdit()
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(store.saveDashboardLayout).not.toHaveBeenCalled()
	})

	it('saves nothing when an edit session changed nothing', async () => {
		const store = layoutStore({ items: [{ widgetId: 'kpis', gridX: 0 }] })
		const page = mountPage({ userLayout: true, appId: 'dossiq', userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))

		page.vm.toggleEdit()
		page.vm.toggleEdit()
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(store.saveDashboardLayout).not.toHaveBeenCalled()
	})

	it('never writes a user arrangement into the manifest prop', async () => {
		const store = layoutStore({ items: [{ widgetId: 'kpis', gridX: 0 }] })
		const layout = manifest()
		const page = mountPage(
			{ userLayout: true, appId: 'dossiq', userLayoutStore: store },
			layout,
		)
		await new Promise((resolve) => setTimeout(resolve, 0))

		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 9 }])

		// 🔴 THE MANIFEST IS UNTOUCHED. The in-place write the admin editor
		// relies on would, here, rewrite the page for everybody.
		expect(layout.find((w) => w.widgetId === 'kpis').gridX).toBe(0)
		expect(page.vm.renderedLayout.find((w) => w.widgetId === 'kpis').gridX).toBe(9)
	})

	it('still writes in place when the page keeps no user layout', () => {
		const layout = manifest()
		const page = mountPage({}, layout)

		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 9 }])

		// The admin editor's diff depends on this, so the old path is asserted
		// beside the new one rather than assumed to have survived.
		expect(layout.find((w) => w.widgetId === 'kpis').gridX).toBe(9)
	})

	it('resets to the manifest and drops the record', async () => {
		const store = layoutStore({ items: [{ widgetId: 'kpis', gridX: 6 }] })
		const page = mountPage({ userLayout: true, appId: 'dossiq', userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(page.vm.renderedLayout.find((w) => w.widgetId === 'kpis').gridX).toBe(6)

		await page.vm.resetUserLayout()

		expect(store.resetDashboardLayout).toHaveBeenCalledWith('dossiq', 'Dashboard')
		expect(page.vm.renderedLayout).toEqual(manifest())
		expect(page.emitted('user-layout-reset')).toBeTruthy()
	})

	it('does not save the arrangement it just reset', async () => {
		const store = layoutStore({ items: [{ widgetId: 'kpis', gridX: 6 }] })
		const page = mountPage({ userLayout: true, appId: 'dossiq', userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))

		page.vm.toggleEdit()
		page.vm.onLayoutChange([{ id: 'kpis', widgetId: 'kpis', gridX: 9 }])
		await page.vm.resetUserLayout()
		page.vm.toggleEdit()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// A reset that left the session dirty would store the arrangement the
		// user just asked to be rid of, on the way out of edit mode.
		expect(store.saveDashboardLayout).not.toHaveBeenCalled()
	})
})
