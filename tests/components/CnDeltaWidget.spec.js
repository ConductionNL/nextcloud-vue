/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'
import CnDeltaWidget from '../../src/components/CnDeltaWidget/CnDeltaWidget.vue'

jest.mock('../../src/utils/fetchAggregate.js', () => ({
	fetchAggregateValue: jest.fn(),
}))

describe('CnDeltaWidget', () => {
	const mount = (content) => shallowMount(CnDeltaWidget, { propsData: { content } })

	it('computes a positive delta and tints it good (up = good)', async () => {
		const w = mount({ source: { goodDirection: 'up' } })
		w.setData({ current: 120, previous: 100 })
		await w.vm.$nextTick()
		expect(w.vm.deltaPct).toBeCloseTo(20, 5)
		expect(w.vm.formattedDelta).toBe('+20.0%')
		expect(w.vm.deltaColor).toBe('var(--color-success)')
		expect(w.vm.deltaIcon).toBe('TrendingUp')
	})

	it('tints a drop red when up is good', async () => {
		const w = mount({ source: { goodDirection: 'up' } })
		w.setData({ current: 80, previous: 100 })
		await w.vm.$nextTick()
		expect(w.vm.formattedDelta).toBe('-20.0%')
		expect(w.vm.deltaColor).toBe('var(--color-error)')
		expect(w.vm.deltaIcon).toBe('TrendingDown')
	})

	it('inverts good/bad when down is good', async () => {
		const w = mount({ source: { goodDirection: 'down' } })
		w.setData({ current: 80, previous: 100 })
		await w.vm.$nextTick()
		expect(w.vm.deltaColor).toBe('var(--color-success)')
	})

	it('returns null delta when previous is zero', async () => {
		const w = mount({ source: {} })
		w.setData({ current: 50, previous: 0 })
		await w.vm.$nextTick()
		expect(w.vm.deltaPct).toBeNull()
	})

	it('formats the current value as currency', async () => {
		const w = mount({ format: { style: 'currency', currency: 'EUR', decimals: 0 } })
		w.setData({ current: 1234 })
		await w.vm.$nextTick()
		expect(w.vm.formattedCurrent).toMatch(/1.?234/)
	})
})
