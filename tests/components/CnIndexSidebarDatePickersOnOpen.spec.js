/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * A closed sidebar mounts no date-range pickers: each picker reads the page
 * width on mount, a forced style recalculation (14 on a dossiq Cases load,
 * none of them visible). They mount when the sidebar opens and stay mounted.
 */

import { mount } from '@vue/test-utils'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'
import CnDateRangePicker from '../../src/components/CnDateRangePicker/CnDateRangePicker.vue'

const fields = {
	state: { type: 'string', title: 'State', facetable: true, order: 1, inputControl: 'select', enum: ['a', 'b'] },
	dueAt: { type: 'string', title: 'Due between', facetable: true, order: 2, inputControl: 'date-range' },
}

describe('CnIndexSidebar: date-range pickers mount once the sidebar has been open', () => {
	it('mounts them at once in a sidebar that starts open', () => {
		const wrapper = mount(CnIndexSidebar, { propsData: { open: true, filterFields: fields } })
		expect(wrapper.findAllComponents(CnDateRangePicker)).toHaveLength(1)
	})

	it('mounts none in a closed sidebar, then mounts them on open and keeps them on close', async () => {
		const wrapper = mount(CnIndexSidebar, { propsData: { open: false, filterFields: fields } })
		expect(wrapper.findAllComponents(CnDateRangePicker)).toHaveLength(0)
		await wrapper.setProps({ open: true })
		expect(wrapper.findAllComponents(CnDateRangePicker)).toHaveLength(1)
		await wrapper.setProps({ open: false })
		expect(wrapper.findAllComponents(CnDateRangePicker)).toHaveLength(1)
	})

	it('does not render another control in place of a date range while closed', () => {
		const wrapper = mount(CnIndexSidebar, { propsData: { open: false, filterFields: fields } })
		const group = wrapper.findAll('.cn-index-sidebar__filter-group')
		const dueAt = group.find((g) => g.text().includes('Due between'))
		expect(dueAt.find('input').exists()).toBe(false)
	})
})
