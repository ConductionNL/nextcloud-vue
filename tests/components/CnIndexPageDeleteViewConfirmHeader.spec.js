/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the delete-view confirm is headed like the saved view's
 * edit and share dialogs: "Saved view" above the title, the view's name under
 * it (DqFilterVerwijderen).
 *
 * @spec openspec/changes/board-delete-view-confirm-header/specs/board-delete-view-confirm-header/spec.md#requirement-the-board-delete-view-confirm-names-the-saved-view
 */
import fs from 'fs'
import path from 'path'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')
const { deleteViewEyebrow, deleteViewSubtitle } = CnIndexPage.computed

describe('CnIndexPage delete-view confirm header', () => {
	it('passes the eyebrow and the subtitle to the confirm', () => {
		const at = source.indexOf('ref="deleteViewConfirmDialog"')
		const tag = source.slice(at, source.indexOf('/>', at))
		expect(tag).toContain(':eyebrow="deleteViewEyebrow"')
		expect(tag).toContain(':subtitle="deleteViewSubtitle"')
	})

	it('names the saved view in the board look', () => {
		const vm = { isBoardLook: true, viewPendingDelete: { name: 'Wacht op inwoner' } }
		expect(deleteViewEyebrow.call(vm)).toBe('Saved view')
		expect(deleteViewSubtitle.call(vm)).toBe('Wacht op inwoner')
	})

	it('adds nothing in the Nextcloud look', () => {
		const vm = { isBoardLook: false, viewPendingDelete: { name: 'Wacht op inwoner' } }
		expect(deleteViewEyebrow.call(vm)).toBe('')
		expect(deleteViewSubtitle.call(vm)).toBe('')
	})
})
