import { mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard grid can draw its side column at a fixed width (DqMijnWerk: the
 * side cards 320px wide, the main column filling the rest), instead of a
 * share of twelve columns.
 *
 * @spec openspec/changes/dashboard-side-column-width/specs/dashboard-side-column-width/spec.md
 */
import fs from 'fs'
import path from 'path'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const LAYOUT = [
	{ id: 'tile', gridX: 6, gridY: 0, gridWidth: 3, gridHeight: 2 },
	{ id: 'week', gridX: 0, gridY: 2, gridWidth: 8, gridHeight: 4, track: 'main' },
	{ id: 'tasks', gridX: 8, gridY: 2, gridWidth: 4, gridHeight: 4, track: 'side' },
]

describe('CnDashboardGrid: a fixed-width side column', () => {
	it('marks the grid and hands the width and the split to its CSS', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, sideColumn: { width: 320, from: 8 } } })
		const root = wrapper.find('.cn-dashboard-grid')
		expect(root.classes()).toContain('cn-dashboard-grid--side-column')
		const style = root.attributes('style')
		expect(style).toContain('--cn-side-width: 320px')
		expect(style).toContain('--cn-side-from: 8')
		expect(style).toContain('--cn-side-span: 4')
	})

	it('marks the items that name their track, and leaves the others on the twelve shares', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, sideColumn: { width: 320 } } })
		expect(wrapper.find('[gs-id="week"]').attributes('data-cn-track')).toBe('main')
		expect(wrapper.find('[gs-id="tasks"]').attributes('data-cn-track')).toBe('side')
		expect(wrapper.find('[gs-id="tile"]').attributes('data-cn-track')).toBeUndefined()
	})

	it('splits at column 8 when the split is not given', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, sideColumn: { width: 300 } } })
		expect(wrapper.find('.cn-dashboard-grid').attributes('style')).toContain('--cn-side-from: 8')
	})

	it('keeps the twelve shares without it, while editing, and for a width that is not a number', () => {
		for (const props of [{}, { sideColumn: { width: 320 }, editable: true }, { sideColumn: { width: 'wide' } }]) {
			const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, ...props } })
			expect(wrapper.find('.cn-dashboard-grid').classes()).not.toContain('cn-dashboard-grid--side-column')
		}
	})

	it('places the items by their column on the full twelve-column grid only', () => {
		const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'), 'utf8')
		const rule = source.slice(source.indexOf('.cn-dashboard-grid--side-column'))
		expect(rule).toMatch(/\.cn-dashboard-grid--side-column > \.grid-stack\.gs-12:not\(\.grid-stack-rtl\) > \.grid-stack-item\[data-cn-track\]/)
		expect(rule).toContain('left: calc(min(var(--gs-x), var(--cn-side-from))')
		expect(rule).toContain('!important')
	})
})
