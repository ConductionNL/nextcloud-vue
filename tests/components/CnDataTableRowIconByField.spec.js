/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PtMededelingenActies: the leading icon and its tile tone follow a field of the
 * row, a warning triangle on a warning notice and an info circle on the rest.
 *
 * @spec openspec/changes/notice-list-in-a-tab/specs/data-table/spec.md#requirement-a-row-icon-can-follow-a-field-of-the-row
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROW_ICON = {
	field: 'level',
	icons: { warning: 'AlertOutline', info: 'InformationOutline' },
	tones: { warning: 'warning' },
}

function iconCells(rows, rowIcon = ROW_ICON, extra = {}) {
	return mount(CnDataTable, {
		propsData: { rows, columns: ['message'], rowIcon, ...extra },
		global: { stubs: { CnIcon: { props: ['name'], template: '<i :data-name="name" />' } } },
		stubs: { CnIcon: { props: ['name'], template: '<i :data-name="name" />' } },
	}).findAll('td.cn-table-col--icon')
}

describe('CnDataTable rowIcon by field', () => {
	const rows = [
		{ id: 'n1', message: 'Inloggen met DigiD lukt nu niet altijd.', level: 'warning' },
		{ id: 'n2', message: 'Het Stadskantoor is gesloten.', level: 'info' },
	]

	it('picks each row\'s icon by the field\'s value', () => {
		const cells = iconCells(rows)
		expect(cells[0].find('[data-name]').attributes('data-name')).toBe('AlertOutline')
		expect(cells[1].find('[data-name]').attributes('data-name')).toBe('InformationOutline')
	})

	it('tones each row\'s tile by the field\'s value, else the page tone', () => {
		const cells = iconCells(rows, ROW_ICON, { rowIconTone: 'primary' })
		expect(cells[0].classes()).toContain('cn-table-col--icon-warning')
		expect(cells[1].classes()).toContain('cn-table-col--icon-primary')
	})

	it('falls back to `icon` for a value the map does not name, and draws no glyph without one', () => {
		const cells = iconCells([{ id: 'n3', message: 'x', level: 'other' }, { id: 'n4', message: 'y' }], { ...ROW_ICON, icon: 'BullhornOutline' })
		expect(cells[0].find('[data-name]').attributes('data-name')).toBe('BullhornOutline')
		const bare = iconCells([{ id: 'n5', message: 'z', level: 'other' }])
		expect(bare[0].find('[data-name]').exists()).toBe(false)
	})

	it('still takes a plain icon name', () => {
		const cells = iconCells(rows, 'Domain')
		expect(cells[0].find('[data-name]').attributes('data-name')).toBe('Domain')
		expect(cells[0].classes()).toContain('cn-table-col--icon-primary')
	})
})
