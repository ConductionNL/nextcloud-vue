/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The detail body grid reflows on the GRID's width, not the window's.
 *
 * A detail page rendered in a split pane sits in a ~520px container on a wide
 * window. With a fixed 12-column grid that is ~43px per column, so a
 * `gridWidth: 3` panel is ~130px and its own title no longer fits — which is
 * how two side-by-side panels end up unreadable while the viewport says
 * "desktop". Measuring the window instead of the grid would miss this entirely.
 */
import { shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const WIDGETS = [{ id: 'a', type: 'stat', title: 'A' }]
const LAYOUT = [{ id: '1', widgetId: 'a', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 }]

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

/**
 * GridStack's own breakpoint selection, transcribed from `checkDynamicColumn`
 * (gridstack 13.2.0). Kept here so the table is asserted against the algorithm
 * that actually consumes it rather than against our reading of it.
 *
 * @param {object} opts A `columnOpts` bag.
 * @param {number} w The measured width.
 * @return {number|undefined} The resulting column count.
 */
function columnsAt(opts, w) {
	let newColumn = opts.columnMax
	let i = 0
	while (i < opts.breakpoints.length && w <= opts.breakpoints[i].w) {
		newColumn = opts.breakpoints[i++].c
	}
	return newColumn
}

/**
 * @param {object} wrapper A mounted page.
 * @return {object} The columnOpts handed to the grid.
 */
function gridOpts(wrapper) {
	return wrapper.findComponent({ name: 'CnDashboardGrid' }).props('columnOpts')
}

describe('CnDetailPage — responsive body grid', () => {
	it('hands the grid a responsive columnOpts by default', () => {
		const wrapper = mountPage()

		expect(gridOpts(wrapper)).toBeTruthy()
		wrapper.unmount()
	})

	it('measures the grid element, not the window', () => {
		const wrapper = mountPage()

		// The whole point: in a split pane the window is wide and the grid is not.
		// `getDashboardColumnOpts()` sets this true, which is wrong here.
		expect(gridOpts(wrapper).breakpointForWindow).toBe(false)
		wrapper.unmount()
	})

	it('pins columnMax, so a grid that narrowed can widen again', () => {
		const wrapper = mountPage()

		// Above the top breakpoint GridStack assigns `newColumn = columnMax`, and
		// `column(undefined)` is a silent no-op — the grid would stay narrow
		// forever. GridStack only defaults columnMax for a single-entry table.
		expect(gridOpts(wrapper).columnMax).toBe(12)
		wrapper.unmount()
	})

	it('stacks to one column at split-pane width, and keeps 12 at full width', () => {
		const wrapper = mountPage()
		const opts = gridOpts(wrapper)

		// A split pane is ~520px on a laptop and ~950px on a wide monitor —
		// BOTH have to stack, which is what the old 560px floor got wrong.
		expect(columnsAt(opts, 520)).toBe(1)
		expect(columnsAt(opts, 950)).toBe(1)
		// A full-width detail route is unchanged.
		expect(columnsAt(opts, 1400)).toBe(12)
		expect(columnsAt(opts, 1100)).toBe(12)
		wrapper.unmount()
	})

	it('goes straight from 12 to 1, never through a rescaled middle', () => {
		const opts = gridOpts(mountPage())

		// `moveScale` rescales the authored geometry, so an intermediate count
		// puts widgets at fractional positions nobody placed — left/centre/right
		// by rounding. Every width is either the authored 12 or a plain stack.
		const counts = [400, 700, 900, 999, 1000, 1001, 1600, 2400]
			.map((w) => columnsAt(opts, w))
		expect([...new Set(counts)].sort((a, b) => a - b)).toEqual([1, 12])
	})

	it('lets a consumer opt out to a fixed 12-column grid', () => {
		const wrapper = mountPage({ columnOpts: null })

		expect(gridOpts(wrapper)).toBeNull()
		wrapper.unmount()
	})
})
