import { mount } from '@vue/test-utils'
import CnPropertiesTab from '@/components/CnAdvancedFormDialog/CnPropertiesTab.vue'

const baseStubs = {
	NcTextField: true,
	NcTextArea: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	NcSelect: true,
}

const schema = {
	title: 'Item',
	properties: {
		title: { type: 'string', title: 'Title' },
		count: { type: 'integer', title: 'Count' },
		fixed: { type: 'string', const: 'X' },
		locked: { type: 'string', immutable: true },
		notes: { type: 'string', format: 'text' },
		tags: { type: 'array' },
	},
	required: ['title'],
}

describe('CnPropertiesTab', () => {
	it('hides const rows when showConstantProperties is false but keeps immutable rows visible', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema,
				item: { title: 'Hello', count: 1, fixed: 'X', locked: 'val' },
				formData: {},
				showConstantProperties: false,
			},
			stubs: baseStubs,
		})
		const keys = wrapper.vm.objectProperties.map(([k]) => k)
		expect(keys).toContain('title')
		expect(keys).toContain('count')
		// Const → hidden by the toggle.
		expect(keys).not.toContain('fixed')
		// Immutable → still shown (you can create it, you just can't edit it).
		expect(keys).toContain('locked')
	})

	it('marks an immutable row with an existing value as non-editable', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema,
				item: { locked: 'val' },
				formData: {},
			},
			stubs: baseStubs,
		})
		expect(wrapper.vm.isPropertyEditable('locked', 'val')).toBe(false)
		// Empty immutable: editable so the user can fill it during creation.
		expect(wrapper.vm.isPropertyEditable('locked', '')).toBe(true)
		expect(wrapper.vm.isPropertyEditable('locked', null)).toBe(true)
	})

	it('hasConstantOrImmutableProperties only counts const properties (not immutable)', () => {
		// Schema has const (`fixed`) and immutable (`locked`) — only const counts.
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema,
				item: { title: 'Hello' },
				formData: {},
			},
			stubs: baseStubs,
		})
		expect(wrapper.vm.hasConstantOrImmutableProperties).toBe(true)

		// Schema with only an immutable prop (no const) → false.
		const wrapper2 = mount(CnPropertiesTab, {
			propsData: {
				schema: { properties: { locked: { type: 'string', immutable: true } } },
				item: { locked: 'val' },
				formData: {},
			},
			stubs: baseStubs,
		})
		expect(wrapper2.vm.hasConstantOrImmutableProperties).toBe(false)
	})

	it('renders an extra column when row-actions slot is provided', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema: { properties: { title: { type: 'string', title: 'Title' } } },
				item: { title: 'Hello' },
				formData: {},
			},
			scopedSlots: {
				'row-actions': '<button class="drop-btn">x</button>',
			},
			stubs: baseStubs,
		})
		expect(wrapper.findAll('.drop-btn').length).toBeGreaterThan(0)
		expect(wrapper.find('.cn-advanced-form-dialog__table-col-actions').exists()).toBe(true)
	})

	it('does not add the actions column when slot is absent', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema: { properties: { title: { type: 'string', title: 'Title' } } },
				item: { title: 'Hello' },
				formData: {},
			},
			stubs: baseStubs,
		})
		expect(wrapper.find('.cn-advanced-form-dialog__table-col-actions').exists()).toBe(false)
	})

	it('passes propertyOverrides through to CnPropertyValueCell', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema: { properties: { tags: { type: 'array', title: 'Tags' } } },
				item: { tags: ['a', 'b'] },
				formData: {},
				propertyOverrides: {
					tags: { widget: 'select', selectOptions: [{ id: 'a', label: 'A' }], selectMultiple: true },
				},
			},
			stubs: baseStubs,
		})
		const cell = wrapper.findComponent({ name: 'CnPropertyValueCell' })
		expect(cell.props('widget')).toBe('select')
		expect(cell.props('selectOptions')).toEqual([{ id: 'a', label: 'A' }])
		expect(cell.props('selectMultiple')).toBe(true)
	})

	it('emits update:property-value when a cell commits', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema: { properties: { title: { type: 'string', title: 'Title' } } },
				item: { title: 'Hello' },
				formData: {},
			},
			stubs: baseStubs,
		})
		const cell = wrapper.findComponent({ name: 'CnPropertyValueCell' })
		cell.vm.$emit('update:value', 'World')
		expect(wrapper.emitted('update:property-value')).toBeTruthy()
		expect(wrapper.emitted('update:property-value')[0][0]).toEqual({ key: 'title', value: 'World' })
	})

	it('renders a required indicator for properties listed in schema.required', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema: {
					required: ['title'],
					properties: {
						title: { type: 'string', title: 'Title' },
						summary: { type: 'string', title: 'Summary' },
					},
				},
				item: { title: 'Hello', summary: '' },
				formData: {},
			},
			stubs: baseStubs,
		})
		const indicators = wrapper.findAll('.cn-advanced-form-dialog__required-indicator')
		expect(indicators.length).toBe(1)
		expect(indicators.at(0).text()).toBe('*')
		expect(wrapper.vm.isRequired('title')).toBe(true)
		expect(wrapper.vm.isRequired('summary')).toBe(false)
	})

	it('isRequired honours per-property required:true as well', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema: { properties: { tag: { type: 'string', required: true } } },
				item: { tag: 'a' },
				formData: {},
			},
			stubs: baseStubs,
		})
		expect(wrapper.vm.isRequired('tag')).toBe(true)
		expect(wrapper.findAll('.cn-advanced-form-dialog__required-indicator').length).toBe(1)
	})

	it('value-cell scoped slot replaces the default cell', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema: { properties: { notes: { type: 'string', title: 'Notes' } } },
				item: { notes: 'hello' },
				formData: {},
			},
			scopedSlots: {
				'value-cell': '<span class="custom-cell">{{ props.resolvedValue }}</span>',
			},
			stubs: baseStubs,
		})
		expect(wrapper.find('.custom-cell').exists()).toBe(true)
		expect(wrapper.find('.custom-cell').text()).toBe('hello')
		expect(wrapper.findComponent({ name: 'CnPropertyValueCell' }).exists()).toBe(false)
	})
})
