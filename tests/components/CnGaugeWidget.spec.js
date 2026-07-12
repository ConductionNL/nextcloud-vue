/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'
import CnGaugeWidget from '../../src/components/CnGaugeWidget/CnGaugeWidget.vue'

jest.mock('../../src/utils/fetchAggregate.js', () => ({
	fetchAggregateValue: jest.fn(),
}))

describe('CnGaugeWidget', () => {
	const mount = (content) => shallowMount(CnGaugeWidget, { propsData: { content } })

	it('computes ratio, percent label and clamped fill width', async () => {
		const w = mount({ thresholds: { warn: 80, danger: 100 } })
		w.setData({ value: 60, target: 50 })
		await w.vm.$nextTick()
		expect(w.vm.ratio).toBeCloseTo(1.2, 5)
		expect(w.vm.pctLabel).toBe('120%')
		expect(w.vm.fillWidth).toBe('100%') // clamped
	})

	it('colours by threshold bands', async () => {
		const ok = mount({ thresholds: { warn: 80, danger: 100 } })
		ok.setData({ value: 50, target: 100 })
		await ok.vm.$nextTick()
		expect(ok.vm.barColor).toBe('var(--color-success)')

		const warn = mount({ thresholds: { warn: 80, danger: 100 } })
		warn.setData({ value: 90, target: 100 })
		await warn.vm.$nextTick()
		expect(warn.vm.barColor).toBe('var(--color-warning)')

		const danger = mount({ thresholds: { warn: 80, danger: 100 } })
		danger.setData({ value: 110, target: 100 })
		await danger.vm.$nextTick()
		expect(danger.vm.barColor).toBe('var(--color-error)')
	})

	it('inverts bands when low is bad', async () => {
		const w = mount({ thresholds: { warn: 80, danger: 100, invert: true } })
		w.setData({ value: 50, target: 100 })
		await w.vm.$nextTick()
		expect(w.vm.barColor).toBe('var(--color-error)')
	})

	it('returns null ratio when target is zero', async () => {
		const w = mount({})
		w.setData({ value: 50, target: 0 })
		await w.vm.$nextTick()
		expect(w.vm.ratio).toBeNull()
		expect(w.vm.fillWidth).toBe('0%')
	})
})

describe('CnGaugeWidget — @config.currency token', () => {
	const mountCfg = (content, config) =>
		shallowMount(CnGaugeWidget, { propsData: { content }, provide: { cnAppConfig: config || {} } })

	it('resolves @config.currency into the format spec', () => {
		const w = mountCfg(
			{ format: { style: 'currency', currency: '@config.currency', decimals: 0 } },
			{ currency: 'USD' },
		)
		expect(w.vm.resolvedFormat.currency).toBe('USD')
		expect(w.vm.formatNumber(1000)).toContain('$')
		expect(w.vm.formatNumber(1000)).not.toContain('@config')
	})

	it('falls back to EUR (never passes the raw token to Intl) when unset', () => {
		const w = mountCfg(
			{ format: { style: 'currency', currency: '@config.currency', decimals: 0 } },
			{},
		)
		expect(w.vm.resolvedFormat.currency).toBeUndefined()
		// Regression: a literal '@config.currency' would throw RangeError in Intl.
		expect(() => w.vm.formatNumber(1000)).not.toThrow()
		expect(w.vm.formatNumber(1000)).toContain('€')
	})

	it('keeps a literal currency working (backwards compatible)', () => {
		const w = mountCfg(
			{ format: { style: 'currency', currency: 'GBP', decimals: 0 } },
			{ currency: 'USD' },
		)
		expect(w.vm.resolvedFormat.currency).toBe('GBP')
		expect(w.vm.formatNumber(1000)).toContain('£')
	})
})
