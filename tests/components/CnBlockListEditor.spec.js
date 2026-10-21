/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnBlockListEditor: a palette adds typed blocks, the list reorders by
 * buttons and by the arrow keys with every move announced, a pinned type
 * stays last, and the picked block's fields edit its props, fixed tokens
 * included.
 */

import { mount } from '@vue/test-utils'
import CnBlockListEditor from '../../src/components/CnBlockListEditor/CnBlockListEditor.vue'

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, vars = {}) => text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')),
	getLanguage: () => 'en',
}))

const TOKENS = [
	{ token: '{{address}}', label: 'Your physical address' },
	{ token: '{{unsubscribe}}', label: 'The unsubscribe link' },
]

const types = [
	{ type: 'heading', label: 'Heading', fields: [{ key: 'text', label: 'Heading text', default: '' }, { key: 'level', label: 'Size', type: 'select', default: 2, options: [{ value: 1, label: 'Large' }, { value: 2, label: 'Medium' }] }] },
	{ type: 'text', label: 'Text', fields: [{ key: 'markdown', label: 'Text', type: 'markdown' }] },
	{ type: 'image', label: 'Image', fields: [{ key: 'src', label: 'Image address' }, { key: 'alt', label: 'Alternative text', required: true, requiredHint: 'Describe the image.' }] },
	{ type: 'footer', label: 'Footer', addable: false, fields: [{ key: 'text', label: 'Footer text', type: 'textarea', fixedTokens: TOKENS }] },
]

function start() {
	return [
		{ id: 'h', type: 'heading', props: { text: 'Hello' } },
		{ id: 'f', type: 'footer', props: { text: 'Bye\n{{address}}\n{{unsubscribe}}' } },
		{ id: 'i', type: 'image', props: { src: 'https://example.org/a.png' } },
	]
}

/**
 * Mount with v-model wired to a local array.
 *
 * @param {Array<object>} blocks The starting blocks.
 * @return {{wrapper: object, value: () => Array<object>}}
 */
function mountEditor(blocks = start()) {
	let current = blocks
	const wrapper = mount(CnBlockListEditor, {
		attachTo: document.body,
		propsData: {
			modelValue: current,
			types,
			pinnedLast: 'footer',
			'onUpdate:modelValue': (next) => {
				current = next
				wrapper.setProps({ modelValue: next })
			},
		},
		global: { stubs: { CnMarkdownEditor: { props: ['modelValue'], template: '<textarea />' } } },
	})
	return { wrapper, value: () => current }
}

const order = (blocks) => blocks.map((b) => b.id)

describe('CnBlockListEditor', () => {
	it('keeps the pinned type last and offers no move or remove for it', () => {
		const { wrapper } = mountEditor()
		expect(wrapper.findAll('li').map((li) => li.attributes('data-testid'))).toEqual(['cn-block-heading', 'cn-block-image', 'cn-block-footer'])
		expect(wrapper.find('[data-testid="cn-block-remove-f"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-block-handle-f"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-block-add-footer"]').exists()).toBe(false)
	})

	it('adds a block before the pinned one, with the field defaults, and selects it', async () => {
		const { wrapper, value } = mountEditor()
		await wrapper.find('[data-testid="cn-block-add-heading"]').trigger('click')
		const blocks = value()
		expect(blocks.map((b) => b.type)).toEqual(['heading', 'image', 'heading', 'footer'])
		expect(blocks[2].props).toEqual({ text: '', level: 2 })
		expect(wrapper.find('[data-testid="cn-block-properties"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-block-list-live"]').text()).toBe('Heading added')
	})

	it('moves a block with the buttons and announces where it went, never past the pinned one', async () => {
		const { wrapper, value } = mountEditor()
		await wrapper.find('[data-testid="cn-block-down-h"]').trigger('click')
		expect(order(value())).toEqual(['i', 'h', 'f'])
		expect(wrapper.find('[data-testid="cn-block-list-live"]').text()).toBe('Heading moved to position 2 of 3')
		expect(wrapper.find('[data-testid="cn-block-down-h"]').attributes('disabled')).toBeDefined()
	})

	it('moves a block with the arrow keys on its handle', async () => {
		const { wrapper, value } = mountEditor()
		await wrapper.find('[data-testid="cn-block-handle-i"]').trigger('keydown', { key: 'ArrowUp' })
		expect(order(value())).toEqual(['i', 'h', 'f'])
	})

	it('removes a block and announces it', async () => {
		const { wrapper, value } = mountEditor()
		await wrapper.find('[data-testid="cn-block-remove-i"]').trigger('click')
		expect(order(value())).toEqual(['h', 'f'])
		expect(wrapper.find('[data-testid="cn-block-list-live"]').text()).toBe('Image removed')
	})

	it('edits the props of the picked block through its fields, and flags a missing required one', async () => {
		const { wrapper, value } = mountEditor()
		await wrapper.find('[data-testid="cn-block-select-i"]').trigger('click')
		const alt = wrapper.findAllComponents({ name: 'NcTextField' }).find((c) => c.attributes('label') === 'Alternative text')
		expect(alt.attributes('error')).toBe('true')
		alt.vm.$emit('update:modelValue', 'A logo')
		expect(value().find((b) => b.id === 'i').props).toEqual({ src: 'https://example.org/a.png', alt: 'A logo' })
	})

	it('shows a field without its fixed tokens and keeps them at the end', async () => {
		const { wrapper, value } = mountEditor()
		await wrapper.find('[data-testid="cn-block-select-f"]').trigger('click')
		const text = wrapper.findAllComponents({ name: 'NcTextArea' }).find((c) => c.attributes('label') === 'Footer text')
		expect(text.attributes('modelvalue')).toBe('Bye')
		expect(wrapper.find('[data-testid="cn-block-fixed-tokens"]').text()).toContain('The unsubscribe link')
		text.vm.$emit('update:modelValue', 'See you {{unsubscribe}}')
		expect(value().find((b) => b.id === 'f').props.text).toBe('See you\n{{address}}\n{{unsubscribe}}')
	})

	it('drops a palette type on a position', async () => {
		const { wrapper, value } = mountEditor()
		await wrapper.find('[data-testid="cn-block-add-text"]').trigger('dragstart')
		await wrapper.find('[data-testid="cn-block-heading"]').trigger('drop')
		expect(value().map((b) => b.type)).toEqual(['text', 'heading', 'image', 'footer'])
	})

	it('stops adding at maxBlocks', async () => {
		const { wrapper } = mountEditor()
		await wrapper.setProps({ maxBlocks: 3 })
		expect(wrapper.find('[data-testid="cn-block-add-heading"]').attributes('disabled')).toBeDefined()
	})
})
