import { mount } from '@vue/test-utils'
import CnMarkdownEditor from '@/components/CnMarkdownEditor/CnMarkdownEditor.vue'

// Stub the markdown renderer to a deterministic identity so the
// preview text is predictable without invoking the full marked
// pipeline.
jest.mock('@/composables/cnRenderMarkdown.js', () => ({
	cnRenderMarkdown: (s) => `<p>${s}</p>`,
}))

describe('CnMarkdownEditor', () => {
	it('renders with default split mode', () => {
		const wrapper = mount(CnMarkdownEditor)
		expect(wrapper.find('textarea').exists()).toBe(true)
		expect(wrapper.find('.cn-markdown-editor__preview').exists()).toBe(true)
	})

	it('hides textarea in preview-only mode', () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { mode: 'preview' } })
		expect(wrapper.find('textarea').exists()).toBe(false)
		expect(wrapper.find('.cn-markdown-editor__preview').exists()).toBe(true)
	})

	it('hides preview in edit-only mode', () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { mode: 'edit' } })
		expect(wrapper.find('textarea').exists()).toBe(true)
		expect(wrapper.find('.cn-markdown-editor__preview').exists()).toBe(false)
	})

	it('seeds localValue from value prop', () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { value: '# Hi' } })
		expect(wrapper.vm.localValue).toBe('# Hi')
	})

	it('emits input on textarea change', async () => {
		const wrapper = mount(CnMarkdownEditor)
		const ta = wrapper.find('textarea')
		ta.element.value = 'hello'
		await ta.trigger('input')
		expect(wrapper.emitted('input').pop()[0]).toBe('hello')
	})

	it('renders the toolbar with default buttons', () => {
		const wrapper = mount(CnMarkdownEditor)
		const tools = wrapper.findAll('.cn-markdown-editor__tool')
		// 8 default tools + 1 mode switch = 9
		expect(tools.length).toBe(9)
	})

	it('hides toolbar when hideToolbar is true', () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { hideToolbar: true } })
		expect(wrapper.find('.cn-markdown-editor__toolbar').exists()).toBe(false)
	})

	it('hides mode switch when hideModeSwitch is true', () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { hideModeSwitch: true } })
		expect(wrapper.find('[data-testid="mode-switch"]').exists()).toBe(false)
	})

	it('cycleMode emits update:mode', async () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { mode: 'split' } })
		wrapper.vm.cycleMode()
		expect(wrapper.emitted('update:mode').pop()[0]).toBe('preview')
	})

	it('invokeTool wraps selection with prefix + suffix', async () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { value: 'hello world' } })
		const ta = wrapper.find('textarea').element
		ta.setSelectionRange(6, 11) // select "world"
		const boldTool = wrapper.vm.toolbar.find((t) => t.id === 'bold')
		wrapper.vm.invokeTool(boldTool)
		expect(wrapper.emitted('input').pop()[0]).toBe('hello **world**')
	})

	it('invokeTool inserts placeholder when no selection', () => {
		const wrapper = mount(CnMarkdownEditor)
		const italic = wrapper.vm.toolbar.find((t) => t.id === 'italic')
		wrapper.vm.invokeTool(italic)
		expect(wrapper.emitted('input').pop()[0]).toBe('_italic_')
	})

	it('invokeTool h1 prefixes the current line', async () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { value: 'hello' } })
		const ta = wrapper.find('textarea').element
		ta.setSelectionRange(0, 0)
		const h1 = wrapper.vm.toolbar.find((t) => t.id === 'h1')
		wrapper.vm.invokeTool(h1)
		expect(wrapper.emitted('input').pop()[0]).toBe('# hello')
	})

	it('Ctrl+B applies bold', async () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { value: 'hi' } })
		const ta = wrapper.find('textarea')
		ta.element.setSelectionRange(0, 2)
		ta.trigger('keydown', { key: 'b', ctrlKey: true })
		expect(wrapper.emitted('input').pop()[0]).toBe('**hi**')
	})

	it('insertAtCaret inserts text at the caret', () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { value: 'hello world' } })
		const ta = wrapper.find('textarea').element
		ta.setSelectionRange(6, 6)
		wrapper.vm.insertAtCaret('beautiful ')
		expect(wrapper.emitted('input').pop()[0]).toBe('hello beautiful world')
	})

	it('renders the preview HTML from cnRenderMarkdown', () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { value: 'hello' } })
		expect(wrapper.find('.cn-markdown-editor__preview').html()).toContain('<p>hello</p>')
	})

	it('updates localValue when value prop changes', async () => {
		const wrapper = mount(CnMarkdownEditor, { propsData: { value: 'one' } })
		wrapper.setProps({ value: 'two' })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.localValue).toBe('two')
	})
})
