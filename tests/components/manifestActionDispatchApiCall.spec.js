// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * An index row action of `type: "api-call"` posts for that row (the row's id
 * and fields fill the url), toasts, and reads the list again; it never fires
 * while the menu is drawn.
 *
 * @spec openspec/changes/pl4-index-row-api-call/specs/pl4-index-row-api-call/spec.md#requirement-an-index-row-action-can-call-an-endpoint
 */

import axios from '@nextcloud/axios'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { dispatchAction } from '../../src/components/CnIndexPage/manifestActionDispatch.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn(), get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}`, generateOcsUrl: (p) => p, imagePath: (p) => p, generateFilePath: (p) => p }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showError: jest.fn(), showSuccess: jest.fn() }))

const flush = () => new Promise((resolve) => setTimeout(resolve))

describe('index row api-call', () => {
	beforeEach(() => {
		axios.post.mockReset()
		showError.mockReset()
		showSuccess.mockReset()
	})

	const enable = { id: 'enable', label: 'Enable', type: 'api-call', url: '/apps/pipelinq/api/export/jobs/{objectId}/enable', successMessage: 'Job enabled', errorMessage: 'Could not change job status' }

	it('posts for the row it was picked on, then reads the list again', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const refresh = jest.fn()
		const prepared = dispatchAction(enable, { rowKey: 'id', refresh, translate: (s) => s })
		expect(axios.post).not.toHaveBeenCalled()
		await prepared.handler({ id: 'job-7', name: 'Nightly' })
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/export/jobs/job-7/enable', {})
		expect(showSuccess).toHaveBeenCalledWith('Job enabled')
		expect(refresh).toHaveBeenCalled()
	})

	it('fills row fields in the url, and says a failure without reading again', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'No' } } })
		const refresh = jest.fn()
		const prepared = dispatchAction({ ...enable, url: '/apps/x/api/runs/{uuid}/retry' }, { rowKey: 'id', refresh, translate: (s) => s })
		await prepared.handler({ id: 'r1', uuid: 'u-1' })
		await flush()
		expect(axios.post.mock.calls[0][0]).toBe('/index.php/apps/x/api/runs/u-1/retry')
		expect(showError).toHaveBeenCalledWith('Could not change job status')
		expect(refresh).not.toHaveBeenCalled()
	})
})
