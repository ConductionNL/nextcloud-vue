/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A reference field's label comes from the object store's cached copy when
 * the caller already read the object (dossiq's New case from a mail reads the
 * case type before the dialog opens), so the dialog does not read it again.
 *
 * @spec openspec/changes/reference-label-from-the-store-cache/specs/reference-label-from-the-store-cache/spec.md#requirement-a-reference-label-comes-from-the-stores-cached-object-first
 */

import { mount } from '@vue/test-utils'

const cached = {}

const mockStore = {
	objectTypeRegistry: {},
	createObjectTypeSlug: (register, schema) => `${register}/${schema}`,
	registerObjectType: jest.fn((slug) => {
		mockStore.objectTypeRegistry[slug] = {}
	}),
	// The options load names nothing, so the label must come from the
	// cache or from a read by id.
	fetchCollectionForOptions: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue({ id: 'ct-1', title: 'Omgevingsvergunning (read)' }),
	getCachedObject: (type, id) => cached[type]?.[id] || null,
}

jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

// Import AFTER the mock is registered.
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnResourceSelect: true,
	CnFieldHelper: true,
	CnJsonViewer: true,
}

const caseSchema = {
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title', order: 1 },
		caseType: { type: 'string', format: 'uuid', $ref: 'caseType', title: 'Case type', order: 2 },
	},
}

function mountForm() {
	return mount(CnFormDialog, {
		propsData: { schema: caseSchema, item: null, register: 'dossiq', initialData: { caseType: 'ct-1' } },
		stubs,
	})
}

function caseTypeReads() {
	return mockStore.fetchObject.mock.calls.filter(([, id]) => id === 'ct-1')
}

beforeEach(() => {
	mockStore.objectTypeRegistry = {}
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollectionForOptions.mockClear()
	mockStore.fetchObject.mockClear()
	for (const key of Object.keys(cached)) {
		delete cached[key]
	}
})

describe('CnFormDialog reference label from the store cache', () => {
	it('takes the label from the cached object without reading it again', async () => {
		cached['dossiq/caseType'] = { 'ct-1': { id: 'ct-1', title: 'Omgevingsvergunning' } }
		const wrapper = mountForm()
		await flush()
		await flush()

		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'caseType')
		await wrapper.vm.resolveReferenceLabel(field, 'ct-1')

		expect(caseTypeReads()).toEqual([])
		expect(wrapper.vm.referenceLabels['ct-1']).toBe('Omgevingsvergunning')
	})

	it('reads the object by id when the store holds no copy', async () => {
		const wrapper = mountForm()
		await flush()
		await flush()

		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'caseType')
		await wrapper.vm.resolveReferenceLabel(field, 'ct-1')

		expect(caseTypeReads().length).toBeGreaterThan(0)
		expect(wrapper.vm.referenceLabels['ct-1']).toBe('Omgevingsvergunning (read)')
	})
})
