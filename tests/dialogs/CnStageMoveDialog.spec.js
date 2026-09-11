/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStageMoveDialog: the confirm step of a stage move. It asks only for what
 * the move declared, will not confirm until the required inputs are filled,
 * and shows a refusal inside itself.
 */
import { mount } from '@vue/test-utils'
import CnStageMoveDialog from '../../src/dialogs/CnStageMoveDialog.vue'

const RESULTS = [{ id: 'rt-granted', label: 'Granted' }, { id: 'rt-refused', label: 'Refused' }]

/**
 * Mount the dialog.
 *
 * @param {object} props The props.
 * @return {object} The wrapper.
 */
function mountDialog(props = {}) {
	return mount(CnStageMoveDialog, { props: { stageLabel: 'In review', ...props } })
}

describe('CnStageMoveDialog', () => {
	it('names the target stage in its title', () => {
		const w = mountDialog()
		expect(w.vm.dialogTitle).toBe('Move to In review')
	})

	it('asks for nothing it was not told to ask for', () => {
		const w = mountDialog()
		expect(w.find('[data-testid="cn-stage-move-comment"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-stage-move-result"]').exists()).toBe(false)
	})

	it('offers an optional comment', () => {
		const w = mountDialog({ commentMode: 'optional' })
		expect(w.find('[data-testid="cn-stage-move-comment"]').exists()).toBe(true)
		expect(w.vm.commentLabel).toBe('Comment (optional)')
		expect(w.vm.canConfirm).toBe(true)
	})

	it('holds the confirm until a required comment is typed', async () => {
		const w = mountDialog({ commentMode: 'required' })
		expect(w.vm.canConfirm).toBe(false)

		await w.find('[data-testid="cn-stage-move-confirm"]').trigger('click')
		expect(w.emitted('confirm')).toBeUndefined()

		w.vm.comment = '   '
		expect(w.vm.canConfirm).toBe(false)
		w.vm.comment = 'All documents are in.'
		expect(w.vm.canConfirm).toBe(true)
	})

	it('holds the confirm until a required result is picked', () => {
		const w = mountDialog({ resultRequired: true, resultOptions: RESULTS })
		expect(w.find('[data-testid="cn-stage-move-result"]').exists()).toBe(true)
		expect(w.vm.canConfirm).toBe(false)

		w.vm.result = RESULTS[0]
		expect(w.vm.canConfirm).toBe(true)
	})

	it('does not ask for a result it has no choices for', () => {
		const w = mountDialog({ resultRequired: true, resultOptions: [] })
		expect(w.find('[data-testid="cn-stage-move-result"]').exists()).toBe(false)
		expect(w.vm.canConfirm).toBe(true)
	})

	it('emits the trimmed comment and the picked result id', async () => {
		const w = mountDialog({ commentMode: 'optional', resultRequired: true, resultOptions: RESULTS })
		w.vm.comment = '  Granted after review.  '
		w.vm.result = RESULTS[0]

		await w.find('[data-testid="cn-stage-move-confirm"]').trigger('click')
		expect(w.emitted('confirm')[0][0]).toEqual({ comment: 'Granted after review.', result: 'rt-granted' })
	})

	it('leaves out an empty comment rather than sending an empty string', async () => {
		const w = mountDialog({ commentMode: 'optional' })
		await w.find('[data-testid="cn-stage-move-confirm"]').trigger('click')
		expect(w.emitted('confirm')[0][0]).toEqual({})
	})

	it('shows the refusal inside the dialog', () => {
		const w = mountDialog({ error: 'A decision document is missing.' })
		const error = w.find('[data-testid="cn-stage-move-error"]')
		expect(error.text()).toBe('A decision document is missing.')
		expect(error.attributes('role')).toBe('alert')
	})

	it('cannot be closed or confirmed while the move runs', async () => {
		const w = mountDialog({ busy: true })
		expect(w.vm.canConfirm).toBe(false)
		await w.find('[data-testid="cn-stage-move-cancel"]').trigger('click')
		expect(w.emitted('close')).toBeUndefined()
	})

	it('closes on cancel', async () => {
		const w = mountDialog()
		await w.find('[data-testid="cn-stage-move-cancel"]').trigger('click')
		expect(w.emitted('close')).toHaveLength(1)
	})
})
