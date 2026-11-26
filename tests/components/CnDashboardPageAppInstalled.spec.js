/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard widget whose `visibleWhen` is `{ appInstalled }` shows when that
 * app is enabled for the person and is left out when it is not. Before, the
 * dashboard handed such a condition to readVisibleWhenValue(), which has no
 * endpoint, source or field to read, so it failed and the widget was hidden
 * on every instance (found live in planninq's Time spent report).
 */

// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

import { flushPromises, mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { __resetAppInstalledCacheForTests } from '@/utils/appInstalled.js'
import { readVisibleWhenValue } from '@/utils/visibleWhen.js'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@/utils/visibleWhen.js', () => ({
	...jest.requireActual('@/utils/visibleWhen.js'),
	readVisibleWhenValue: jest.fn(),
}))

const renderer = { template: '<div class="rend" />' }
registerDashboardWidget('test-app-installed', { renderer, form: {}, defaultContent: {}, displayName: 'N', icon: 'X' })

const stubs = {
	CnDashboardGrid: {
		template: '<div><div v-for="it in layout" :key="it.id" class="cell" :data-wid="it.widgetId"><slot name="widget" :item="it" /></div></div>',
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
	},
	CnWidgetWrapper: { props: ['flush', 'showTitle', 'title'], template: '<div class="ww"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div class="loading" />' },
}

/**
 * Mount a dashboard with one widget that needs an app, beside one that does not.
 *
 * @param {object} visibleWhen The first widget's condition.
 * @return {object} The wrapper.
 */
function mountWith(visibleWhen) {
	return mount(CnDashboardPage, {
		propsData: {
			widgets: [
				{ id: 'hours', type: 'test-app-installed', visibleWhen },
				{ id: 'plain', type: 'test-app-installed' },
			],
			layout: [
				{ id: '1', widgetId: 'hours', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4 },
				{ id: '2', widgetId: 'plain', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 4 },
			],
		},
		stubs,
	})
}

const shown = (wrapper) => wrapper.findAll('.cell').map((c) => c.attributes('data-wid'))

/**
 * Enable these apps for the person, as Nextcloud lists them on OC.appswebroots.
 *
 * @param {string[]} apps The enabled app ids.
 */
function enable(apps) {
	__resetAppInstalledCacheForTests()
	window.OC = { ...(window.OC || {}), appswebroots: Object.fromEntries(apps.map((app) => [app, `/apps/${app}`])) }
}

describe('CnDashboardPage — a widget that needs an app', () => {
	beforeEach(() => readVisibleWhenValue.mockReset())
	afterEach(() => __resetAppInstalledCacheForTests())

	it('shows { appInstalled } when the app is enabled', async () => {
		enable(['humaniq'])
		const wrapper = mountWith({ appInstalled: 'humaniq' })
		await flushPromises()
		expect(shown(wrapper)).toEqual(['hours', 'plain'])
		expect(readVisibleWhenValue).not.toHaveBeenCalled()
	})

	it('leaves { appInstalled } out when the app is not enabled', async () => {
		enable([])
		const wrapper = mountWith({ appInstalled: 'humaniq' })
		await flushPromises()
		expect(shown(wrapper)).toEqual(['plain'])
	})

	it('does not run the query of a condition whose app is missing', async () => {
		enable([])
		const wrapper = mountWith({ appInstalled: 'humaniq', endpoint: '/api/hours', field: 'total', op: 'gt', value: 0 })
		await flushPromises()
		expect(shown(wrapper)).toEqual(['plain'])
		expect(readVisibleWhenValue).not.toHaveBeenCalled()
	})

	it('runs the query once the app is there', async () => {
		enable(['humaniq'])
		readVisibleWhenValue.mockResolvedValue(3)
		const wrapper = mountWith({ appInstalled: 'humaniq', endpoint: '/api/hours', field: 'total', op: 'gt', value: 0 })
		await flushPromises()
		expect(shown(wrapper)).toEqual(['hours', 'plain'])
		expect(readVisibleWhenValue).toHaveBeenCalledTimes(1)
	})
})
