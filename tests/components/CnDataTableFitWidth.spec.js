/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * CnDataTable's `fitWidth`: which column grows, and that CnWidgetObjectTable
 * turns it on. The widths themselves are measured in a browser
 * (`e2e/narrow-object-table.e2e.js`).
 *
 * @spec openspec/changes/narrow-object-table-widgets/specs/narrow-object-table-widgets/spec.md#requirement-a-narrow-object-table-keeps-its-trailing-columns-in-view
 */

jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default
const CnWidgetObjectTable = require('../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default

const rows = [{ id: '1', identifier: 'Z-1', title: 'A long case title', name: 'n', viewedAt: 'today' }]
const stubs = { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } }

/**
 * The keys of the body cells that carry the grow class.
 *
 * @param {object} wrapper The mounted wrapper.
 * @param {Array<string>} keys The column keys, in order.
 * @return {Array<string>} The keys whose cell grows.
 */
function growKeys(wrapper, keys) {
	return wrapper.findAll('tbody tr td').filter((td) => td.classes().includes('cn-table-col--grow')).map((td) => keys[td.element.cellIndex])
}

describe('CnDataTable fitWidth', () => {
	it('is off by default: no fit class, no grow column', () => {
		const wrapper = mount(CnDataTable, { propsData: { rows, columns: ['identifier', 'title', 'viewedAt'] }, stubs })
		expect(wrapper.find('table').classes()).not.toContain('cn-data-table--fit')
		expect(wrapper.find('.cn-table-col--grow').exists()).toBe(false)
	})

	it('grows the title column, not the first one', () => {
		const keys = ['identifier', 'title', 'viewedAt']
		const wrapper = mount(CnDataTable, { propsData: { rows, columns: keys, fitWidth: true }, stubs })
		expect(wrapper.find('table').classes()).toContain('cn-data-table--fit')
		expect(growKeys(wrapper, keys)).toEqual(['title'])
		expect(wrapper.findAll('thead th.cn-table-col--grow')).toHaveLength(1)
	})

	it('lets a column ask to grow with grow: true', () => {
		const keys = ['identifier', 'title', 'viewedAt']
		const columns = ['identifier', 'title', { key: 'viewedAt', grow: true }]
		const wrapper = mount(CnDataTable, { propsData: { rows, columns, fitWidth: true }, stubs })
		expect(growKeys(wrapper, keys)).toEqual(['viewedAt'])
	})

	it('falls back to name, then to the first column', () => {
		const withName = mount(CnDataTable, { propsData: { rows, columns: ['identifier', 'name'], fitWidth: true }, stubs })
		expect(growKeys(withName, ['identifier', 'name'])).toEqual(['name'])
		const plain = mount(CnDataTable, { propsData: { rows, columns: ['identifier', 'viewedAt'], fitWidth: true }, stubs })
		expect(growKeys(plain, ['identifier', 'viewedAt'])).toEqual(['identifier'])
	})
})

describe('CnWidgetObjectTable fits its tile', () => {
	it('turns fitWidth on by default and can turn it off', () => {
		const on = mount(CnWidgetObjectTable, { propsData: { rows, columns: ['identifier', 'title'] }, stubs })
		expect(on.findComponent(CnDataTable).props('fitWidth')).toBe(true)
		const off = mount(CnWidgetObjectTable, { propsData: { rows, columns: ['identifier', 'title'], fitWidth: false }, stubs })
		expect(off.findComponent(CnDataTable).props('fitWidth')).toBe(false)
	})
})
