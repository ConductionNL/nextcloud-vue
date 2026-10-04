/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnStackedBarWidget: one bar, a legend that carries the numbers, segment
 * order, the lightness ramp, and the single grouped request.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
 */

import { mount } from '@vue/test-utils'
import CnStackedBarWidget, { rampColor } from '../../src/components/CnStackedBarWidget/CnStackedBarWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { fetchGroupedCounts } from '../../src/utils/fetchAggregate.js'
import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

jest.mock('../../src/utils/fetchAggregate.js', () => ({
	...jest.requireActual('../../src/utils/fetchAggregate.js'),
	fetchGroupedCounts: jest.fn(),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve))

const STATIC = {
	segments: [
		{ label: 'Received', value: 3 },
		{ label: 'In progress', value: 6 },
		{ label: 'Decision', value: 3 },
		{ label: 'Publish', value: 2 },
	],
}

beforeEach(() => {
	fetchGroupedCounts.mockReset()
})

describe('rampColor', () => {
	it('is the primary colour for a single segment', () => {
		expect(rampColor(0, 1)).toBe('var(--color-primary-element)')
	})

	it('runs from a light tint of the primary colour to the text colour', () => {
		expect(rampColor(0, 4)).toBe('color-mix(in srgb, var(--color-primary-element) 70%, var(--color-main-background))')
		expect(rampColor(1, 4)).toBe('color-mix(in srgb, var(--color-primary-element) 90%, var(--color-main-background))')
		expect(rampColor(2, 4)).toBe('color-mix(in srgb, var(--color-main-text) 33%, var(--color-primary-element))')
		expect(rampColor(3, 4)).toBe('var(--color-main-text)')
	})

	it('gives every step of a ramp its own colour', () => {
		for (const count of [2, 3, 4, 5, 6, 8]) {
			const colors = Array.from({ length: count }, (_, index) => rampColor(index, count))
			expect(new Set(colors).size).toBe(count)
		}
	})

	it('uses theme variables only, never a literal colour', () => {
		for (let index = 0; index < 6; index++) {
			expect(rampColor(index, 6)).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i)
		}
	})
})

describe('CnStackedBarWidget', () => {
	it('is registered as the stacked-bar widget with a form', () => {
		const entry = getWidgetTypeEntry('stacked-bar')
		expect(entry.renderer).toBe(CnStackedBarWidget)
		expect(entry.form.name).toBe('CnStackedBarWidgetForm')
	})

	it('puts every label and count in the legend', () => {
		const wrapper = mount(CnStackedBarWidget, { propsData: { content: STATIC } })
		const items = wrapper.findAll('[data-testid="cn-stacked-bar-legend-item"]')
		expect(items.map((item) => item.find('.cn-stacked-bar__label').text())).toEqual(['Received', 'In progress', 'Decision', 'Publish'])
		expect(items.map((item) => item.find('.cn-stacked-bar__count').text())).toEqual(['3', '6', '3', '2'])
		expect(wrapper.find('.cn-stacked-bar__legend').element.tagName).toBe('UL')
	})

	it('hides the bar from assistive technology and keeps the legend visible to it', () => {
		const wrapper = mount(CnStackedBarWidget, { propsData: { content: STATIC } })
		expect(wrapper.find('.cn-stacked-bar__bar').attributes('aria-hidden')).toBe('true')
		expect(wrapper.find('.cn-stacked-bar__legend').attributes('aria-hidden')).toBeUndefined()
		expect(wrapper.findAll('.cn-stacked-bar__dot').every((dot) => dot.attributes('aria-hidden') === 'true')).toBe(true)
	})

	it('sizes each segment by its count and colours it like its legend dot', () => {
		const wrapper = mount(CnStackedBarWidget, { propsData: { content: STATIC } })
		const segments = wrapper.findAll('.cn-stacked-bar__segment')
		expect(segments.map((segment) => segment.element.style.flexGrow)).toEqual(['3', '6', '3', '2'])
		expect(wrapper.vm.segments.map((segment) => segment.color)).toEqual([0, 1, 2, 3].map((index) => rampColor(index, 4)))
	})

	it('leaves a zero-count segment out of the bar but keeps it in the legend', () => {
		const wrapper = mount(CnStackedBarWidget, {
			propsData: { content: { segments: [{ label: 'A', value: 4 }, { label: 'B', value: 0 }] } },
		})
		expect(wrapper.findAll('.cn-stacked-bar__segment')).toHaveLength(1)
		expect(wrapper.findAll('[data-testid="cn-stacked-bar-legend-item"]')).toHaveLength(2)
	})

	it('shows the empty text when there is nothing to count', () => {
		const wrapper = mount(CnStackedBarWidget, { propsData: { content: { emptyText: 'No cases yet' } } })
		expect(wrapper.find('[data-testid="cn-stacked-bar-empty"]').text()).toBe('No cases yet')
		expect(wrapper.find('.cn-stacked-bar__bar').exists()).toBe(false)
	})

	it('translates labels through the translate function', () => {
		const wrapper = mount(CnStackedBarWidget, {
			propsData: { content: STATIC, translate: (key) => key.toUpperCase() },
		})
		expect(wrapper.find('.cn-stacked-bar__label').text()).toBe('RECEIVED')
	})

	describe('with an OpenRegister source', () => {
		const SOURCE = {
			source: { register: 'dossiq', schema: 'case', groupBy: 'status', filter: { assignee: '@me' } },
			order: ['received', 'in_progress', 'decision'],
			labels: { received: 'Received', in_progress: 'In progress' },
		}

		it('makes ONE grouped request for all segments', async () => {
			fetchGroupedCounts.mockResolvedValue([{ key: 'in_progress', count: 6 }, { key: 'received', count: 3 }])
			mount(CnStackedBarWidget, { propsData: { content: SOURCE } })
			await flush()
			expect(fetchGroupedCounts).toHaveBeenCalledTimes(1)
			expect(fetchGroupedCounts).toHaveBeenCalledWith(SOURCE.source)
		})

		it('renders in the declared order, with unlisted groups after it and a listed empty group at 0', async () => {
			fetchGroupedCounts.mockResolvedValue([
				{ key: 'publish', count: 2 },
				{ key: 'in_progress', count: 6 },
				{ key: 'received', count: 3 },
			])
			const wrapper = mount(CnStackedBarWidget, { propsData: { content: SOURCE } })
			await flush()
			const items = wrapper.findAll('[data-testid="cn-stacked-bar-legend-item"]')
			expect(items.map((item) => item.find('.cn-stacked-bar__label').text())).toEqual(['Received', 'In progress', 'decision', 'publish'])
			expect(items.map((item) => item.find('.cn-stacked-bar__count').text())).toEqual(['3', '6', '0', '2'])
		})

		it('shows a loading state, then the result', async () => {
			let resolve
			fetchGroupedCounts.mockReturnValue(new Promise((r) => { resolve = r }))
			const wrapper = mount(CnStackedBarWidget, { propsData: { content: SOURCE } })
			await flush()
			expect(wrapper.find('[role="status"]').exists()).toBe(true)
			resolve([{ key: 'received', count: 1 }])
			await flush()
			expect(wrapper.find('[role="status"]').exists()).toBe(false)
			expect(wrapper.find('.cn-stacked-bar__bar').exists()).toBe(true)
		})

		it('says the numbers could not be loaded when the request fails', async () => {
			jest.spyOn(console, 'warn').mockImplementation(() => {})
			fetchGroupedCounts.mockRejectedValue(new Error('500'))
			const wrapper = mount(CnStackedBarWidget, { propsData: { content: SOURCE } })
			await flush()
			expect(wrapper.find('[role="status"]').text()).toContain('could not be loaded')
			jest.restoreAllMocks()
		})

		it('fetches again when the source changes', async () => {
			fetchGroupedCounts.mockResolvedValue([])
			const wrapper = mount(CnStackedBarWidget, { propsData: { content: SOURCE } })
			await flush()
			await wrapper.setProps({ content: { ...SOURCE, source: { ...SOURCE.source, groupBy: 'caseType' } } })
			await flush()
			expect(fetchGroupedCounts).toHaveBeenCalledTimes(2)
		})
	})
})
