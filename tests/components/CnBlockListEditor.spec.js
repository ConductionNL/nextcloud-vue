/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnBlockListEditor: typed blocks in order, moved by drag or by button.
 *
 * @spec openspec/changes/block-list-editor/specs/block-list-editor/spec.md
 */
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import CnBlockListEditor from '../../src/components/CnBlockListEditor/CnBlockListEditor.vue'

const DraggableStub = {
	name: 'Draggable',
	props: ['modelValue', 'move', 'disabled'],
	emits: ['update:modelValue', 'change'],
	template: '<ol><template v-for="(element, index) in modelValue" :key="index"><slot name="item" :element="element" :index="index" /></template></ol>',
}

const stubs = {
	Draggable: DraggableStub,
	DragVertical: true,
	NcNoteCard: { template: '<div><slot /></div>' },
	NcButton: {
		props: ['disabled'],
		emits: ['click'],
		template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
	},
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'inputLabel'], template: '<div class="select" />' },
}

const types = [
	{ type: 'text', label: 'Text', create: () => ({ body: '' }) },
	{ type: 'note', label: 'Note' },
]

/** Mounts the editor as a host would: a parent that writes `update:modelValue` back. */
function mountEditor(blocks, props = {}, slots = {}) {
	const wrapper = mount(CnBlockListEditor, {
		attachTo: document.body,
		props: {
			modelValue: blocks,
			types,
			...props,
			'onUpdate:modelValue': (next) => wrapper.setProps({ modelValue: next }),
		},
		slots,
		global: { stubs },
	})
	return wrapper
}

function threeBlocks() {
	return [
		{ id: 'a', type: 'text' },
		{ id: 'b', type: 'text' },
		{ id: 'c', type: 'note' },
	]
}
const order = (w) => w.props('modelValue').map((block) => block.id)
const row = (w, index) => w.findAll('[data-testid="cn-block-list-block"]')[index]
const live = (w) => w.find('[data-testid="cn-block-list-live"]').text()

describe('CnBlockListEditor', () => {
	it('moves a block with the buttons, says where it landed and emits move', async () => {
		const w = mountEditor(threeBlocks())
		await row(w, 0).find('[data-move="down"]').trigger('click')
		expect(order(w)).toEqual(['b', 'a', 'c'])
		expect(live(w)).toBe('Block moved to position 2 of 3.')
		expect(w.emitted('move')[0][0]).toMatchObject({ from: 0, to: 1 })
	})

	it('keeps focus on the button that moved the block', async () => {
		const w = mountEditor(threeBlocks())
		await row(w, 0).find('[data-move="down"]').trigger('click')
		await nextTick()
		expect(document.activeElement).toBe(row(w, 1).find('[data-move="down"]').element)
	})

	it('hands focus to the other button when the block reached the end', async () => {
		const w = mountEditor(threeBlocks())
		await row(w, 1).find('[data-move="down"]').trigger('click')
		await nextTick()
		expect(document.activeElement).toBe(row(w, 2).find('[data-move="up"]').element)
	})

	it('names each control by action, type and position, so two blocks of a type differ', () => {
		const w = mountEditor(threeBlocks())
		expect(row(w, 0).find('[data-move="up"]').attributes('aria-label')).toBe('Move up: Text block 1')
		expect(row(w, 1).find('[data-move="up"]').attributes('aria-label')).toBe('Move up: Text block 2')
	})

	it('refuses a move off the list', async () => {
		const w = mountEditor(threeBlocks())
		expect(row(w, 0).find('[data-move="up"]').attributes('disabled')).toBeDefined()
		expect(row(w, 2).find('[data-move="down"]').attributes('disabled')).toBeDefined()
		w.vm.move(0, -1)
		expect(w.emitted('update:modelValue')).toBeUndefined()
	})

	it('announces a drag and reports the move', async () => {
		const w = mountEditor(threeBlocks())
		const drag = w.findComponent({ name: 'Draggable' })
		const [a, b, c] = threeBlocks()
		drag.vm.$emit('update:modelValue', [b, c, a])
		drag.vm.$emit('change', { moved: { element: a, oldIndex: 0, newIndex: 2 } })
		await nextTick()
		expect(order(w)).toEqual(['b', 'c', 'a'])
		expect(live(w)).toBe('Block moved to position 3 of 3.')
	})

	it('keeps a pinned block in place: no controls, no give way, no drag past it', async () => {
		const blocks = [{ id: 'a', type: 'text' }, { id: 'z', type: 'note', pinned: true }]
		const w = mountEditor(blocks)
		expect(row(w, 1).find('[data-move="up"]').exists()).toBe(false)
		expect(row(w, 1).find('[data-action="remove"]').exists()).toBe(false)
		expect(row(w, 0).find('[data-move="down"]').attributes('disabled')).toBeDefined()
		const { move } = w.findComponent({ name: 'Draggable' }).props()
		expect(move({ relatedContext: { element: blocks[1] } })).toBe(false)
		expect(move({ relatedContext: { element: blocks[0] } })).toBe(true)
	})

	it('adds a block above a pinned end, with the fields of its type', async () => {
		const w = mountEditor([{ id: 'a', type: 'text' }, { id: 'z', type: 'note', pinned: true }])
		await w.find('[data-add="text"]').trigger('click')
		const list = w.props('modelValue')
		expect(list.map((block) => block.type)).toEqual(['text', 'text', 'note'])
		expect(list[1].body).toBe('')
		expect(list[1].id).toBeTruthy()
		expect(list[1].id).not.toBe('a')
		expect(live(w)).toBe('Text block added at position 2.')
		expect(w.emitted('add')[0][0].index).toBe(1)
	})

	it('stores the id of a new block under idKey', async () => {
		const w = mountEditor([], { idKey: 'blockId' })
		await w.find('[data-add="note"]').trigger('click')
		expect(w.props('modelValue')[0].blockId).toBeTruthy()
		expect(w.props('modelValue')[0].id).toBeUndefined()
	})

	it('offers the types as a field with an add button in select mode', async () => {
		const w = mountEditor([], { palette: 'select' })
		expect(w.find('[data-add="text"]').exists()).toBe(false)
		expect(w.findComponent({ name: 'NcSelect' }).props('inputLabel')).toBe('Block type')
		await w.find('[data-action="add"]').trigger('click')
		expect(w.props('modelValue')[0].type).toBe('text')
	})

	it('removes a block and moves focus to the block in its place', async () => {
		const w = mountEditor(threeBlocks())
		await row(w, 0).find('[data-action="remove"]').trigger('click')
		await nextTick()
		expect(order(w)).toEqual(['b', 'c'])
		expect(row(w, 0).element.contains(document.activeElement)).toBe(true)
		expect(live(w)).toBe('Block removed.')
	})

	it('moves focus to the palette when the last block goes', async () => {
		const w = mountEditor([{ id: 'a', type: 'text' }])
		await w.find('[data-action="remove"]').trigger('click')
		await nextTick()
		expect(w.find('[data-testid="cn-block-list-empty"]').exists()).toBe(true)
		expect(document.activeElement).toBe(w.find('[data-add="text"]').element)
	})

	it('hands the editor slot of a type its block and an update', async () => {
		const w = mountEditor(threeBlocks(), {}, {
			'block-text': ({ block, update }) => h('button', { class: 'edit', onClick: () => update({ body: block.id + '!' }) }, block.id),
			block: ({ block }) => h('span', { class: 'fallback' }, block.type),
		})
		expect(w.findAll('.edit')).toHaveLength(2)
		expect(w.find('.fallback').text()).toBe('note')
		await w.findAll('.edit')[1].trigger('click')
		expect(w.props('modelValue')[1]).toEqual({ id: 'b', type: 'text', body: 'b!' })
		expect(w.props('modelValue')[0]).toEqual({ id: 'a', type: 'text' })
	})

	it('shows an editor only after its name is pressed when collapsible', async () => {
		const w = mountEditor(threeBlocks(), { collapsible: true }, {
			block: () => h('span', { class: 'editor' }),
			'block-text': () => h('span', { class: 'editor' }),
		})
		expect(w.findAll('.editor')).toHaveLength(0)
		const toggle = row(w, 1).find('[data-testid="cn-block-list-toggle"]')
		expect(toggle.attributes('aria-expanded')).toBe('false')
		await toggle.trigger('click')
		expect(toggle.attributes('aria-expanded')).toBe('true')
		expect(row(w, 1).find('.editor').exists()).toBe(true)
		expect(row(w, 0).find('.editor').exists()).toBe(false)
	})

	describe('a draft', () => {
		const withDraft = () => [{ id: 'a', type: 'text' }, { id: 'b', type: 'text', draft: { note: 'Check it first.' } }]

		it('says which block waits, and reports it to the host', async () => {
			const w = mountEditor(withDraft())
			expect(w.find('[data-testid="cn-block-list-draft-notice"]').text()).toBe('Block 2 is still a draft. Keep or discard it first.')
			expect(w.find('[data-testid="cn-block-list-draft"]').text()).toContain('Check it first.')
			expect(w.emitted('pending-drafts')[0][0]).toEqual([2])
		})

		it('stops being a draft when kept, and the notice goes', async () => {
			const w = mountEditor(withDraft())
			await w.find('[data-action="keep"]').trigger('click')
			await nextTick()
			expect(w.props('modelValue')[1]).toEqual({ id: 'b', type: 'text' })
			expect(w.find('[data-testid="cn-block-list-draft-notice"]').exists()).toBe(false)
			expect(w.emitted('pending-drafts').at(-1)[0]).toEqual([])
			expect(live(w)).toBe('Draft kept.')
			expect(row(w, 1).element.contains(document.activeElement)).toBe(true)
		})

		it('leaves the list when discarded', async () => {
			const w = mountEditor(withDraft())
			await w.find('[data-action="discard"]').trigger('click')
			expect(order(w)).toEqual(['a'])
			expect(w.emitted('discard-draft')[0][0].block.id).toBe('b')
			expect(live(w)).toBe('Draft discarded.')
		})
	})

	it('reads only when disabled', () => {
		const w = mountEditor(threeBlocks(), { disabled: true })
		expect(w.find('[data-testid="cn-block-list-palette"]').exists()).toBe(false)
		expect(row(w, 1).find('[data-move="up"]').attributes('disabled')).toBeDefined()
		expect(row(w, 1).find('[data-action="remove"]').attributes('disabled')).toBeDefined()
		expect(w.findComponent({ name: 'Draggable' }).props('disabled')).toBe(true)
	})

	it('renders through the real vuedraggable, with the list named', () => {
		const w = mount(CnBlockListEditor, {
			props: { modelValue: threeBlocks(), types },
			global: { stubs: { DragVertical: true, NcNoteCard: true, NcSelect: true, NcButton: stubs.NcButton } },
		})
		expect(w.find('ol').attributes('aria-label')).toBe('Blocks')
		expect(w.findAll('ol > li')).toHaveLength(3)
	})

	it('takes its texts from labels', () => {
		const w = mountEditor([{ id: 'a', type: 'text', draft: true }], {
			labels: { moved: 'Naar {position}/{total}', draftNotice: 'Er staat nog een AI-concept in blok {position}.', draft: 'AI-concept' },
		})
		expect(w.find('[data-testid="cn-block-list-draft-notice"]').text()).toBe('Er staat nog een AI-concept in blok 1.')
		expect(w.find('[data-testid="cn-block-list-draft"] strong').text()).toBe('AI-concept')
	})
})
