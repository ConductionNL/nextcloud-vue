/**
 * Tests for CnFormDialog's OpenRegister object-reference (`$ref`) support.
 *
 * A schema property that is an object reference renders as a searchable
 * dropdown of the referenced objects (label = human name, value = UUID)
 * instead of a free-text UUID box. The stored value remains the UUID.
 */

import { mount } from '@vue/test-utils'

const mockStore = {
	objectTypeRegistry: {},
	createObjectTypeSlug: (...parts) => parts.join('-'),
	registerObjectType: jest.fn((slug) => {
		mockStore.objectTypeRegistry[slug] = {}
	}),
	fetchCollection: jest.fn().mockResolvedValue([
		{ id: 'uuid-omg', title: 'Omgevingsvergunning' },
		{ id: 'uuid-kap', title: 'Kapvergunning' },
	]),
	fetchObject: jest.fn().mockResolvedValue({ id: 'uuid-omg', title: 'Omgevingsvergunning' }),
}

jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

// Import AFTER the mock is registered.
// eslint-disable-next-line import/first
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button @click="$listeners.click"><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
}

const refSchema = {
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title', order: 1 },
		caseType: { type: 'string', format: 'uuid', $ref: 'caseType', title: 'Case type', order: 2 },
		contacts: { type: 'array', items: { $ref: 'contact' }, title: 'Contacts', order: 3 },
	},
	required: ['title', 'caseType'],
}

beforeEach(() => {
	mockStore.objectTypeRegistry = {}
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.fetchObject.mockClear()
})

describe('CnFormDialog — $ref object references', () => {
	it('renders a single $ref field as a select widget', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: refSchema, item: null, register: 'zaken' },
			stubs,
		})
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'caseType')
		expect(field.widget).toBe('select')
		expect(wrapper.vm.isReferenceField(field)).toBe(true)
	})

	it('loads {label,value} options from the store for a reference field', async () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: refSchema, item: null, register: 'zaken' },
			stubs,
		})
		await flushPromises()
		expect(mockStore.fetchCollection).toHaveBeenCalled()
		const options = wrapper.vm.getEffectiveOptions(
			wrapper.vm.resolvedFields.find((f) => f.key === 'caseType'),
		)
		expect(options).toEqual([
			{ id: 'uuid-omg', label: 'Omgevingsvergunning' },
			{ id: 'uuid-kap', label: 'Kapvergunning' },
		])
	})

	it('stores the chosen UUID (not the full object) on select', async () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: refSchema, item: null, register: 'zaken' },
			stubs,
		})
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'caseType')
		wrapper.vm.onEffectiveSelectChange(field, { id: 'uuid-omg', label: 'Omgevingsvergunning' })
		expect(wrapper.vm.formData.caseType).toBe('uuid-omg')
	})

	it('preserves the UUID in the submit payload', async () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: refSchema, item: null, register: 'zaken' },
			stubs,
		})
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'caseType')
		wrapper.vm.updateField('title', 'My case')
		wrapper.vm.onEffectiveSelectChange(field, { id: 'uuid-omg', label: 'Omgevingsvergunning' })
		const payload = wrapper.vm.buildSubmitPayload()
		expect(payload.caseType).toBe('uuid-omg')
	})

	it('resolves a stored UUID to its label in edit mode', async () => {
		const wrapper = mount(CnFormDialog, {
			propsData: {
				schema: refSchema,
				item: { id: '1', title: 'Edit case', caseType: 'uuid-omg' },
				register: 'zaken',
			},
			stubs,
		})
		await flushPromises()
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'caseType')
		const selected = wrapper.vm.getEffectiveSelectedOption(field)
		expect(selected).toEqual({ id: 'uuid-omg', label: 'Omgevingsvergunning' })
		// Stored value is still the UUID.
		expect(wrapper.vm.formData.caseType).toBe('uuid-omg')
	})

	it('stores an array of UUIDs for a multi-value reference', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: refSchema, item: null, register: 'zaken' },
			stubs,
		})
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'contacts')
		expect(field.widget).toBe('multiselect')
		expect(wrapper.vm.isReferenceArrayField(field)).toBe(true)
		wrapper.vm.onEffectiveMultiSelectChange(field, [
			{ id: 'c1', label: 'Alice' },
			{ id: 'c2', label: 'Bob' },
		])
		expect(wrapper.vm.formData.contacts).toEqual(['c1', 'c2'])
	})

	it('resolves options when $ref is served as a JSON-pointer path', async () => {
		// OpenRegister may serve a `$ref` as '#/components/schemas/product' or a
		// register-qualified 'pipelinq/product' rather than a bare slug — the
		// picker must still fetch the right schema (was: empty dropdown).
		const pathSchema = {
			title: 'Lead product',
			properties: {
				product: { type: 'string', format: 'uuid', $ref: '#/components/schemas/product', title: 'Product', order: 1 },
			},
			required: ['product'],
		}
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: pathSchema, item: null, register: 'pipelinq' },
			stubs,
		})
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'product')
		expect(field.widget).toBe('select')
		expect(field.reference.schema).toBe('product')
		await flushPromises()
		expect(mockStore.registerObjectType).toHaveBeenCalledWith('pipelinq-product', 'product', 'pipelinq')
		expect(mockStore.fetchCollection).toHaveBeenCalled()
	})

	it('applies x-relation-filter tokens against the form values when fetching options', async () => {
		const filterSchema = {
			title: 'Lead product',
			properties: {
				lead: { type: 'string', format: 'uuid', $ref: 'lead', title: 'Lead', order: 1 },
				product: {
					type: 'string',
					format: 'uuid',
					$ref: 'product',
					title: 'Product',
					order: 2,
					'x-relation-filter': { supplier: '@object.lead', active: true },
				},
			},
			required: ['product'],
		}
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: filterSchema, item: null, register: 'pipelinq', initialData: { lead: 'lead-1' } },
			stubs,
		})
		await flushPromises()
		mockStore.fetchCollection.mockClear()
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'product')
		await wrapper.vm.fetchReferenceOptions(field, '')
		const params = mockStore.fetchCollection.mock.calls[mockStore.fetchCollection.mock.calls.length - 1][1]
		// Resolved token (@object.lead → the seeded lead uuid) + literal scalar.
		expect(params.supplier).toBe('lead-1')
		expect(params.active).toBe(true)
	})

	it('falls back to a text widget when no register is provided', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: refSchema, item: null, register: '' },
			stubs,
		})
		const field = wrapper.vm.visibleFields.find((f) => f.key === 'caseType')
		expect(field.widget).toBe('text')
		expect(field.reference).toBeNull()
		expect(mockStore.fetchCollection).not.toHaveBeenCalled()
	})
})
