/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The api-call verb set (manifest-api-call-verbs-and-toggle): PATCH and
 * DELETE next to POST and PUT, the DELETE body carried in the axios config,
 * the unknown-verb fallback that keeps old behaviour, and the schema enums
 * that must list exactly the verbs the dispatcher knows.
 *
 * @spec openspec/changes/manifest-api-call-verbs-and-toggle/specs/manifest-api-call-verbs-and-toggle/spec.md
 */

import axios from '@nextcloud/axios'
import { showSuccess } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { triggerBlobDownload } from '../../src/components/CnIndexPage/selfModeIO.js'
import schema from '../../src/schemas/app-manifest-v2.schema.json'
import { API_CALL_METHODS, dispatchAction, resolveApiCallMethod } from '../../src/utils/actionsDispatcher.js'

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
	default: { post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
jest.mock('../../src/components/CnIndexPage/selfModeIO.js', () => {
	const actual = jest.requireActual('../../src/components/CnIndexPage/selfModeIO.js')
	return { ...actual, triggerBlobDownload: jest.fn() }
})

describe('api-call verbs', () => {
	beforeEach(() => {
		for (const fn of [axios.post, axios.put, axios.patch, axios.delete]) {
			fn.mockReset()
			fn.mockResolvedValue({ data: { ok: true } })
		}
		emit.mockReset()
		showSuccess.mockReset()
		triggerBlobDownload.mockReset()
	})

	describe('resolveApiCallMethod', () => {
		it('maps every declared verb, case-insensitively', () => {
			expect(resolveApiCallMethod('POST')).toBe('post')
			expect(resolveApiCallMethod('put')).toBe('put')
			expect(resolveApiCallMethod('Patch')).toBe('patch')
			expect(resolveApiCallMethod('DELETE')).toBe('delete')
		})

		it('defaults to POST when no method is given', () => {
			expect(resolveApiCallMethod(undefined)).toBe('post')
			expect(resolveApiCallMethod('')).toBe('post')
		})

		it('falls back to POST for a verb it does not know, as every non-PUT verb did before', () => {
			expect(resolveApiCallMethod('GET')).toBe('post')
			expect(resolveApiCallMethod('constructor')).toBe('post')
		})
	})

	it('sends a PATCH with the body as the second argument', async () => {
		const result = await dispatchAction(
			{ type: 'api-call', method: 'PATCH', url: '/apps/x/api/items/@objectId', payload: { title: 'New' } },
			{ tokenCtx: { objectId: '7' } },
		)
		expect(axios.patch).toHaveBeenCalledWith('/nc/apps/x/api/items/7', { title: 'New' })
		expect(axios.post).not.toHaveBeenCalled()
		expect(result).toEqual({ ok: true, data: { ok: true } })
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})
	})

	it('sends a DELETE with no body when the action has none', async () => {
		await dispatchAction(
			{ type: 'api-call', method: 'DELETE', url: '/apps/x/api/items/@objectId/favourite' },
			{ tokenCtx: { objectId: '7' } },
		)
		expect(axios.delete).toHaveBeenCalledTimes(1)
		expect(axios.delete.mock.calls[0]).toEqual(['/nc/apps/x/api/items/7/favourite'])
		expect(axios.post).not.toHaveBeenCalled()
		expect(showSuccess).toHaveBeenCalled()
	})

	it('carries a DELETE body in the axios config, because axios.delete has no body argument', async () => {
		await dispatchAction(
			{ type: 'api-call', method: 'DELETE', url: '/apps/x/api/followers', payload: { objectId: '@objectId' } },
			{ tokenCtx: { objectId: '7' } },
		)
		expect(axios.delete).toHaveBeenCalledWith('/nc/apps/x/api/followers', { data: { objectId: '7' } })
	})

	it('asks a DELETE download for a blob', async () => {
		axios.delete.mockResolvedValue({ data: 'blob', headers: {} })
		await dispatchAction(
			{ type: 'api-call', method: 'DELETE', url: '/apps/x/api/export', download: true, filename: 'gone.pdf' },
			{ tokenCtx: {} },
		)
		expect(axios.delete).toHaveBeenCalledWith('/nc/apps/x/api/export', { responseType: 'blob' })
		expect(triggerBlobDownload).toHaveBeenCalledWith('blob', 'gone.pdf')
	})

	it('still blocks a DELETE whose required token does not resolve', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const result = await dispatchAction(
			{ type: 'api-call', method: 'DELETE', url: '/apps/x/api/items/x', payload: { id: '@objectId' } },
			{ tokenCtx: {} },
		)
		expect(axios.delete).not.toHaveBeenCalled()
		expect(result.ok).toBe(false)
		warnSpy.mockRestore()
	})

	it('keeps the POST call shape of an action without a method', async () => {
		await dispatchAction({ type: 'api-call', url: '/apps/x/api/act', params: { a: 1 } }, { tokenCtx: {} })
		expect(axios.post.mock.calls[0]).toEqual(['/nc/apps/x/api/act', { a: 1 }])
	})

	describe('schema enums', () => {
		const verbs = Object.keys(API_CALL_METHODS).sort()

		it('the action method enum lists exactly the dispatcher verbs', () => {
			expect([...schema.$defs.action.properties.method.enum].sort()).toEqual(verbs)
		})

		it('the toggle write method enum lists exactly the dispatcher verbs', () => {
			expect([...schema.$defs.toggleWrite.properties.method.enum].sort()).toEqual(verbs)
		})
	})
})
