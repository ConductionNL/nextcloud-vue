/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMarkdownEditor writes variables in another syntax, and works as a
 * plain-text field.
 *
 * @spec openspec/changes/markdown-editor-variable-syntax-plain-text/specs/markdown-editor/spec.md
 */
import { mount } from '@vue/test-utils'
import CnMarkdownEditor from '@/components/CnMarkdownEditor/CnMarkdownEditor.vue'
import { isVariableSyntax, plainTextPreview, templateVariables, unknownVariablesIn } from '@/utils/templateVariables.js'

jest.mock('@/composables/cnRenderMarkdown.js', () => ({
	cnRenderMarkdown: (s) => `<p>markdown:${s}</p>`,
}))

const stubs = {
	NcActions: { props: ['menuName'], template: '<div class="menu"><slot /></div>' },
	NcActionButton: { props: ['description'], emits: ['click'], template: '<button class="item" :data-description="description" @click="$emit(\'click\')"><slot /></button>' },
}

const VARIABLES = ['naam', 'case']

function mountEditor(props = {}) {
	return mount(CnMarkdownEditor, { props: { mode: 'edit', variables: VARIABLES, ...props }, global: { stubs } })
}

describe('a variable syntax', () => {
	it('accepts a syntax with marks on both sides of name only', () => {
		expect(isVariableSyntax('{{name}}')).toBe(true)
		expect(isVariableSyntax('name}}')).toBe(false)
		expect(isVariableSyntax('{{name')).toBe(false)
		expect(isVariableSyntax('{{x}}')).toBe(false)
	})

	it('reads {{name}} with or without spaces, and not the single-brace form', () => {
		expect(templateVariables('Dear {{ naam }}, case {{case.number}}, {other}', '{{name}}')).toEqual(['naam', 'case.number'])
	})

	it('inserts the variable in the syntax and describes it that way', async () => {
		const w = mountEditor({ modelValue: 'Dear ', variableSyntax: '{{name}}' })
		w.find('textarea').element.setSelectionRange(5, 5)
		expect(w.findAll('.item')[0].attributes('data-description')).toBe('{{naam}}')
		await w.findAll('.item')[0].trigger('click')
		expect(w.emitted('update:modelValue').pop()[0]).toBe('Dear {{naam}}')
	})

	it('names an unknown variable in the syntax', () => {
		const w = mountEditor({ modelValue: 'Dear {{naam}} {{besluit}}', variableSyntax: '{{name}}' })
		expect(w.find('[data-testid="cn-markdown-unknown-variables"]').text()).toBe('Unknown variable: {{besluit}}.')
		expect(w.emitted('unknown-variables')[0][0]).toEqual(['besluit'])
	})

	it('keeps {name} as the default', () => {
		expect(unknownVariablesIn('{naam} {x}', { allowed: ['naam'] })).toEqual(['x'])
	})
})

describe('plain text', () => {
	it('draws no formatting tools and ignores the Markdown keys', async () => {
		const w = mountEditor({ modelValue: 'Hello', plainText: true })
		expect(w.find('[data-testid="tool-bold"]').exists()).toBe(false)
		expect(w.find('[data-testid="mode-switch"]').exists()).toBe(true)
		const ta = w.find('textarea')
		ta.element.setSelectionRange(0, 5)
		await ta.trigger('keydown', { key: 'b', ctrlKey: true })
		expect(w.emitted('update:modelValue')).toBeUndefined()
	})

	it('keeps the Markdown tools without the option', () => {
		const w = mountEditor({ modelValue: 'Hello' })
		expect(w.find('[data-testid="tool-bold"]').exists()).toBe(true)
	})

	it('previews the text as written, escaped, with its variables marked', () => {
		const w = mountEditor({ modelValue: '<b>Dear</b> {{naam}}\n{{besluit}}', plainText: true, mode: 'preview', variableSyntax: '{{name}}' })
		const html = w.find('[data-testid="cn-markdown-preview"]').element.innerHTML
		expect(html).toBe('&lt;b&gt;Dear&lt;/b&gt; <span class="cn-markdown-editor__var">{{naam}}</span><br><span class="cn-markdown-editor__var cn-markdown-editor__var--unknown">{{besluit}}</span>')
	})

	it('edits instead of opening WYSIWYG, and cycles past it', async () => {
		const w = mountEditor({ modelValue: 'x', plainText: true, mode: 'wysiwyg' })
		expect(w.find('textarea').exists()).toBe(true)
		expect(w.find('[data-testid="cn-markdown-wysiwyg"]').exists()).toBe(false)
		await w.setProps({ mode: 'preview' })
		await w.find('[data-testid="mode-switch"]').trigger('click')
		expect(w.emitted('update:mode').pop()[0]).toBe('edit')
	})

	it('marks no variable unknown without a list of allowed names', () => {
		expect(plainTextPreview('{a}', { allowed: [] })).toBe('<span class="cn-markdown-editor__var">{a}</span>')
	})
})
