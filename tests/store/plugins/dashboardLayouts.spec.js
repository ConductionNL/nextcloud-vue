/**
 * Unit tests for dashboardLayoutsPlugin and its merge rule.
 *
 * The merge rule is what the whole change turns on, so it is exercised as a
 * pure function at its edges rather than through a mounted grid:
 *
 * - the manifest decides MEMBERSHIP and the user decides GEOMETRY
 * - a widget the admin removed stays gone, stored record or not
 * - a widget the admin added appears, after what the user arranged
 * - the user's own order survives
 *
 * Plus the three actions, over an http double, asserting what is SENT: a
 * record that carried a widget's title and config would override the next
 * manifest change with a copy the user never edited.
 */

import { createPinia, setActivePinia } from 'pinia'
import {
	dashboardLayoutKey,
	dashboardLayoutsPlugin,
	mergeUserLayout,
} from '../../../src/store/plugins/dashboardLayouts.js'
import { createObjectStore } from '../../../src/store/useObjectStore.js'

/**
 * One manifest layout item.
 *
 * @param {string} widgetId The widget.
 * @param {number} gridX Its column.
 * @param {object} [extra] Anything else the manifest carries on it.
 * @return {object} The item.
 */
function item(widgetId, gridX, extra = {}) {
	return {
		id: widgetId,
		widgetId,
		gridX,
		gridY: 0,
		gridWidth: 3,
		gridHeight: 2,
		...extra,
	}
}

/**
 * A localStorage-shaped double, so the mirror in `useUserPreferences` does not
 * leak between tests and answer a value this test never stored.
 *
 * @return {object} The store.
 */
function memoryStorage() {
	const values = new Map()

	return {
		getItem: (key) => (values.has(key) ? values.get(key) : null),
		setItem: (key, value) => values.set(key, String(value)),
		removeItem: (key) => values.delete(key),
	}
}

describe('mergeUserLayout', () => {
	it('keeps the manifest layout when there is no record', () => {
		const manifest = [item('kpis', 0), item('tasks', 3)]

		expect(mergeUserLayout(manifest, null)).toEqual(manifest)
		expect(mergeUserLayout(manifest, { items: [] })).toEqual(manifest)
		expect(mergeUserLayout(manifest, [])).toEqual(manifest)
	})

	it('takes the stored geometry and leaves untouched widgets where they were', () => {
		const merged = mergeUserLayout(
			[item('kpis', 0), item('tasks', 3)],
			{ items: [{ widgetId: 'kpis', gridX: 6 }] },
		)

		expect(merged.find((w) => w.widgetId === 'kpis').gridX).toBe(6)
		// Every widget without a stored entry renders at its manifest position.
		expect(merged.find((w) => w.widgetId === 'tasks').gridX).toBe(3)
	})

	it('drops a widget the admin removed, whatever the record says', () => {
		const merged = mergeUserLayout(
			[item('kpis', 0)],
			{ items: [{ widgetId: 'kpis', gridX: 6 }, { widgetId: 'old', gridX: 0 }] },
		)

		// The manifest decides membership. Reading it the other way round would
		// let a stored record resurrect a widget the admin took off the page.
		expect(merged.map((w) => w.widgetId)).toEqual(['kpis'])
	})

	it('appends a widget the admin added, after what the user arranged', () => {
		const merged = mergeUserLayout(
			[item('kpis', 0), item('fresh', 3)],
			{ items: [{ widgetId: 'kpis', gridX: 6 }] },
		)

		expect(merged.map((w) => w.widgetId)).toEqual(['kpis', 'fresh'])
		// It arrives at its manifest position rather than hidden until the user
		// next edits the page.
		expect(merged[1].gridX).toBe(3)
	})

	it("keeps the user's own order for the widgets they arranged", () => {
		const merged = mergeUserLayout(
			[item('a', 0), item('b', 3), item('c', 6)],
			{ items: [{ widgetId: 'c', gridX: 0 }, { widgetId: 'a', gridX: 3 }] },
		)

		expect(merged.map((w) => w.widgetId)).toEqual(['c', 'a', 'b'])
	})

	it('never lets a record overwrite anything but geometry', () => {
		const merged = mergeUserLayout(
			[item('kpis', 0, { title: 'Numbers', styleConfig: { tone: 'quiet' } })],
			{ items: [{ widgetId: 'kpis', gridX: 6, title: 'Mine', styleConfig: null }] },
		)

		expect(merged[0].gridX).toBe(6)
		expect(merged[0].title).toBe('Numbers')
		expect(merged[0].styleConfig).toEqual({ tone: 'quiet' })
	})
})

describe('dashboardLayoutsPlugin', () => {
	let http
	let storage

	beforeEach(() => {
		setActivePinia(createPinia())
		storage = memoryStorage()
		http = {
			get: jest.fn(async () => ({ data: {} })),
			put: jest.fn(async () => ({ data: {} })),
		}
	})

	/**
	 * A store carrying the plugin over the doubles.
	 *
	 * @return {object} The store instance.
	 */
	function store() {
		const useStore = createObjectStore('testapp', {
			plugins: [dashboardLayoutsPlugin({ http, storage })],
		})

		return useStore()
	}

	it('keys a record by page, so two dashboards do not overwrite each other', () => {
		expect(dashboardLayoutKey('Dashboard')).toBe('dashboard-layout.Dashboard')
		expect(dashboardLayoutKey('MyWork')).not.toBe(dashboardLayoutKey('Dashboard'))
	})

	it('answers null when the user has no record', async () => {
		const s = store()

		await expect(s.loadDashboardLayout('dossiq', 'Dashboard')).resolves.toBeNull()
		expect(s.dashboardLayouts.Dashboard).toBeNull()
	})

	it('answers null for a stored record with no items', async () => {
		http.get.mockResolvedValue({ data: { value: JSON.stringify({ items: [] }) } })
		const s = store()

		// An empty record and no record are the same fact to a page: show the
		// manifest. Answering `{ items: [] }` would read as an arrangement.
		await expect(s.loadDashboardLayout('dossiq', 'Dashboard')).resolves.toBeNull()
	})

	it('reads a stored record back', async () => {
		http.get.mockResolvedValue({
			data: { value: JSON.stringify({ items: [{ widgetId: 'kpis', gridX: 6 }] }) },
		})

		await expect(store().loadDashboardLayout('dossiq', 'Dashboard')).resolves.toEqual({
			items: [{ widgetId: 'kpis', gridX: 6 }],
		})
	})

	it('stores geometry and nothing else', async () => {
		await store().saveDashboardLayout('dossiq', 'Dashboard', [
			item('kpis', 6, { title: 'Numbers', styleConfig: { tone: 'quiet' }, props: { a: 1 } }),
		])

		expect(http.put).toHaveBeenCalledTimes(1)
		const sent = JSON.parse(http.put.mock.calls[0][1].value)
		expect(sent).toEqual({
			items: [{ widgetId: 'kpis', gridX: 6, gridY: 0, gridWidth: 3, gridHeight: 2 }],
		})
	})

	it('drops an entry with no widget id rather than storing a nameless one', async () => {
		await store().saveDashboardLayout('dossiq', 'Dashboard', [
			item('kpis', 0),
			{ id: 'stray', gridX: 3 },
		])

		const sent = JSON.parse(http.put.mock.calls[0][1].value)
		expect(sent.items.map((i) => i.widgetId)).toEqual(['kpis'])
	})

	it('resets by writing an empty record, which reads back as no arrangement', async () => {
		const s = store()
		await s.saveDashboardLayout('dossiq', 'Dashboard', [item('kpis', 6)])
		await s.resetDashboardLayout('dossiq', 'Dashboard')

		expect(s.dashboardLayouts.Dashboard).toBeNull()
		const sent = JSON.parse(http.put.mock.calls.at(-1)[1].value)
		expect(sent).toEqual({ items: [] })
	})

	it('survives an instance whose preference route is not there', async () => {
		http.get.mockRejectedValue(new Error('404'))
		http.put.mockRejectedValue(new Error('404'))
		const s = store()

		await expect(s.saveDashboardLayout('dossiq', 'Dashboard', [item('kpis', 6)]))
			.resolves.toBe(false)
		// The page still works; it simply shows the manifest layout.
		await expect(s.loadDashboardLayout('dossiq', 'Dashboard')).resolves.not.toBeUndefined()
	})
})
