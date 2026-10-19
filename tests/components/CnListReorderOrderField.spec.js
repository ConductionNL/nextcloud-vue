/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list ordered by a field of its own records, as the statuses of a case
 * type: a move renumbers the rows and PATCHes only that field, only on the
 * rows that changed; a new row goes last; an order is unique among its
 * siblings when a form saves it.
 *
 * @spec openspec/changes/list-reorder-order-field/specs/object-list-widget/spec.md#requirement-a-list-can-be-reordered-by-its-order-field
 * @spec openspec/changes/list-reorder-order-field/specs/object-list-widget/spec.md#requirement-an-order-is-unique-among-its-siblings
 */
import axios from '@nextcloud/axios'
import { mount, shallowMount } from '@vue/test-utils'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import { moveIndex, renumberRows } from '../../src/utils/reorderRows.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p = {}) => u.replace(/\{(\w+)\}/g, (_, k) => p[k]) }))

const STATUSES = [
	{ id: 's1', name: 'Intake', order: 1, capacity: 5 },
	{ id: 's2', name: 'In behandeling', order: 2 },
	{ id: 's3', name: 'Afgerond', order: 3 },
]
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('renumberRows and moveIndex', () => {
	it('moves an item and renumbers, listing only the rows whose number changed', () => {
		const moved = moveIndex(STATUSES, 2, 0)
		expect(moved.map((r) => r.id)).toEqual(['s3', 's1', 's2'])
		const { rows, changes } = renumberRows(moved, 'order')
		expect(rows.map((r) => r.order)).toEqual([1, 2, 3])
		expect(changes).toEqual([{ id: 's3', value: 1 }, { id: 's1', value: 2 }, { id: 's2', value: 3 }])
		expect(renumberRows(STATUSES, 'order').changes).toEqual([])
		expect(moveIndex(STATUSES, 0, 9)).toEqual(STATUSES)
	})

	it('numbers from the page\'s first place', () => {
		expect(renumberRows([{ id: 'a', order: 1 }], 'order', 26).changes).toEqual([{ id: 'a', value: 26 }])
	})
})

describe('CnObjectListWidget with reorder', () => {
	const mountList = (content = {}) => shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'statusType', columns: [{ key: 'name', label: 'Name' }], reorder: { field: 'order' }, ...content } },
		stubs: { CnDataTable: true },
	})

	beforeEach(() => {
		axios.get.mockReset()
		axios.patch.mockReset()
		axios.get.mockResolvedValue({ data: { results: STATUSES.map((r) => ({ ...r })), total: 3 } })
		axios.patch.mockResolvedValue({ data: {} })
	})

	it('reads the rows in their stored order', async () => {
		mountList()
		await flush()
		expect(axios.get.mock.calls[0][1].params['_order[order]']).toBe('asc')
	})

	it('PATCHes only the order, only on the rows that changed, and says where the row went', async () => {
		const w = mountList()
		await flush()
		await w.vm.moveRowBy(w.vm.rows[1], 1)
		expect(axios.patch.mock.calls).toEqual([
			['/apps/openregister/api/objects/dossiq/statusType/s3', { order: 2 }],
			['/apps/openregister/api/objects/dossiq/statusType/s2', { order: 3 }],
		])
		expect(w.vm.rows.map((r) => r.id)).toEqual(['s1', 's3', 's2'])
		expect(w.vm.reorderStatus).toBe('In behandeling moved to place 3 of 3')
	})

	it('offers Move up and Move down as row actions, and passes a drag on', async () => {
		const w = mountList()
		await flush()
		expect(w.vm.mappedRowActions.map((a) => a.label)).toEqual(['Move up', 'Move down'])
		await w.vm.onRowMove({ from: 0, to: 2 })
		expect(w.vm.rows.map((r) => r.id)).toEqual(['s2', 's3', 's1'])
	})

	it('reads out the server\'s refusal and reads the list again', async () => {
		axios.patch.mockRejectedValueOnce({ response: { data: { message: 'A case type keeps one final status.' } } })
		const w = mountList()
		await flush()
		await w.vm.moveRowBy(w.vm.rows[2], -1)
		expect(w.vm.reorderStatus).toBe('A case type keeps one final status.')
		expect(axios.get).toHaveBeenCalledTimes(2)
	})

	it('puts a new row last', async () => {
		const w = mountList()
		await flush()
		w.vm.createSchema = { properties: { name: {}, order: {} } }
		expect(w.vm.createInitialData.order).toBe(4)
	})

	it('does not reorder without the key', async () => {
		const w = mountList({ reorder: undefined })
		await flush()
		expect(w.vm.reorderField).toBe('')
		expect(w.vm.mappedRowActions).toEqual([])
	})
})

describe('CnDataTable reorderable rows', () => {
	it('emits row-move with the dragged row and both indexes', async () => {
		const w = mount(CnDataTable, { props: { columns: [{ key: 'name', label: 'Name' }], rows: STATUSES, reorderable: true } })
		const rows = w.findAll('[data-testid="cn-object-row"]')
		expect(rows[0].attributes('draggable')).toBe('true')
		await rows[0].trigger('dragstart', { dataTransfer: { setData: () => {} } })
		await rows[2].trigger('dragover')
		await rows[2].trigger('drop')
		expect(w.emitted('row-move')[0][0]).toEqual({ row: STATUSES[0], from: 0, to: 2 })
	})

	it('is not draggable by default', () => {
		const w = mount(CnDataTable, { props: { columns: [{ key: 'name', label: 'Name' }], rows: STATUSES } })
		expect(w.find('[data-testid="cn-object-row"]').attributes('draggable')).toBeUndefined()
	})
})

describe('a unique order in the form', () => {
	const schema = { slug: 'statusType', properties: { name: { type: 'string' }, order: { type: 'integer', title: 'Order' } } }
	const mountForm = (item) => shallowMount(CnFormDialog, {
		propsData: { schema, register: 'dossiq', item, fieldOverrides: { order: { unique: { filter: { caseType: 'ct-1' } } } } },
		stubs: { NcDialog: { template: '<div><slot /></div>' } },
	})

	beforeEach(() => axios.get.mockReset())

	it('refuses an order a sibling has, naming the field', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 's2', order: 2 }] } })
		const w = mountForm({ id: 's1', name: 'Intake', order: 1 })
		w.vm.updateField('order', 2)
		w.vm.executeConfirm()
		await flush()
		await flush()
		expect(axios.get.mock.calls[0][1].params).toMatchObject({ caseType: 'ct-1', order: 2 })
		expect(w.vm.errors.order).toBe('Order is already used; choose another value.')
		expect(w.emitted('confirm')).toBeUndefined()
	})

	it('saves when only the object itself holds the value', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 's1', order: 1 }] } })
		const w = mountForm({ id: 's1', name: 'Intake', order: 1 })
		w.vm.executeConfirm()
		await flush()
		await flush()
		expect(w.vm.errors.order).toBeUndefined()
		expect(w.emitted('confirm')).toHaveLength(1)
	})
})
