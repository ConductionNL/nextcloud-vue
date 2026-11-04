/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/child-records-totals/tasks.md#task-1
 * @spec openspec/changes/child-records-totals/tasks.md#task-2
 * @spec openspec/changes/child-records-totals/tasks.md#task-3
 */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnChildRecordsField from '../../src/components/CnChildRecordsField/CnChildRecordsField.vue'
import { computeRow, computeTotals, rowFromSource, storeComputed } from '../../src/utils/childRecordTotals.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const SCHEMA = {
	required: ['product', 'qty', 'price', 'order'],
	properties: {
		product: { title: 'Product', type: 'string' },
		qty: { title: 'Quantity', type: 'number' },
		price: { title: 'Price', type: 'number' },
		discount: { title: 'Discount', type: 'number' },
		vatRate: { title: 'VAT rate', type: 'number' },
		lineTotal: { title: 'Line total', type: 'number' },
		order: { type: 'string' },
	},
}

const computed = [{ key: 'lineTotal', label: 'Line total', formula: 'qty * price * (1 - discount / 100)', decimals: 2, store: true }]
const totals = [
	{ key: 'subtotal', label: 'Subtotal', sum: 'lineTotal' },
	{ key: 'tax', label: 'Tax', sum: 'lineTotal * vatRate / 100' },
	{ key: 'total', label: 'Total', formula: 'subtotal + tax', emphasis: true },
]
const ROWS = [
	{ product: 'a', qty: 2, price: 10, discount: 0, vatRate: 21 },
	{ product: 'b', qty: 1, price: 50, discount: 10, vatRate: 9 },
]

/**
 * Mount the field with a mocked API.
 *
 * @param {object} config Extra relation config.
 * @param {object} propsData Extra props.
 * @param {Function} [sources] Answers a source objects request.
 * @return {Promise<object>} The wrapper.
 */
async function mountField(config = {}, propsData = {}, sources = () => ({ results: [] })) {
	axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/schemas/') ? SCHEMA : sources(url) }))
	const w = shallowMount(CnChildRecordsField, {
		propsData: { config: { schema: 'order-line', parentField: 'order', columns: ['product', 'qty', 'price'], ...config }, register: 'shop', ...propsData },
		stubs: {
			NcTextField: { props: ['modelValue', 'label'], template: '<input :aria-label="label" :value="modelValue" />' },
			NcButton: { template: '<button><slot /></button>' },
			NcLoadingIcon: true,
			CnSearchSelect: { props: ['options', 'inputLabel'], template: '<div class="pick">{{ inputLabel }}</div>' },
		},
	})
	await new Promise((resolve) => setTimeout(resolve, 0))
	return w
}

describe('childRecordTotals', () => {
	it('computes a row in order, so a later column can name an earlier one', () => {
		const cols = [...computed, { key: 'tax', formula: 'lineTotal * vatRate / 100' }]
		expect(computeRow(ROWS[1], cols)).toEqual({ lineTotal: 45, tax: 4.05 })
	})

	it('treats an empty value as 0, so a new row computes', () => {
		expect(computeRow({ qty: 3 }, computed)).toEqual({ lineTotal: 0 })
	})

	it('sums over the rows and computes a total from the totals before it', () => {
		const out = computeTotals(ROWS, totals, computed)
		expect(out.subtotal).toBe(65)
		expect(out.tax).toBeCloseTo(8.25)
		expect(out.total).toBeCloseTo(73.25)
	})

	it('writes only the stored computed columns into a row', () => {
		expect(storeComputed({ qty: 2, price: 3 }, computed)).toEqual({ qty: 2, price: 3, lineTotal: 6 })
		expect(storeComputed({ qty: 2 }, [{ key: 'x', formula: 'qty' }])).toEqual({ qty: 2 })
	})

	it('maps a source record onto a row, with @id for its id', () => {
		expect(rowFromSource({ id: 'p1', name: 'Pen', unitPrice: 2 }, { product: '@id', price: 'unitPrice', note: 'missing' }))
			.toEqual({ product: 'p1', price: 2, note: null })
	})
})

describe('CnChildRecordsField computed columns and totals', () => {
	it('shows a computed column after the plain ones, read only', async () => {
		const w = await mountField({ computed }, { modelValue: ROWS })
		expect(w.findAll('thead th').map((th) => th.text()).slice(0, 4)).toEqual(['Product', 'Quantity', 'Price', 'Line total'])
		expect(w.findAll('[data-testid="cn-child-records-computed"]').map((c) => c.text())).toEqual(['20.00', '45.00'])
	})

	it('draws the totals under the table and emits them', async () => {
		const w = await mountField({ computed, totals }, { modelValue: ROWS })
		const rows = w.findAll('[data-testid="cn-child-records-total"]')
		expect(rows.map((r) => r.find('th').text())).toEqual(['Subtotal', 'Tax', 'Total'])
		expect(rows.map((r) => r.find('[data-testid="cn-child-records-total-value"]').text())).toEqual(['65.00', '8.25', '73.25'])
		expect(rows[2].classes()).toContain('cn-child-records-field__total--emphasis')
		expect(w.emitted('totals').pop()[0].total).toBeCloseTo(73.25)
	})

	it('writes a stored computed value when a cell changes', async () => {
		const w = await mountField({ computed }, { modelValue: ROWS })
		w.vm.setCell(0, { key: 'qty', numeric: true }, '3')
		expect(w.emitted('update:modelValue').pop()[0][0]).toMatchObject({ qty: 3, lineTotal: 30 })
	})

	it('draws no footer without totals', async () => {
		const w = await mountField({}, { modelValue: ROWS })
		expect(w.find('tfoot').exists()).toBe(false)
		expect(w.emitted('totals')).toBeUndefined()
	})
})

describe('CnChildRecordsField addFrom', () => {
	const addFrom = { schema: 'product', label: 'Add a product', map: { product: '@id', price: 'unitPrice' }, codeField: 'barcode' }
	const pen = { id: 'p1', name: 'Pen', unitPrice: 2, barcode: '871' }

	it('searches the source and adds a row from the picked record', async () => {
		const w = await mountField({ addFrom, computed }, { modelValue: [] }, () => ({ results: [pen] }))
		expect(w.find('.pick').text()).toBe('Add a product')
		await w.vm.searchSource('pe')
		expect(axios.get.mock.calls.some(([u]) => u.includes('/objects/shop/product?') && u.includes('_search=pe'))).toBe(true)
		w.vm.addFromPicked('p1')
		expect(w.emitted('update:modelValue').pop()[0]).toEqual([{ product: 'p1', price: 2, lineTotal: 0 }])
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-child-records-status"]').text()).toBe('Added Pen.')
	})

	it('adds a row by a typed or scanned code and clears the field', async () => {
		const w = await mountField({ addFrom }, { modelValue: [] }, (url) => ({ results: url.includes('barcode=871') ? [pen] : [] }))
		w.vm.code = '871'
		await w.vm.addByCode()
		expect(w.emitted('update:modelValue').pop()[0]).toEqual([{ product: 'p1', price: 2 }])
		expect(w.vm.code).toBe('')
	})

	it('says so when no record has the code, and adds nothing', async () => {
		const w = await mountField({ addFrom }, { modelValue: [] })
		w.vm.code = '999'
		await w.vm.addByCode()
		await w.vm.$nextTick()
		expect(w.emitted('update:modelValue')).toBeUndefined()
		expect(w.find('[role="alert"]').text()).toBe('No record has the code 999.')
	})

	it('refuses a code that more than one record has', async () => {
		const w = await mountField({ addFrom }, { modelValue: [] }, () => ({ results: [pen, { ...pen, id: 'p2' }] }))
		w.vm.code = '871'
		await w.vm.addByCode()
		expect(w.emitted('update:modelValue')).toBeUndefined()
		expect(w.vm.addError).toBe('More than one record has the code 871.')
	})

	it('keeps Add row next to the source unless freeRows is false', async () => {
		const w = await mountField({ addFrom }, { modelValue: [] })
		expect(w.find('[data-testid="cn-child-records-add"]').exists()).toBe(true)
		const only = await mountField({ addFrom: { ...addFrom, freeRows: false } }, { modelValue: [] })
		expect(only.find('[data-testid="cn-child-records-add"]').exists()).toBe(false)
	})
})
