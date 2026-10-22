/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The note box is a contenteditable textbox. A placeholder is not a name, so
 * without one a screen reader announces an unnamed edit field (axe
 * aria-input-field-name, WCAG 4.1.2). The composer names it, without a
 * visible label, so the look does not change.
 */
import { mount } from '@vue/test-utils'
import CnNoteComposer from '../../src/components/CnNoteComposer/CnNoteComposer.vue'

const RichStub = {
	name: 'NcRichContenteditable',
	props: ['modelValue', 'placeholder', 'autoComplete', 'multiline'],
	template: '<div class="rich-contenteditable"><div class="rich-contenteditable__input" contenteditable="plaintext-only" role="textbox" :aria-placeholder="placeholder" /></div>',
}

function mountComposer(props = {}) {
	return mount(CnNoteComposer, {
		propsData: props,
		stubs: { NcRichContenteditable: RichStub },
	})
}

describe('CnNoteComposer — accessible name', () => {
	it('names the editable box "Note" by default', () => {
		const w = mountComposer()
		expect(w.find('[contenteditable]').attributes('aria-label')).toBe('Note')
	})

	it('takes the name from the label prop', () => {
		const w = mountComposer({ label: 'Reply to the requester' })
		expect(w.find('[contenteditable]').attributes('aria-label')).toBe('Reply to the requester')
	})

	it('follows a changed label', async () => {
		const w = mountComposer({ label: 'Note' })
		await w.setProps({ label: 'Internal note' })
		expect(w.find('[contenteditable]').attributes('aria-label')).toBe('Internal note')
	})
})
