/**
 * Tests for CnFormDialog's detail-page sub-object helpers:
 *  - `initialData`      → seeds create-mode form values (parent pre-link)
 *  - `lockedFields`     → renders those fields read-only (immutable parent)
 *  - `x-fill-from`      → selecting a reference copies mapped fields off it
 */

import { mount } from '@vue/test-utils'

const product = { id: 'prod-1', name: 'Consulting', unitPrice: 120, unit: 'hours' }
const mockStore = {
	objectTypeRegistry: {},
	createObjectTypeSlug: (...parts) => parts.join('-'),
	registerObjectType: jest.fn((slug) => { mockStore.objectTypeRegistry[slug] = {} }),
	fetchCollection: jest.fn().mockResolvedValue([product]),
	fetchObject: jest.fn().mockResolvedValue(product),
}

jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

// eslint-disable-next-line import/first
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
// eslint-disable-next-line import/first
import { fieldsFromSchema } from '../../src/utils/schema.js'

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
	CnResourceSelect: { name: 'CnResourceSelect', props: ['register', 'schema', 'modelValue'], template: '<div class="stub-resource-select" />' },
}

const schema = {
	title: 'Lead Product',
	properties: {
		lead: { type: 'string', format: 'uuid', $ref: 'lead', title: 'Lead', order: 1 },
		product: { type: 'string', format: 'uuid', $ref: 'product', 'x-allow-create': true, 'x-fill-from': { unitPrice: 'unitPrice', unit: 'unit' }, title: 'Product', order: 2 },
		quantity: { type: 'number', title: 'Quantity', order: 3 },
		unitPrice: { type: 'number', title: 'Unit Price', order: 4 },
		unit: { type: 'string', title: 'Unit', order: 5 },
	},
	required: ['lead', 'product'],
}

const mountDialog = (props = {}) => mount(CnFormDialog, {
	propsData: { schema, register: 'pipelinq', open: true, item: null, ...props },
	stubs,
})

beforeEach(() => { mockStore.fetchObject.mockClear() })

describe('schema.js fillFrom', () => {
	it('passes x-fill-from onto the reference field descriptor', () => {
		const fields = fieldsFromSchema(schema)
		expect(fields.find((f) => f.key === 'product').fillFrom).toEqual({ unitPrice: 'unitPrice', unit: 'unit' })
	})
})

describe('CnFormDialog initialData + lockedFields', () => {
	it('seeds create-mode formData from initialData', () => {
		const wrapper = mountDialog({ initialData: { lead: 'lead-uuid-9' } })
		expect(wrapper.vm.formData.lead).toBe('lead-uuid-9')
	})

	it('marks lockedFields read-only', () => {
		const wrapper = mountDialog({ initialData: { lead: 'lead-uuid-9' }, lockedFields: ['lead'] })
		const leadField = wrapper.vm.resolvedFields.find((f) => f.key === 'lead')
		expect(leadField.readOnly).toBe(true)
	})
})

describe('CnFormDialog template pre-fill (x-fill-from)', () => {
	it('copies mapped fields off a selected reference object', async () => {
		const wrapper = mountDialog()
		const productField = wrapper.vm.resolvedFields.find((f) => f.key === 'product')
		await wrapper.vm.applyTemplateFill(productField, 'prod-1')
		expect(mockStore.fetchObject).toHaveBeenCalled()
		expect(wrapper.vm.formData.unitPrice).toBe(120)
		expect(wrapper.vm.formData.unit).toBe('hours')
	})

	it('fills directly from a freshly-created object without fetching', async () => {
		const wrapper = mountDialog()
		const productField = wrapper.vm.resolvedFields.find((f) => f.key === 'product')
		wrapper.vm.onReferenceCreated(productField, { id: 'prod-new', name: 'New svc', unitPrice: 50, unit: 'pieces' })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.formData.unitPrice).toBe(50)
		expect(wrapper.vm.formData.unit).toBe('pieces')
	})
})
