/**
 * Tests for CnWidgetGrid editable body mode (ADR-041 §4).
 *
 * - default (editable:false) renders the read-only CSS grid, no GridStack
 * - editable body mounts GridStack with the resolved column count
 * - geometry write-back by id, clamped within the resolved columns, emits layout-change
 */

import { shallowMount } from '@vue/test-utils'
import CnWidgetGrid from '../../src/components/CnWidgetGrid/CnWidgetGrid.vue'
import { GridStack } from 'gridstack'

jest.mock('../../src/components/CnWidgetGrid/builtInWidgets.js', () => ({
	BUILT_IN_WIDGETS: {
		'card-grid': { template: '<div class="w" />', name: 'CnWidgetCardGrid' },
	},
}))

function bodyWidgets() {
	return [
		{ id: 'w1', widgetKey: 'card-grid', slot: 'body', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 },
		{ id: 'w2', widgetKey: 'card-grid', slot: 'body', gridX: 4, gridY: 0, gridWidth: 4, gridHeight: 2 },
	]
}

describe('CnWidgetGrid — editable body mode', () => {
	beforeEach(() => jest.clearAllMocks())

	it('renders the read-only CSS grid and creates no GridStack by default', () => {
		const wrapper = shallowMount(CnWidgetGrid, { propsData: { slotName: 'body', widgets: bodyWidgets() } })
		expect(wrapper.find('.cn-grid').exists()).toBe(true)
		expect(wrapper.find('.grid-stack').exists()).toBe(false)
		expect(GridStack.init).not.toHaveBeenCalled()
	})

	it('mounts a GridStack on the editable body with the resolved column count', () => {
		const wrapper = shallowMount(CnWidgetGrid, {
			propsData: { slotName: 'body', widgets: bodyWidgets(), editable: true, columns: 8 },
		})
		expect(wrapper.find('.grid-stack').exists()).toBe(true)
		expect(GridStack.init).toHaveBeenCalledTimes(1)
		expect(GridStack.init.mock.calls[0][0]).toMatchObject({ column: 8 })
	})

	it('does not enter editable mode for non-body slots', () => {
		const wrapper = shallowMount(CnWidgetGrid, {
			propsData: { slotName: 'sidebar', widgets: [], editable: true },
		})
		expect(wrapper.vm.editableBody).toBe(false)
		expect(GridStack.init).not.toHaveBeenCalled()
	})

	it('writes geometry back by id, clamped within resolved columns, and emits layout-change', () => {
		const widgets = bodyWidgets()
		const wrapper = shallowMount(CnWidgetGrid, {
			propsData: { slotName: 'body', widgets, editable: true },
		})
		// gridColumns defaults to 12 here; w:14 must clamp to 12 and x to 0.
		wrapper.vm.handleGridChange([
			{ id: 'w1', x: 6, y: 1, w: 14, h: 3 },
			{ id: 'w2', x: 2, y: 0, w: 3, h: 2 },
		])
		expect(widgets[0]).toMatchObject({ gridX: 0, gridY: 1, gridWidth: 12, gridHeight: 3 })
		expect(widgets[1]).toMatchObject({ gridX: 2, gridY: 0, gridWidth: 3, gridHeight: 2 })
		expect(wrapper.emitted('layout-change')).toBeTruthy()
	})
})
