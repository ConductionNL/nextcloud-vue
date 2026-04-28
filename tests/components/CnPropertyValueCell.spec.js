import { mount } from '@vue/test-utils'
import CnPropertyValueCell from '@/components/CnAdvancedFormDialog/CnPropertyValueCell.vue'

const stubs = {
	NcTextField: { template: '<input class="nc-textfield" :value="value" @input="$emit(\'update:value\', $event.target.value)" />', props: ['value'] },
	NcTextArea: { template: '<textarea class="nc-textarea" :value="value" @input="$emit(\'update:value\', $event.target.value)" />', props: ['value'] },
	NcCheckboxRadioSwitch: { template: '<input type="checkbox" class="nc-switch" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" />', props: ['checked'] },
	NcDateTimePickerNative: { template: '<input class="nc-datetime" :value="value" @input="$emit(\'update:value\', $event.target.value)" />', props: ['value'] },
	NcSelect: { template: '<div class="nc-select"></div>', props: ['value', 'options', 'multiple'] },
	InformationOutline: true,
	CnJsonViewer: { template: '<div class="cn-json-viewer-stub" :data-value="value"></div>', props: ['value', 'language', 'height'] },
}

describe('CnPropertyValueCell', () => {
	it('auto-detects textarea from format: text', () => {
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
		expect(wrapper.vm.resolvedWidget).toBe('textarea')
		expect(wrapper.find('.nc-textarea').exists()).toBe(true)
	})

	it('auto-detects array widget from type: array', () => {
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
		expect(wrapper.vm.resolvedWidget).toBe('array')
	})

	it('emits comma-split array on update for array widget', async () => {
		const wrapper = mount(CnPropertyValueCell, {
			propsData: {
				propertyKey: 'tags',
				schema: { properties: { tags: { type: 'array' } } },
				value: ['a', 'b'],
				isEditable: true,
				isEditing: true,
				displayName: 'Tags',
				widget: 'array',
			},
			stubs,
		})
		wrapper.vm.emitArray('one, two , three')
		expect(wrapper.emitted('update:value')[0][0]).toEqual(['one', 'two', 'three'])
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
		expect(make('color').inputType).toBe('color')
		expect(make('color-hex-alpha').inputType).toBe('color')
		expect(make('color-rgb').inputType).toBe('text')
		expect(make('uuid').inputType).toBe('text')
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
