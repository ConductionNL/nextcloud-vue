/**
 * CnWidgetStyleEditorModal: the border (style, width, colour, radius), padding
 * (four sides) and header colour controls the widget style editor requirement
 * names, and how Save writes them into `styleConfig`.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */

import { mount } from '@vue/test-utils'
import CnWidgetStyleEditorModal from '../../src/dialogs/CnWidgetStyleEditorModal.vue'

function mountModal(widget) {
	return mount(CnWidgetStyleEditorModal, { propsData: { show: true, widget } })
}

function byTestId(wrapper, id) {
	return wrapper.findAllComponents({ name: 'NcSelect' })
		.concat(wrapper.findAllComponents({ name: 'NcTextField' }))
		.concat(wrapper.findAllComponents({ name: 'NcButton' }))
		.find((c) => c.attributes('data-testid') === id || c.vm.$attrs['data-testid'] === id)
}

describe('CnWidgetStyleEditorModal border, padding and header controls', () => {
	it('renders the border, padding and header sections', () => {
		const wrapper = mountModal({ title: 'W', styleConfig: {} })
		expect(wrapper.find('[data-testid="cn-widget-style-border"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-widget-style-padding"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-widget-style-header"]').exists()).toBe(true)
		for (const id of [
			'cn-widget-style-border-style',
			'cn-widget-style-border-width',
			'cn-widget-style-border-radius',
			'cn-widget-style-border-color',
			'cn-widget-style-padding-top',
			'cn-widget-style-padding-right',
			'cn-widget-style-padding-bottom',
			'cn-widget-style-padding-left',
			'cn-widget-style-header-background',
			'cn-widget-style-header-text',
		]) {
			expect(byTestId(wrapper, id) ? id : `missing ${id}`).toBe(id)
		}
	})

	it('offers none, solid, dashed and dotted border styles', () => {
		const wrapper = mountModal({ title: 'W' })
		expect(wrapper.vm.borderStyleOptions.map((o) => o.id)).toEqual(['none', 'solid', 'dashed', 'dotted'])
		expect(wrapper.vm.borderStyleOption.id).toBe('none')
	})

	it('writes the edited border, padding and header onto styleConfig on Save', () => {
		const widget = { title: 'W', styleConfig: {} }
		const wrapper = mountModal(widget)
		byTestId(wrapper, 'cn-widget-style-border-style').vm.$emit('update:modelValue', { id: 'dashed', label: 'Dashed' })
		byTestId(wrapper, 'cn-widget-style-border-width').vm.$emit('update:modelValue', '3')
		byTestId(wrapper, 'cn-widget-style-border-radius').vm.$emit('update:modelValue', '0')
		byTestId(wrapper, 'cn-widget-style-padding-left').vm.$emit('update:modelValue', '16')
		wrapper.vm.draft.borderColor = '#112233'
		wrapper.vm.draft.headerStyle.backgroundColor = '#000000'
		wrapper.vm.draft.headerStyle.textColor = '#ffffff'
		wrapper.vm.onSave()
		expect(widget.styleConfig).toMatchObject({
			borderStyle: 'dashed',
			borderWidth: 3,
			borderRadius: 0,
			borderColor: '#112233',
			padding: { top: 0, right: 0, bottom: 0, left: 16 },
			headerStyle: { backgroundColor: '#000000', textColor: '#ffffff' },
		})
	})

	it('keeps the previous number when a pixel field is not a number', () => {
		const wrapper = mountModal({ title: 'W', styleConfig: { borderWidth: 2 } })
		byTestId(wrapper, 'cn-widget-style-border-width').vm.$emit('update:modelValue', 'abc')
		expect(wrapper.vm.draft.borderWidth).toBe(1)
		byTestId(wrapper, 'cn-widget-style-border-width').vm.$emit('update:modelValue', '-4')
		expect(wrapper.vm.draft.borderWidth).toBe(1)
	})

	it('seeds the header colours and removes an emptied header style on Save', () => {
		const widget = { title: 'W', styleConfig: { headerStyle: { backgroundColor: '#abcdef', textColor: '' } } }
		const wrapper = mountModal(widget)
		expect(wrapper.vm.draft.headerStyle.backgroundColor).toBe('#abcdef')
		wrapper.vm.draft.headerStyle.backgroundColor = ''
		wrapper.vm.onSave()
		expect(widget.styleConfig.headerStyle).toBeUndefined()
	})

	it('Reset clears the header colours', () => {
		const wrapper = mountModal({ title: 'W', styleConfig: { headerStyle: { textColor: '#ff0000' } } })
		wrapper.vm.resetDraft()
		expect(wrapper.vm.draft.headerStyle).toEqual({ backgroundColor: '', textColor: '' })
	})
})
