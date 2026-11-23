// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * An index row action of `type: "object-action"` runs the OpenRegister action
 * on the row it was picked on, then reads the list again; it never fires while
 * the menu is drawn.
 *
 * @spec openspec/changes/object-actions/specs/object-actions/spec.md#requirement-a-row-can-run-an-action-openregister-declares
 */

import axios from '@nextcloud/axios'
import { showError } from '@nextcloud/dialogs'
import { dispatchAction } from '../../src/components/CnIndexPage/manifestActionDispatch.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn(), get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}`, generateOcsUrl: (p) => p, imagePath: (p) => p, generateFilePath: (p) => p }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

describe('index row object-action', () => {
	beforeEach(() => {
		axios.post.mockReset()
		showError.mockReset()
	})

	const close = { id: 'close', label: 'Close', type: 'object-action', action: 'close', inputs: { reason: 'done' } }

	it('runs the action for the row, then reads the list again', async () => {
		axios.post.mockResolvedValue({ status: 200, data: {} })
		const refresh = jest.fn()
		const prepared = dispatchAction(close, { rowKey: 'id', refresh, translate: (s) => s, register: 'dossiq', schema: 'case' })
		expect(axios.post).not.toHaveBeenCalled()
		await prepared.handler({ id: 'c-7' })
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/dossiq/case/c-7/actions/close', { inputs: { reason: 'done' } })
		expect(refresh).toHaveBeenCalled()
	})

	it('says a refusal and does not read again', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'Not allowed.' } } })
		const refresh = jest.fn()
		const prepared = dispatchAction(close, { rowKey: 'id', refresh, translate: (s) => s, register: 'dossiq', schema: 'case' })
		await prepared.handler({ id: 'c-7' })
		expect(showError).toHaveBeenCalledWith('Not allowed.')
		expect(refresh).not.toHaveBeenCalled()
	})
})
