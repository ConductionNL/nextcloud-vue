/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A form field whose select options come from a source (`optionsFrom`, or a
 * schema property's `x-options-from`), as dossiq's IV3 taakveld picker asks:
 * the shared reader, CnFormDialog, the schema-driven field list and the
 * CnAdvancedFormDialog cell.
 *
 * @spec openspec/changes/form-field-options-from/specs/form-dialog/spec.md#requirement-a-select-field-can-read-its-options-from-a-source
 */
import axios from '@nextcloud/axios'
import { mount, shallowMount } from '@vue/test-utils'
import CnPropertyValueCell from '../../src/components/CnAdvancedFormDialog/CnPropertyValueCell.vue'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import { fieldWithOptionsFrom, filterOptions, isOptionsFrom, loadOptionsFrom, optionFromRow, optionsFromSource } from '../../src/utils/optionsFrom.js'
import { fieldsFromSchema } from '../../src/utils/schema.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const TAAKVELDEN = [
	{ id: 'u1', code: '0.1', name: 'Bestuur' },
	{ id: 'u2', code: '1.1', name: 'Crisisbeheersing en brandweer' },
	{ id: 'u3', code: '2.1', name: 'Verkeer, wegen en water' },
]
const FROM = { register: 'dossiq', schema: 'taakveld', valueField: 'code', labelField: 'name' }
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: TAAKVELDEN } })
})

describe('the optionsFrom reader', () => {
	it('reads OpenRegister objects of a register and schema, with its filter', () => {
		expect(optionsFromSource({ register: 'dossiq', schema: 'taakveld', filter: { active: true } })).toEqual({
			url: '/apps/openregister/api/objects/dossiq/taakveld',
			params: { _limit: 500, active: true },
			responsePath: 'results',
		})
	})

	it('reads an app endpoint with its params and response path', () => {
		expect(optionsFromSource({ url: '/apps/dossiq/api/iv3', params: { year: 2026 }, responsePath: 'items' })).toEqual({ url: '/apps/dossiq/api/iv3', params: { year: 2026 }, responsePath: 'items' })
		expect(optionsFromSource({ responsePath: 'items' })).toBeNull()
		expect(isOptionsFrom({ register: 'r' })).toBe(false)
	})

	it('takes the value and label from valueField and labelField, else id and title or name', () => {
		expect(optionFromRow({ code: '0.1', name: 'Bestuur' }, FROM)).toEqual({ id: '0.1', label: 'Bestuur' })
		expect(optionFromRow({ id: 7, title: 'Seven' })).toEqual({ id: 7, label: 'Seven' })
		expect(optionFromRow({ '@self': { id: 'uuid' }, name: 'Named' })).toEqual({ id: 'uuid', label: 'Named' })
		expect(optionFromRow({ id: 'x' })).toEqual({ id: 'x', label: 'x' })
		expect(optionFromRow({ name: 'no value' })).toBeNull()
		expect(optionFromRow('plain')).toEqual({ id: 'plain', label: 'plain' })
	})

	it('loads the options in the source order, without repeats, and none when the read fails', async () => {
		axios.get.mockResolvedValue({ data: { results: [...TAAKVELDEN, TAAKVELDEN[0]] } })
		expect((await loadOptionsFrom(FROM)).map((o) => o.id)).toEqual(['0.1', '1.1', '2.1'])
		expect(axios.get.mock.calls[0][0]).toBe('/apps/openregister/api/objects/dossiq/taakveld')
		axios.get.mockRejectedValue(new Error('down'))
		await expect(loadOptionsFrom({ ...FROM, filter: { x: 1 } })).rejects.toThrow('down')
	})

	it('filters on the label or the value, ignoring case', () => {
		const options = [{ id: '0.1', label: 'Bestuur' }, { id: '2.1', label: 'Verkeer' }]
		expect(filterOptions(options, 'verk')).toEqual([options[1]])
		expect(filterOptions(options, '0.1')).toEqual([options[0]])
		expect(filterOptions(options, '')).toBe(options)
	})

	it('draws a field with optionsFrom as a select, or a multiselect for an array', () => {
		expect(fieldWithOptionsFrom({ key: 'a', type: 'string', widget: 'text', optionsFrom: FROM }).widget).toBe('select')
		expect(fieldWithOptionsFrom({ key: 'a', type: 'array', optionsFrom: FROM }).widget).toBe('multiselect')
		const plain = { key: 'a', type: 'string', widget: 'text' }
		expect(fieldWithOptionsFrom(plain)).toBe(plain)
	})
})

describe('schema-driven fields', () => {
	it('read x-options-from on the property or its items, and optionsFrom from a field override', () => {
		const schema = {
			properties: {
				taakveld: { type: 'string', 'x-options-from': FROM },
				taakvelden: { type: 'array', items: { type: 'string', 'x-options-from': FROM } },
				functie: { type: 'string' },
			},
		}
		const fields = Object.fromEntries(fieldsFromSchema(schema, { overrides: { functie: { optionsFrom: { url: '/apps/dossiq/api/functies' } } } }).map((f) => [f.key, f]))
		expect(fields.taakveld).toMatchObject({ optionsFrom: FROM, widget: 'select' })
		expect(fields.taakvelden).toMatchObject({ optionsFrom: FROM, widget: 'multiselect' })
		expect(fields.functie).toMatchObject({ optionsFrom: { url: '/apps/dossiq/api/functies' }, widget: 'select' })
	})
})

describe('CnFormDialog with an optionsFrom field', () => {
	const fields = [
		{ key: 'taakveld', label: 'Taakveld', type: 'string', optionsFrom: FROM },
		{ key: 'taakvelden', label: 'Taakvelden', type: 'array', optionsFrom: FROM },
	]
	const mountForm = (item = null) => shallowMount(CnFormDialog, { propsData: { fields, item }, stubs: { NcDialog: { template: '<div><slot /></div>' } } })

	it('offers the source\'s options and stores the value, one or several', async () => {
		const w = mountForm()
		await tick()
		await tick()
		const single = w.vm.resolvedFields.find((f) => f.key === 'taakveld')
		expect(single.widget).toBe('select')
		expect(w.vm.getEffectiveOptions(single).map((o) => o.label)).toEqual(['Bestuur', 'Crisisbeheersing en brandweer', 'Verkeer, wegen en water'])
		w.vm.onEffectiveSelectChange(single, { id: '1.1', label: 'Crisisbeheersing en brandweer' })
		expect(w.vm.formData.taakveld).toBe('1.1')
		const multi = w.vm.resolvedFields.find((f) => f.key === 'taakvelden')
		w.vm.onEffectiveMultiSelectChange(multi, [{ id: '0.1', label: 'Bestuur' }, { id: '2.1', label: 'Verkeer, wegen en water' }])
		expect(w.vm.formData.taakvelden).toEqual(['0.1', '2.1'])
	})

	it('shows a held value by its label, and reads the source once while searching it', async () => {
		const w = mountForm({ taakveld: '2.1' })
		await tick()
		await tick()
		const single = w.vm.resolvedFields.find((f) => f.key === 'taakveld')
		expect(w.vm.getEffectiveSelectedOption(single)).toEqual({ id: '2.1', label: 'Verkeer, wegen en water' })
		const reads = axios.get.mock.calls.length
		await w.vm.loadAsyncOptions(single, 'brand')
		expect(w.vm.getEffectiveOptions(single).map((o) => o.id)).toEqual(['1.1'])
		expect(axios.get.mock.calls.length).toBe(reads)
	})
})

describe('a filter on the page\'s object', () => {
	it('resolves @objectId from the detail page the form opens on', async () => {
		const fields = [{ key: 'field', label: 'Field', type: 'string', optionsFrom: { register: 'dossiq', schema: 'propertyDefinition', filter: { caseType: '@objectId' }, valueField: 'name' } }]
		shallowMount(CnFormDialog, {
			propsData: { fields },
			global: { provide: { cnDetailObjectContext: { value: { objectId: 'ct-1', objectData: { id: 'ct-1' } } } } },
			stubs: { NcDialog: { template: '<div><slot /></div>' } },
		})
		await tick()
		await tick()
		const call = axios.get.mock.calls.find(([url]) => url.endsWith('/propertyDefinition'))
		expect(call[1].params).toMatchObject({ caseType: 'ct-1' })
	})
})

describe('the CnAdvancedFormDialog cell', () => {
	const schema = { properties: { taakveld: { type: 'string', 'x-options-from': FROM }, naam: { type: 'string' } } }

	it('draws a select over the source\'s options and shows the held value by its label', async () => {
		const w = mount(CnPropertyValueCell, { props: { propertyKey: 'taakveld', schema, value: '0.1', isEditing: false } })
		await tick()
		await tick()
		expect(w.vm.resolvedWidget).toBe('select')
		expect(w.vm.effectiveSelectOptions.map((o) => o.id)).toEqual(['0.1', '1.1', '2.1'])
		expect(w.vm.effectiveSelectTaggable).toBe(false)
		expect(w.vm.displayValue).toBe('Bestuur')
	})

	it('takes optionsFrom as a prop too, and leaves a plain property alone', async () => {
		const w = mount(CnPropertyValueCell, { props: { propertyKey: 'naam', schema, value: 'x', optionsFrom: { url: '/apps/dossiq/api/namen', responsePath: 'results' } } })
		await tick()
		expect(w.vm.resolvedWidget).toBe('select')
		const plain = mount(CnPropertyValueCell, { props: { propertyKey: 'naam', schema, value: 'x' } })
		expect(plain.vm.resolvedWidget).toBe('text')
	})
})

describe('the manifest schema', () => {
	const withOverride = (override) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', fieldOverrides: { taakveld: override } } }],
	})

	it('accepts optionsFrom on a field override, from objects or an endpoint', () => {
		expect(validateManifestV2(withOverride({ optionsFrom: FROM })).valid).toBe(true)
		expect(validateManifestV2(withOverride({ optionsFrom: { url: '/apps/dossiq/api/iv3', responsePath: 'items', valueField: 'code', labelField: 'name' } })).valid).toBe(true)
	})

	it('refuses an optionsFrom without a source, or with an unknown key', () => {
		expect(validateManifestV2(withOverride({ optionsFrom: { register: 'r' } })).valid).toBe(false)
		expect(validateManifestV2(withOverride({ optionsFrom: { url: '/x', rows: 'items' } })).valid).toBe(false)
	})
})
