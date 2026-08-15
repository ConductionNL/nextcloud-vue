import { mount } from '@vue/test-utils'
import CnPropertyValueCell from '@/components/CnAdvancedFormDialog/CnPropertyValueCell.vue'

const stubs = {
	NcTextField: { template: '<input class="nc-textfield" :value="value" @input="$emit(\'update:value\', $event.target.value)" />', props: ['value'] },
	NcTextArea: { template: '<textarea class="nc-textarea" :value="value" @input="$emit(\'update:value\', $event.target.value)" />', props: ['value'] },
	NcCheckboxRadioSwitch: { template: '<input type="checkbox" class="nc-switch" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" />', props: ['checked'] },
	NcDateTimePickerNative: { template: '<input class="nc-datetime" :value="value" @input="$emit(\'update:value\', $event.target.value)" />', props: ['value'] },
	NcDateTimePicker: { template: '<input class="nc-datetime-picker" :value="value" @input="$emit(\'input\', $event.target.value)" />', props: ['value', 'type'] },
	NcSelect: { template: '<div class="nc-select"></div>', props: ['value', 'options', 'multiple'] },
	InformationOutline: true,
	CnJsonViewer: { template: '<div class="cn-json-viewer-stub" :data-value="value"></div>', props: ['value', 'language', 'height'] },
}

describe('CnPropertyValueCell', () => {
	it('renders a single-line text input for format: text', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'description',
				schema: { properties: { description: { type: 'string', format: 'text' } } },
				value: 'hi',
				isEditable: true,
				isEditing: true,
				displayName: 'Description',
			},
			stubs,
		})
		expect(wrapper.vm.resolvedWidget).toBe('text')
		expect(wrapper.find('.nc-textfield').exists()).toBe(true)
	})

	it('auto-detects textarea from format: markdown', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'body',
				schema: { properties: { body: { type: 'string', format: 'markdown' } } },
				value: '# hi',
				isEditable: true,
				isEditing: true,
			},
			stubs,
		})
		expect(wrapper.vm.resolvedWidget).toBe('textarea')
		expect(wrapper.find('.nc-textarea').exists()).toBe(true)
	})

	it('color formats resolve to the color widget', () => {
		const make = (format) => mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'k',
				schema: { properties: { k: { type: 'string', format } } },
				value: '',
				isEditable: true,
				isEditing: true,
			},
			stubs,
		}).vm
		expect(make('color').resolvedWidget).toBe('color')
		expect(make('color-hex').resolvedWidget).toBe('color')
		expect(make('color-rgb').resolvedWidget).toBe('color')
		expect(make('color-rgba').resolvedWidget).toBe('color')
		expect(make('color-hsl').resolvedWidget).toBe('color')
		expect(make('color-hsla').resolvedWidget).toBe('color')
	})

	it('arrays render as a multi NcSelect with taggable when items.enum is missing', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'tags',
				schema: { properties: { tags: { type: 'array' } } },
				value: ['a', 'b'],
				isEditable: true,
				isEditing: true,
				displayName: 'Tags',
			},
			stubs,
		})
		expect(wrapper.vm.resolvedWidget).toBe('select')
		expect(wrapper.vm.effectiveSelectMultiple).toBe(true)
		expect(wrapper.vm.effectiveSelectTaggable).toBe(true)
	})

	it('arrays with items.enum become a multi NcSelect of those enums', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'roles',
				schema: { properties: { roles: { type: 'array', items: { type: 'string', enum: ['admin', 'user'] } } } },
				value: [],
				isEditable: true,
				isEditing: true,
			},
			stubs,
		})
		expect(wrapper.vm.resolvedWidget).toBe('select')
		expect(wrapper.vm.effectiveSelectMultiple).toBe(true)
		expect(wrapper.vm.effectiveSelectTaggable).toBe(false)
		expect(wrapper.vm.effectiveSelectOptions).toEqual(['admin', 'user'])
	})

	it('string with enum becomes a single NcSelect of those values', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'status',
				schema: { properties: { status: { type: 'string', enum: ['draft', 'published'] } } },
				value: 'draft',
				isEditable: true,
				isEditing: true,
			},
			stubs,
		})
		expect(wrapper.vm.resolvedWidget).toBe('select')
		expect(wrapper.vm.effectiveSelectMultiple).toBe(false)
		expect(wrapper.vm.effectiveSelectOptions).toEqual(['draft', 'published'])
	})

	it('respects explicit widget override', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'foo',
				schema: { properties: { foo: { type: 'string' } } },
				value: 'x',
				isEditable: true,
				isEditing: true,
				widget: 'textarea',
			},
			stubs,
		})
		expect(wrapper.vm.resolvedWidget).toBe('textarea')
	})

	it('select widget emits IDs from option objects', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'themes',
				schema: { properties: { themes: { type: 'array' } } },
				value: [],
				isEditable: true,
				isEditing: true,
				widget: 'select',
				selectOptions: [{ id: 1, label: 'A' }, { id: 2, label: 'B' }],
				selectMultiple: true,
			},
			stubs,
		})
		wrapper.vm.emitSelect([{ id: 1, label: 'A' }, { id: 2, label: 'B' }])
		expect(wrapper.emitted('update:value')[0][0]).toEqual([1, 2])
	})

	it('auto-detects object widget from type: object and parses on commit', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'config',
				schema: { properties: { config: { type: 'object' } } },
				value: { a: 1 },
				isEditable: true,
				isEditing: true,
				displayName: 'Config',
			},
			stubs,
		})
		expect(wrapper.vm.resolvedWidget).toBe('object')
		expect(wrapper.find('.cn-json-viewer-stub').exists()).toBe(true)
		wrapper.vm.emitObject('{ "a": 2 }')
		expect(wrapper.emitted('update:value').pop()[0]).toEqual({ a: 2 })
	})

	it('object widget keeps raw string when JSON is invalid', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'config',
				schema: { properties: { config: { type: 'object' } } },
				value: {},
				isEditable: true,
				isEditing: true,
				widget: 'object',
			},
			stubs,
		})
		wrapper.vm.emitObject('{ broken')
		expect(wrapper.emitted('update:value').pop()[0]).toBe('{ broken')
	})

	it('object widget emits null on empty input', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'config',
				schema: { properties: { config: { type: 'object' } } },
				value: { a: 1 },
				isEditable: true,
				isEditing: true,
				widget: 'object',
			},
			stubs,
		})
		wrapper.vm.emitObject('   ')
		expect(wrapper.emitted('update:value').pop()[0]).toBeNull()
	})

	it('maps string formats to HTML5 input types', () => {
		const make = (format) => mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'k',
				schema: { properties: { k: { type: 'string', format } } },
				value: '',
				isEditable: true,
				isEditing: true,
			},
			stubs,
		}).vm
		expect(make('email').inputType).toBe('email')
		expect(make('idn-email').inputType).toBe('email')
		expect(make('uri').inputType).toBe('url')
		expect(make('uri-template').inputType).toBe('url')
		expect(make('downloadUrl').inputType).toBe('url')
		expect(make('password').inputType).toBe('password')
		expect(make('telephone').inputType).toBe('tel')
		expect(make('uuid').inputType).toBe('text')
		// Date formats are routed to NcDateTimePicker, not NcTextField, so
		// `inputType` falls through to `text` for them.
		expect(make('date').inputType).toBe('text')
		expect(make('time').inputType).toBe('text')
		expect(make('date-time').inputType).toBe('text')
	})

	it('html format auto-detects to textarea', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'body',
				schema: { properties: { body: { type: 'string', format: 'html' } } },
				value: '',
				isEditable: true,
				isEditing: true,
			},
			stubs,
		})
		expect(wrapper.vm.resolvedWidget).toBe('textarea')
	})

	it('boolean widget renders the switch even when not selected', () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'active',
				schema: { properties: { active: { type: 'boolean' } } },
				value: true,
				isEditable: true,
				isEditing: false,
				displayName: 'Active',
			},
			stubs,
		})
		expect(wrapper.find('.nc-switch').exists()).toBe(true)
	})
})
