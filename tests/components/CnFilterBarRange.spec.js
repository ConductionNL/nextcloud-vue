/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFilterBar `range` and `dateRange` filters: two bounds under one legend,
 * each with its own accessible name, emitting `{ gte, lte }`.
 *
 * @spec openspec/changes/dq-abstract-forms/specs/related-field-filters/spec.md
 */
import { mount } from '@vue/test-utils'
import CnFilterBar from '../../src/components/CnFilterBar/CnFilterBar.vue'

/**
 * @param {object} props Props.
 * @return {import('@vue/test-utils').VueWrapper} The bar.
 */
function mountBar(props) {
	return mount(CnFilterBar, { props })
}

describe('CnFilterBar ranges', () => {
	it('draws a number range as two number fields named from and up to', () => {
		const wrapper = mountBar({ showSearch: false, filters: [{ key: 'cost', label: 'Cost', type: 'range', value: { gte: '10', lte: '' }, testid: 'field-filter-cost' }] })
		const fields = wrapper.findAllComponents({ name: 'NcTextField' })

		expect(fields).toHaveLength(2)
		expect(fields[0].attributes('type')).toBe('number')
		expect(fields[0].attributes('label')).toBe('Cost, from')
		expect(fields[1].attributes('label')).toBe('Cost, up to')
		expect(fields[0].attributes('data-testid')).toBe('field-filter-cost-from')
		expect(fields[0].attributes('modelvalue')).toBe('10')
		expect(wrapper.find('legend').text()).toBe('Cost')
	})

	it('draws a date range with date inputs', () => {
		const wrapper = mountBar({ filters: [{ key: 'due', label: 'Due', type: 'dateRange', value: {} }] })

		expect(wrapper.findAllComponents({ name: 'NcTextField' }).filter((f) => f.attributes('type') === 'date')).toHaveLength(2)
	})

	it('emits the whole range with the changed bound', async () => {
		const wrapper = mountBar({ filters: [{ key: 'cost', label: 'Cost', type: 'range', value: { gte: '10', lte: '' } }] })
		const upper = wrapper.findAllComponents({ name: 'NcTextField' }).find((f) => f.attributes('label') === 'Cost, up to')
		upper.vm.$emit('update:modelValue', '99')

		expect(wrapper.emitted('filter-change')).toEqual([[{ key: 'cost', value: { gte: '10', lte: '99' } }]])
	})

	it('takes the host bound names when given', () => {
		const wrapper = mountBar({ showSearch: false, filters: [{ key: 'c', label: 'Cost', type: 'range', fromLabel: 'Minimum cost', toLabel: 'Maximum cost' }] })
		const labels = wrapper.findAllComponents({ name: 'NcTextField' }).map((f) => f.attributes('label'))

		expect(labels).toEqual(['Minimum cost', 'Maximum cost'])
	})

	it('drops the search field with showSearch false, and keeps it by default', () => {
		expect(mountBar({ showSearch: false, filters: [] }).find('[data-testid="cn-filter-bar-search"]').exists()).toBe(false)
		expect(mountBar({ filters: [] }).find('[data-testid="cn-filter-bar-search"]').exists()).toBe(true)
	})

	it('counts a range with a bound as an active filter, and an empty one as not', () => {
		const active = mountBar({ filters: [{ key: 'c', label: 'Cost', type: 'range', value: { gte: '', lte: '5' } }] })
		const idle = mountBar({ filters: [{ key: 'c', label: 'Cost', type: 'range', value: { gte: '', lte: '' } }] })

		expect(active.vm.hasActiveFilters).toBe(true)
		expect(idle.vm.hasActiveFilters).toBe(false)
	})
})
