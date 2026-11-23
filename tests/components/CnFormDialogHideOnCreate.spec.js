/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A question definition can stay off the create form. dossiq fills the Woo
 * "Ontvangen op" answer itself when the case is created, so asking for it on
 * the create form asks for something the app overwrites.
 *
 * @spec openspec/changes/dynamic-question-hide-on-create/specs/dynamic-question-hide-on-create/spec.md#requirement-a-question-can-stay-off-the-create-form
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
	{ id: 'def-1', name: 'Onderwerp', propertyType: 'string', isRequired: true },
	{ id: 'def-2', name: 'Ontvangen op', propertyType: 'date', isRequired: true, hideOnCreate: true },
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
 * @return {{fetchCollectionForOptions: Function, definitionCalls: Function, state: object}} The mock handle.
 */
function mockStore(records = definitions) {
	const state = { definitions: records }
	const fetchCollectionForOptions = jest.fn((type) => Promise.resolve(type === DEFINITION_TYPE ? state.definitions : []))
	useObjectStore.mockReturnValue({
		fetchCollectionForOptions,
		createObjectTypeSlug: (register, schema) => `${register}/${schema}`,
		registerObjectType: jest.fn(),
		objectTypeRegistry: {},
		fetchObject: jest.fn(() => Promise.resolve(null)),
	})
	/** Every call that asked for definitions, ignoring the picker's own. */
	const definitionCalls = () => fetchCollectionForOptions.mock.calls.filter(([type]) => type === DEFINITION_TYPE)
	return { fetchCollectionForOptions, definitionCalls, state }
}

function mountForm(propsData = {}) {
	return mount(CnFormDialog, {
		propsData: { schema: caseSchema, item: null, register: 'dossiq', ...propsData },
		stubs,
	})
}

describe('a question that stays off the create form (hideOnCreate)', () => {
	beforeEach(() => useObjectStore.mockReset())

	it('is left off when a case is created, required or not', async () => {
		mockStore()
		const wrapper = mountForm()
		await flush()
		wrapper.vm.formData.caseType = 'ct-woo'
		await flush()

		expect(wrapper.vm.resolvedFields.map((f) => f.label)).toEqual(['Case type', 'Title', 'Onderwerp'])
		expect(Object.keys(wrapper.vm.formData)).not.toContain(DYNAMIC_KEY_PREFIX + 'def-2')
	})

	it('is shown when the case is edited', async () => {
		mockStore()
		const wrapper = mountForm({ item: { id: 'case-1', title: 'Verzoek', caseType: 'ct-woo' } })
		await flush()
		await flush()

		expect(wrapper.vm.resolvedFields.map((f) => f.label)).toContain('Ontvangen op')
	})
})
