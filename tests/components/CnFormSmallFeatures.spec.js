/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The smaller form features dossiq's status and property forms need: an
 * option colour, a placeholder from another field, grouped options, a
 * foldable section, clearWhenHidden, a field that is not stored, a lines
 * widget, a warning that does not block, a cross-field required rule,
 * create defaults from the page, and the server's refusal in the dialog.
 *
 * @spec openspec/changes/form-small-features/specs/form-dialog/spec.md#requirement-a-field-can-warn-without-blocking-the-save
 */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import { conditionHolds } from '../../src/utils/fieldCondition.js'
import { loadOptionsFrom } from '../../src/utils/optionsFrom.js'
import { fieldsFromSchema } from '../../src/utils/schema.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(async () => ({ data: {} })), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p = {}) => u.replace(/\{(\w+)\}/g, (_, k) => p[k]) }))

const PROPERTY = {
	slug: 'propertyDefinition',
	properties: {
		name: { type: 'string', title: 'Name' },
		propertyType: { type: 'string', title: 'Type', enum: ['string', 'enum', 'number'] },
		enumValues: { type: 'array', title: 'Choices', items: { type: 'string' } },
		conceptScheme: { type: 'string', title: 'Concept scheme' },
		publicLabel: { type: 'string', title: 'Public label' },
		colour: { type: 'string', title: 'Colour', enum: ['blue', 'grey'] },
		defaultValue: { type: 'string', title: 'Default value' },
	},
}
const OVERRIDES = {
	choiceList: { stored: false, label: 'Choice list', widget: 'switch', initialWhen: { any: [{ field: 'propertyType', equals: 'enum' }, { field: 'enumValues', notEmpty: true }] } },
	enumValues: {
		widget: 'lines',
		visibleWhen: { field: 'choiceList', truthy: true },
		clearWhenHidden: true,
		requiredWhen: { all: [{ field: 'choiceList', truthy: true }, { field: 'conceptScheme', empty: true }] },
		warnWhen: { when: { all: [{ field: 'conceptScheme', notEmpty: true }, { field: 'enumValues', notEmpty: true }] }, text: 'The concept scheme wins over these choices.' },
	},
	publicLabel: { placeholderFrom: 'name' },
	colour: { optionSwatches: { blue: 'var(--color-primary)', grey: '#888' } },
	defaultValue: { section: 'More options', sectionCollapsed: true },
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
const mountForm = (item = null) => shallowMount(CnFormDialog, { propsData: { schema: PROPERTY, item, fieldOverrides: OVERRIDES }, stubs: { NcDialog: { template: '<div><slot /></div>' } } })

describe('conditions compose', () => {
	it('reads all, any, empty and notEmpty', () => {
		expect(conditionHolds({ all: [{ field: 'a', truthy: true }, { field: 'b', empty: true }] }, { a: true, b: [] })).toBe(true)
		expect(conditionHolds({ any: [{ field: 'a', equals: 1 }, { field: 'b', notEmpty: true }] }, { a: 2, b: '' })).toBe(false)
	})
})

describe('a field that is not stored', () => {
	it('is built from its override, starts from initialWhen, steers the form and is not saved', () => {
		const keys = fieldsFromSchema(PROPERTY, { overrides: OVERRIDES }).map((f) => f.key)
		expect(keys).toContain('choiceList')
		const w = mountForm({ id: 'p1', name: 'Soort', propertyType: 'enum', enumValues: [] })
		expect(w.vm.formData.choiceList).toBe(true)
		expect(w.vm.visibleFields.map((f) => f.key)).toContain('enumValues')
		expect(w.vm.buildSubmitPayload()).not.toHaveProperty('choiceList')
	})
})

describe('lines, clearWhenHidden, requiredWhen and warnWhen on the choice list', () => {
	it('splits lines, trimmed and without empties', () => {
		const w = mountForm()
		expect(w.vm.linesOf(' a \n\n b ')).toEqual(['a', 'b'])
	})

	it('is required while the list is on and no scheme is set', () => {
		const w = mountForm({ id: 'p1', name: 'Soort', propertyType: 'enum', enumValues: [] })
		expect(w.vm.validate()).toBe(false)
		expect(w.vm.errors.enumValues).toBeTruthy()
		w.vm.updateField('conceptScheme', 'https://x/scheme')
		expect(w.vm.validate()).toBe(true)
	})

	it('warns, without blocking, when a scheme and choices are both set', () => {
		const w = mountForm({ id: 'p1', name: 'Soort', propertyType: 'enum', enumValues: ['a'], conceptScheme: 's' })
		const field = w.vm.visibleFields.find((f) => f.key === 'enumValues')
		expect(w.vm.fieldWarnings(field)).toEqual(['The concept scheme wins over these choices.'])
		expect(w.vm.validate()).toBe(true)
	})

	it('clears the choices when the list is turned off', async () => {
		const w = mountForm({ id: 'p1', name: 'Soort', propertyType: 'string', enumValues: ['a'] })
		expect(w.vm.formData.choiceList).toBe(true)
		w.vm.updateField('choiceList', false)
		await w.vm.$nextTick()
		expect(w.vm.buildSubmitPayload().enumValues).toEqual([])
	})
})

describe('placeholder, swatches and a foldable section', () => {
	it('shows the name as the public label\'s placeholder', () => {
		const w = mountForm({ id: 'p1', name: 'In behandeling' })
		expect(w.vm.fieldPlaceholder(w.vm.visibleFields.find((f) => f.key === 'publicLabel'))).toBe('In behandeling')
	})

	it('gives an option its colour', () => {
		const w = mountForm()
		const field = w.vm.visibleFields.find((f) => f.key === 'colour')
		expect(w.vm.optionSwatch(field, { id: 'grey' })).toBe('#888')
		expect(w.vm.optionSwatch(field, { id: 'red' })).toBe('')
	})

	it('opens More options folded and unfolds it from its heading', () => {
		const w = mountForm()
		const field = w.vm.visibleFields.find((f) => f.key === 'defaultValue')
		expect(w.vm.foldableSections).toEqual(['More options'])
		expect(w.vm.isInFoldedSection(field)).toBe(true)
		w.vm.toggleSection('More options')
		expect(w.vm.isInFoldedSection(field)).toBe(false)
	})
})

describe('grouped options from an endpoint', () => {
	it('keeps each group together, groups in the order they first appear', async () => {
		axios.get.mockResolvedValueOnce({ data: { types: [
			{ type: 'string', label: 'Text', category: 'Text' },
			{ type: 'integer', label: 'Whole number', category: 'Numbers' },
			{ type: 'email', label: 'E-mail', category: 'Text' },
		] } })
		const options = await loadOptionsFrom({ url: '/apps/openregister/api/schemas/property-vocabulary', responsePath: 'types', valueField: 'type', labelField: 'label', groupField: 'category' })
		expect(options).toEqual([
			{ id: 'string', label: 'Text', group: 'Text' },
			{ id: 'email', label: 'E-mail', group: 'Text' },
			{ id: 'integer', label: 'Whole number', group: 'Numbers' },
		])
	})
})

describe('CnObjectListWidget create', () => {
	const mountList = (content) => shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'statusType', columns: [{ key: 'name' }], ...content } },
		global: { provide: { cnObjectContext: { objectId: 'ct-1', object: { id: 'ct-1' } } } },
		stubs: { CnDataTable: true },
	})

	it('resolves @objectId in createDefaults to the page\'s object', async () => {
		axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
		const w = mountList({ createDefaults: { caseType: '@objectId' } })
		w.vm.createSchema = { properties: { caseType: {}, name: {} } }
		expect(w.vm.createInitialData.caseType).toBe('ct-1')
	})

	it('shows the server\'s refusal in the dialog', async () => {
		axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
		axios.post.mockRejectedValueOnce({ message: 'Request failed with status code 422', response: { data: { message: 'A case type keeps one final status.' } } })
		const w = mountList({})
		const setResult = jest.fn()
		const refs = { createDialog: { setResult } }
		await CnObjectListWidget.methods.onCreateConfirm.call(new Proxy(w.vm, { get: (t, k) => (k === '$refs' ? refs : t[k]) }), { name: 'x' })
		await tick()
		expect(setResult).toHaveBeenCalledWith({ error: 'A case type keeps one final status.' })
	})
})
