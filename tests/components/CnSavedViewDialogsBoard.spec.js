/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The saved-view dialogs (edit, share, presentation) go through CnDialog, as
 * the save dialog does, so the board look draws the board dialog: the board
 * header with its 36px round close button (DqFilterBewerken, DqFilterDelen),
 * where they drew NcDialog's own 64x49 text close button.
 *
 * @spec openspec/changes/saved-view-dialogs-board-header/specs/saved-views/spec.md#requirement-the-saved-view-dialogs-are-board-dialogs
 */
import { mount } from '@vue/test-utils'
import CnSavedViewEditDialog from '../../src/components/CnSavedViewEditDialog/CnSavedViewEditDialog.vue'
import CnSavedViewPresentationDialog from '../../src/components/CnSavedViewPresentationDialog/CnSavedViewPresentationDialog.vue'
import CnSavedViewShareDialog from '../../src/components/CnSavedViewShareDialog/CnSavedViewShareDialog.vue'

const VIEW = { id: 'v1', name: 'Mine', owner: 'alice', query: {}, sharedWith: [] }

describe('saved-view dialogs in the board look', () => {
	it.each([
		['edit', CnSavedViewEditDialog],
		['share', CnSavedViewShareDialog],
		['presentation', CnSavedViewPresentationDialog],
	])('the %s dialog renders through CnDialog with the board look', (_name, component) => {
		const w = mount(component, {
			props: { view: VIEW },
			global: { provide: { cnLook: 'board' }, stubs: { CnDialog: { name: 'CnDialog', props: ['look', 'name'], template: '<div class="cn-dialog-stub"><slot /><slot name="actions" /></div>' } } },
		})
		const dialog = w.findComponent({ name: 'CnDialog' })
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('name')).toBeTruthy()
	})
})
