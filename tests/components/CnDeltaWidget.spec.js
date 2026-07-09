/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import CnDeltaWidget from '../../src/components/CnDeltaWidget/CnDeltaWidget.vue'
import { fetchAggregateValue } from '../../src/utils/fetchAggregate.js'

jest.mock('../../src/utils/fetchAggregate.js', () => ({
	fetchAggregateValue: jest.fn(),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

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

describe('CnDeltaWidget — @workspace date-window filter', () => {
	const source = {
		register: 'pipelinq',
		schema: 'lead',
		metric: 'count',
		current: { filter: { status: 'won', expectedCloseDate: { gte: '@workspace.dateFrom?', lte: '@workspace.dateTo?' } } },
		previous: { filter: { status: 'open' } },
	}

	const mountWs = (workspace) => shallowMount(CnDeltaWidget, {
		propsData: { content: { source } },
		provide: { cnWorkspaceContext: workspace !== undefined ? workspace : {} },
	})

	beforeEach(() => {
		fetchAggregateValue.mockReset()
		fetchAggregateValue.mockResolvedValue(3)
	})

	it('resolves the date window into the current leg when set', async () => {
		mountWs({ dateFrom: '2026-01-01T00:00:00.000Z', dateTo: '2026-01-31T23:59:59.999Z' })
		await flush()
		const curArg = fetchAggregateValue.mock.calls[0][0]
		expect(curArg.filter.expectedCloseDate).toEqual({ gte: '2026-01-01T00:00:00.000Z', lte: '2026-01-31T23:59:59.999Z' })
		expect(curArg.filter.status).toBe('won')
	})

	it('drops the date filter from the current leg when the window is empty ("All")', async () => {
		mountWs({ dateFrom: '', dateTo: '' })
		await flush()
		const curArg = fetchAggregateValue.mock.calls[0][0]
		expect(curArg.filter.expectedCloseDate).toBeUndefined()
		expect(curArg.filter.status).toBe('won')
	})

	it('leaves the previous (snapshot) leg untouched', async () => {
		mountWs({ dateFrom: '2026-01-01', dateTo: '2026-01-31' })
		await flush()
		const prevArg = fetchAggregateValue.mock.calls[1][0]
		expect(prevArg.filter).toEqual({ status: 'open' })
	})

	it('refetches with the new window when the workspace context changes', async () => {
		const workspace = ref({ dateFrom: '', dateTo: '' })
		shallowMount(CnDeltaWidget, {
			propsData: { content: { source } },
			provide: { cnWorkspaceContext: workspace },
		})
		await flush()
		expect(fetchAggregateValue.mock.calls[0][0].filter.expectedCloseDate).toBeUndefined()

		workspace.value = { dateFrom: '2026-06-01T00:00:00.000Z', dateTo: '2026-06-30T23:59:59.999Z' }
		await flush()
		const lastCur = fetchAggregateValue.mock.calls[fetchAggregateValue.mock.calls.length - 2][0]
		expect(lastCur.filter.expectedCloseDate).toEqual({ gte: '2026-06-01T00:00:00.000Z', lte: '2026-06-30T23:59:59.999Z' })
	})
})
