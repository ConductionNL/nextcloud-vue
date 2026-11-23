/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An api-call can open what the call answered (`openResponse`), as a row's
 * "Conversation in Talk" opens the room the endpoint just made.
 *
 * @spec openspec/changes/api-call-open-response/specs/api-call-open-response/spec.md
 */
import axios from '@nextcloud/axios'
import { dispatchAction, resolveOpenResponse } from '../../src/utils/actionsDispatcher.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn(), patch: jest.fn(), get: jest.fn(), delete: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

describe('resolveOpenResponse', () => {
	it('reads url by default, a named field, or a dot-path', () => {
		expect(resolveOpenResponse(true, { url: 'https://cloud.example/call/abc' })).toEqual({ url: 'https://cloud.example/call/abc', newTab: false })
		expect(resolveOpenResponse('room.link', { room: { link: '/index.php/call/abc' } })).toEqual({ url: '/index.php/call/abc', newTab: false })
		expect(resolveOpenResponse({ field: 'href', newTab: true }, { href: '/apps/forms/x' })).toEqual({ url: '/apps/forms/x', newTab: true })
	})

	it('opens nothing for an unsafe address, a missing value or no openResponse', () => {
		expect(resolveOpenResponse(true, { url: 'javascript:alert(1)' })).toBeNull()
		expect(resolveOpenResponse(true, { url: '//evil.example/x' })).toBeNull()
		expect(resolveOpenResponse(true, { other: 'x' })).toBeNull()
		expect(resolveOpenResponse(true, null)).toBeNull()
		expect(resolveOpenResponse(false, { url: '/x' })).toBeNull()
	})
})

describe('an api-call with openResponse', () => {
	let open
	beforeEach(() => {
		axios.post.mockReset()
		open = jest.spyOn(window, 'open').mockImplementation(() => null)
	})
	afterEach(() => {
		open.mockRestore()
	})

	it('opens the answered address in a new tab after a successful call', async () => {
		axios.post.mockResolvedValue({ data: { url: 'https://cloud.example/call/abc' } })
		const result = await dispatchAction({ type: 'api-call', url: '/apps/portaliq/api/submissions/@objectId/talk', openResponse: { newTab: true } }, { tokenCtx: { objectId: 's1' } })
		expect(result.ok).toBe(true)
		expect(open).toHaveBeenCalledWith('https://cloud.example/call/abc', '_blank', 'noopener,noreferrer')
	})

	it('opens nothing when the call fails or the answer holds no safe address', async () => {
		axios.post.mockRejectedValueOnce(new Error('nope'))
		await dispatchAction({ type: 'api-call', url: '/apps/x/api', openResponse: { newTab: true } }, { tokenCtx: {} })
		axios.post.mockResolvedValueOnce({ data: { url: 'javascript:alert(1)' } })
		await dispatchAction({ type: 'api-call', url: '/apps/x/api', openResponse: { newTab: true } }, { tokenCtx: {} })
		expect(open).not.toHaveBeenCalled()
	})

	it('is accepted by the manifest schema in its three shapes, and nothing else', () => {
		const manifest = (openResponse) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [{ id: 'Subs', route: '/subs', type: 'index', title: 'Subs', config: { register: 'r', schema: 's' }, actions: [{ id: 'talk', label: 'Talk', type: 'api-call', url: '/apps/x/api', openResponse }] }],
		})
		expect(validateManifestV2(manifest(true)).valid).toBe(true)
		expect(validateManifestV2(manifest('room.url')).valid).toBe(true)
		expect(validateManifestV2(manifest({ field: 'url', newTab: true })).valid).toBe(true)
		expect(validateManifestV2(manifest({ target: '_blank' })).valid).toBe(false)
		expect(validateManifestV2(manifest(3)).valid).toBe(false)
	})
})
