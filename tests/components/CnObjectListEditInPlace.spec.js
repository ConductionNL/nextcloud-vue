/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What the case type page needs to drop its rehosted editors: a list that
 * edits a row in its own form and saves only the keys the form changed, a
 * declared patch that writes only its values, and a select whose options
 * follow another field (a property type's formats).
 *
 * @spec openspec/changes/object-list-edit-in-place/specs/object-list-widget/spec.md#requirement-a-list-can-edit-a-row-in-its-own-form
 */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'
import { formTokenKeys, loadOptionsFrom, resolveFormTokens } from '../../src/utils/optionsFrom.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn(), post: jest.fn(), delete: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p = {}) => u.replace(/\{(\w+)\}/g, (_, k) => p[k]) }))

const STATUS = { id: 's1', name: 'Intake', order: 1, capacity: 5, phaseTermDays: 10 }
const VOCAB = { types: [
	{ type: 'string', category: 'Text', formats: ['email', 'uri'] },
	{ type: 'integer', category: 'Numbers', formats: [] },
] }
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('a list that edits a row in its own form', () => {
	const mountList = (content = {}) => shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'statusType', columns: [{ key: 'name' }], editable: true, ...content } },
		stubs: { CnDataTable: true, CnFormDialog: { name: 'CnFormDialog', methods: { setResult() {} }, template: '<div />' } },
	})

	beforeEach(() => {
		axios.get.mockReset()
		axios.patch.mockReset()
		axios.get.mockImplementation(async (url) => (url.includes('/schemas/') ? { data: { slug: 'statusType', properties: { name: {}, order: {}, capacity: {} } } } : { data: { results: [STATUS], total: 1 } }))
		axios.patch.mockResolvedValue({ data: {} })
	})

	it('offers Edit and opens the form on the row', async () => {
		const w = mountList()
		await flush()
		expect(w.vm.mappedRowActions[0].label).toBe('Edit')
		await w.vm.openEdit(STATUS)
		expect(w.vm.editingRow).toEqual(STATUS)
		expect(w.vm.editingRow).not.toBe(STATUS)
	})

	it('PATCHes only the keys the form changed, so capacity survives', async () => {
		const w = mountList()
		await flush()
		await w.vm.openEdit(STATUS)
		await w.vm.onEditConfirm({ name: 'Intake en triage', order: 1 })
		expect(axios.patch).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/statusType/s1', { name: 'Intake en triage' })
		expect(w.emitted('updated')[0][0]).toEqual({ id: 's1', changes: { name: 'Intake en triage' } })
	})

	it('writes nothing when nothing changed', async () => {
		const w = mountList()
		await flush()
		await w.vm.openEdit(STATUS)
		await w.vm.onEditConfirm({ name: 'Intake' })
		expect(axios.patch).not.toHaveBeenCalled()
	})

	it('deletes a row of its own schema with deletable', async () => {
		axios.delete.mockResolvedValue({})
		const w = mountList({ deletable: true, feedback: false })
		await flush()
		const del = w.vm.mappedRowActions.find((a) => a.label === 'Delete')
		expect(del.destructive).toBe(true)
		await del.handler(STATUS)
		expect(axios.delete).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/statusType/s1')
	})

	it('offers no Edit without editable', async () => {
		const w = mountList({ editable: undefined })
		await flush()
		expect(w.vm.mappedRowActions).toEqual([])
	})
})

describe('a declared patch', () => {
	it('writes only its values through patchObject', async () => {
		const store = { saveObject: jest.fn(), deleteObject: jest.fn(), patchObject: jest.fn(async () => ({})), registerObjectType: jest.fn(), objectTypeRegistry: {} }
		await dispatchAction({ type: 'object-op', op: 'patch', values: { isFinal: true } }, { objectStore: store, source: { register: 'dossiq', schema: 'statusType' }, row: STATUS })
		expect(store.patchObject).toHaveBeenCalledWith(expect.any(String), 's1', { isFinal: true })
		expect(store.saveObject).not.toHaveBeenCalled()
	})
})

describe('options that follow another field', () => {
	it('fills @answer tokens and lists the keys it reads', () => {
		const from = { url: '/v', where: { type: '@answer.propertyType' }, itemsPath: 'formats' }
		expect(resolveFormTokens(from, { propertyType: 'string' }).where).toEqual({ type: 'string' })
		expect(formTokenKeys(from)).toEqual(['propertyType'])
	})

	it('narrows the rows by where and reads the list at itemsPath', async () => {
		axios.get.mockResolvedValueOnce({ data: VOCAB })
		const options = await loadOptionsFrom({ url: '/apps/openregister/api/schemas/property-vocabulary', responsePath: 'types', where: { type: 'string' }, itemsPath: 'formats' })
		expect(options.map((o) => o.id)).toEqual(['email', 'uri'])
	})

	it('reads the source again when the field changes, and hides an empty one', async () => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: VOCAB })
		const schema = { properties: { propertyType: { type: 'string', enum: ['string', 'integer'] }, format: { type: 'string' } } }
		const fieldOverrides = { format: { optionsFrom: { url: '/apps/openregister/api/schemas/property-vocabulary', responsePath: 'types', where: { type: '@answer.propertyType' }, itemsPath: 'formats', hideWhenEmpty: true } } }
		const w = shallowMount(CnFormDialog, { propsData: { schema, item: { id: 'p1', propertyType: 'string' }, fieldOverrides }, stubs: { NcDialog: { template: '<div><slot /></div>' } } })
		await flush()
		await flush()
		const format = () => w.vm.resolvedFields.find((f) => f.key === 'format')
		expect(w.vm.getEffectiveOptions(format()).map((o) => o.id)).toEqual(['email', 'uri'])
		w.vm.updateField('propertyType', 'integer')
		await flush()
		await flush()
		expect(w.vm.visibleFields.map((f) => f.key)).not.toContain('format')
	})
})
