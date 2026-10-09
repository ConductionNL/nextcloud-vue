/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board dialog (screens-dialog-parity tasks 2 to 7): width by role, the
 * eyebrow and subtitle, the frame, the footer order, the destructive sentence
 * and type-to-confirm. The Nextcloud look is asserted unchanged next to each.
 *
 * @spec openspec/changes/screens-dialog-parity/tasks.md
 */
import { mount } from '@vue/test-utils'
import CnDialog from '../../src/components/CnDialog/CnDialog.vue'
import CnDeleteDialog from '../../src/components/CnDeleteDialog/CnDeleteDialog.vue'
import CnCopyDialog from '../../src/components/CnCopyDialog/CnCopyDialog.vue'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnMassDeleteDialog from '../../src/components/CnMassDeleteDialog/CnMassDeleteDialog.vue'
import CnRichSubmitDialog from '../../src/components/CnRichSubmitDialog/CnRichSubmitDialog.vue'
import CnTabbedFormDialog from '../../src/components/CnTabbedFormDialog/CnTabbedFormDialog.vue'
import CnWizardDialog from '../../src/components/CnWizardDialog/CnWizardDialog.vue'
import CnConfirmDialog from '../../src/dialogs/CnConfirmDialog.vue'
import { DIALOG_WIDTHS, resolveDialogWidth } from '../../src/utils/dialogWidths.js'
import { splitAroundPlaceholder } from '../../src/utils/dialogSentence.js'

const board = { global: { provide: { cnLook: 'board' } } }
const footerButtons = (wrapper) => wrapper.findAll('.stub.NcButton:not(.cn-dialog-header__close), [data-testid="cn-dialog-tertiary"]')
const dialogEl = (wrapper) => wrapper.find('.stub.NcDialog')
const widthOf = (wrapper) => dialogEl(wrapper).element.style.getPropertyValue('--cn-dialog-width')

describe('dialog widths (task 2)', () => {
	it('knows exactly three widths', () => {
		expect(DIALOG_WIDTHS).toEqual({ confirm: 560, form: 640, wizard: 720 })
	})

	it('resolves a role, falls back to the component default, never to a fourth width', () => {
		expect(resolveDialogWidth('wizard', 'confirm')).toEqual({ role: 'wizard', px: 720 })
		expect(resolveDialogWidth('', 'confirm')).toEqual({ role: 'confirm', px: 560 })
		expect(resolveDialogWidth('900', 'confirm')).toEqual({ role: 'confirm', px: 560 })
		expect(resolveDialogWidth('', 'huge')).toEqual({ role: 'form', px: 640 })
	})

	it('CnDeleteDialog is 560 wide in the board look', () => {
		const w = mount(CnDeleteDialog, { ...board, props: { item: { id: 1, title: 'A' } } })
		expect(widthOf(w)).toBe('560px')
	})

	it.each([
		['CnConfirmDialog', CnConfirmDialog, {}, '560px'],
		['CnMassDeleteDialog', CnMassDeleteDialog, { items: [{ id: 1, title: 'A' }] }, '560px'],
		['CnCopyDialog', CnCopyDialog, { item: { id: 1, title: 'A' } }, '560px'],
		['CnFormDialog', CnFormDialog, { schema: { properties: {} }, item: null }, '640px'],
		['CnRichSubmitDialog', CnRichSubmitDialog, {}, '640px'],
		['CnTabbedFormDialog', CnTabbedFormDialog, { tabs: [{ id: 'a', title: 'A' }], item: null }, '720px'],
		['CnWizardDialog', CnWizardDialog, { steps: [{ id: 'a', label: 'A' }] }, '720px'],
	])('%s takes its default role', (_name, component, props, expected) => {
		const w = mount(component, { ...board, props })
		expect(widthOf(w)).toBe(expected)
	})

	it('a form app overrides to the wizard width', () => {
		const w = mount(CnFormDialog, { ...board, props: { schema: { properties: {} }, item: null, width: 'wizard' } })
		expect(widthOf(w)).toBe('720px')
	})

	it('the Nextcloud look sets no board width and keeps the NcDialog size', () => {
		const w = mount(CnDeleteDialog, { props: { item: { id: 1, title: 'A' } } })
		expect(widthOf(w)).toBe('')
		expect(dialogEl(w).classes()).not.toContain('cn-dialog-board')
		expect(dialogEl(w).attributes('size')).toBe('small')
	})

	it('the board look asks NcDialog for the normal size and lets CSS cap it', () => {
		const w = mount(CnDeleteDialog, { ...board, props: { item: { id: 1, title: 'A' } } })
		expect(dialogEl(w).attributes('size')).toBe('normal')
	})
})

describe('the board dialog container (tasks 1 and 4)', () => {
	it('carries cn-look-board and cn-dialog-board after the teleport, so the stylesheet reaches it', () => {
		const w = mount(CnDialog, { ...board, props: { name: 'T' } })
		expect(dialogEl(w).classes()).toEqual(expect.arrayContaining(['cn-look-board', 'cn-dialog-board', 'cn-dialog-board--form']))
	})

	it('the look prop wins over the app', () => {
		const w = mount(CnDialog, { ...board, props: { name: 'T', look: 'nextcloud' } })
		expect(dialogEl(w).classes()).not.toContain('cn-look-board')
	})

	it('renders the header with a close button that emits closing', async () => {
		const w = mount(CnDialog, { ...board, props: { name: 'Delete publication' } })
		expect(w.find('[data-testid="cn-dialog-title"]').text()).toBe('Delete publication')
		await w.find('[data-testid="cn-dialog-close"]').trigger('click')
		expect(w.emitted('closing')).toBeTruthy()
	})

	it('disables the close button while loading (REQ-DG-015)', () => {
		const w = mount(CnDialog, { ...board, props: { name: 'T', noClose: true } })
		expect(w.find('[data-testid="cn-dialog-close"]').attributes('disabled')).toBeDefined()
		expect(dialogEl(w).attributes('noclose')).toBeDefined()
	})

	it('draws no header in the Nextcloud look', () => {
		const w = mount(CnDialog, { props: { name: 'T' } })
		expect(w.find('[data-testid="cn-dialog-header"]').exists()).toBe(false)
	})
})

describe('eyebrow and subtitle (task 3)', () => {
	const props = { name: 'Convert ticket', eyebrow: 'Convert · PQ-2026-0417', subtitle: 'Event permit for the street party' }

	it('renders both in the board look, with the eyebrow as plain text', () => {
		const w = mount(CnDialog, { ...board, props })
		const eyebrow = w.find('[data-testid="cn-dialog-eyebrow"]')
		expect(eyebrow.text()).toBe('Convert · PQ-2026-0417')
		expect(eyebrow.element.tagName).toBe('SPAN')
		expect(w.find('[data-testid="cn-dialog-subtitle"]').text()).toBe('Event permit for the street party')
	})

	it('keeps the accessible name to the title: NcDialog gets the title only', () => {
		const w = mount(CnDialog, { ...board, props })
		expect(dialogEl(w).attributes('name')).toBe('Convert ticket')
		// The visible title is presentational, so it is not announced twice.
		expect(w.find('[data-testid="cn-dialog-title"]').attributes('aria-hidden')).toBe('true')
		expect(w.find('h1,h2,h3,h4').exists()).toBe(false)
	})

	it('ignores both in the Nextcloud look', () => {
		const w = mount(CnDialog, { props })
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-dialog-subtitle"]').exists()).toBe(false)
	})

	it('reaches the header from a Cn* dialog', () => {
		const w = mount(CnDeleteDialog, { ...board, props: { item: { id: 1, title: 'A' }, eyebrow: 'Publication' } })
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').text()).toBe('Publication')
	})
})

describe('the footer order (task 5)', () => {
	const schema = { title: 'Item', properties: { title: { type: 'string', title: 'Title' } } }

	const draftable = { ...schema, properties: { ...schema.properties, isDraft: { type: 'boolean', title: 'Draft' } } }


	it('moves Save draft to the far left in the board look', () => {
		const w = mount(CnFormDialog, { ...board, props: { schema: draftable, item: null, allowDraft: true, draftField: 'isDraft' } })
		const order = footerButtons(w).map((b) => b.attributes('data-testid') || b.text())
		// The tertiary region comes first, Save draft sits inside it (the button is a child, so it is
		// listed after its wrapper), then Cancel, then the primary.
		expect(order[0]).toBe('cn-dialog-tertiary')
		expect(order.indexOf('cn-form-dialog-save-draft')).toBe(1)
		expect(order.indexOf('Cancel')).toBe(2)
		expect(order.length).toBe(4)
	})

	it('keeps Save draft between Cancel and the primary in the Nextcloud look', () => {
		const w = mount(CnFormDialog, { props: { schema: draftable, item: null, allowDraft: true, draftField: 'isDraft' } })
		const order = footerButtons(w).map((b) => b.attributes('data-testid') || b.text())
		expect(order.indexOf('Cancel')).toBeLessThan(order.indexOf('cn-form-dialog-save-draft'))
		expect(order.indexOf('cn-form-dialog-save-draft')).toBe(order.length - 2)
	})

	it('keeps the Nextcloud order (no tertiary region) without the board look', () => {
		const w = mount(CnFormDialog, { props: { schema, item: null } })
		expect(w.find('[data-testid="cn-dialog-tertiary"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-form-dialog-draft-state"]').exists()).toBe(true)
	})

	it('has exactly one draft-state live region in either look', () => {
		expect(mount(CnFormDialog, { ...board, props: { schema, item: null } }).findAll('[data-testid="cn-form-dialog-draft-state"]')).toHaveLength(1)
		expect(mount(CnFormDialog, { props: { schema, item: null } }).findAll('[data-testid="cn-form-dialog-draft-state"]')).toHaveLength(1)
	})

	it('ends a board copy dialog in one Close after setResult', async () => {
		const w = mount(CnCopyDialog, { ...board, props: { item: { id: 1, title: 'A' } } })
		w.vm.setResult({ success: true })
		await w.vm.$nextTick()
		const buttons = footerButtons(w)
		expect(buttons).toHaveLength(1)
		expect(buttons[0].text()).toBe('Close')
	})

	it('lists Cancel before the primary on a delete dialog', () => {
		const w = mount(CnDeleteDialog, { ...board, props: { item: { id: 1, title: 'A' } } })
		expect(footerButtons(w).map((b) => b.text())).toEqual(['Cancel', 'Delete'])
	})
})

describe('a destructive dialog states the consequence (task 6)', () => {
	it('puts the item name in a strong element and the warning in a note', () => {
		const w = mount(CnDeleteDialog, {
			...board,
			props: { item: { id: 1, title: 'Woo decision on the swimming pool tender' }, warningText: 'Linked documents stay in the register.' },
		})
		const sentence = w.find('[data-testid="cn-delete-sentence"]')
		expect(sentence.find('strong').text()).toBe('Woo decision on the swimming pool tender')
		expect(sentence.text()).toContain('This action cannot be undone.')
		const note = w.find('[data-testid="cn-delete-note"]')
		expect(note.exists()).toBe(true)
		expect(note.text()).toBe('Linked documents stay in the register.')
		expect(note.attributes('role')).toBe('note')
	})

	it('does not repeat the default warning as a note', () => {
		const w = mount(CnDeleteDialog, { ...board, props: { item: { id: 1, title: 'A' } } })
		expect(w.find('[data-testid="cn-delete-note"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-delete-sentence"] strong').text()).toBe('A')
	})

	it('omits the irreversible sentence when the delete can be undone', () => {
		const w = mount(CnDeleteDialog, { ...board, props: { item: { id: 1, title: 'A' }, irreversible: false } })
		expect(w.find('[data-testid="cn-delete-sentence"]').text()).not.toContain('cannot be undone')
	})

	it('keeps the warning note card as the whole body in the Nextcloud look', () => {
		const w = mount(CnDeleteDialog, { props: { item: { id: 1, title: 'A' } } })
		expect(w.find('.stub.NcNoteCard').exists()).toBe(true)
		expect(w.find('[data-testid="cn-delete-sentence"]').exists()).toBe(false)
	})

	it('mass delete names the count in bold with the list warning as a note', () => {
		const w = mount(CnMassDeleteDialog, { ...board, props: { items: [{ id: 1, title: 'A' }, { id: 2, title: 'B' }] } })
		expect(w.find('[data-testid="cn-mass-delete-sentence"] strong').text()).toContain('2')
		expect(w.find('[data-testid="cn-mass-delete-note"]').exists()).toBe(true)
	})

	it('splits a sentence around its placeholder', () => {
		expect(splitAroundPlaceholder('Delete {name}?')).toEqual(['Delete ', '?'])
		expect(splitAroundPlaceholder('No placeholder')).toEqual(['No placeholder', ''])
	})
})

describe('type-to-confirm (task 7)', () => {
	const confirmButton = (w, id) => w.find(`[data-testid="${id}"]`)

	it('keeps the button off one character short and emits nothing', async () => {
		const w = mount(CnDeleteDialog, { ...board, props: { item: { id: 7, title: 'A' }, confirmValue: 'ticket' } })
		await w.find('[data-testid="cn-confirm-value-input"]').setValue('ticke')
		const button = confirmButton(w, 'cn-delete-dialog-confirm')
		expect(button.attributes('disabled')).toBeDefined()
		expect(button.attributes('aria-disabled')).toBe('true')
		await button.trigger('click')
		w.vm.executeDelete()
		expect(w.emitted('confirm')).toBeFalsy()
	})

	it('enables the button on an exact match and emits confirm', async () => {
		const w = mount(CnDeleteDialog, { ...board, props: { item: { id: 7, title: 'A' }, confirmValue: 'ticket' } })
		await w.find('[data-testid="cn-confirm-value-input"]').setValue('ticket')
		const button = confirmButton(w, 'cn-delete-dialog-confirm')
		expect(button.attributes('disabled')).toBeUndefined()
		await button.trigger('click')
		expect(w.emitted('confirm')).toEqual([[7]])
	})

	it('shows a labelled field and a hint that names the value', () => {
		const w = mount(CnDeleteDialog, { ...board, props: { item: { id: 7, title: 'A' }, confirmValue: 'ticket', confirmFieldLabel: 'Ticket reference' } })
		expect(w.find('label').text()).toBe('Ticket reference')
		expect(w.find('[data-testid="cn-confirm-value-hint"] code').text()).toBe('ticket')
		const input = w.find('input')
		expect(w.find('label').attributes('for')).toBe(input.attributes('id'))
	})

	it('behaves as before without a confirmValue, in both looks', () => {
		for (const options of [{}, board]) {
			const w = mount(CnDeleteDialog, { ...options, props: { item: { id: 7, title: 'A' } } })
			expect(w.find('[data-testid="cn-confirm-value-field"]').exists()).toBe(false)
			expect(w.find('[data-testid="cn-delete-dialog-confirm"]').attributes('disabled')).toBeUndefined()
		}
	})

	it('holds in the Nextcloud look too', async () => {
		const w = mount(CnDeleteDialog, { props: { item: { id: 7, title: 'A' }, confirmValue: 'x' } })
		expect(w.find('[data-testid="cn-delete-dialog-confirm"]').attributes('disabled')).toBeDefined()
	})

	it('works on CnConfirmDialog and CnMassDeleteDialog', async () => {
		const c = mount(CnConfirmDialog, { props: { variant: 'error', confirmValue: 'schema' } })
		expect(c.find('[data-testid="cn-confirm-dialog-confirm"]').attributes('disabled')).toBeDefined()
		await c.find('input').setValue('schema')
		expect(c.find('[data-testid="cn-confirm-dialog-confirm"]').attributes('disabled')).toBeUndefined()

		const m = mount(CnMassDeleteDialog, { props: { items: [{ id: 1, title: 'A' }], confirmValue: 'delete' } })
		expect(m.find('[data-testid="cn-mass-delete-dialog-confirm"]').attributes('disabled')).toBeDefined()
		await m.find('input').setValue('delete')
		expect(m.find('[data-testid="cn-mass-delete-dialog-confirm"]').attributes('disabled')).toBeUndefined()
	})
})
