/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The row menu and the table under the board look: one menu button per row
 * named after the row, a visually hidden "Actions" column header, the title
 * column marked, and the table container carrying the card class.
 *
 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-table-is-a-white-card-with-one-row-menu
 */
import { mount } from '@vue/test-utils'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'
import CnRowActions from '../../src/components/CnRowActions/CnRowActions.vue'

const ActionsStub = {
	props: ['forceMenu', 'ariaLabel', 'variant'],
	template: '<div class="nc-actions" :data-force="String(forceMenu)" :data-label="ariaLabel" :data-variant="variant"><slot name="icon" /></div>',
}
const ACTIONS = [{ id: 'edit', label: 'Edit', handler: () => {} }]

function mountActions(props, look) {
	return mount(CnRowActions, {
		props: { actions: ACTIONS, row: { id: 1 }, ...props },
		global: { provide: { cnLook: look }, stubs: { NcActions: ActionsStub } },
	})
}

describe('CnRowActions (board look)', () => {
	it('is always a menu, secondary, named "Actions for <title>"', () => {
		const w = mountActions({ rowLabel: 'Parkeervergunningen' }, 'board')
		const menu = w.find('.nc-actions')
		expect(menu.attributes('data-force')).toBe('true')
		expect(menu.attributes('data-variant')).toBe('secondary')
		expect(menu.attributes('data-label')).toBe('Actions for Parkeervergunningen')
		expect(menu.classes()).toContain('cn-row-actions--board')
	})

	it('takes a whole trigger label for the card menu', () => {
		const w = mountActions({ rowLabel: 'Sanne', triggerLabel: 'More actions for Sanne' }, 'board')
		expect(w.find('.nc-actions').attributes('data-label')).toBe('More actions for Sanne')
	})

	it('is named "Actions" without a row label', () => {
		expect(mountActions({}, 'board').find('.nc-actions').attributes('data-label')).toBe('Actions')
	})

	it('is unchanged without the look', () => {
		const w = mountActions({ rowLabel: 'Parkeervergunningen' }, 'nextcloud')
		const menu = w.find('.nc-actions')
		expect(menu.attributes('data-force')).toBe('false')
		expect(menu.attributes('data-label')).toBeUndefined()
		expect(menu.classes()).not.toContain('cn-row-actions--board')
	})
})

describe('CnDataTable (board look)', () => {
	function mountTable(look) {
		return mount(CnDataTable, {
			props: {
				columns: [{ key: 'title', label: 'Case' }, { key: 'type', label: 'Type' }],
				rows: [{ id: 1, title: 'Parkeervergunningen', type: 'Woo' }],
			},
			slots: { 'row-actions': '<button class="menu">...</button>' },
			global: { provide: { cnLook: look } },
		})
	}

	it('marks the table as the board card and names the actions column', () => {
		const w = mountTable('board')
		expect(w.find('.cn-table-container').classes()).toContain('cn-table-container--board')
		expect(w.find('th.cn-table-col--actions .hidden-visually').text()).toBe('Actions')
	})

	it('marks the first data cell as the title column', () => {
		const w = mountTable('board')
		const cells = w.findAll('tbody td').filter((td) => !td.classes().includes('cn-table-col--actions'))
		expect(cells[0].classes()).toContain('cn-table-col--title')
		expect(cells[1].classes()).not.toContain('cn-table-col--title')
	})

	it('draws the plain table without the look', () => {
		const w = mountTable('nextcloud')
		expect(w.find('.cn-table-container').classes()).not.toContain('cn-table-container--board')
		expect(w.find('th.cn-table-col--actions .hidden-visually').exists()).toBe(false)
	})
})
