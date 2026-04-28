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
	it('hides const + immutable rows when showConstantProperties is false', () => {
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
		expect(keys).not.toContain('fixed')
		expect(keys).not.toContain('locked')
	})

	it('exposes hasConstantOrImmutableProperties for parents', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: {
				schema,
				item: { title: 'Hello' },
				formData: {},
			},
			stubs: baseStubs,
		})
		expect(wrapper.vm.hasConstantOrImmutableProperties).toBe(true)

		const wrapper2 = mount(CnPropertiesTab, {
			propsData: {
				schema: { properties: { title: { type: 'string' } } },
				item: { title: 'Hello' },
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
