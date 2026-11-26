/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChildRecordsField `addFrom.resolve`: a row added from a product asks the
 * app for the price for its quantity, the unit and the VAT rate; a quantity
 * change asks again; a price the user typed is kept.
 *
 * @spec openspec/changes/child-records-resolve/tasks.md#task-1
 * @spec openspec/changes/child-records-resolve/tasks.md#task-2
 */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnChildRecordsField from '../../src/components/CnChildRecordsField/CnChildRecordsField.vue'
import { patchFromAnswer, resolveBody, shouldResolveAgain, sourceIdKey } from '../../src/utils/childRecordResolve.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const SCHEMA = {
	required: ['product', 'quantity'],
	properties: {
		product: { type: 'string' },
		name: { type: 'string' },
		quantity: { type: 'number' },
		unitPrice: { type: 'number' },
		unit: { type: 'string' },
		vatRate: { type: 'number' },
		lead: { type: 'string' },
	},
}

const PRODUCT = {
	id: 'p-1',
	name: 'Licence',
	unitPrice: 100,
	unit: 'piece',
	priceTiers: [{ minQuantity: 10, unitPrice: 80, label: '10+' }],
}

const RESOLVE = {
	url: '/apps/shop/api/products/resolve-price',
	body: { product: '@source', quantity: '@row.quantity' },
	map: { unitPrice: 'unitPrice', vatRate: 'taxRate' },
	when: ['quantity'],
}

const ADD_FROM = {
	schema: 'product',
	register: 'shop',
	map: { product: '@id', name: 'name', unitPrice: 'unitPrice', unit: 'unit' },
	resolve: RESOLVE,
}

/**
 * The answer resolve-price gives: a tier price from 10 pieces, else the base price.
 *
 * @param {object} body The posted body.
 * @return {object} The answer.
 */
function priceAnswer(body) {
	const quantity = body.quantity ?? 1
	const tier = quantity >= 10
	return { unitPrice: tier ? 80 : 100, source: tier ? 'tier' : 'base', tierLabel: tier ? '10+' : null, quantity, taxRate: 21, btwClass: 'high' }
}

/**
 * Mount the field the way a parent with v-model would, so each emit becomes the new modelValue.
 *
 * @param {object[]} rows The starting rows.
 * @return {Promise<object>} The wrapper.
 */
async function mountField(rows = []) {
	axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/schemas/') ? SCHEMA : (url.endsWith('/p-1') ? PRODUCT : { results: [] }) }))
	axios.post.mockImplementation((url, body) => Promise.resolve({ data: priceAnswer(body) }))
	const w = shallowMount(CnChildRecordsField, {
		props: {
			modelValue: rows,
			config: { schema: 'lead-line', parentField: 'lead', columns: ['name', 'quantity', 'unitPrice'], addFrom: ADD_FROM },
			register: 'shop',
			'onUpdate:modelValue': (value) => w.setProps({ modelValue: value }),
		},
		global: {
			stubs: {
				NcTextField: { props: ['modelValue', 'label'], template: '<input :aria-label="label" :value="modelValue" />' },
				NcButton: { template: '<button><slot /></button>' },
				NcLoadingIcon: true,
				CnSearchSelect: { props: ['options', 'inputLabel'], template: '<div class="pick">{{ inputLabel }}</div>' },
			},
		},
	})
	await flush()
	return w
}

/**
 * Let pending promises settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe('childRecordResolve helpers', () => {
	it('fills the body from the source and the row, and leaves an empty row value out', () => {
		expect(resolveBody({ product: '@source', sku: '@source.sku', quantity: '@row.quantity', currency: 'EUR' }, { source: { sku: 'A1' }, row: {} }))
			.toEqual({ product: { sku: 'A1' }, sku: 'A1', currency: 'EUR' })
	})

	it('writes only the answer keys that are there', () => {
		expect(patchFromAnswer({ unitPrice: 80, taxRate: null }, { unitPrice: 'unitPrice', vatRate: 'taxRate' })).toEqual({ unitPrice: 80 })
		expect(patchFromAnswer(null, { unitPrice: 'unitPrice' })).toEqual({})
	})

	it('asks again when a when-key changes, not when the user typed a price of their own', () => {
		expect(shouldResolveAgain({ quantity: 1 }, { quantity: 12 }, RESOLVE)).toBe(true)
		expect(shouldResolveAgain({ quantity: 1, unitPrice: 100 }, { quantity: 12, unitPrice: 95 }, RESOLVE)).toBe(false)
		expect(shouldResolveAgain({ quantity: 1, unitPrice: 100 }, { quantity: 1, unitPrice: 95 }, RESOLVE)).toBe(false)
	})

	it('finds the row key that holds the source id', () => {
		expect(sourceIdKey(ADD_FROM.map)).toBe('product')
		expect(sourceIdKey({ name: 'name' })).toBeNull()
	})
})

describe('CnChildRecordsField addFrom.resolve', () => {
	it('fills the base price and the VAT rate from the resolver when a product is added', async () => {
		const w = await mountField()
		await w.vm.addSourceRow(PRODUCT)
		await flush()

		expect(axios.post).toHaveBeenCalledWith('/apps/shop/api/products/resolve-price', { product: PRODUCT })
		expect(w.props('modelValue')).toEqual([{ product: 'p-1', name: 'Licence', unitPrice: 100, unit: 'piece', vatRate: 21 }])
	})

	it('asks again with the new quantity and takes the tier price', async () => {
		const w = await mountField([{ product: 'p-1', name: 'Licence', quantity: 1, unitPrice: 100, unit: 'piece', vatRate: 21 }])
		w.vm.editing = 0
		w.vm.onRowConfirm({ quantity: 12 })
		await flush()

		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/shop/product/p-1')
		expect(axios.post).toHaveBeenLastCalledWith('/apps/shop/api/products/resolve-price', { product: PRODUCT, quantity: 12 })
		expect(w.props('modelValue')[0]).toMatchObject({ quantity: 12, unitPrice: 80, vatRate: 21 })
	})

	it('keeps a price the user typed in the same edit', async () => {
		const w = await mountField([{ product: 'p-1', name: 'Licence', quantity: 1, unitPrice: 100, unit: 'piece', vatRate: 21 }])
		w.vm.editing = 0
		w.vm.onRowConfirm({ quantity: 12, unitPrice: 95 })
		await flush()

		expect(axios.post).not.toHaveBeenCalled()
		expect(w.props('modelValue')[0]).toMatchObject({ quantity: 12, unitPrice: 95 })
	})

	it('asks again shortly after a quantity is typed into the cell', async () => {
		const w = await mountField([{ product: 'p-1', name: 'Licence', quantity: 1, unitPrice: 100, unit: 'piece', vatRate: 21 }])
		jest.useFakeTimers()
		try {
			w.vm.setCell(0, { key: 'quantity', numeric: true }, '15')
			await w.vm.$nextTick()
			w.vm.setCell(0, { key: 'quantity', numeric: true }, '15')
			await w.vm.$nextTick()
			expect(axios.post).not.toHaveBeenCalled()
			jest.advanceTimersByTime(400)
		} finally {
			jest.useRealTimers()
		}
		await flush()

		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(w.props('modelValue')[0]).toMatchObject({ quantity: 15, unitPrice: 80 })
	})

	it('keeps the row and says so when the resolver fails', async () => {
		const w = await mountField()
		axios.post.mockImplementationOnce(() => Promise.reject(new Error('down')))
		await w.vm.addSourceRow(PRODUCT)
		await flush()

		expect(w.props('modelValue')).toEqual([{ product: 'p-1', name: 'Licence', unitPrice: 100, unit: 'piece' }])
		expect(w.vm.addError).toBe('The values for this row could not be worked out. It keeps the values it had.')
	})

	it('does nothing extra without resolve', async () => {
		const w = await mountField()
		await w.setProps({ config: { schema: 'lead-line', parentField: 'lead', addFrom: { ...ADD_FROM, resolve: undefined } } })
		await w.vm.addSourceRow(PRODUCT)
		await flush()

		expect(axios.post).not.toHaveBeenCalled()
		expect(w.props('modelValue')).toHaveLength(1)
	})
})
