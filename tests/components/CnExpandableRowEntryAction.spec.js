/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An expandable row's sub-table can end every entry with an icon button
 * (board PqPipelines: a pencil "Fase bewerken Nieuw" after each stage). It
 * names the entry and emits the row's `action` with the entry.
 *
 * @spec openspec/changes/expandable-row-entry-action/specs/expandable-row-entry-action/spec.md
 */
import { mount } from '@vue/test-utils'
import CnExpandableRow from '../../src/components/CnExpandableRow/CnExpandableRow.vue'
import CnIcon from '../../src/components/CnIcon/CnIcon.vue'

const stages = [{ name: 'Nieuw' }, { name: 'Gewonnen' }]

function mountRow(table = {}) {
	return mount(CnExpandableRow, {
		props: {
			object: { id: 'p1', title: 'Verkoop', stages },
			open: true,
			layout: {
				title: 'title',
				table: { field: 'stages', columns: [{ key: 'name', label: 'Stage' }], ...table },
			},
		},
	})
}

describe('CnExpandableRow entry action', () => {
	it('ends every entry with an icon button that names it', () => {
		const wrapper = mountRow({ entryAction: { id: 'edit', label: 'Edit stage', icon: 'Pencil' } })
		const buttons = wrapper.findAll('[data-testid="cn-expandable-row-entry-action"]')
		expect(buttons).toHaveLength(2)
		expect(buttons.map((b) => b.attributes('aria-label'))).toEqual(['Edit stage Nieuw', 'Edit stage Gewonnen'])
		expect(buttons[0].findComponent(CnIcon).props('name')).toBe('Pencil')
		expect(wrapper.findAll('thead th')).toHaveLength(2)
	})

	it('emits the action with the row and the entry', async () => {
		const wrapper = mountRow({ entryAction: { id: 'edit', label: 'Edit stage', icon: 'Pencil' } })
		await wrapper.findAll('[data-testid="cn-expandable-row-entry-action"]')[1].trigger('click')
		expect(wrapper.emitted('action')[0][0]).toEqual({ id: 'edit', row: { id: 'p1', title: 'Verkoop', stages }, entry: stages[1] })
	})

	it('draws no extra column without one', () => {
		const wrapper = mountRow()
		expect(wrapper.find('[data-testid="cn-expandable-row-entry-action"]').exists()).toBe(false)
		expect(wrapper.findAll('thead th')).toHaveLength(1)
	})
})
