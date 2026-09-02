/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Fields a record's own data decides, rather than its schema. A case type
 * declares the extra questions its cases answer, and a functional admin adds
 * them at runtime, so the schema cannot enumerate them. CnFormDialog fetches
 * the definitions once a driving value is picked and renders them as ordinary
 * fields.
 */

import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'
import { useObjectStore } from '@/store/useObjectStore.js'
import { DYNAMIC_KEY_PREFIX } from '@/utils/dynamicProperties.js'

jest.mock('@/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: jest.fn(),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button @click="$attrs.onClick && $attrs.onClick()"><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	CnResourceSelect: true,
	CnFieldHelper: true,
	CnJsonViewer: true,
}

const EXTENDS = {
	definitions: { schema: 'propertyDefinition', filter: { caseType: '$value' } },
	values: {
		schema: 'caseProperty',
		objectRef: 'case',
		definitionRef: 'propertyDefinition',
		valueKey: 'value',
	},
}

const caseSchema = {
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title', order: 2 },
		caseType: { type: 'string', title: 'Case type', $ref: 'caseType', order: 1, 'x-openregister-extends-form': EXTENDS },
	},
	required: ['title', 'caseType'],
}

const definitions = [
	{ id: 'def-1', name: 'Plafond', propertyType: 'number', isRequired: true },
	{ id: 'def-2', name: 'Doelgroep', propertyType: 'enum', enumValues: ['Cultuur', 'Sport'] },
]

const DEFINITION_TYPE = 'dossiq/propertyDefinition'

/**
 * A store whose collection fetch answers per object type. The `caseType`
 * picker fetches its own options through the same method, so a mock that
 * answers every type identically cannot tell the two apart.
 *
 * The returned handle lets a test change what the definitions fetch answers
 * mid-flight — the component caches the store on first use, so replacing the
 * whole mock afterwards has no effect.
 *
 * @param {Array<object>} [records] The definition records the fetch answers with.
 * @return {{fetchCollection: Function, definitionCalls: Function, state: object}} The mock handle.
 */
function mockStore(records = definitions) {
	const state = { definitions: records }
	const fetchCollection = jest.fn((type) => Promise.resolve(
		type === DEFINITION_TYPE ? state.definitions : [],
	))
	useObjectStore.mockReturnValue({
		fetchCollection,
		createObjectTypeSlug: (register, schema) => `${register}/${schema}`,
		registerObjectType: jest.fn(),
		objectTypeRegistry: {},
		fetchObject: jest.fn(() => Promise.resolve(null)),
	})
	/** Every call that asked for definitions, ignoring the picker's own. */
	const definitionCalls = () => fetchCollection.mock.calls.filter(([type]) => type === DEFINITION_TYPE)
	return { fetchCollection, definitionCalls, state }
}

function mountForm(propsData = {}) {
	return mount(CnFormDialog, {
		propsData: { schema: caseSchema, item: null, register: 'dossiq', ...propsData },
		stubs,
	})
}

describe('CnFormDialog data-driven fields', () => {
	beforeEach(() => useObjectStore.mockReset())

	it('asks for nothing until a driving value is picked', async () => {
		const { definitionCalls } = mockStore()
		const wrapper = mountForm()
		await flush()

		expect(definitionCalls()).toEqual([])
		expect(wrapper.vm.resolvedFields.map((f) => f.key)).toEqual(['caseType', 'title'])
	})

	it('fetches the chosen case type definitions and renders them as ordinary fields', async () => {
		const { definitionCalls } = mockStore()
		const wrapper = mountForm()
		await flush()

		wrapper.vm.formData.caseType = 'ct-subsidie'
		await flush()

		expect(definitionCalls()).toEqual([[DEFINITION_TYPE, { _limit: 100, caseType: 'ct-subsidie' }]])
		const fields = wrapper.vm.resolvedFields
		expect(fields.map((f) => f.label)).toEqual(['Case type', 'Title', 'Plafond', 'Doelgroep'])
		expect(fields.find((f) => f.label === 'Plafond').widget).toBe('number')
		expect(fields.find((f) => f.label === 'Doelgroep').widget).toBe('select')
	})

	it('marks a required definition required, so Create stays disabled until it is answered', async () => {
		mockStore()
		const wrapper = mountForm()
		await flush()
		wrapper.vm.formData.title = 'Aanvraag'
		wrapper.vm.formData.caseType = 'ct-subsidie'
		await flush()

		expect(wrapper.vm.requiredFieldsFilled).toBe(false)
		wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-1`] = 50000
		await flush()
		expect(wrapper.vm.requiredFieldsFilled).toBe(true)
	})

	it('drops the answers when the case type changes, so no value carries over', async () => {
		const { state } = mockStore()
		const wrapper = mountForm()
		await flush()
		wrapper.vm.formData.caseType = 'ct-subsidie'
		await flush()
		wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-1`] = 50000
		await flush()

		state.definitions = [{ id: 'def-9', name: 'Locatie', propertyType: 'string' }]
		wrapper.vm.formData.caseType = 'ct-vergunning'
		await flush()

		expect(wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-1`]).toBeUndefined()
		expect(wrapper.vm.resolvedFields.map((f) => f.label)).toEqual(['Case type', 'Title', 'Locatie'])
	})

	it('seeds a definition default without overwriting an answer already given', async () => {
		mockStore([
			{ id: 'def-a', name: 'Kanaal', propertyType: 'string', defaultValue: 'Balie' },
			{ id: 'def-b', name: 'Regio', propertyType: 'string', defaultValue: 'Noord' },
		])
		const wrapper = mountForm()
		await flush()
		wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-b`] = 'Zuid'
		wrapper.vm.formData.caseType = 'ct-1'
		await flush()

		expect(wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-a`]).toBe('Balie')
		expect(wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-b`]).toBe('Zuid')
	})

	it('emits the object own fields apart from the answers, so nothing is posted to a schema that would drop it', async () => {
		mockStore()
		const wrapper = mountForm()
		await flush()
		wrapper.vm.formData.title = 'Aanvraag'
		wrapper.vm.formData.caseType = 'ct-subsidie'
		await flush()
		wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-1`] = 50000
		await flush()

		wrapper.vm.executeConfirm()
		const [payload, dynamic] = wrapper.emitted('confirm')[0]
		expect(payload).toEqual({ title: 'Aanvraag', caseType: 'ct-subsidie' })
		expect(dynamic.answers).toEqual([
			{ definitionId: 'def-1', value: 50000, declarationKey: 'caseType' },
		])
	})

	it('emits no second argument for a schema that declares no questions', async () => {
		mockStore()
		const wrapper = mount(CnFormDialog, {
			propsData: {
				schema: { title: 'Note', properties: { title: { type: 'string', title: 'Title' } }, required: ['title'] },
				item: null,
			},
			stubs,
		})
		await flush()
		wrapper.vm.formData.title = 'x'
		wrapper.vm.executeConfirm()

		expect(wrapper.emitted('confirm')[0][1]).toBeNull()
	})

	it('keeps the last selection when an earlier fetch resolves after it', async () => {
		// A fast second pick must win. Without the token guard the first
		// selection's slower response reinstates fields the user moved off.
		let resolveFirst
		const first = new Promise((resolve) => { resolveFirst = resolve })
		const responses = [first, Promise.resolve([{ id: 'def-late', name: 'Locatie', propertyType: 'string' }])]
		const fetchCollection = jest.fn((type) => (
			type === DEFINITION_TYPE ? responses.shift() : Promise.resolve([])
		))
		useObjectStore.mockReturnValue({
			fetchCollection,
			createObjectTypeSlug: (r, s) => `${r}/${s}`,
			registerObjectType: jest.fn(),
			objectTypeRegistry: {},
			fetchObject: jest.fn(() => Promise.resolve(null)),
		})

		const wrapper = mountForm()
		await flush()
		wrapper.vm.formData.caseType = 'ct-1'
		await flush()
		wrapper.vm.formData.caseType = 'ct-2'
		await flush()
		resolveFirst(definitions)
		await flush()

		expect(wrapper.vm.resolvedFields.map((f) => f.label)).toEqual(['Case type', 'Title', 'Locatie'])
	})

	it('renders no questions when the fetch fails, rather than a form missing one it never showed', async () => {
		useObjectStore.mockReturnValue({
			fetchCollection: jest.fn(() => Promise.reject(new Error('offline'))),
			createObjectTypeSlug: (r, s) => `${r}/${s}`,
			registerObjectType: jest.fn(),
			objectTypeRegistry: {},
			fetchObject: jest.fn(() => Promise.resolve(null)),
		})
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

		const wrapper = mountForm()
		await flush()
		wrapper.vm.formData.caseType = 'ct-1'
		await flush()

		expect(wrapper.vm.resolvedFields.map((f) => f.key)).toEqual(['caseType', 'title'])
		expect(wrapper.vm.dynamicLoading).toBe(false)
		spy.mockRestore()
	})

	it('leaves an explicit fields prop alone, questions and all', async () => {
		const { definitionCalls } = mockStore()
		const wrapper = mountForm({ fields: [{ key: 'only', label: 'Only', type: 'string', widget: 'text' }] })
		await flush()
		wrapper.vm.formData.caseType = 'ct-1'
		await flush()

		expect(definitionCalls()).toEqual([])
		expect(wrapper.vm.resolvedFields.map((f) => f.key)).toEqual(['only'])
	})
})
