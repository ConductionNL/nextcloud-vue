/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row's select checkbox is named by `selectRowLabel`: one string for every
 * row, or a function of the row so each checkbox says which row it selects
 * (WCAG 2.4.6, 4.1.2).
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => `/index.php${p}`,
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const rows = [{ id: 'a', value: 'Jan' }, { id: 'b', value: 'Piet' }]
const columns = [{ key: 'value', label: 'Value' }]

function rowLabels(props = {}) {
	const wrapper = mount(CnDataTable, {
		propsData: { rows, columns, selectable: true, ...props },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } },
	})
	return wrapper.findAll('tbody td.cn-table-col--checkbox').map((td) => td.findComponent({ name: 'NcCheckboxRadioSwitch' }).attributes('aria-label'))
}

describe('CnDataTable — selectRowLabel', () => {
	it('names every row with the library label by default', () => {
		expect(rowLabels()).toEqual(['Select row', 'Select row'])
	})

	it('names every row alike with a string', () => {
		expect(rowLabels({ selectRowLabel: 'Pick' })).toEqual(['Pick', 'Pick'])
	})

	it('names each row by its own content with a function', () => {
		expect(rowLabels({ selectRowLabel: (row) => `Select entity ${row.value}` })).toEqual([
			'Select entity Jan',
			'Select entity Piet',
		])
	})
})
