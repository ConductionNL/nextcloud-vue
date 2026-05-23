import { mount } from '@vue/test-utils'
import CnDataMatrix from '@/components/CnDataMatrix/CnDataMatrix.vue'

const columns = [
	{ key: 'q1', label: 'Q1', type: 'number' },
	{ key: 'q2', label: 'Q2', type: 'number' },
	{ key: 'note', label: 'Note', type: 'string', readOnly: true },
]
const rows = [
	{ id: 1, label: 'Alpha', q1: 10, q2: 20, note: 'ok' },
	{ id: 2, label: 'Bravo', q1: 5,  q2: 15, note: '' },
]

describe('CnDataMatrix', () => {
	it('renders empty state when rows[] is empty', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { columns } })
		expect(wrapper.find('.cn-data-matrix__empty').exists()).toBe(true)
	})

	it('renders one row per record + one column header per column', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns } })
		expect(wrapper.findAll('tbody tr').length).toBe(rows.length)
		expect(wrapper.findAll('thead th').length).toBe(columns.length)
	})

	it('renders the row-header column when rowHeader is set', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns, rowHeader: 'Group' } })
		expect(wrapper.findAll('thead th').length).toBe(columns.length + 1)
		expect(wrapper.text()).toContain('Alpha')
	})

	it('shows row + column + grand totals when enabled', () => {
		const wrapper = mount(CnDataMatrix, {
			propsData: {
				rows, columns: [columns[0], columns[1]],
				rowHeader: 'Group', showRowTotals: true, showColumnTotals: true,
			},
		})
		// Per-row totals: 30, 20
		expect(wrapper.vm.rowTotal(rows[0])).toBe(30)
		expect(wrapper.vm.rowTotal(rows[1])).toBe(20)
		// Per-column totals: 15, 35
		expect(wrapper.vm.columnTotal(columns[0])).toBe(15)
		expect(wrapper.vm.columnTotal(columns[1])).toBe(35)
		// Grand total
		expect(wrapper.vm.grandTotal).toBe(50)
	})

	it('startEdit + commitEdit emits cell-edit with coerced number', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns } })
		wrapper.vm.startEdit(rows[0], columns[0])
		wrapper.vm.commitEdit(rows[0], columns[0], '42')
		const emit = wrapper.emitted('cell-edit')[0][0]
		expect(emit).toMatchObject({ rowId: 1, colKey: 'q1', value: 42 })
	})

	it('commit on a number column with non-numeric input coerces to null', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns } })
		wrapper.vm.startEdit(rows[0], columns[0])
		wrapper.vm.commitEdit(rows[0], columns[0], 'foo')
		expect(wrapper.emitted('cell-edit')[0][0].value).toBeNull()
	})

	it('does not start editing on read-only column', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns } })
		wrapper.vm.startEdit(rows[0], columns[2]) // note is read-only
		expect(wrapper.vm.editing).toBeNull()
	})

	it('does not start editing when readOnly globally', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns, readOnly: true } })
		wrapper.vm.startEdit(rows[0], columns[0])
		expect(wrapper.vm.editing).toBeNull()
	})

	it('cancelEdit clears editing state', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows, columns } })
		wrapper.vm.startEdit(rows[0], columns[0])
		expect(wrapper.vm.editing).not.toBeNull()
		wrapper.vm.cancelEdit()
		expect(wrapper.vm.editing).toBeNull()
	})

	it('column aggregate=avg averages values', () => {
		const wrapper = mount(CnDataMatrix, {
			propsData: {
				rows: [
					{ id: 1, x: 10 }, { id: 2, x: 20 }, { id: 3, x: 60 },
				],
				columns: [{ key: 'x', label: 'X', type: 'number', aggregate: 'avg' }],
			},
		})
		expect(wrapper.vm.columnTotal({ key: 'x', type: 'number', aggregate: 'avg' })).toBe(30)
	})

	it('column aggregate=count counts numeric values', () => {
		const wrapper = mount(CnDataMatrix, {
			propsData: {
				rows: [
					{ id: 1, x: 10 }, { id: 2, x: null }, { id: 3, x: 20 },
				],
				columns: [{ key: 'x', label: 'X', type: 'number', aggregate: 'count' }],
			},
		})
		expect(wrapper.vm.columnTotal({ key: 'x', type: 'number', aggregate: 'count' })).toBe(2)
	})

	it('formatCell uses the column formatter when provided', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows: [], columns: [] } })
		const col = { type: 'string', formatter: (v) => `[${v}]` }
		expect(wrapper.vm.formatCell('hello', col)).toBe('[hello]')
	})

	it('formatCell returns empty string for null/undefined', () => {
		const wrapper = mount(CnDataMatrix, { propsData: { rows: [], columns: [] } })
		expect(wrapper.vm.formatCell(null, { type: 'number' })).toBe('')
		expect(wrapper.vm.formatCell(undefined, { type: 'string' })).toBe('')
	})

	it('renders title + description', () => {
		const wrapper = mount(CnDataMatrix, {
			propsData: { rows, columns, title: 'Grades', description: 'Per quarter' },
		})
		expect(wrapper.text()).toContain('Grades')
		expect(wrapper.text()).toContain('Per quarter')
	})
})
