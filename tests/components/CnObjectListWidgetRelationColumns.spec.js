/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectListWidget's relation-column resolution (ADR-062): a column
 * whose schema property is a `$ref` uuid relation must render the referenced
 * object's display NAME (via the built-in `fkResolve` cell widget), not a raw
 * uuid. An explicit per-column widget/formatter/format always wins.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

function mountWidget(propsData = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData,
		stubs: { CnDataTable: true, CnFormDialog: true },
		mocks: { t: (_app, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

const schemaProps = {
	title: { type: 'string', title: 'Title' },
	product: { type: 'string', format: 'uuid', $ref: 'product', title: 'Product' },
	contacts: { type: 'array', items: { $ref: 'contact' }, title: 'Contacts' },
}

describe('CnObjectListWidget — relation column resolution', () => {
	it('auto-assigns the fkResolve widget to a $ref uuid column once the schema loads', async () => {
		const w = mountWidget({
			content: {
				register: 'pipelinq',
				schema: 'leadProduct',
				columns: [{ key: 'title', label: 'Title' }, { key: 'product', label: 'Product' }],
			},
		})
		// Before the schema loads, the relation column stays a plain text column.
		expect(w.vm.resolvedColumns.find((c) => c.key === 'product').widget).toBeUndefined()

		w.vm.schemaProps = schemaProps
		await w.vm.$nextTick()

		const productCol = w.vm.resolvedColumns.find((c) => c.key === 'product')
		expect(productCol.widget).toBe('fkResolve')
		expect(productCol.widgetProps).toEqual({ register: 'pipelinq', schema: 'product', labelField: 'name' })
		// A non-relation column is untouched.
		expect(w.vm.resolvedColumns.find((c) => c.key === 'title').widget).toBeUndefined()
	})

	it('resolves an array-of-refs column too', async () => {
		const w = mountWidget({
			content: { register: 'pipelinq', schema: 'leadProduct', columns: [{ key: 'contacts', label: 'Contacts' }] },
		})
		w.vm.schemaProps = schemaProps
		await w.vm.$nextTick()
		const col = w.vm.resolvedColumns.find((c) => c.key === 'contacts')
		expect(col.widget).toBe('fkResolve')
		expect(col.widgetProps.schema).toBe('contact')
	})

	it('does not override an explicit column widget/formatter', async () => {
		const w = mountWidget({
			content: {
				register: 'pipelinq',
				schema: 'leadProduct',
				columns: [{ key: 'product', label: 'Product', widget: 'badge' }],
			},
		})
		w.vm.schemaProps = schemaProps
		await w.vm.$nextTick()
		expect(w.vm.resolvedColumns.find((c) => c.key === 'product').widget).toBe('badge')
	})
})
