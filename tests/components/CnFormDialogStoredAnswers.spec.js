/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Editing a record whose data-driven answers live on the record itself
 * (`values.mode: "array"`, dossiq's `case.properties`): the form shows what
 * the record answered, and saving keeps what the person did not change.
 *
 * @spec openspec/changes/dynamic-answers-on-edit/specs/dynamic-answers-on-edit/spec.md#requirement-the-edit-form-shows-the-stored-answers
 * @spec openspec/changes/dynamic-answers-on-edit/specs/dynamic-answers-on-edit/spec.md#requirement-saving-an-edit-keeps-what-was-not-changed
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
		mode: 'array',
		arrayKey: 'properties',
		definitionRef: 'propertyDefinition',
		nameKey: 'name',
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
	{ id: 'def-1', name: 'Plafond', propertyType: 'number', defaultValue: 10 },
	{ id: 'def-2', name: 'Doelgroep', propertyType: 'enum', enumValues: ['Cultuur', 'Sport'] },
]

const storedProperties = [
	{ propertyDefinition: 'def-1', name: 'Plafond', value: '50000' },
	{ propertyDefinition: 'def-old', name: 'Niet meer gevraagd', value: 'blijft' },
]

const DEFINITION_TYPE = 'dossiq/propertyDefinition'

function mockStore() {
	useObjectStore.mockReturnValue({
		fetchCollectionForOptions: jest.fn((type) => Promise.resolve(type === DEFINITION_TYPE ? definitions : [])),
		createObjectTypeSlug: (register, schema) => `${register}/${schema}`,
		registerObjectType: jest.fn(),
		objectTypeRegistry: {},
		fetchObject: jest.fn(() => Promise.resolve(null)),
	})
}

async function mountEdit() {
	mockStore()
	const item = {
		id: 'case-1',
		title: 'Aanvraag',
		caseType: 'ct-subsidie',
		properties: JSON.parse(JSON.stringify(storedProperties)),
	}
	const wrapper = mount(CnFormDialog, {
		propsData: { schema: caseSchema, item, register: 'dossiq' },
		stubs,
	})
	await flush()
	await flush()
	return wrapper
}

describe('CnFormDialog editing a record with stored answers', () => {
	beforeEach(() => useObjectStore.mockReset())

	it('shows the stored answer, typed for its field, over the definition default', async () => {
		const wrapper = await mountEdit()

		expect(wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-1`]).toBe(50000)
		expect(wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-2`]).toBeUndefined()
	})

	it('saves a changed answer beside the stored ones it did not touch', async () => {
		const wrapper = await mountEdit()
		wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-2`] = 'Sport'
		await flush()

		wrapper.vm.executeConfirm()
		const [payload] = wrapper.emitted('confirm')[0]
		expect(payload.properties).toEqual([
			storedProperties[0],
			storedProperties[1],
			{ propertyDefinition: 'def-2', name: 'Doelgroep', value: 'Sport' },
		])
		expect(Object.keys(payload).some((key) => key.startsWith(DYNAMIC_KEY_PREFIX))).toBe(false)
	})

	it('saves the stored array unchanged when no answer changed', async () => {
		const wrapper = await mountEdit()

		wrapper.vm.executeConfirm()
		const [payload] = wrapper.emitted('confirm')[0]
		expect(payload.properties).toEqual(storedProperties)
	})
})
