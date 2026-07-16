import { mount } from '@vue/test-utils'
import CnThemePreview from '@/components/CnThemePreview/CnThemePreview.vue'

const pickers = [
	{ key: 'primary', label: 'Primary', default: '#21468B' },
	{ key: 'background', label: 'Background', default: '#FFFFFF' },
	{ key: 'text', label: 'Text', default: '#1B1B1B' },
]

describe('CnThemePreview', () => {
	it('seeds the model from picker defaults', () => {
		const wrapper = mount(CnThemePreview, { propsData: { pickers } })
		expect(wrapper.vm.model).toEqual({ primary: '#21468B', background: '#FFFFFF', text: '#1B1B1B' })
	})

	it('value prop overrides picker defaults', () => {
		const wrapper = mount(CnThemePreview, {
			propsData: { pickers, value: { primary: '#FF0000' } },
		})
		expect(wrapper.vm.model.primary).toBe('#FF0000')
	})

	it('renders one picker per declaration', () => {
		const wrapper = mount(CnThemePreview, { propsData: { pickers } })
		expect(wrapper.findAll('input[type="color"]').length).toBe(3)
	})

	it('emits change + input on picker mutation', async () => {
		const wrapper = mount(CnThemePreview, { propsData: { pickers } })
		wrapper.vm.onPickerChange('primary', '#FF8800')
		expect(wrapper.emitted('change').pop()[0].primary).toBe('#FF8800')
		expect(wrapper.emitted('input').pop()[0].primary).toBe('#FF8800')
	})

	it('renders the preview panel with inline CSS variables', () => {
		const wrapper = mount(CnThemePreview, { propsData: { pickers } })
		const panel = wrapper.find('[data-testid="cn-theme-preview-panel"]')
		const styleAttr = panel.attributes('style')
		expect(styleAttr).toContain('--primary')
		expect(styleAttr.toLowerCase()).toContain('21468b')
	})

	it('shows the Reset button when defaults are provided', () => {
		const wrapper = mount(CnThemePreview, {
			propsData: { pickers, defaults: { primary: '#21468B', background: '#FFFFFF', text: '#1B1B1B' } },
		})
		expect(wrapper.find('.cn-theme-preview__reset').exists()).toBe(true)
	})

	it('hides the Reset button when defaults are null', () => {
		const wrapper = mount(CnThemePreview, { propsData: { pickers } })
		expect(wrapper.find('.cn-theme-preview__reset').exists()).toBe(false)
	})

	it('disables Reset when the model equals defaults', () => {
		const wrapper = mount(CnThemePreview, {
			propsData: { pickers, defaults: { primary: '#21468B', background: '#FFFFFF', text: '#1B1B1B' } },
		})
		const btn = wrapper.find('.cn-theme-preview__reset')
		expect(btn.attributes('disabled')).toBeDefined()
	})

	it('enables Reset after a colour change', async () => {
		const wrapper = mount(CnThemePreview, {
			propsData: { pickers, defaults: { primary: '#21468B', background: '#FFFFFF', text: '#1B1B1B' } },
		})
		wrapper.vm.onPickerChange('primary', '#FF0000')
		await wrapper.vm.$nextTick()
		const btn = wrapper.find('.cn-theme-preview__reset')
		expect(btn.attributes('disabled')).toBeUndefined()
	})

	it('reset() restores the defaults + emits change', async () => {
		const defaults = { primary: '#21468B', background: '#FFFFFF', text: '#1B1B1B' }
		const wrapper = mount(CnThemePreview, { propsData: { pickers, defaults } })
		wrapper.vm.onPickerChange('primary', '#FF0000')
		wrapper.vm.reset()
		expect(wrapper.vm.model).toEqual(defaults)
		expect(wrapper.emitted('change').pop()[0]).toEqual(defaults)
	})

	it('falls back to #000000 when no default + no value', () => {
		const wrapper = mount(CnThemePreview, {
			propsData: { pickers: [{ key: 'k', label: 'K' }] },
		})
		expect(wrapper.vm.model.k).toBe('#000000')
	})

	it('non-string values are ignored', async () => {
		const wrapper = mount(CnThemePreview, { propsData: { pickers } })
		const before = wrapper.vm.model.primary
		wrapper.vm.onPickerChange('primary', null)
		expect(wrapper.vm.model.primary).toBe(before)
	})
})
