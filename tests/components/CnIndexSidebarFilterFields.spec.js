/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * `filterFields`: the questions a page declares when it has no schema.
 *
 * A named-source page has no register and no schema to point at, so its
 * filters cannot come from one. They could have been passed as a synthetic
 * schema, and that is the trap this prop exists to avoid: the schema feeds
 * BOTH tabs, so the four filters would also have appeared in the Columns tab
 * offering columns the table does not have. A ticked toggle that shows no
 * column is the same silent shape as a filter that narrows nothing.
 */

import { mount } from '@vue/test-utils'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

const fields = {
	objectUuid: { type: 'string', title: 'Case', facetable: true, order: 1, inputControl: 'reference' },
	state: { type: 'string', title: 'State', facetable: true, order: 2, inputControl: 'multiselect', enum: ['available', 'active'] },
	priority: { type: 'string', title: 'Priority', facetable: true, order: 3, inputControl: 'select', enum: ['low', 'high'] },
	dueAt: { type: 'string', title: 'Due between', facetable: true, order: 4, inputControl: 'date-range' },
}

/**
 * Mount the sidebar with a declared filter set.
 *
 * @param {object} [extra] Extra props.
 *
 * @return {object} The wrapper.
 */
function mountSidebar(extra = {}) {
	return mount(CnIndexSidebar, {
		propsData: { open: true, filterFields: fields, ...extra },
	})
}

describe('a declared filter set drives the Search tab', () => {
	it('offers one filter per declared field, in declared order', () => {
		const wrapper = mountSidebar()

		expect(wrapper.vm.schemaFilters.map((f) => f.key))
			.toEqual(['objectUuid', 'state', 'priority', 'dueAt'])
	})

	it('gives each field the control it asked for', () => {
		const byKey = Object.fromEntries(mountSidebar().vm.schemaFilters.map((f) => [f.key, f]))

		expect(byKey.objectUuid.type).toBe('reference')
		expect(byKey.state.type).toBe('select')
		expect(byKey.priority.multiple).toBe(false)
		expect(byKey.dueAt.type).toBe('date-range')
	})

	/**
	 * The whole reason the prop exists. A filter is a question, a column is a
	 * cell, and the same declaration must not become both.
	 */
	it('keeps the declared fields out of the Columns tab', () => {
		const wrapper = mountSidebar()

		expect(wrapper.vm.allColumns).toEqual([])
	})

	it('wins over a schema when a page happens to carry both', () => {
		const wrapper = mountSidebar({
			schema: { title: 'Other', properties: { somethingElse: { type: 'string', title: 'Else', facetable: true } } },
		})

		expect(wrapper.vm.schemaFilters.map((f) => f.key))
			.toEqual(['objectUuid', 'state', 'priority', 'dueAt'])
	})

	it('falls back to the schema when no fields are declared', () => {
		const wrapper = mount(CnIndexSidebar, {
			propsData: {
				open: true,
				filterFields: null,
				schema: { title: 'Cases', properties: { status: { type: 'string', title: 'Status', facetable: true, enum: ['open'] } } },
			},
		})

		expect(wrapper.vm.schemaFilters.map((f) => f.key)).toEqual(['status'])
	})
})

describe('the payload each control emits', () => {
	it('emits a window as a from/to pair', () => {
		const wrapper = mountSidebar()

		wrapper.vm.onRangeChange('dueAt', { from: '2026-09-21', to: '2026-09-25', preset: 'custom' })

		expect(wrapper.emitted('filter-change')[0][0])
			.toEqual({ key: 'dueAt', values: { from: '2026-09-21', to: '2026-09-25' } })
	})

	it('emits an empty list when both bounds are cleared', () => {
		const wrapper = mountSidebar()

		wrapper.vm.onRangeChange('dueAt', { from: '', to: '' })

		expect(wrapper.emitted('filter-change')[0][0]).toEqual({ key: 'dueAt', values: [] })
	})

	/**
	 * 🔴 NcSelect CHANGES THE SHAPE OF ITS PAYLOAD WITH `multiple`. A single
	 * select emits the option OBJECT, and `.map` on it throws inside an event
	 * handler, where Vue logs and carries on: the picker looks inert and the
	 * reason is in a console nobody is reading.
	 */
	it('takes a single select\'s object payload as well as an array', () => {
		const wrapper = mountSidebar()

		wrapper.vm.onFilterChange('priority', { id: 'high', label: 'High' })
		wrapper.vm.onFilterChange('state', [{ id: 'available', label: 'Available' }, { id: 'active', label: 'Active' }])

		expect(wrapper.emitted('filter-change')[0][0]).toEqual({ key: 'priority', values: ['high'] })
		expect(wrapper.emitted('filter-change')[1][0]).toEqual({ key: 'state', values: ['available', 'active'] })
	})

	it('emits an empty list when a select is cleared', () => {
		const wrapper = mountSidebar()

		wrapper.vm.onFilterChange('priority', null)

		expect(wrapper.emitted('filter-change')[0][0]).toEqual({ key: 'priority', values: [] })
	})

	it('trims a text filter and drops it when it is blank', () => {
		const wrapper = mountSidebar({
			filterFields: { holdReason: { type: 'string', title: 'Reason', facetable: true, inputControl: 'text' } },
		})

		wrapper.vm.onTextChange('holdReason', '  spoed  ')
		wrapper.vm.onTextChange('holdReason', '   ')

		expect(wrapper.emitted('filter-change')[0][0]).toEqual({ key: 'holdReason', values: ['spoed'] })
		expect(wrapper.emitted('filter-change')[1][0]).toEqual({ key: 'holdReason', values: [] })
	})
})
