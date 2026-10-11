/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `rowTitle: "plain"` marks the board table so its title column draws as bold
 * text without an underline (PqTickets). The default and the Nextcloud look
 * render as before.
 *
 * @spec openspec/changes/screens-table-rows-parity/specs/index-list-board-look/spec.md#requirement-a-row-title-can-be-plain-text
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const ROWS = [{ id: '1', title: 'Afvalpas werkt niet', number: 'PQ-2026-0409' }]
const COLUMNS = [{ key: 'title', label: 'Subject', secondary: 'number' }, { key: 'number', label: 'Number' }]

function mountTable(look, props = {}) {
	return mount(CnDataTable, {
		props: { rows: ROWS, columns: COLUMNS, rowKey: 'id', ...props },
		global: {
			provide: { cnLook: look },
			stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cn-cell-renderer">{{ value }}</span>' } },
		},
	})
}

describe('CnDataTable: rowTitle', () => {
	it('marks the board table plain when asked', () => {
		const wrapper = mountTable('board', { rowTitle: 'plain' })
		const container = wrapper.find('[data-testid="cn-object-list"]')
		expect(container.classes()).toContain('cn-table-container--board')
		expect(container.classes()).toContain('cn-table-container--title-plain')
		// The secondary line still renders under the title.
		expect(wrapper.find('td.cn-table-col--title [data-testid="cn-cell-secondary"]').text()).toBe('PQ-2026-0409')
	})

	it('keeps the underlined title by default under the board look', () => {
		const container = mountTable('board').find('[data-testid="cn-object-list"]')
		expect(container.classes()).toContain('cn-table-container--board')
		expect(container.classes()).not.toContain('cn-table-container--title-plain')
	})

	it('ignores it under the Nextcloud look', () => {
		const container = mountTable('nextcloud', { rowTitle: 'plain' }).find('[data-testid="cn-object-list"]')
		expect(container.classes()).not.toContain('cn-table-container--board')
		expect(container.classes()).not.toContain('cn-table-container--title-plain')
	})

	it('accepts only link and plain', () => {
		const { validator } = CnDataTable.props.rowTitle
		expect(validator('link')).toBe(true)
		expect(validator('plain')).toBe(true)
		expect(validator('bold')).toBe(false)
	})

	it('is a CnIndexPage prop with the same default, passed to the table', () => {
		expect(CnIndexPage.props.rowTitle.default).toBe('link')
		expect(CnIndexPage.props.rowTitle.validator('plain')).toBe(true)
	})
})
