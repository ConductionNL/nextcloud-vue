/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailPage: the body grid stacks at 1000px of grid width, or at 600px when
 * a side column narrows the grid (a row of small tiles stays a row at about
 * 790px). An explicit `columnOpts` prop is passed through untouched.
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const store = {
	objects: { 'reg-case': { 'id-1': { name: 'Case' } } },
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
}

const WIDGETS = [
	{ id: 'w-a', type: 'text', title: 'A' },
	{ id: 'w-side', type: 'text', title: 'Side' },
]

const stubs = {
	CnDashboardGrid: { props: ['columnOpts'], template: '<div class="grid-stub" />' },
	CnDetailWidgetHost: { props: ['widget'], template: '<div />' },
}

function breakpointsOf(props = {}) {
	const wrapper = mount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: store,
			widgets: WIDGETS,
			layout: [{ id: '1', widgetId: 'w-a', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
			...props,
		},
		global: { stubs },
	})
	return wrapper.findComponent({ name: 'CnDashboardGrid' }).props('columnOpts')
}

describe('CnDetailPage body grid breakpoint', () => {
	it('stacks at 1000px without a side column', () => {
		expect(breakpointsOf().breakpoints).toEqual([{ w: 1000, c: 1 }])
	})

	it('stacks at 600px with a side column', () => {
		const opts = breakpointsOf({ sideColumn: ['w-side'] })
		expect(opts.breakpoints).toEqual([{ w: 600, c: 1 }])
		expect(opts.columnMax).toBe(12)
		expect(opts.breakpointForWindow).toBe(false)
	})

	it('keeps an explicit columnOpts as given, side column or not', () => {
		const own = { columnMax: 12, breakpoints: [{ w: 800, c: 1 }], layout: 'moveScale', breakpointForWindow: false }
		expect(breakpointsOf({ sideColumn: ['w-side'], columnOpts: own }).breakpoints).toEqual([{ w: 800, c: 1 }])
	})

	it('keeps null (a fixed 12-column grid)', () => {
		expect(breakpointsOf({ sideColumn: ['w-side'], columnOpts: null })).toBeNull()
	})
})
