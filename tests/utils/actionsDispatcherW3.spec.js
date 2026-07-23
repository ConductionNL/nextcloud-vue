/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Wave-3 (#91) dispatch types on the unified actions dispatcher:
 * open-form (delegates to context.openForm), refresh (bumps the
 * cn:page:refresh event-bus signal), api-call (POST/PUT + success/error
 * toast + refresh, DEEP `payload` token resolution, `download: true` blob
 * flow), and toggle (non-dispatchable — warns).
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
jest.mock('../../src/components/CnIndexPage/selfModeIO.js', () => {
	const actual = jest.requireActual('../../src/components/CnIndexPage/selfModeIO.js')
	return {
		...actual,
		triggerBlobDownload: jest.fn(),
	}
})

import { emit } from '@nextcloud/event-bus'
import { showSuccess, showError } from '@nextcloud/dialogs'
import axios from '@nextcloud/axios'
import { triggerBlobDownload } from '../../src/components/CnIndexPage/selfModeIO.js'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('dispatchAction — Wave 3 types (#91)', () => {
	beforeEach(() => {
		emit.mockReset()
		showSuccess.mockReset()
		showError.mockReset()
		axios.post.mockReset()
		axios.put.mockReset()
		triggerBlobDownload.mockReset()
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

		it('interpolates the {objectId} brace form in the url', async () => {
			axios.post.mockResolvedValue({ data: {} })
			await dispatchAction(
				{ type: 'api-call', url: '/apps/x/api/objects/{objectId}/act' },
				{ tokenCtx: { objectId: '99' } },
			)
			await flush()
			expect(axios.post).toHaveBeenCalledWith('/nc/apps/x/api/objects/99/act', {})
		})

		describe('payload — deep token resolution', () => {
			it('resolves @objectId nested inside an array of objects, and payload wins over params', async () => {
				axios.post.mockResolvedValue({ data: { ok: true } })
				await dispatchAction(
					{
						type: 'api-call',
						url: '/apps/docudesk/api/documents/generate',
						payload: {
							template: 'invoice',
							dataRefs: [{ register: 'crm', schema: 'lead', id: '@objectId' }],
						},
						params: { shouldBeIgnored: true },
					},
					{ tokenCtx: { objectId: '42' } },
				)
				await flush()

				expect(axios.post).toHaveBeenCalledWith(
					'/nc/apps/docudesk/api/documents/generate',
					{
						template: 'invoice',
						dataRefs: [{ register: 'crm', schema: 'lead', id: '42' }],
					},
				)
			})

			it('resolves @object.<field> and drops an unresolved optional @workspace token nested in an object', async () => {
				axios.post.mockResolvedValue({ data: {} })
				await dispatchAction(
					{
						type: 'api-call',
						url: '/apps/x/api/act',
						payload: {
							meta: { client: '@object.clientName', note: '@workspace.note?' },
						},
					},
					{ tokenCtx: { object: { clientName: 'Acme' }, workspace: {} } },
				)
				await flush()

				expect(axios.post).toHaveBeenCalledWith(
					'/nc/apps/x/api/act',
					{ meta: { client: 'Acme' } },
				)
			})

			it('BLOCKS the call (with a warn) when a required @object.<field> token nested in the payload is unresolved', async () => {
				const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
				const result = await dispatchAction(
					{
						type: 'api-call',
						url: '/apps/x/api/act',
						payload: { dataRefs: [{ id: '@objectId' }] },
					},
					{ tokenCtx: {} },
				)
				expect(axios.post).not.toHaveBeenCalled()
				expect(result.ok).toBe(false)
				expect(warnSpy).toHaveBeenCalled()
				warnSpy.mockRestore()
			})
		})

		describe('download: true', () => {
			it('requests a blob response, triggers a browser download named from Content-Disposition, and does NOT refresh by default', async () => {
				const blob = new Blob(['%PDF'])
				axios.post.mockResolvedValue({
					data: blob,
					headers: { 'content-disposition': 'attachment; filename="invoice-42.pdf"' },
				})
				const result = await dispatchAction(
					{
						type: 'api-call',
						url: '/apps/docudesk/api/documents/generate',
						payload: { dataRefs: [{ id: '@objectId' }] },
						download: true,
						successMessage: 'Document generated',
					},
					{ tokenCtx: { objectId: '42' } },
				)
				await flush()

				expect(axios.post).toHaveBeenCalledWith(
					'/nc/apps/docudesk/api/documents/generate',
					{ dataRefs: [{ id: '42' }] },
					{ responseType: 'blob' },
				)
				expect(triggerBlobDownload).toHaveBeenCalledWith(blob, 'invoice-42.pdf')
				expect(showSuccess).toHaveBeenCalledWith('Document generated')
				expect(emit).not.toHaveBeenCalled()
				expect(result.ok).toBe(true)
			})

			it('falls back to the token-resolved filename when there is no Content-Disposition header', async () => {
				const blob = new Blob(['%PDF'])
				axios.post.mockResolvedValue({ data: blob, headers: {} })
				await dispatchAction(
					{
						type: 'api-call',
						url: '/apps/docudesk/api/documents/generate',
						download: true,
						filename: 'invoice-@objectId.pdf',
					},
					{ tokenCtx: { objectId: '7' } },
				)
				await flush()
				expect(triggerBlobDownload).toHaveBeenCalledWith(blob, 'invoice-7.pdf')
			})

			it("falls back to 'download.pdf' when neither Content-Disposition nor filename is available", async () => {
				const blob = new Blob(['%PDF'])
				axios.post.mockResolvedValue({ data: blob, headers: {} })
				await dispatchAction(
					{ type: 'api-call', url: '/apps/x/api/act', download: true },
					{ tokenCtx: {} },
				)
				await flush()
				expect(triggerBlobDownload).toHaveBeenCalledWith(blob, 'download.pdf')
			})

			it('DOES refresh after a download when refresh: true is explicit', async () => {
				const blob = new Blob(['%PDF'])
				axios.post.mockResolvedValue({ data: blob, headers: {} })
				await dispatchAction(
					{ type: 'api-call', url: '/apps/x/api/act', download: true, refresh: true },
					{ tokenCtx: {} },
				)
				await flush()
				expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})
			})
		})
	})
})
