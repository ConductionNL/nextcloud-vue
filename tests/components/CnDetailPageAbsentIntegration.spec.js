/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An `integration` widget placing a leaf from ANOTHER app costs no grid cell
 * when that app is absent.
 *
 * A cross-app feature is normally optional: dossiq places humaniq's hours leaf
 * on a case, and humaniq is not a dossiq dependency. With the leaf unregistered
 * nothing resolves, but CnDetailWidgetHost still renders its wrapper — so the
 * absent app used to cost a bordered, full-height ghost card holding a quarter
 * of the top band on every case.
 *
 * A widget declaring `requiredApp` is NOT dropped: the host answers a missing
 * app with an actionable set-up state, and that is content.
 */
import { shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const mockRegistered = new Set()

jest.mock('../../src/composables/useIntegrationRegistry.js', () => ({
	__esModule: true,
	useIntegrationRegistry: () => ({
		resolveWidget: (id) => (mockRegistered.has(id) ? { name: 'LeafWidget' } : null),
		getById: (id) => (mockRegistered.has(id) ? { id, widget: { name: 'LeafWidget' } } : null),
	}),
}))

jest.mock('../../src/utils/appInstalled.js', () => ({
	__esModule: true,
	isAppInstalled: (app) => app === 'installedapp',
}))

const WIDGETS = [
	{ id: 'tile-a', type: 'stat', title: 'A' },
	{ id: 'tile-b', type: 'stat', title: 'B' },
	{ id: 'hours', type: 'integration', integrationId: 'humaniq-hours', title: 'Hours booked' },
]

const LAYOUT = [
	{ id: '1', widgetId: 'tile-a', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
	{ id: '2', widgetId: 'tile-b', gridX: 3, gridY: 0, gridWidth: 3, gridHeight: 2 },
	{ id: '3', widgetId: 'hours', gridX: 6, gridY: 0, gridWidth: 3, gridHeight: 2 },
]

/**
 * @param {object} propsData Props merged over the defaults.
 * @return {object} Wrapper.
 */
function mountPage(propsData = {}) {
	return shallowMount(CnDetailPage, {
		propsData: { title: 'Case', widgets: WIDGETS, layout: LAYOUT, ...propsData },
		mocks: {
			t: (_a, s) => s,
			$route: { params: {}, query: {}, name: 'case' },
			$router: { push: jest.fn(), replace: jest.fn() },
		},
	})
}

beforeEach(() => {
	mockRegistered.clear()
})

describe('CnDetailPage — an absent integration leaf costs no cell', () => {
	it('drops the layout item when the leaf is not registered', () => {
		const wrapper = mountPage()

		const ids = wrapper.vm.bodyGridLayout.map((i) => i.widgetId)
		expect(ids).toEqual(['tile-a', 'tile-b'])
		expect(ids).not.toContain('hours')
		wrapper.unmount()
	})

	it('keeps the item once the other app registers its leaf', () => {
		mockRegistered.add('humaniq-hours')
		const wrapper = mountPage()

		expect(wrapper.vm.bodyGridLayout.map((i) => i.widgetId)).toContain('hours')
		wrapper.unmount()
	})

	it('keeps a widget declaring requiredApp, so the set-up state still shows', () => {
		// Nothing registered, but the widget names the app it needs — the host
		// renders "X is not installed", which is content worth a cell.
		const wrapper = mountPage({
			widgets: [{ id: 'hours', type: 'integration', integrationId: 'humaniq-hours', requiredApp: 'humaniq' }],
			layout: [{ id: '3', widgetId: 'hours', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 }],
		})

		expect(wrapper.vm.bodyGridLayout).toHaveLength(1)
		wrapper.unmount()
	})

	it('hides nothing in edit mode, so the placement stays manageable', () => {
		// `cnEditingBody` is what Buildiq's edit toggle provides.
		const wrapper = shallowMount(CnDetailPage, {
			propsData: { title: 'Case', widgets: WIDGETS, layout: LAYOUT },
			provide: { cnEditingBody: true },
			mocks: {
				t: (_a, s) => s,
				$route: { params: {}, query: {}, name: 'case' },
				$router: { push: jest.fn(), replace: jest.fn() },
			},
		})

		// All three: an author cannot move or delete a cell they cannot see.
		expect(wrapper.vm.editingBody).toBe(true)
		expect(wrapper.vm.bodyGridLayout.map((i) => i.widgetId)).toContain('hours')
		wrapper.unmount()
	})

	it('never drops a non-integration widget, whatever it resolves to', () => {
		// A `custom` widget with no slot also draws an empty host, but that is a
		// wiring fault to surface, not an optional feature to hide.
		const wrapper = mountPage({
			widgets: [{ id: 'plan', type: 'custom', title: 'Case plan' }],
			layout: [{ id: '9', widgetId: 'plan', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 6 }],
		})

		expect(wrapper.vm.bodyGridLayout).toHaveLength(1)
		wrapper.unmount()
	})
})
