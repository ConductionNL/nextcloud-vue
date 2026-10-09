/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-child-records-table/tasks.md#task-2
 * @spec openspec/changes/form-child-records-table/tasks.md#task-4
 */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnChildRecordsField from '../../src/components/CnChildRecordsField/CnChildRecordsField.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const SCHEMA = { required: ['product', 'qty', 'order'], properties: { product: { title: 'Product', type: 'string' }, qty: { title: 'Quantity', type: 'integer' }, order: { type: 'string' } } }
const config = { schema: 'order-line', parentField: 'order' }

async function mountField(propsData = {}, children = []) {
	axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/schemas/') ? SCHEMA : { results: children, total: children.length } }))
	const w = shallowMount(CnChildRecordsField, {
		propsData: { config, register: 'shop', ...propsData },
		stubs: { NcTextField: { props: ['modelValue', 'label'], template: '<input :aria-label="label" :value="modelValue" />' }, NcButton: { template: '<button><slot /></button>' }, NcLoadingIcon: true },
	})
	await new Promise((resolve) => setTimeout(resolve, 0))
	return w
}

describe('CnChildRecordsField', () => {
	beforeEach(() => axios.get.mockClear())

	it('shows the required child properties as columns, without the parent reference', async () => {
		const w = await mountField()
		expect(w.findAll('th').map((th) => th.text()).slice(0, 2)).toEqual(['Product', 'Quantity'])
	})

	it('loads the children of an existing parent and reports them as loaded', async () => {
		const w = await mountField({ parentId: 'o-1' }, [{ id: 1, product: 'a', qty: 2 }])
		expect(axios.get.mock.calls.some(([u]) => u.includes('order=o-1'))).toBe(true)
		expect(w.emitted('loaded')[0][0]).toEqual([{ id: 1, product: 'a', qty: 2 }])
		expect(w.emitted('update:modelValue')[0][0]).toEqual([{ id: 1, product: 'a', qty: 2 }])
	})

	it('does not load for a new parent', async () => {
		const w = await mountField()
		expect(axios.get.mock.calls.every(([u]) => u.includes('/schemas/'))).toBe(true)
		expect(w.emitted('loaded')).toBeUndefined()
	})

	it('adds, edits inline and removes rows', async () => {
		const w = await mountField({ modelValue: [{ product: 'a', qty: 1 }, { product: 'b', qty: 2 }] })
		w.vm.addRow()
		expect(w.emitted('update:modelValue').pop()[0]).toHaveLength(3)
		w.vm.setCell(0, { key: 'qty', numeric: true }, '5')
		expect(w.emitted('update:modelValue').pop()[0][0]).toEqual({ product: 'a', qty: 5 })
		w.vm.removeRow(1)
		expect(w.emitted('update:modelValue').pop()[0]).toEqual([{ product: 'a', qty: 1 }])
	})

	it('names the row and field of a failing row', async () => {
		const w = await mountField({ modelValue: [{ product: 'a', qty: 1 }, { qty: 2 }] })
		expect(w.find('[role="alert"]').text()).toBe('Row 2 needs a value for Product.')
		expect(w.emitted('validity').pop()[0]).toEqual([{ row: 2, field: 'product', label: 'Product' }])
	})

	it('says how many rows there are beyond the first page', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/schemas/') ? SCHEMA : { results: [{ id: 1, product: 'a', qty: 1 }], total: 80 } }))
		const w = shallowMount(CnChildRecordsField, { propsData: { config, register: 'shop', parentId: 'o-1', modelValue: [{ id: 1, product: 'a', qty: 1 }] }, stubs: { NcTextField: true, NcButton: true, NcLoadingIcon: true } })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(w.find('[data-testid="cn-child-records-more"]').text()).toContain('80')
	})
})
