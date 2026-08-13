/**
 * Tests for CnDataTable's opt-in `fixedLayout`.
 *
 * Under the default `table-layout: auto` a column's `width` is only a hint —
 * the browser sizes columns from content, so a long unbreakable value (a PHP
 * FQCN, a UUID) widens its own column and can paint past the cell box, while a
 * column left unsized soaks up all remaining width. `fixedLayout` makes the
 * declared widths binding; the CSS companion (`overflow-wrap: anywhere` on
 * `.cn-data-table--fixed` cells) keeps overlong values inside their cell.
 */

jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const rows = [{ id: '1', message: 'Synchronized 100 successfully', jobClass: 'OCA\\OpenConnector\\Action\\SynchronizationAction' }]
const columns = [
	{ key: 'message', label: 'Message', width: '38%' },
	{ key: 'jobClass', label: 'Job class', width: '19%' },
]

/**
 * Mount helper.
 *
 * @param {object} propsData Component props.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountTable(propsData) {
	return mount(CnDataTable, {
		propsData,
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

describe('CnDataTable — fixedLayout', () => {
	it('defaults to the auto layout (no marker class)', () => {
		const wrapper = mountTable({ rows, columns })
		expect(wrapper.find('table').classes()).not.toContain('cn-data-table--fixed')
	})

	it('marks the table when opted in', () => {
		const wrapper = mountTable({ rows, columns, fixedLayout: true })
		expect(wrapper.find('table').classes()).toContain('cn-data-table--fixed')
	})

	it('keeps the base class so the shared table styling still applies', () => {
		const wrapper = mountTable({ rows, columns, fixedLayout: true })
		expect(wrapper.find('table').classes()).toContain('cn-data-table')
	})

	it('still applies each column width to its header, fixed or not', () => {
		for (const fixedLayout of [false, true]) {
			const wrapper = mountTable({ rows, columns, fixedLayout })
			const widths = wrapper.findAll('thead th').map((w) => w.attributes('style'))
			expect(widths[0]).toContain('38%')
			expect(widths[1]).toContain('19%')
		}
	})

	it('renders percentage widths verbatim, so a column set can sum to 100', () => {
		const wrapper = mountTable({
			rows,
			fixedLayout: true,
			columns: [
				{ key: 'a', label: 'A', width: '14%' },
				{ key: 'b', label: 'B', width: '9%' },
				{ key: 'c', label: 'C', width: '77%' },
			],
		})
		expect(wrapper.findAll('thead th').map((w) => w.attributes('style')))
			.toEqual(['width: 14%;', 'width: 9%;', 'width: 77%;'])
	})
})
