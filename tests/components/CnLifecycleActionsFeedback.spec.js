/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/write-feedback-toast-and-undo/tasks.md#task-3
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

import axios from '@nextcloud/axios'
import { showError, showSuccess, showUndo } from '@nextcloud/dialogs'
import { mount } from '@vue/test-utils'
import CnLifecycleActions from '../../src/components/CnLifecycleActions/CnLifecycleActions.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcButton: { template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['disabled', 'variant'], emits: ['click'] },
	NcLoadingIcon: true,
	CnWriteConfirmDialog: { name: 'CnWriteConfirmDialog', props: ['message', 'variant'], emits: ['close'], template: '<div class="confirm" />' },
}

const TRANSITIONS = [
	{ from: 'open', to: 'assigned', action: 'pickup', label: 'Pick up' },
	{ from: 'assigned', to: 'open', action: 'release', label: 'Release' },
	{ from: 'assigned', to: 'closed', action: 'close', label: 'Close' },
]

function mountIt(extra = {}, object = { status: 'open', title: 'Permit 2026-00012' }) {
	return mount(CnLifecycleActions, {
		propsData: { objectId: 'o1', object, config: { field: 'status', autoFetch: false, finalStates: ['closed'], transitions: TRANSITIONS, ...extra } },
		stubs,
	})
}

describe('CnLifecycleActions confirm, toast and undo', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset().mockResolvedValue({ data: { id: 'o1' } })
		showSuccess.mockClear()
		showError.mockClear()
		showUndo.mockClear()
	})

	it('asks first for a final-state transition, and Cancel sends no request', async () => {
		const w = mountIt({}, { status: 'assigned', title: 'Permit' })
		await w.find('[data-testid="cn-lifecycle-action-close"]').trigger('click')
		const dialog = w.findComponent({ name: 'CnWriteConfirmDialog' })
		expect(dialog.exists()).toBe(true)
		dialog.vm.$emit('close', false)
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
		expect(w.findComponent({ name: 'CnWriteConfirmDialog' }).exists()).toBe(false)
	})

	it('sends the transition once the confirm is answered yes', async () => {
		const w = mountIt({}, { status: 'assigned', title: 'Permit' })
		await w.find('[data-testid="cn-lifecycle-action-close"]').trigger('click')
		w.findComponent({ name: 'CnWriteConfirmDialog' }).vm.$emit('close', true)
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)
	})

	it('asks for a danger variant and for confirm text, and skips it with confirm: false', async () => {
		const w = mountIt({ transitions: [
			{ from: 'open', to: 'voided', action: 'void', label: 'Void', variant: 'danger' },
			{ from: 'open', to: 'held', action: 'hold', label: 'Hold', confirm: 'Hold this permit?' },
			{ from: 'open', to: 'closed', action: 'quick', label: 'Quick', confirm: false },
		] })
		await w.find('[data-testid="cn-lifecycle-action-void"]').trigger('click')
		expect(w.findComponent({ name: 'CnWriteConfirmDialog' }).exists()).toBe(true)
		w.findComponent({ name: 'CnWriteConfirmDialog' }).vm.$emit('close', false)
		await flush()
		await w.find('[data-testid="cn-lifecycle-action-hold"]').trigger('click')
		expect(w.findComponent({ name: 'CnWriteConfirmDialog' }).props('message')).toBe('Hold this permit?')
		w.findComponent({ name: 'CnWriteConfirmDialog' }).vm.$emit('close', false)
		await flush()
		await w.find('[data-testid="cn-lifecycle-action-quick"]').trigger('click')
		await flush()
		expect(w.findComponent({ name: 'CnWriteConfirmDialog' }).exists()).toBe(false)
		expect(axios.post).toHaveBeenCalledTimes(1)
	})

	it('toasts the move with an Undo that posts the declared reverse transition', async () => {
		const w = mountIt()
		await w.find('[data-testid="cn-lifecycle-action-pickup"]').trigger('click')
		await flush()
		expect(showUndo).toHaveBeenCalledTimes(1)
		const [message, onUndo, options] = showUndo.mock.calls[0]
		expect(message).toBe('Moved Permit 2026-00012 to Assigned')
		expect(options.timeout).toBe(10000)
		axios.post.mockClear()
		await onUndo()
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(JSON.stringify(axios.post.mock.calls[0])).toContain('release')
		expect(showUndo).toHaveBeenCalledTimes(1)
	})

	it('toasts without an Undo when no reverse edge is declared', async () => {
		const w = mountIt({ transitions: [{ from: 'open', to: 'assigned', action: 'pickup', label: 'Pick up' }] })
		await w.find('[data-testid="cn-lifecycle-action-pickup"]').trigger('click')
		await flush()
		expect(showUndo).not.toHaveBeenCalled()
		expect(showSuccess).toHaveBeenCalledWith('Moved Permit 2026-00012 to Assigned')
	})

	it('feedback: false suppresses the toast only', async () => {
		const w = mountIt({ feedback: false })
		await w.find('[data-testid="cn-lifecycle-action-pickup"]').trigger('click')
		await flush()
		expect(showUndo).not.toHaveBeenCalled()
		expect(showSuccess).not.toHaveBeenCalled()
		expect(axios.post).toHaveBeenCalledTimes(1)
	})

	it('toasts a refusal as well as showing it inline', async () => {
		axios.post.mockRejectedValue({ response: { status: 422, data: { error: 'Not allowed now' } } })
		const w = mountIt()
		await w.find('[data-testid="cn-lifecycle-action-pickup"]').trigger('click')
		await flush()
		expect(showError).toHaveBeenCalledTimes(1)
		expect(w.find('[data-testid="cn-lifecycle-actions-error"]').exists()).toBe(true)
	})
})
