/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A form whose caller already read the definitions a driving value brings
 * (dossiq's New case from a mail reads the case type's questions to answer
 * them from the mail) uses those records instead of reading them again.
 *
 * @spec openspec/changes/preloaded-form-definitions/specs/preloaded-form-definitions/spec.md#requirement-a-form-takes-definitions-its-caller-already-read
 */

import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'
import { useObjectStore } from '@/store/useObjectStore.js'

jest.mock('@/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: jest.fn(),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	CnResourceSelect: true,
	CnFieldHelper: true,
	CnJsonViewer: true,
}

const caseSchema = {
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title', order: 2 },
		caseType: {
			type: 'string',
			title: 'Case type',
			$ref: 'caseType',
			order: 1,
			'x-openregister-extends-form': { definitions: { schema: 'propertyDefinition', filter: { caseType: '$value' } } },
		},
	},
}

const DEFINITION_TYPE = 'dossiq/propertyDefinition'

const fetched = [{ id: 'def-1', name: 'Plafond', propertyType: 'number' }]
const preloaded = [{ id: 'def-9', name: 'Afzender', propertyType: 'string' }]

function mockStore() {
	const fetchCollectionForOptions = jest.fn((type) => Promise.resolve(type === DEFINITION_TYPE ? fetched : []))
	useObjectStore.mockReturnValue({
		fetchCollectionForOptions,
		createObjectTypeSlug: (register, schema) => `${register}/${schema}`,
		registerObjectType: jest.fn(),
		objectTypeRegistry: {},
		fetchObject: jest.fn(() => Promise.resolve(null)),
	})
	return () => fetchCollectionForOptions.mock.calls.filter(([type]) => type === DEFINITION_TYPE)
}

function mountForm(propsData) {
	return mount(CnFormDialog, {
		propsData: { schema: caseSchema, item: null, register: 'dossiq', ...propsData },
		stubs,
	})
}

describe('CnFormDialog preloadedDefinitions', () => {
	beforeEach(() => useObjectStore.mockReset())

	it('uses the records handed over for the value the form opens on, without reading them', async () => {
		const definitionCalls = mockStore()
		const wrapper = mountForm({
			initialData: { caseType: 'ct-1' },
			preloadedDefinitions: { caseType: { value: 'ct-1', records: preloaded } },
		})
		await flush()
		await flush()

		expect(definitionCalls()).toEqual([])
		expect(wrapper.vm.resolvedFields.map((f) => f.label)).toEqual(['Case type', 'Title', 'Afzender'])
	})

	it('reads the definitions as usual once the field holds another value', async () => {
		const definitionCalls = mockStore()
		const wrapper = mountForm({
			initialData: { caseType: 'ct-1' },
			preloadedDefinitions: { caseType: { value: 'ct-1', records: preloaded } },
		})
		await flush()

		wrapper.vm.formData.caseType = 'ct-2'
		await flush()

		expect(definitionCalls()).toEqual([[DEFINITION_TYPE, { _limit: 100, caseType: 'ct-2' }]])
		expect(wrapper.vm.resolvedFields.map((f) => f.label)).toEqual(['Case type', 'Title', 'Plafond'])
	})

	it('ignores an entry without records and reads them', async () => {
		const definitionCalls = mockStore()
		mountForm({
			initialData: { caseType: 'ct-1' },
			preloadedDefinitions: { caseType: { value: 'ct-1' } },
		})
		await flush()
		await flush()

		expect(definitionCalls()).toEqual([[DEFINITION_TYPE, { _limit: 100, caseType: 'ct-1' }]])
	})
})
