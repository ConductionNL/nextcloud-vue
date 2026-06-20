/**
 * Tests for CnWidgetStyleEditorModal (cn-widget-library, Wave 4 — chrome).
 *
 * Covers the pure-editor contract: the draft re-seeds from the passed widget on
 * open, Reset never touches the live widget, and Save mutates the *passed*
 * widget's `styleConfig` in place (not a copy of the defaults) and emits it.
 * Cancel / Esc discard the draft without mutating. NcModal / NcButton / NcSelect
 * / NcColorPicker / NcTextField / NcCheckboxRadioSwitch are stubbed via
 * tests/__mocks__/nextcloud-vue.js.
 */

import { mount } from '@vue/test-utils'
import CnWidgetStyleEditorModal from '../../src/modals/CnWidgetStyleEditorModal.vue'

/**
 * Mount the modal over a fresh widget object.
 *
 * @param {object} widget the widget chrome to edit.
 * @param {object} [extraProps] extra props to pass.
 * @return {object} the wrapper.
 */
function mountModal(widget, extraProps = {}) {
	return mount(CnWidgetStyleEditorModal, {
		propsData: { show: true, widget, ...extraProps },
	})
}

describe('CnWidgetStyleEditorModal', () => {
	it('seeds the draft from the widget chrome + styleConfig', () => {
		const widget = {
			title: 'Sales',
			showTitle: false,
			customTitle: 'My title',
			styleConfig: { backgroundColor: '#ff0000', borderRadius: 4 },
		}
		const wrapper = mountModal(widget)
		expect(wrapper.vm.draft.showTitle).toBe(false)
		expect(wrapper.vm.draft.customTitle).toBe('My title')
		expect(wrapper.vm.draft.backgroundColor).toBe('#ff0000')
		expect(wrapper.vm.draft.borderRadius).toBe(4)
	})

	it('Save mutates the passed widget styleConfig in place, not a copy of base', () => {
		const widget = { title: 'Sales', styleConfig: { backgroundColor: '#000000' } }
		const styleConfigRef = widget.styleConfig
		const wrapper = mountModal(widget)
		wrapper.vm.draft.backgroundColor = '#123456'
		wrapper.vm.onSave()
		// Same object reference — Save wrote onto the live styleConfig, not a clone.
		expect(widget.styleConfig).toBe(styleConfigRef)
		expect(widget.styleConfig.backgroundColor).toBe('#123456')
	})

	it('Save writes chrome fields onto the widget and emits the same object', () => {
		const widget = { title: 'Sales', styleConfig: {} }
		const wrapper = mountModal(widget)
		wrapper.vm.draft.showTitle = true
		wrapper.vm.draft.customTitle = 'Overridden'
		wrapper.vm.onSave()
		expect(widget.showTitle).toBe(true)
		expect(widget.customTitle).toBe('Overridden')
		expect(wrapper.emitted('save')).toBeTruthy()
		expect(wrapper.emitted('save')[0][0]).toBe(widget)
	})

	it('creates styleConfig when the widget has none', () => {
		const widget = { title: 'Sales' }
		const wrapper = mountModal(widget)
		wrapper.vm.draft.backgroundColor = '#abcdef'
		wrapper.vm.onSave()
		expect(widget.styleConfig).toBeTruthy()
		expect(widget.styleConfig.backgroundColor).toBe('#abcdef')
	})

	it('empty colour / title persist as null on Save', () => {
		const widget = { title: 'Sales', styleConfig: { backgroundColor: '#fff' }, customTitle: 'x' }
		const wrapper = mountModal(widget)
		wrapper.vm.draft.backgroundColor = ''
		wrapper.vm.draft.customTitle = ''
		wrapper.vm.onSave()
		expect(widget.styleConfig.backgroundColor).toBeNull()
		expect(widget.customTitle).toBeNull()
	})

	it('Reset clears the draft without touching the live widget', () => {
		const widget = { title: 'Sales', styleConfig: { backgroundColor: '#ff0000' }, customTitle: 'keep' }
		const wrapper = mountModal(widget)
		wrapper.vm.resetDraft()
		expect(wrapper.vm.draft.backgroundColor).toBe('')
		expect(wrapper.vm.draft.customTitle).toBe('')
		// Live widget is untouched until Save.
		expect(widget.styleConfig.backgroundColor).toBe('#ff0000')
		expect(widget.customTitle).toBe('keep')
	})

	it('selectedIcon round-trips a picked icon into draft.customIcon', () => {
		const widget = { title: 'Sales', styleConfig: {} }
		const wrapper = mountModal(widget)
		const option = wrapper.vm.iconOptions[3]
		wrapper.vm.selectedIcon = option
		expect(wrapper.vm.draft.customIcon).toBe(option.icon)
		expect(wrapper.vm.selectedIcon).toBe(option)
	})

	it('re-seeds the draft when the modal re-opens', async () => {
		const widget = { title: 'Sales', styleConfig: { backgroundColor: '#111111' } }
		const wrapper = mount(CnWidgetStyleEditorModal, { propsData: { show: false, widget } })
		await wrapper.setProps({ show: true })
		expect(wrapper.vm.draft.backgroundColor).toBe('#111111')
	})

	it('Cancel emits close and never save or mutates the widget', () => {
		const widget = { title: 'Sales', styleConfig: { backgroundColor: '#ff0000' } }
		const wrapper = mountModal(widget)
		wrapper.vm.draft.backgroundColor = '#changed'
		wrapper.vm.onCancel()
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(wrapper.emitted('save')).toBeFalsy()
		expect(widget.styleConfig.backgroundColor).toBe('#ff0000')
	})

	it('Esc emits close and never save', () => {
		const widget = { title: 'Sales', styleConfig: {} }
		const wrapper = mountModal(widget)
		wrapper.vm.onKeydown({ key: 'Escape' })
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(wrapper.emitted('save')).toBeFalsy()
	})

	it('Delete emits delete with the widget', () => {
		const widget = { title: 'Sales', styleConfig: {} }
		const wrapper = mountModal(widget, { deletable: true })
		wrapper.vm.onDelete()
		expect(wrapper.emitted('delete')).toBeTruthy()
		expect(wrapper.emitted('delete')[0][0]).toBe(widget)
	})

	it('hides the Delete button when not deletable', () => {
		const widget = { title: 'Sales', styleConfig: {} }
		const wrapper = mountModal(widget, { deletable: false })
		expect(wrapper.find('[data-testid="cn-widget-style-delete"]').exists()).toBe(false)
	})
})
