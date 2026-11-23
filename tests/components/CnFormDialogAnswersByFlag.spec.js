/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A declaration that keeps a flagged definition's answers in a second array
 * (`values.arrayKeyBy`): the edit form shows answers from both arrays, and
 * saving writes each answer to its own array and keeps the rest of each.
 *
 * @spec openspec/changes/dynamic-answers-by-definition-flag/specs/dynamic-answers-by-definition-flag/spec.md
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
		arrayKeyBy: { field: 'sensitive', keys: { true: 'sensitiveProperties' } },
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
	{ id: 'def-kind', name: 'Soort', propertyType: 'string' },
	{ id: 'def-income', name: 'Inkomen', propertyType: 'number', sensitive: true },
]

function mockStore() {
	useObjectStore.mockReturnValue({
		fetchCollectionForOptions: jest.fn((type) => Promise.resolve(type === 'dossiq/propertyDefinition' ? definitions : [])),
		createObjectTypeSlug: (register, schema) => `${register}/${schema}`,
		registerObjectType: jest.fn(),
		objectTypeRegistry: {},
		fetchObject: jest.fn(() => Promise.resolve(null)),
	})
}

async function mountEdit(item) {
	mockStore()
	const wrapper = mount(CnFormDialog, {
		propsData: { schema: caseSchema, item, register: 'dossiq' },
		stubs,
	})
	await flush()
	await flush()
	return wrapper
}

describe('CnFormDialog with answers routed by a definition flag', () => {
	beforeEach(() => useObjectStore.mockReset())

	it('shows the stored answers of both arrays', async () => {
		const wrapper = await mountEdit({
			id: 'case-1',
			title: 'Aanvraag',
			caseType: 'ct-1',
			properties: [{ propertyDefinition: 'def-kind', name: 'Soort', value: 'algemeen' }],
			sensitiveProperties: [{ propertyDefinition: 'def-income', name: 'Inkomen', value: '480' }],
		})

		expect(wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-kind`]).toBe('algemeen')
		expect(wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-income`]).toBe(480)
	})

	it('saves a flagged answer to its own array and leaves the other array alone', async () => {
		const wrapper = await mountEdit({
			id: 'case-1',
			title: 'Aanvraag',
			caseType: 'ct-1',
			properties: [{ propertyDefinition: 'def-kind', name: 'Soort', value: 'algemeen' }],
		})
		wrapper.vm.formData[`${DYNAMIC_KEY_PREFIX}def-income`] = 520
		await flush()

		wrapper.vm.executeConfirm()
		const [payload] = wrapper.emitted('confirm')[0]
		expect(payload.sensitiveProperties).toEqual([{ propertyDefinition: 'def-income', name: 'Inkomen', value: '520' }])
		expect(payload.properties).toEqual([{ propertyDefinition: 'def-kind', name: 'Soort', value: 'algemeen' }])
	})
})

describe('CnActionButtons create path with answers routed by a definition flag', () => {
	it('folds a flagged answer into its own array on the new record', async () => {
		const { default: CnActionButtons } = await import('@/components/CnActionButtons/CnActionButtons.vue')
		const payload = { title: 'Aanvraag' }
		CnActionButtons.methods.foldArrayAnswers.call({}, payload, {
			answers: [
				{ definitionId: 'def-kind', value: 'algemeen', declarationKey: 'caseType' },
				{ definitionId: 'def-income', value: 480, declarationKey: 'caseType' },
			],
			declarations: [{ key: 'caseType', config: EXTENDS }],
			definitions,
		})

		expect(payload.properties).toEqual([{ propertyDefinition: 'def-kind', name: 'Soort', value: 'algemeen' }])
		expect(payload.sensitiveProperties).toEqual([{ propertyDefinition: 'def-income', name: 'Inkomen', value: '480' }])
	})
})
