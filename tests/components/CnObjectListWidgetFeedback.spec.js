/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/write-feedback-toast-and-undo/tasks.md#task-4
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p, params) => `/nc${Object.entries(params || {}).reduce((o, [k, v]) => o.replace(`{${k}}`, v), p)}`) }))

import axios from '@nextcloud/axios'
import { showError, showSuccess, showUndo } from '@nextcloud/dialogs'
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const DELETE = { type: 'object-op', op: 'delete', label: 'Delete' }

function mountWidget(content = {}, dispatchResult = Promise.resolve(true)) {
	const w = shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 's', ...content } },
		provide: { cnDispatchAction: jest.fn(() => dispatchResult) },
		stubs: { CnDataTable: true, CnFormDialog: true },
	})
	w.vm.fetchRows = jest.fn()
	return w
}

describe('CnObjectListWidget write feedback', () => {
	beforeEach(() => {
		showSuccess.mockClear()
		showError.mockClear()
		showUndo.mockClear()
		axios.post.mockReset().mockResolvedValue({ data: {} })
	})

	it('toasts a delete with an Undo that restores the row from the trash and refreshes', async () => {
		const w = mountWidget()
		w.vm.runRowAction(DELETE, { id: 'row-1', title: 'Permit 7' })
		await flush()
		expect(showUndo).toHaveBeenCalledTimes(1)
		const [message, onUndo, options] = showUndo.mock.calls[0]
		expect(message).toBe('Deleted Permit 7')
		expect(options.timeout).toBe(10000)
		onUndo()
		await flush()
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/openregister/api/deleted/row-1/restore')
		expect(w.vm.fetchRows).toHaveBeenCalled()
	})

	it('toasts an error when the delete fails', async () => {
		const w = mountWidget({}, Promise.resolve(false))
		w.vm.runRowAction(DELETE, { id: 'row-1' })
		await flush()
		expect(showError).toHaveBeenCalledTimes(1)
		expect(showUndo).not.toHaveBeenCalled()
	})

	it('feedback: false in the content suppresses the toast', async () => {
		const w = mountWidget({ feedback: false })
		w.vm.runRowAction(DELETE, { id: 'row-1' })
		await flush()
		expect(showUndo).not.toHaveBeenCalled()
		expect(showSuccess).not.toHaveBeenCalled()
	})

	it('a create adds no toast of its own: the dialog gives the one', async () => {
		const w = mountWidget()
		await w.vm.onCreateConfirm({ title: 'x' })
		await flush()
		expect(showSuccess).not.toHaveBeenCalled()
		expect(showUndo).not.toHaveBeenCalled()
	})

	it('another kind of row action reports nothing', async () => {
		const w = mountWidget()
		w.vm.runRowAction({ type: 'handler', handler: 'x' }, { id: 'r' })
		await flush()
		expect(showUndo).not.toHaveBeenCalled()
	})
})
