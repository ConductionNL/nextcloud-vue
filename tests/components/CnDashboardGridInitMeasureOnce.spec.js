/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * GridStack sized each size-to-content cell while it added it, one forced
 * style recalculation per cell. The grid adds them unsized and then sizes
 * them together, every measure before any write, with their mark back.
 *
 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
 */
import { mount } from '@vue/test-utils'
import { GridStack } from 'gridstack'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

describe('CnDashboardGrid: size-to-content cells are measured together after GridStack adds them', () => {
	it('hands GridStack the cells unsized, then sizes them in one measured-first pass', () => {
		const seen = []
		const original = GridStack.init.getMockImplementation()
		GridStack.init.mockImplementationOnce((opts, el) => {
			seen.push(...Array.from(el.querySelectorAll('.grid-stack-item')).map((item) => item.getAttribute('gs-size-to-content')))
			return original(opts, el)
		})
		const measure = jest.spyOn(CnDashboardGrid.methods, 'resizeCellsMeasuredFirst')
		const layout = [
			{ id: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2, sizeToContent: true },
			{ id: 'b', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 2, sizeToContent: 3 },
			{ id: 'c', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2 },
		]
		const wrapper = mount(CnDashboardGrid, { propsData: { layout, float: true } })
		const el = (id) => wrapper.find(`[gs-id="${id}"]`).element
		expect(seen).toEqual([null, null, null])
		expect(measure).toHaveBeenCalledTimes(1)
		expect(measure.mock.calls[0][0]).toEqual([el('a'), el('b')])
		expect(el('a').getAttribute('gs-size-to-content')).toBe('true')
		expect(el('b').getAttribute('gs-size-to-content')).toBe('3')
		expect(el('c').hasAttribute('gs-size-to-content')).toBe(false)
		measure.mockRestore()
		wrapper.destroy?.()
	})
})
