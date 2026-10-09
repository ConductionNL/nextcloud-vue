/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-child-records-table/tasks.md#task-3
 * @spec openspec/changes/form-child-records-table/tasks.md#task-4
 */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(() => Promise.resolve({ data: {} })) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const schema = {
	title: 'Order',
	properties: {
		name: { type: 'string', title: 'Name' },
		lines: { type: 'array', items: { $ref: 'order-line' }, inversedBy: 'order', title: 'Lines' },
	},
}

function mountForm() {
	return shallowMount(CnFormDialog, { propsData: { schema, register: 'shop' }, stubs: { NcDialog: { template: '<div><slot /><slot name="actions" /></div>' }, CnChildRecordsField: true } })
}

describe('CnFormDialog child records', () => {
	beforeEach(() => axios.post.mockClear())

	it('keeps the children out of the parent payload', () => {
		const w = mountForm()
		w.vm.updateField('name', 'Order 1')
		w.vm.updateField('lines', [{ product: 'a' }])
		w.vm.executeConfirm()
		const payload = w.emitted('confirm')[0][0]
		expect(payload.name).toBe('Order 1')
		expect(payload).not.toHaveProperty('lines')
	})

	it('blocks the submit and names the row when a row is invalid', () => {
		const w = mountForm()
		w.vm.updateField('lines', [{}])
		w.vm.childProblems = { lines: [{ row: 1, field: 'product', label: 'Product' }] }
		w.vm.executeConfirm()
		expect(w.emitted('confirm')).toBeUndefined()
		expect(w.vm.errors.lines).toBe('Row 1 needs a value for Product.')
	})

	it('saves the children after the parent is saved, in two requests', async () => {
		const w = mountForm()
		w.vm.childOriginals = { lines: [{ id: 1, product: 'x' }] }
		w.vm.updateField('lines', [{ product: 'new' }])
		await w.vm.setResult({ success: true, id: 'o-9' })
		expect(axios.post).toHaveBeenCalledTimes(2)
		expect(axios.post.mock.calls[0][1].objects).toEqual([{ product: 'new', order: 'o-9' }])
		expect(w.vm.result.success).toBe(true)
	})

	it('names rows that were not saved and keeps the parent saved', async () => {
		axios.post.mockRejectedValueOnce({ response: { status: 403 } })
		const w = mountForm()
		w.vm.updateField('lines', [{ product: 'new' }])
		await w.vm.setResult({ success: true, id: 'o-9' })
		expect(w.vm.result.success).toBe(true)
		expect(w.vm.result.error).toContain('You may not write these rows.')
	})
})
