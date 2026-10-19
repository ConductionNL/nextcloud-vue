/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A form field at a dotted path (`handling.teams`): one key inside an object
 * property, edited on its own while the object's other keys survive. Also an
 * object property a field override gives a widget, which is no longer dropped.
 *
 * @spec openspec/changes/forms-dotted-path-fields/specs/form-dialog/spec.md#requirement-a-field-can-edit-one-key-inside-an-object-property
 */
import { shallowMount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'
import { foldDottedFields, isDottedKey, spreadDottedFields } from '../../src/utils/dottedFields.js'
import { fieldsFromSchema } from '../../src/utils/schema.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(async () => ({ data: {} })) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const SCHEMA = {
	properties: {
		name: { type: 'string', title: 'Name' },
		handling: {
			type: 'object',
			required: ['teams'],
			properties: {
				teams: { type: 'array', title: 'Teams', items: { type: 'string' } },
				deadline: { type: 'integer', title: 'Deadline' },
			},
		},
		settings: { type: 'object', properties: { a: { type: 'string' } } },
	},
}
const CASE_TYPE = { id: 'ct', name: 'Woo', handling: { teams: ['woo'], deadline: 28 }, settings: { a: 'x' } }

describe('the dotted-field helpers', () => {
	it('recognise a dotted key', () => {
		expect(isDottedKey('handling.teams')).toBe(true)
		expect(isDottedKey('name')).toBe(false)
		expect(isDottedKey('.x')).toBe(false)
	})

	it('read a dotted value out, and fold it back next to the object\'s other keys', () => {
		const fields = [{ key: 'handling.teams' }]
		const open = spreadDottedFields(CASE_TYPE, fields)
		expect(open['handling.teams']).toEqual(['woo'])
		const saved = foldDottedFields({ ...open, 'handling.teams': ['woo', 'avg'] }, fields)
		expect(saved.handling).toEqual({ teams: ['woo', 'avg'], deadline: 28 })
		expect(Object.keys(saved)).not.toContain('handling.teams')
	})

	it('create the object when it is missing', () => {
		expect(foldDottedFields({ 'handling.teams': ['a'] }, [{ key: 'handling.teams' }])).toEqual({ handling: { teams: ['a'] } })
	})
})

describe('fieldsFromSchema', () => {
	it('builds a field for a dotted override key, with the nested property\'s widget and required', () => {
		const fields = fieldsFromSchema(SCHEMA, { overrides: { 'handling.teams': { label: 'Teams that handle it' } } })
		const teams = fields.find((f) => f.key === 'handling.teams')
		expect(teams).toMatchObject({ label: 'Teams that handle it', type: 'array', required: true })
		expect(fields.find((f) => f.key === 'handling')).toBeUndefined()
	})

	it('builds one for a dotted include key, and none for a path that names nothing', () => {
		const keys = fieldsFromSchema(SCHEMA, { include: ['name', 'handling.deadline', 'handling.nope'] }).map((f) => f.key)
		expect(keys).toEqual(['handling.deadline', 'name'])
	})

	it('keeps an object property a field override gives a widget', () => {
		expect(fieldsFromSchema(SCHEMA).map((f) => f.key)).not.toContain('settings')
		expect(fieldsFromSchema(SCHEMA, { overrides: { settings: { widget: 'json' } } }).map((f) => f.key)).toContain('settings')
	})
})

describe('CnFormDialog', () => {
	it('edits handling.teams and sends handling with its other keys', () => {
		const w = shallowMount(CnFormDialog, {
			propsData: { schema: SCHEMA, item: CASE_TYPE, fieldOverrides: { 'handling.teams': {} }, includeFields: ['name', 'handling.teams'] },
			stubs: { NcDialog: { template: '<div><slot /></div>' } },
		})
		expect(w.vm.formData['handling.teams']).toEqual(['woo'])
		w.vm.updateField('handling.teams', ['woo', 'avg'])
		const payload = w.vm.buildSubmitPayload()
		expect(payload.handling).toEqual({ teams: ['woo', 'avg'], deadline: 28 })
		expect(Object.keys(payload)).not.toContain('handling.teams')
	})
})

describe('CnObjectDataWidget', () => {
	it('shows the dotted value and saves it back inside its object', async () => {
		const w = shallowMount(CnObjectDataWidget, {
			propsData: { schema: SCHEMA, objectData: CASE_TYPE, overrides: { 'handling.deadline': {} }, include: ['handling.deadline'] },
		})
		expect(w.vm.fieldValues['handling.deadline']).toBe(28)
		expect(w.vm.resolvedFields.map((f) => f.key)).toEqual(['handling.deadline'])
		w.vm.dirtyFields = { 'handling.deadline': 42 }
		await w.vm.save()
		const [saved] = w.emitted('save')[0]
		expect(saved.handling).toEqual({ teams: ['woo'], deadline: 42 })
		expect(Object.keys(saved)).not.toContain('handling.deadline')
	})
})
