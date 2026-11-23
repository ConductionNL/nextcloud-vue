/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/markdown-editor-variables/tasks.md#task-1
 * @spec openspec/changes/markdown-editor-variables/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnMarkdownEditor from '@/components/CnMarkdownEditor/CnMarkdownEditor.vue'
import { templateVariables, unknownTemplateVariables } from '@/utils/templateVariables.js'

jest.mock('@/composables/cnRenderMarkdown.js', () => ({
	cnRenderMarkdown: (s) => `<p>${s}</p>`,
}))

const stubs = {
	NcActions: { props: ['menuName'], template: '<div class="menu" :data-name="menuName"><slot /></div>' },
	NcActionButton: { props: ['description'], emits: ['click'], template: '<button class="item" :data-description="description" @click="$emit(\'click\')"><slot /></button>' },
}

const VARIABLES = [{ name: 'naam', label: 'Name' }, 'case', { name: 'datum', description: 'The date of the letter' }]

/**
 * Mount the editor in edit mode.
 *
 * @param {object} propsData Props.
 * @return {object} The wrapper.
 */
function mountEditor(propsData = {}) {
	return mount(CnMarkdownEditor, { propsData: { mode: 'edit', variables: VARIABLES, ...propsData }, global: { stubs }, stubs })
}

describe('templateVariables', () => {
	it('reads each variable once, with or without a format', () => {
		expect(templateVariables('Dear {naam}, on {datum|date} for {naam}')).toEqual(['naam', 'datum'])
	})

	it('allows a dotted name under a listed prefix only', () => {
		expect(unknownTemplateVariables('{case.number} {cases.x} {besluit}', ['case'])).toEqual(['cases.x', 'besluit'])
	})
})

describe('CnMarkdownEditor variables', () => {
	it('offers each variable in the insert menu, by label', () => {
		const w = mountEditor()
		expect(w.find('.menu').attributes('data-name')).toBe('Insert variable')
		expect(w.findAll('.item').map((b) => b.text())).toEqual(['Name', 'case', 'datum'])
		expect(w.findAll('.item')[2].attributes('data-description')).toBe('The date of the letter')
	})

	it('inserts {name} at the caret', async () => {
		const w = mountEditor({ modelValue: 'Dear ' })
		const ta = w.find('textarea').element
		ta.setSelectionRange(5, 5)
		await w.findAll('.item')[0].trigger('click')
		expect(w.emitted('update:modelValue').pop()[0]).toBe('Dear {naam}')
	})

	it('names an unknown variable and emits it', async () => {
		const w = mountEditor({ modelValue: 'Dear {naam}' })
		expect(w.find('[data-testid="cn-markdown-unknown-variables"]').exists()).toBe(false)
		await w.find('textarea').setValue('Dear {naam}, {besluit}')
		expect(w.find('[role="alert"]').text()).toBe('Unknown variable: {besluit}.')
		expect(w.emitted('unknown-variables').pop()[0]).toEqual(['besluit'])
		await w.find('textarea').setValue('Dear {naam}')
		expect(w.find('[role="alert"]').exists()).toBe(false)
		expect(w.emitted('unknown-variables').pop()[0]).toEqual([])
	})

	it('uses the host text, with {names} filled', async () => {
		const w = mountEditor({ modelValue: '{besluit} {x}', unknownVariableText: 'Onbekende variabele: {names}. Niet opgeslagen.' })
		expect(w.find('[role="alert"]').text()).toBe('Onbekende variabele: {besluit}, {x}. Niet opgeslagen.')
	})

	it('checks nothing and shows no menu without variables', () => {
		const w = mountEditor({ variables: [], modelValue: '{anything}' })
		expect(w.find('[data-testid="cn-markdown-variables"]').exists()).toBe(false)
		expect(w.find('[role="alert"]').exists()).toBe(false)
		expect(w.emitted('unknown-variables')).toBeUndefined()
	})
})
