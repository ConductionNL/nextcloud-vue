/**
 * Tests for CnDashboardPage context push to cnAiContext.
 */

import { mount } from '@vue/test-utils'

const Vue = require('vue').default || require('vue')

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('vue-apexcharts', () => ({ name: 'vue-apexcharts-stub' }), { virtual: true })

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))

const CnDashboardPage = require('../../src/components/CnDashboardPage/CnDashboardPage.vue').default

function makeAiContext(overrides = {}) {
	return Vue.observable({ appId: 'test', pageKind: 'custom', route: { path: '/' }, ...overrides })
}

const stubs = {
	CnDashboardGrid: { template: '<div class="stub-dashboard-grid" />', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { template: '<div />', props: ['title', 'iconUrl', 'iconClass', 'showTitle', 'borderless', 'flush', 'buttons', 'styleConfig', 'titleIconPosition', 'titleIconColor'] },
	CnWidgetRenderer: { template: '<div />', props: ['widget', 'unavailableText'] },
	CnTileWidget: { template: '<div />', props: ['tile'] },
	CnChartWidget: { template: '<div />', props: ['type', 'series', 'categories', 'labels', 'options', 'colors', 'toolbar', 'legend', 'height', 'width', 'unavailableLabel'] },
	CnStatsBlockWidget: { template: '<div />', props: ['title', 'description', 'icon', 'value', 'loading', 'error'] },
	NcButton: { template: '<div><slot/><slot name="icon"/></div>' },
	NcEmptyContent: { template: '<div><slot name="icon"/></div>' },
	NcLoadingIcon: { template: '<div />' },
	Pencil: { template: '<div />' },
	Check: { template: '<div />' },
	ViewDashboardOutline: { template: '<div />' },
}

function mountDashboard(props = {}, cnAiContext = null) {
	const provide = {}
	if (cnAiContext) provide.cnAiContext = cnAiContext

	return mount(CnDashboardPage, {
		propsData: {
			title: 'My Dashboard',
			widgets: [],
			layout: [],
			...props,
		},
		provide,
		stubs,
	})
}

describe('CnDashboardPage — AI context push', () => {
	it('writes pageKind="dashboard" on created()', () => {
		const ctx = makeAiContext()
		mountDashboard({}, ctx)

		expect(ctx.pageKind).toBe('dashboard')
	})

	it('beforeDestroy resets pageKind to "custom"', () => {
		const ctx = makeAiContext()
		const wrapper = mountDashboard({}, ctx)

		expect(ctx.pageKind).toBe('dashboard')
		wrapper.destroy()
		expect(ctx.pageKind).toBe('custom')
	})

	it('does not crash when cnAiContext is not provided', () => {
		expect(() => mountDashboard({})).not.toThrow()
	})
})
