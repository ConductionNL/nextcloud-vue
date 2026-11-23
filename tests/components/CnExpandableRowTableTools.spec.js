/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An expandable row's sub-table sorts and filters on its column headers and
 * reorders its entries by drag or keyboard (board PqPipelines: Volgorde, Fase,
 * Kans ... each with a sort chevron and a filter button, a drag handle per
 * stage).
 *
 * @spec openspec/changes/expandable-row-table-tools/specs/expandable-row-table-tools/spec.md
 */
import { mount } from '@vue/test-utils'
import CnExpandableRow from '../../src/components/CnExpandableRow/CnExpandableRow.vue'

const stages = [
	{ name: 'Nieuw', probability: 10, order: 1 },
	{ name: 'Offerte', probability: 60, order: 2 },
	{ name: 'Gewonnen', probability: 100, order: 3 },
]

function mountRow(table = {}) {
	return mount(CnExpandableRow, {
		props: {
			object: { id: 'p1', title: 'Verkoop', stages },
			open: true,
			layout: {
				title: 'title',
				table: {
					field: 'stages',
					columns: [
						{ label: 'Order', as: 'order' },
						{ key: 'name', label: 'Stage' },
						{ key: 'probability', label: 'Chance', as: 'bar' },
					],
					...table,
				},
			},
		},
		attachTo: document.body,
	})
}

describe('CnExpandableRow sub-table tools', () => {
	it('draws plain headers without sortable or filterable', () => {
		const wrapper = mountRow()
		expect(wrapper.find('[data-testid="cn-expandable-row-sort"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-expandable-row-filter"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-expandable-row-handle"]').exists()).toBe(false)
	})

	it('sorts a column ascending, then descending, and keeps each entry its order number', async () => {
		const wrapper = mountRow({ sortable: true })
		const sorts = wrapper.findAll('[data-testid="cn-expandable-row-sort"]')
		expect(sorts).toHaveLength(3)
		await sorts.at(1).trigger('click')
		expect(wrapper.findAll('tbody tr').map((tr) => tr.findAll('td').at(1).text())).toEqual(['Gewonnen', 'Nieuw', 'Offerte'])
		expect(wrapper.findAll('th').at(1).attributes('aria-sort')).toBe('ascending')
		expect(wrapper.findAll('.cn-expandable-row__order').map((o) => o.text())).toEqual(['3', '1', '2'])
		await sorts.at(1).trigger('click')
		expect(wrapper.findAll('tbody tr').map((tr) => tr.findAll('td').at(1).text())).toEqual(['Offerte', 'Nieuw', 'Gewonnen'])
		expect(wrapper.findAll('th').at(1).attributes('aria-sort')).toBe('descending')
		wrapper.unmount()
	})

	it('sorts numbers as numbers', async () => {
		const wrapper = mountRow({ sortable: true })
		await wrapper.findAll('[data-testid="cn-expandable-row-sort"]').at(2).trigger('click')
		await wrapper.findAll('[data-testid="cn-expandable-row-sort"]').at(2).trigger('click')
		expect(wrapper.findAll('.cn-expandable-row__bar-value').map((v) => v.text())).toEqual(['100%', '60%', '10%'])
		wrapper.unmount()
	})

	it('filters a column on the values it holds', async () => {
		const wrapper = mountRow({ filterable: true })
		const filters = wrapper.findAll('[data-testid="cn-expandable-row-filter"]')
		expect(filters).toHaveLength(3)
		expect(filters.at(1).attributes('aria-label')).toBe('Filter on Stage')
		await filters.at(1).trigger('click')
		const options = wrapper.findAll('[data-testid="cn-expandable-row-filter-option"]')
		expect(options.map((o) => o.text())).toEqual(['Gewonnen', 'Nieuw', 'Offerte'])
		await options.at(1).find('input').setValue(true)
		expect(wrapper.findAll('tbody tr')).toHaveLength(1)
		expect(filters.at(1).attributes('aria-pressed')).toBe('true')
		await wrapper.find('[data-testid="cn-expandable-row-filter-clear"]').trigger('click')
		expect(wrapper.findAll('tbody tr')).toHaveLength(3)
		wrapper.unmount()
	})

	it('moves an entry by keyboard and emits the list renumbered', async () => {
		const wrapper = mountRow({ reorder: {} })
		const handles = wrapper.findAll('[data-testid="cn-expandable-row-handle"]')
		expect(handles).toHaveLength(3)
		expect(handles.at(0).attributes('aria-label')).toBe('Move Nieuw')
		await handles.at(0).trigger('keydown', { key: 'ArrowDown' })
		const [payload] = wrapper.emitted('reorder')[0]
		expect(payload.field).toBe('stages')
		expect(payload.row.id).toBe('p1')
		expect(payload.entries.map((e) => [e.name, e.order])).toEqual([['Offerte', 1], ['Nieuw', 2], ['Gewonnen', 3]])
		expect(stages[0].order).toBe(1)
		wrapper.unmount()
	})

	it('moves an entry by drag and drop', async () => {
		const wrapper = mountRow({ reorder: { key: 'order' } })
		const rows = wrapper.findAll('tbody tr')
		await rows.at(2).trigger('dragstart', { dataTransfer: { setData() {}, effectAllowed: '' } })
		await rows.at(0).trigger('drop', { dataTransfer: { getData: () => '' } })
		const [payload] = wrapper.emitted('reorder')[0]
		expect(payload.entries.map((e) => e.name)).toEqual(['Gewonnen', 'Nieuw', 'Offerte'])
		wrapper.unmount()
	})

	it('does not reorder while the table is sorted', async () => {
		const wrapper = mountRow({ sortable: true, reorder: {} })
		await wrapper.findAll('[data-testid="cn-expandable-row-sort"]').at(1).trigger('click')
		const handle = wrapper.findAll('[data-testid="cn-expandable-row-handle"]').at(0)
		expect(handle.attributes('disabled')).toBeDefined()
		await handle.trigger('keydown', { key: 'ArrowDown' })
		expect(wrapper.emitted('reorder')).toBeUndefined()
		expect(wrapper.findAll('tbody tr')).toHaveLength(3)
		wrapper.unmount()
	})
})
