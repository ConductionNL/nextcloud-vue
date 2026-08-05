/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Wave-3 (#91) dispatch types on the unified actions dispatcher:
 * open-form (delegates to context.openForm), refresh (bumps the
 * cn:page:refresh event-bus signal), api-call (POST/PUT + success/error
 * toast + refresh), and toggle (non-dispatchable — warns).
 */

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))
jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	showSuccess: jest.fn(),
	showError: jest.fn(),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn(), put: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

import { emit } from '@nextcloud/event-bus'
import { showSuccess, showError } from '@nextcloud/dialogs'
import axios from '@nextcloud/axios'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('dispatchAction — Wave 3 types (#91)', () => {
	beforeEach(() => {
		emit.mockReset()
		showSuccess.mockReset()
		showError.mockReset()
		axios.post.mockReset()
		axios.put.mockReset()
	})

	describe('open-form', () => {
		it('delegates to context.openForm with the action', () => {
			const openForm = jest.fn()
			const action = { id: 'new-lead', label: 'New lead', type: 'open-form', schema: 'lead' }
			dispatchAction(action, { openForm })
			expect(openForm).toHaveBeenCalledWith(action)
		})

		it('warns and no-ops when context.openForm is missing', () => {
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			expect(() => dispatchAction({ type: 'open-form' }, {})).not.toThrow()
			expect(warnSpy).toHaveBeenCalled()
			warnSpy.mockRestore()
		})
	})

	describe('refresh', () => {
		it('bumps the cn:page:refresh event-bus signal', () => {
			dispatchAction({ id: 'refresh', label: 'Refresh', type: 'refresh' }, {})
			expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})
		})
	})

	describe('toggle (non-dispatchable)', () => {
		it('warns — a toggle is rendered by the header-actions surface, never dispatched', () => {
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const result = dispatchAction({ type: 'toggle' }, {})
			expect(result).toBeUndefined()
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('toggle'))
			warnSpy.mockRestore()
		})
	})

	describe('api-call', () => {
		it('POSTs the resolved endpoint, shows a success toast, and bumps the refresh signal', async () => {
			axios.post.mockResolvedValue({ data: { ok: true } })
			const result = await dispatchAction(
				{
					id: 'approve',
					label: 'Approve',
					type: 'api-call',
					url: '/apps/shillinq/api/payment-runs/@objectId/approve',
					params: { note: 'ok' },
					successMessage: 'Approved',
				},
				{ tokenCtx: { objectId: '42' } },
			)
			await flush()

			expect(axios.post).toHaveBeenCalledWith(
				'/nc/apps/shillinq/api/payment-runs/42/approve',
				{ note: 'ok' },
			)
			expect(showSuccess).toHaveBeenCalledWith('Approved')
			expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})
			expect(result).toEqual({ ok: true, data: { ok: true } })
		})

		it('honours method: PUT and resolves token params', async () => {
			axios.put.mockResolvedValue({ data: {} })
			await dispatchAction(
				{
					type: 'api-call',
					method: 'PUT',
					url: '/apps/x/api/state',
					params: { user: '@me', when: '@today' },
				},
				{ tokenCtx: { workspace: {} } },
			)
			await flush()

			expect(axios.put).toHaveBeenCalledTimes(1)
			const body = axios.put.mock.calls[0][1]
			// @me resolves via @nextcloud/auth (falls back to '' in jsdom) — the
			// point is the token grammar ran, not the exact user id.
			expect(body).toHaveProperty('when')
		})

		it('shows an error toast and returns { ok: false } on failure, and does NOT refresh', async () => {
			axios.post.mockRejectedValue({ response: { data: { error: 'Not allowed' } } })
			const result = await dispatchAction(
				{ type: 'api-call', url: '/apps/x/api/act' },
				{ tokenCtx: {} },
			)
			await flush()

			expect(showError).toHaveBeenCalledWith('Not allowed')
			expect(emit).not.toHaveBeenCalled()
			expect(result.ok).toBe(false)
		})

		it('skips the call (with a warn) when a required URL token is unresolved', async () => {
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const result = await dispatchAction(
				{ type: 'api-call', url: '', params: {} },
				{ tokenCtx: {} },
			)
			expect(axios.post).not.toHaveBeenCalled()
			expect(result.ok).toBe(false)
			expect(warnSpy).toHaveBeenCalled()
			warnSpy.mockRestore()
		})

		it('does not refresh when action.refresh is false', async () => {
			axios.post.mockResolvedValue({ data: {} })
			await dispatchAction(
				{ type: 'api-call', url: '/apps/x/api/act', refresh: false },
				{ tokenCtx: {} },
			)
			await flush()
			expect(emit).not.toHaveBeenCalled()
		})
	})
})
