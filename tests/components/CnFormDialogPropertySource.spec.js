/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-field-property-source/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'

jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => ({ objectTypeRegistry: {}, errors: {}, createObjectTypeSlug: (a, b) => `${a}-${b}`, registerObjectType: jest.fn(), fetchCollectionForOptions: jest.fn().mockResolvedValue([]), collections: {} }),
}))

import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	CnPropertySourceField: true,
	CnReplaceValuesDialog: true,
}

function schemaFor(mode) {
	return {
		title: 'Payee',
		properties: {
			kvkNumber: { type: 'string', title: 'KvK number', 'x-openregister-property-source': { provider: 'kvk', mode, config: { fill: { name: 'naam', tradingName: 'handelsnamen[0].naam', 'address.country': '=NL' } } } },
			name: { type: 'string', title: 'Name' },
			tradingName: { type: 'string', title: 'Trading name' },
			address: { type: 'object', title: 'Address', widget: 'json' },
		},
	}
}
const answer = { value: { naam: 'Eneco Energie B.V.', handelsnamen: [{ naam: 'Eneco' }] } }
const mountIt = (mode) => mount(CnFormDialog, { props: { schema: schemaFor(mode), item: null }, global: { stubs } })

describe('CnFormDialog: property-source fill', () => {
	it('renders the property-source widget', async () => {
		const w = mountIt('default')
		await flush()
		expect(w.findComponent({ name: 'CnPropertySourceField' }).exists()).toBe(true)
	})

	it('fills empty siblings including a dotted literal, without asking', async () => {
		const w = mountIt('default')
		await flush()
		const field = w.vm.visibleFields.find((f) => f.key === 'kvkNumber')
		await w.vm.onPropertySourceResolved(field, answer)
		expect(w.vm.formData.name).toBe('Eneco Energie B.V.')
		expect(w.vm.formData.tradingName).toBe('Eneco')
		expect(w.vm.formData.address).toEqual({ country: 'NL' })
		expect(w.vm.pendingReplace).toBeNull()
	})

	it('asks before replacing a typed value, and keeps it on decline while filling the rest', async () => {
		const w = mountIt('default')
		await flush()
		w.vm.updateField('name', 'Eneco')
		const field = w.vm.visibleFields.find((f) => f.key === 'kvkNumber')
		const done = w.vm.onPropertySourceResolved(field, answer)
		await flush()
		expect(w.vm.pendingReplace.changes).toHaveLength(1)
		expect(w.vm.pendingReplace.changes[0]).toMatchObject({ key: 'name', label: 'Name', oldValue: 'Eneco', newValue: 'Eneco Energie B.V.' })
		w.vm.resolveReplace(false)
		await done
		expect(w.vm.formData.name).toBe('Eneco')
		expect(w.vm.formData.tradingName).toBe('Eneco')
	})

	it('replaces the typed value on accept', async () => {
		const w = mountIt('default')
		await flush()
		w.vm.updateField('name', 'Eneco')
		const field = w.vm.visibleFields.find((f) => f.key === 'kvkNumber')
		const done = w.vm.onPropertySourceResolved(field, answer)
		await flush()
		w.vm.resolveReplace(true)
		await done
		expect(w.vm.formData.name).toBe('Eneco Energie B.V.')
	})

	it('fills nothing in mode live', async () => {
		const w = mountIt('live')
		await flush()
		const field = w.vm.visibleFields.find((f) => f.key === 'kvkNumber')
		await w.vm.onPropertySourceResolved(field, answer)
		expect(w.vm.formData.name || '').toBe('')
	})
})
