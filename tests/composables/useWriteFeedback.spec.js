/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/write-feedback-toast-and-undo/tasks.md#task-1
 */
import { showError, showSuccess, showUndo } from '@nextcloud/dialogs'
import { UNDO_WINDOW_MS, useWriteFeedback } from '../../src/composables/useWriteFeedback.js'

describe('useWriteFeedback', () => {
	beforeEach(() => {
		showSuccess.mockClear()
		showError.mockClear()
		showUndo.mockClear()
	})

	it('shows a plain success and a plain error', () => {
		const f = useWriteFeedback()
		f.success('Saved')
		f.error('Nope')
		expect(showSuccess).toHaveBeenCalledWith('Saved')
		expect(showError).toHaveBeenCalledWith('Nope')
		expect(showUndo).not.toHaveBeenCalled()
	})

	it('offers Undo for ten seconds and runs the callback once', () => {
		const undo = jest.fn()
		useWriteFeedback().success('Deleted', { undo })
		const [message, onUndo, options] = showUndo.mock.calls[0]
		expect(message).toBe('Deleted')
		expect(options.timeout).toBe(UNDO_WINDOW_MS)
		expect(UNDO_WINDOW_MS).toBe(10000)
		onUndo()
		onUndo()
		expect(undo).toHaveBeenCalledTimes(1)
		expect(showSuccess).not.toHaveBeenCalled()
	})
})
