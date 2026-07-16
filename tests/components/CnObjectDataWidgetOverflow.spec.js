/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectDataWidget item-1 fix (ADR-062): when the field grid
 * overflows its cell it is clipped at a WHOLE-ROW boundary (never mid-text),
 * with a bottom fade + a "Show all N fields" toggle that expands in place.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const SCHEMA = { properties: { a: { type: 'string' }, b: { type: 'string' }, c: { type: 'string' } } }

function mountWidget() {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema: SCHEMA, objectData: { a: '1', b: '2', c: '3' }, editable: false },
		stubs: {
			CnWidgetWrapper: { template: '<div><slot /></div>' },
			CnFormDialog: true,
			CnObjectMetadataModal: true,
		},
		mocks: { t: (_app, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

describe('CnObjectDataWidget — whole-row overflow clip', () => {
	it('computeWholeRowClip picks the largest row-bottom within the budget', () => {
		const w = mountWidget()
		// Rows end at 40, 80, 120, 160; budget 130 → clip at 120 (whole rows only).
		expect(w.vm.computeWholeRowClip([40, 80, 120, 160], 130)).toBe(120)
	})

	it('computeWholeRowClip keeps the first row even when it exceeds the budget', () => {
		const w = mountWidget()
		// A single very tall row (200) with a 130 budget still shows — the fade
		// covers the overflow, we never cut BEFORE the first row.
		expect(w.vm.computeWholeRowClip([200, 400], 130)).toBe(200)
	})

	it('computeWholeRowClip returns the budget when there are no rows', () => {
		const w = mountWidget()
		expect(w.vm.computeWholeRowClip([], 130)).toBe(130)
	})

	it('cellRowBottoms groups cells into rows and reports each row bottom', () => {
		const w = mountWidget()
		const cell = (top, bottom) => ({ getBoundingClientRect: () => ({ top, bottom }) })
		// gridTop=0. Two cells on row 1 (top 0) + one on row 2 (top 40).
		const bottoms = w.vm.cellRowBottoms([cell(0, 38), cell(0, 40), cell(40, 78)], 0)
		expect(bottoms).toEqual([40, 78])
	})

	it('toggle switches expanded state and the button label', async () => {
		const w = mountWidget()
		w.setData({ overflowing: true })
		await w.vm.$nextTick()
		expect(w.find('.cn-object-data-widget__toggle').text()).toBe('Show all 3 fields')
		w.vm.toggleExpanded()
		await w.vm.$nextTick()
		expect(w.vm.expanded).toBe(true)
		expect(w.find('.cn-object-data-widget__toggle').text()).toBe('Show less')
	})

	it('collapsedGridStyle applies the whole-row max-height only when clipped', async () => {
		const w = mountWidget()
		expect(w.vm.collapsedGridStyle.maxHeight).toBeUndefined()
		w.setData({ overflowing: true, collapsedMaxHeight: 120 })
		await w.vm.$nextTick()
		expect(w.vm.collapsedGridStyle.maxHeight).toBe('120px')
		w.setData({ expanded: true })
		await w.vm.$nextTick()
		// Expanded → no clip.
		expect(w.vm.collapsedGridStyle.maxHeight).toBeUndefined()
	})

	it('no toggle renders when the field set fits the cell (not overflowing)', () => {
		const w = mountWidget()
		expect(w.vm.overflowing).toBe(false)
		expect(w.find('.cn-object-data-widget__toggle').exists()).toBe(false)
	})
})
