/**
 * Tests for CnFormDialog's three schema-driven picker enhancements:
 *  - `format: "user"`        → Nextcloud-user picker (stores the uid string)
 *  - `x-allow-create: true`  → single `$ref` renders CnResourceSelect (select-or-create)
 *  - `widget: "switch"`      → a 2-value enum renders as a toggle mapping to the enum values
 */

import { mount } from '@vue/test-utils'

const mockStore = {
	objectTypeRegistry: {},
	createObjectTypeSlug: (...parts) => parts.join('-'),
	registerObjectType: jest.fn((slug) => { mockStore.objectTypeRegistry[slug] = {} }),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue(null),
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
	NcSelect: { name: 'NcSelect', props: ['userSelect', 'options', 'modelValue'], template: '<div class="stub-ncselect" />' },
	NcCheckboxRadioSwitch: {
		name: 'NcCheckboxRadioSwitch',
		props: ['modelValue'],
		template: '<label class="stub-switch" @click="$emit(\'update:model-value\', !modelValue)"><slot /></label>',
	},
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
	CnResourceSelect: { name: 'CnResourceSelect', props: ['register', 'schema', 'labelField', 'modelValue'], template: '<div class="stub-resource-select" />' },
}

const schema = {
	title: 'Character',
	properties: {
		ocName: { type: 'string', format: 'uuid', $ref: 'player', 'x-allow-create': true, title: 'Player', order: 1 },
		userUid: { type: 'string', format: 'user', title: 'Nextcloud user', order: 2 },
		approved: { type: 'string', enum: ['no', 'approved'], widget: 'switch', title: 'Approved', order: 3 },
	},
	required: ['ocName'],
}

describe('schema.js widget resolution', () => {
	it('maps format:"user" to the user widget (renders via the :user-select NcSelect)', () => {
		const fields = fieldsFromSchema(schema)
		expect(fields.find((f) => f.key === 'userUid').widget).toBe('user')
	})

	it('passes x-allow-create through onto the reference field', () => {
		const fields = fieldsFromSchema(schema)
		const ocName = fields.find((f) => f.key === 'ocName')
		expect(ocName.allowCreate).toBe(true)
		expect(ocName.reference).toEqual({ schema: 'player', multiple: false })
	})

	it('keeps the explicit switch widget over the enum→select default', () => {
		const fields = fieldsFromSchema(schema)
		expect(fields.find((f) => f.key === 'approved').widget).toBe('switch')
	})
})

describe('CnFormDialog picker rendering', () => {
	const mountDialog = () => mount(CnFormDialog, {
		propsData: { schema, register: 'larpingapp', open: true },
		stubs,
	})

	it('renders CnResourceSelect for an allowCreate reference field', () => {
		const wrapper = mountDialog()
		expect(wrapper.findComponent({ name: 'CnResourceSelect' }).exists()).toBe(true)
	})

	it('renders a user-select NcSelect for a format:user field', () => {
		const wrapper = mountDialog()
		const userSelects = wrapper.findAllComponents({ name: 'NcSelect' }).filter((c) => c.props('userSelect'))
		expect(userSelects.length).toBe(1)
	})

	it('renders a switch for a widget:switch enum field and maps its value', () => {
		const wrapper = mountDialog()
		expect(wrapper.findComponent({ name: 'NcCheckboxRadioSwitch' }).exists()).toBe(true)
		const vm = wrapper.vm
		const field = vm.resolvedFields.find((f) => f.key === 'approved')
		// off → first enum value, on → last enum value
		expect(vm.isSwitchOn(field)).toBe(false)
		expect(vm.switchValueFor(field, true)).toBe('approved')
		expect(vm.switchValueFor(field, false)).toBe('no')
		vm.updateField('approved', 'approved')
		expect(vm.isSwitchOn(field)).toBe(true)
	})
})
