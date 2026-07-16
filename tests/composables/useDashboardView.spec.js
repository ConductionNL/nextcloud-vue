/**
 * Tests for `useDashboardView` — widget set composition (app + NC widgets),
 * layout load/save, role-based visibility filtering, addWidget / removeWidget
 * derivation, and the `availableWidgets` computed.
 *
 * Aligns with the `dashboard-widget-system` composable contract: the
 * composable owns visibility filtering, layout persistence, and edit mode
 * for CnDashboardPage hosts.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateOcsUrl: (path) => `/ocs${path}`,
	generateUrl: (path) => `/index.php${path}`,
}))
jest.mock('../../src/utils/widgetVisibility.js', () => ({
	filterWidgetsByVisibility: jest.fn(async (arr) => arr || []),
}))

const axios = require('@nextcloud/axios').default
const { filterWidgetsByVisibility } = require('../../src/utils/widgetVisibility.js')
const { useDashboardView } = require('../../src/composables/useDashboardView.js')

const { defineComponent, h } = require('vue')
const { mount } = require('@vue/test-utils')

/**
 * Flush microtasks + onMounted callbacks.
 *
 * @param {number} [ms] Timer delay
 * @return {Promise<void>} Settles after the delay
 */
function flush(ms = 0) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mount a host that exposes `useDashboardView(opts)` as `vm.dash`.
 *
 * @param {object} opts Composable options
 * @return {object} Vue Test Utils wrapper
 */
function mountDash(opts) {
	const Comp = defineComponent({
		setup() {
			const dash = useDashboardView(opts)
			return { dash }
		},
		render() { return h('div') },
	})
	return mount(Comp)
}

beforeEach(() => {
	jest.clearAllMocks()
	filterWidgetsByVisibility.mockImplementation(async (arr) => arr || [])
})

describe('useDashboardView — layout load/save', () => {
	it('falls back to defaultLayout when loadLayout returns null', async () => {
		const defaultLayout = [{ id: 1, widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }]
		const w = mountDash({
			widgets: [{ id: 'a', title: 'A', type: 'custom' }],
			defaultLayout,
			loadLayout: jest.fn().mockResolvedValue(null),
		})
		await flush()
		expect(w.vm.dash.layout.value).toEqual(defaultLayout)
	})

	it('uses the loaded layout when loadLayout returns a non-empty array', async () => {
		const saved = [{ id: 7, widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }]
		const w = mountDash({
			widgets: [{ id: 'a', title: 'A', type: 'custom' }],
			defaultLayout: [],
			loadLayout: jest.fn().mockResolvedValue(saved),
		})
		await flush()
		expect(w.vm.dash.layout.value).toEqual(saved)
	})

	it('falls back to defaultLayout when loadLayout returns an empty array', async () => {
		const defaultLayout = [{ id: 1, widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }]
		const w = mountDash({
			widgets: [{ id: 'a', title: 'A', type: 'custom' }],
			defaultLayout,
			loadLayout: jest.fn().mockResolvedValue([]),
		})
		await flush()
		expect(w.vm.dash.layout.value).toEqual(defaultLayout)
	})

	it('persists layout changes through saveLayout', async () => {
		const saveLayout = jest.fn().mockResolvedValue()
		const w = mountDash({
			widgets: [{ id: 'a', title: 'A', type: 'custom' }],
			defaultLayout: [],
			saveLayout,
		})
		await flush()
		await w.vm.dash.onLayoutChange([{ id: 1, widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }])
		expect(saveLayout).toHaveBeenCalledTimes(1)
		expect(saveLayout.mock.calls[0][0]).toHaveLength(1)
	})

	it('survives a saveLayout failure without crashing', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const saveLayout = jest.fn().mockRejectedValue(new Error('boom'))
		const w = mountDash({
			widgets: [{ id: 'a', title: 'A', type: 'custom' }],
			defaultLayout: [],
			saveLayout,
		})
		await flush()
		await w.vm.dash.onLayoutChange([{ id: 1, widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }])
		expect(w.vm.dash.saving.value).toBe(false)
		errSpy.mockRestore()
	})
})

describe('useDashboardView — NC widgets', () => {
	it('does not call the OCS endpoint when includeNcWidgets is false', async () => {
		mountDash({ widgets: [], defaultLayout: [] })
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('maps OCS widget payloads into the unified widget shape', async () => {
		axios.get.mockResolvedValue({
			data: {
				ocs: {
					data: {
						mail: {
							id: 'mail',
							title: 'Mail',
							icon_class: 'icon-mail',
							icon_url: '/img/mail.svg',
							widget_url: '/apps/mail',
							item_api_versions: [1, 2],
							item_icons_round: true,
							reload_interval: 60,
							buttons: [{ type: 'new' }],
						},
					},
				},
			},
		})
		const w = mountDash({ widgets: [], defaultLayout: [], includeNcWidgets: true })
		await flush()
		const nc = w.vm.dash.ncWidgets.value
		expect(nc).toHaveLength(1)
		expect(nc[0]).toMatchObject({
			id: 'mail',
			title: 'Mail',
			iconClass: 'icon-mail',
			iconUrl: '/img/mail.svg',
			widgetUrl: '/apps/mail',
			itemApiVersions: [1, 2],
			itemIconsRound: true,
			reloadInterval: 60,
			type: 'nc-widget',
		})
	})

	it('logs and falls back to an empty list when the OCS endpoint errors', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		axios.get.mockRejectedValue(new Error('500'))
		const w = mountDash({ widgets: [], defaultLayout: [], includeNcWidgets: true })
		await flush()
		expect(w.vm.dash.ncWidgets.value).toEqual([])
		errSpy.mockRestore()
	})
})

describe('useDashboardView — visibility filtering', () => {
	it('drops layout entries pointing at widgets the user cannot see', async () => {
		filterWidgetsByVisibility.mockImplementation(async (arr) => {
			return (arr || []).filter((w) => w.id !== 'admin-only')
		})
		const w = mountDash({
			widgets: [
				{ id: 'public', title: 'Pub', type: 'custom' },
				{ id: 'admin-only', title: 'Adm', type: 'custom', visibility: { groups: ['admin'] } },
			],
			defaultLayout: [
				{ id: 1, widgetId: 'public', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 },
				{ id: 2, widgetId: 'admin-only', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 3 },
			],
		})
		await flush()
		expect(w.vm.dash.layout.value.map((i) => i.widgetId)).toEqual(['public'])
		expect(w.vm.dash.widgets.value.map((x) => x.id)).toEqual(['public'])
	})

	it('re-applies visibility filtering on setWidgets', async () => {
		const w = mountDash({ widgets: [], defaultLayout: [] })
		await flush()
		expect(w.vm.dash.widgets.value).toEqual([])
		await w.vm.dash.setWidgets([{ id: 'x', title: 'X', type: 'custom' }])
		expect(w.vm.dash.widgets.value.map((x) => x.id)).toEqual(['x'])
	})
})

describe('useDashboardView — addWidget / removeWidget / derived state', () => {
	it('addWidget places the next widget at the bottom and assigns an id', async () => {
		const w = mountDash({
			widgets: [
				{ id: 'a', title: 'A', type: 'custom' },
				{ id: 'b', title: 'B', type: 'custom' },
			],
			defaultLayout: [
				{ id: 1, widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 },
			],
		})
		await flush()
		w.vm.dash.addWidget('b')
		await flush()
		expect(w.vm.dash.layout.value).toHaveLength(2)
		const added = w.vm.dash.layout.value[1]
		expect(added.widgetId).toBe('b')
		expect(added.id).toBe(2)
		expect(added.gridY).toBe(3)
	})

	it('removeWidget drops the layout entry by id', async () => {
		const w = mountDash({
			widgets: [
				{ id: 'a', title: 'A', type: 'custom' },
				{ id: 'b', title: 'B', type: 'custom' },
			],
			defaultLayout: [
				{ id: 1, widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 },
				{ id: 2, widgetId: 'b', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 3 },
			],
		})
		await flush()
		w.vm.dash.removeWidget(1)
		await flush()
		expect(w.vm.dash.layout.value.map((i) => i.id)).toEqual([2])
	})

	it('availableWidgets excludes widgets already on the layout', async () => {
		const w = mountDash({
			widgets: [
				{ id: 'a', title: 'A', type: 'custom' },
				{ id: 'b', title: 'B', type: 'custom' },
			],
			defaultLayout: [
				{ id: 1, widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 },
			],
		})
		await flush()
		expect(w.vm.dash.availableWidgets.value.map((x) => x.id)).toEqual(['b'])
	})
})
