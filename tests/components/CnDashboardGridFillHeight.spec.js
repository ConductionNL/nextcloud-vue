/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard grid can fill the height its host gives it (LpVandaag): the
 * layout rows divide that height, a row of `fitRows` items takes its
 * content's height, and the page around the grid does not scroll.
 *
 * @spec openspec/changes/dashboard-fill-height/specs/dashboard-grid/spec.md#requirement-a-dashboard-can-fill-the-height-below-the-top-bar
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardGrid, { fillRowTracks } from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const LAYOUT = [
	{ id: 'header', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, fitRows: true },
	{ id: 'first', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 3, fitRows: true },
	{ id: 'apps', gridX: 0, gridY: 5, gridWidth: 8, gridHeight: 8 },
	{ id: 'agenda', gridX: 8, gridY: 5, gridWidth: 4, gridHeight: 4 },
	{ id: 'recent', gridX: 8, gridY: 9, gridWidth: 4, gridHeight: 4 },
]

describe('fillRowTracks', () => {
	it('sizes the fitRows rows to their content and shares the rest', () => {
		expect(fillRowTracks(LAYOUT)).toEqual([
			'auto', 'auto', 'auto', 'auto', 'auto',
			...Array(8).fill('minmax(0, 1fr)'),
		])
	})

	it('shares a row as soon as one item on it does not fit its content', () => {
		const layout = [
			{ id: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1, fitRows: true },
			{ id: 'b', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 1 },
		]
		expect(fillRowTracks(layout)).toEqual(['minmax(0, 1fr)'])
	})

	it('leaves an empty row at its content, which is none', () => {
		const layout = [{ id: 'a', gridX: 0, gridY: 1, gridWidth: 12, gridHeight: 1 }]
		expect(fillRowTracks(layout)).toEqual(['auto', 'minmax(0, 1fr)'])
	})

	it('has no rows without items', () => {
		expect(fillRowTracks([])).toEqual([])
		expect(fillRowTracks(null)).toEqual([])
	})
})

describe('CnDashboardGrid: fillHeight', () => {
	it('draws the layout on CSS grid rows and places every item by its cell', async () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, fillHeight: true, fillMinWidth: 0, margin: 8 } })
		await nextTick()
		expect(wrapper.find('.cn-dashboard-grid').classes()).toContain('cn-dashboard-grid--fill')
		const style = wrapper.find('.grid-stack').attributes('style')
		expect(style).toContain('grid-template-columns: repeat(12, minmax(0, 1fr))')
		expect(style).toContain('grid-template-rows: auto auto auto auto auto minmax(0, 1fr)')
		expect(style).toContain('--cn-fill-margin: 8px')
		const agenda = wrapper.find('[gs-id="agenda"]').attributes('style')
		expect(agenda).toContain('grid-column: 9 / span 4')
		expect(agenda).toContain('grid-row: 6 / span 4')
		expect(wrapper.vm.grid).toBeNull()
	})

	it('keeps the GridStack grid while editing', async () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, fillHeight: true, fillMinWidth: 0, editable: true } })
		await nextTick()
		expect(wrapper.find('.cn-dashboard-grid').classes()).not.toContain('cn-dashboard-grid--fill')
		expect(wrapper.vm.grid).not.toBeNull()
	})

	it('starts GridStack when editing begins and stops it when editing ends', async () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, fillHeight: true, fillMinWidth: 0 } })
		await nextTick()
		expect(wrapper.vm.grid).toBeNull()
		await wrapper.setProps({ editable: true })
		await nextTick()
		await nextTick()
		expect(wrapper.vm.grid).not.toBeNull()
		expect(wrapper.find('[gs-id="apps"]').attributes('gs-h')).toBe('8')
		await wrapper.setProps({ editable: false })
		await nextTick()
		expect(wrapper.vm.grid).toBeNull()
		expect(wrapper.find('.cn-dashboard-grid').classes()).toContain('cn-dashboard-grid--fill')
	})

	it('keeps the GridStack grid on a grid narrower than fillMinWidth', async () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, fillHeight: true } })
		await nextTick()
		expect(wrapper.find('.cn-dashboard-grid').classes()).not.toContain('cn-dashboard-grid--fill')
		expect(wrapper.find('.grid-stack').attributes('style')).toBeUndefined()
	})

	it('is off by default', async () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, fillMinWidth: 0 } })
		await nextTick()
		expect(wrapper.find('.cn-dashboard-grid').classes()).not.toContain('cn-dashboard-grid--fill')
		expect(wrapper.vm.grid).not.toBeNull()
	})
})
