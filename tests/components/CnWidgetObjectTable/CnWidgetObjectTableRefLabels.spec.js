/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard table shows the label of the object a column references
 * (dashboard-table-reference-labels). Board ShDebiteurenbeheer lists open
 * invoices by customer name; the invoice holds the customer's id.
 */
import { shallowMount } from '@vue/test-utils'

jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(),
}))

const { useObjectStore } = require('../../../src/store/useObjectStore.js')
const CnWidgetObjectTable = require('../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default

function makeStore(schema) {
	return {
		objectTypeRegistry: {},
		errors: {},
		registerObjectType: jest.fn(function(slug, schemaId, registerId) {
			this.objectTypeRegistry[slug] = { schema: schemaId, register: registerId }
		}),
		fetchSchema: jest.fn().mockResolvedValue(schema),
	}
}

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

function columnsOf(wrapper) {
	return wrapper.findComponent({ name: 'CnDataTable' }).props('columns')
}

const SOURCE = { register: 'shillinq', schema: 'ARInvoice' }

describe('CnWidgetObjectTable reference labels', () => {
	it('renders a column with resolve as an fkResolve cell, without reading the schema', async () => {
		const store = makeStore(null)
		useObjectStore.mockReturnValue(store)
		const wrapper = shallowMount(CnWidgetObjectTable, {
			props: { source: SOURCE, columns: [{ key: 'customerId', label: 'Customer', labelField: 'legalName', resolve: { register: 'shillinq', schema: 'CustomerMaster' } }, { key: 'invoiceNumber', label: 'Invoice' }] },
		})
		await flush()
		const cols = columnsOf(wrapper)
		expect(cols[0]).toMatchObject({ key: 'customerId', widget: 'fkResolve', widgetProps: { register: 'shillinq', schema: 'CustomerMaster', labelField: 'legalName' } })
		expect(cols[1]).toEqual({ key: 'invoiceNumber', label: 'Invoice' })
		expect(store.fetchSchema).not.toHaveBeenCalled()
	})

	// The $ref becomes the slug the index page's label columns use as well.
	it('reads the target off the source schema $ref when the column names none', async () => {
		const store = makeStore({ properties: { customerId: { type: 'string', $ref: 'CustomerMaster' } } })
		useObjectStore.mockReturnValue(store)
		const wrapper = shallowMount(CnWidgetObjectTable, {
			props: { source: SOURCE, columns: [{ key: 'customerId', label: 'Customer', labelField: 'legalName' }] },
		})
		await flush()
		expect(store.fetchSchema).toHaveBeenCalledWith('shillinq/ARInvoice')
		expect(columnsOf(wrapper)[0]).toMatchObject({ widget: 'fkResolve', widgetProps: { register: 'shillinq', schema: 'customer-master', labelField: 'legalName' } })
	})

	it('keeps the raw column when the property references nothing, and leaves a cell widget alone', async () => {
		useObjectStore.mockReturnValue(makeStore({ properties: { customerId: { type: 'string' } } }))
		const badge = { key: 'state', widget: 'badge', labelField: 'x' }
		const wrapper = shallowMount(CnWidgetObjectTable, {
			props: { source: SOURCE, columns: [{ key: 'customerId', labelField: 'legalName' }, badge] },
		})
		await flush()
		const cols = columnsOf(wrapper)
		expect(cols[0]).toEqual({ key: 'customerId', labelField: 'legalName' })
		expect(cols[1]).toEqual(badge)
	})
})
