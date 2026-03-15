import { mount } from '@vue/test-utils'
import CnAdvancedFormDialog from '@/components/CnAdvancedFormDialog/CnAdvancedFormDialog.vue'

const testSchema = {
	title: 'Item',
	properties: {
		title: { type: 'string', title: 'Title' },
		count: { type: 'integer', title: 'Count' },
		active: { type: 'boolean', title: 'Active' },
	},
	required: ['title'],
}

describe('CnAdvancedFormDialog', () => {
	it('renders in create mode when item is null', () => {
		const wrapper = mount(CnAdvancedFormDialog, {
			propsData: {
				schema: testSchema,
				item: null,
			},
			stubs: {
				NcDialog: true,
				NcButton: true,
				NcNoteCard: true,
				NcLoadingIcon: true,
				NcTextField: true,
				NcCheckboxRadioSwitch: true,
				NcDateTimePickerNative: true,
				BTabs: true,
				BTab: true,
			},
		})
		expect(wrapper.vm.isCreateMode).toBe(true)
		expect(wrapper.vm.resolvedTitle).toContain('Create')
	})

	it('renders in edit mode when item is provided', () => {
		const item = { id: '1', title: 'Test', count: 5, active: true }
		const wrapper = mount(CnAdvancedFormDialog, {
			propsData: {
				schema: testSchema,
				item,
			},
			stubs: {
				NcDialog: true,
				NcButton: true,
				NcNoteCard: true,
				NcLoadingIcon: true,
				NcTextField: true,
				NcCheckboxRadioSwitch: true,
				NcDateTimePickerNative: true,
				BTabs: true,
				BTab: true,
			},
		})
		expect(wrapper.vm.isCreateMode).toBe(false)
		expect(wrapper.vm.resolvedTitle).toContain('Edit')
		expect(wrapper.vm.formData.title).toBe('Test')
	})

	it('emits confirm with formData when store is not provided', async () => {
		const wrapper = mount(CnAdvancedFormDialog, {
			propsData: {
				schema: testSchema,
				item: null,
			},
			stubs: {
				NcDialog: {
					template: '<div><slot /><slot name="actions" /></div>',
				},
				NcButton: {
					template: '<button @click="$listeners.click"><slot /></button>',
				},
				NcNoteCard: true,
				NcLoadingIcon: true,
				NcTextField: true,
				NcCheckboxRadioSwitch: true,
				NcDateTimePickerNative: true,
				BTabs: true,
				BTab: true,
			},
		})
		wrapper.vm.formData = { title: 'New Item', count: 0, active: false }
		wrapper.vm.jsonData = JSON.stringify(wrapper.vm.formData, null, 2)
		await wrapper.vm.executeConfirm()
		expect(wrapper.emitted('confirm')).toBeTruthy()
		expect(wrapper.emitted('confirm')[0][0]).toMatchObject({ title: 'New Item' })
	})

	it('setResult shows success and resets loading', () => {
		const wrapper = mount(CnAdvancedFormDialog, {
			propsData: {
				schema: testSchema,
				item: null,
			},
			stubs: {
				NcDialog: true,
				NcButton: true,
				NcNoteCard: true,
				NcLoadingIcon: true,
				NcTextField: true,
				NcCheckboxRadioSwitch: true,
				NcDateTimePickerNative: true,
				BTabs: true,
				BTab: true,
			},
		})
		wrapper.vm.loading = true
		wrapper.vm.setResult({ success: true })
		expect(wrapper.vm.loading).toBe(false)
		expect(wrapper.vm.result).toEqual({ success: true })
	})

	it('setResult with error shows error', () => {
		const wrapper = mount(CnAdvancedFormDialog, {
			propsData: {
				schema: testSchema,
				item: null,
			},
			stubs: {
				NcDialog: true,
				NcButton: true,
				NcNoteCard: true,
				NcLoadingIcon: true,
				NcTextField: true,
				NcCheckboxRadioSwitch: true,
				NcDateTimePickerNative: true,
				BTabs: true,
				BTab: true,
			},
		})
		wrapper.vm.setResult({ error: 'Save failed' })
		expect(wrapper.vm.result).toEqual({ error: 'Save failed' })
	})

	it('respects excludeFields', () => {
		const wrapper = mount(CnAdvancedFormDialog, {
			propsData: {
				schema: testSchema,
				item: null,
				excludeFields: ['count'],
			},
			stubs: {
				NcDialog: true,
				NcButton: true,
				NcNoteCard: true,
				NcLoadingIcon: true,
				NcTextField: true,
				NcCheckboxRadioSwitch: true,
				NcDateTimePickerNative: true,
				BTabs: true,
				BTab: true,
			},
		})
		const props = wrapper.vm.objectProperties
		const keys = props.map(([k]) => k)
		expect(keys).not.toContain('count')
	})

	it('respects includeFields', () => {
		const wrapper = mount(CnAdvancedFormDialog, {
			propsData: {
				schema: testSchema,
				item: null,
				includeFields: ['title'],
			},
			stubs: {
				NcDialog: true,
				NcButton: true,
				NcNoteCard: true,
				NcLoadingIcon: true,
				NcTextField: true,
				NcCheckboxRadioSwitch: true,
				NcDateTimePickerNative: true,
				BTabs: true,
				BTab: true,
			},
		})
		const props = wrapper.vm.objectProperties
		const keys = props.map(([k]) => k)
		expect(keys).toContain('title')
		expect(keys).not.toContain('count')
		expect(keys).not.toContain('active')
	})
})
