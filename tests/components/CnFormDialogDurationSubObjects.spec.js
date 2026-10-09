/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-widgets-duration-and-subobject-table/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'

jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => ({ objectTypeRegistry: {}, errors: {}, createObjectTypeSlug: (a, b) => `${a}-${b}`, registerObjectType: jest.fn(), fetchCollectionForOptions: jest.fn().mockResolvedValue([]), collections: {} }),
}))

import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import { fieldsFromSchema } from '../../src/utils/schema.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	CnDurationField: true,
	CnSubObjectsField: true,
}
const schema = {
	title: 'Case type',
	properties: {
		handlingTerm: { type: 'string', format: 'duration', title: 'Handling term', minimum: 'P1D', maximum: 'P10D' },
		statuses: { type: 'array', 'x-widget': 'sub-objects', title: 'Statuses', items: { type: 'object', required: ['name', 'key'], properties: { name: { type: 'string' }, key: { type: 'string' } } } },
		plain: { type: 'array', title: 'Plain', items: { type: 'object', properties: { a: { type: 'string' } } } },
	},
}

describe('widget selection', () => {
	it('picks duration for format duration and sub-objects only on x-widget', () => {
		const fields = Object.fromEntries(fieldsFromSchema(schema).map((f) => [f.key, f]))
		expect(fields.handlingTerm.widget).toBe('duration')
		expect(fields.statuses.widget).toBe('sub-objects')
		expect(fields.plain.widget).not.toBe('sub-objects')
	})
	it('lets an override name the sub-objects widget', () => {
		const [f] = fieldsFromSchema({ properties: { rows: { type: 'array', items: { type: 'object', properties: {} } } } }, { overrides: { rows: { widget: 'sub-objects' } } })
		expect(f.widget).toBe('sub-objects')
	})
})

describe('CnFormDialog validation', () => {
	const mountIt = () => mount(CnFormDialog, { props: { schema, item: null }, global: { stubs } })

	it('renders both widgets', async () => {
		const w = mountIt()
		await flush()
		expect(w.findComponent({ name: 'CnDurationField' }).exists()).toBe(true)
		expect(w.findComponent({ name: 'CnSubObjectsField' }).exists()).toBe(true)
	})

	it('blocks save naming the row with a missing required value', async () => {
		const w = mountIt()
		await flush()
		w.vm.updateField('statuses', [{ name: 'A', key: 'a' }, { name: 'B' }])
		expect(w.vm.validate()).toBe(false)
		expect(w.vm.errors.statuses).toBe('Row 2: key is required.')
	})

	it('passes complete rows and checks duration bounds', async () => {
		const w = mountIt()
		await flush()
		w.vm.updateField('statuses', [{ name: 'A', key: 'a' }])
		w.vm.updateField('handlingTerm', 'P56D')
		expect(w.vm.validate()).toBe(false)
		expect(w.vm.errors.handlingTerm).toBe('Maximum duration is P10D.')
		w.vm.updateField('handlingTerm', 'P8D')
		expect(w.vm.validate()).toBe(true)
	})
})
