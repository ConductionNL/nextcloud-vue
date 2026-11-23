/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Per-item `sizeToContent`, so a widget that turns out to have nothing to show
 * does not cost its whole authored row.
 *
 * The row is reserved from the layout before the component renders, and the
 * engine positions items absolutely — so a widget whose `v-if` is false leaves
 * a reserved gap that no CSS can reclaim (height:0 hides it without moving
 * anything below). Handing the row's height to its content is what lets the
 * grid close up behind it.
 */
import { shallowMount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

/**
 * @param {Array<object>} layout Layout items.
 * @return {object} Wrapper.
 */
function mountGrid(layout) {
	return shallowMount(CnDashboardGrid, { propsData: { layout } })
}

const base = { id: '1', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 1 }

describe('CnDashboardGrid — per-item sizeToContent', () => {
	it('writes gs-size-to-content when an item opts in', () => {
		const wrapper = mountGrid([{ ...base, sizeToContent: true }])

		expect(wrapper.find('.grid-stack-item').attributes('gs-size-to-content')).toBe('true')
		wrapper.unmount()
	})

	it('leaves the attribute off an item that did not ask, so gridHeight still rules', () => {
		const wrapper = mountGrid([base])

		expect(wrapper.find('.grid-stack-item').attributes('gs-size-to-content')).toBeUndefined()
		wrapper.unmount()
	})

	it('passes a number through as a row minimum', () => {
		const wrapper = mountGrid([{ ...base, sizeToContent: 2 }])

		expect(wrapper.find('.grid-stack-item').attributes('gs-size-to-content')).toBe('2')
		wrapper.unmount()
	})

	it('ignores values that are not a real opt-in', () => {
		// `false`, 0 and nonsense must not emit the attribute at all — GridStack
		// reads any present value, so writing "false" would still opt the item in
		// on the paths that only check for the attribute.
		for (const v of [false, 0, -1, null, 'yes', undefined]) {
			const wrapper = mountGrid([{ ...base, sizeToContent: v }])
			expect(wrapper.find('.grid-stack-item').attributes('gs-size-to-content')).toBeUndefined()
			wrapper.unmount()
		}
	})

	it('applies per item, not to the whole grid', () => {
		const wrapper = mountGrid([
			{ ...base, id: 'a', sizeToContent: true },
			{ ...base, id: 'b', gridY: 1 },
		])

		const attrs = wrapper.findAll('.grid-stack-item').map((w) => w.attributes('gs-size-to-content'))
		expect(attrs).toEqual(['true', undefined])
		wrapper.unmount()
	})
})
