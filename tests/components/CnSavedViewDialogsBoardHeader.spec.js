/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The edit and share dialogs of a saved view as boards DqFilterBewerken and
 * DqFilterDelen draw them in the board look: the form width (640, not the
 * confirm 560), "Opgeslagen weergave" above the title, and the explaining
 * sentence under the title instead of as the first line of the body. In the
 * Nextcloud look nothing changes.
 */
import { mount } from '@vue/test-utils'
import CnSavedViewEditDialog from '../../src/components/CnSavedViewEditDialog/CnSavedViewEditDialog.vue'
import CnSavedViewShareDialog from '../../src/components/CnSavedViewShareDialog/CnSavedViewShareDialog.vue'

const VIEW = { id: 'v1', name: 'Mine', owner: 'alice', query: {}, sharedWith: [] }
const CnDialog = {
	name: 'CnDialog',
	props: ['look', 'name', 'width', 'defaultWidth', 'eyebrow', 'subtitle'],
	template: '<div class="cn-dialog-stub"><slot /><slot name="actions" /></div>',
}

/**
 * Mount a dialog in a look.
 *
 * @param {object} component The dialog.
 * @param {string} look `board` or `nextcloud`.
 * @return {object} The wrapper.
 */
function open(component, look) {
	return mount(component, {
		props: { view: VIEW },
		global: { provide: { cnLook: look }, stubs: { CnDialog, CnSavedViewShareFields: true } },
	})
}

describe('saved-view dialog headers in the board look', () => {
	it.each([
		['edit', CnSavedViewEditDialog, 'Give the view another name, or replace its criteria with what the list shows now.', '.cn-edit-view__intro'],
		['share', CnSavedViewShareDialog, 'Whoever gets the view sees it under Shared with me. It is yours and stays yours.', '.cn-share-view__intro'],
	])('the %s dialog is a form dialog with the eyebrow and the sentence as its subtitle', (_name, component, sentence, introSelector) => {
		const w = open(component, 'board')
		const dialog = w.findComponent({ name: 'CnDialog' })
		expect(dialog.props('defaultWidth')).toBe('form')
		expect(dialog.props('eyebrow')).toBe('Saved view')
		expect(dialog.props('subtitle')).toBe(sentence)
		expect(w.find(introSelector).exists()).toBe(false)
	})

	it.each([
		['edit', CnSavedViewEditDialog, '.cn-edit-view__intro'],
		['share', CnSavedViewShareDialog, '.cn-share-view__intro'],
	])('the %s dialog keeps its sentence in the body in the Nextcloud look', (_name, component, introSelector) => {
		const w = open(component, 'nextcloud')
		expect(w.findComponent({ name: 'CnDialog' }).props('eyebrow')).toBe('')
		expect(w.find(introSelector).exists()).toBe(true)
	})
})
