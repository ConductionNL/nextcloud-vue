/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * objectWrite: nested field paths and the `save` endpoint template.
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()
var mockPut = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		patch: (...args) => mockPatch(...args),
		put: (...args) => mockPut(...args),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { fillSaveTemplate, nestChanges, setPath, writeFields } from '../../src/utils/objectWrite.js'

const URL = '/apps/openregister/api/objects/portaliq/portal/p-1'

describe('setPath and nestChanges', () => {
	test('sets a leaf on a copy and keeps the siblings', () => {
		const base = { a: { b: 1, c: 2 }, d: 3 }
		const next = setPath(base, 'a.b', 9)
		expect(next).toEqual({ a: { b: 9, c: 2 }, d: 3 })
		expect(base.a.b).toBe(1)
	})

	test('creates the objects on the way, replacing a non-object', () => {
		expect(setPath({ a: 'x' }, 'a.b.c', true)).toEqual({ a: { b: { c: true } } })
		expect(setPath(null, 'a.b', 1)).toEqual({ a: { b: 1 } })
	})

	test('nests several paths', () => {
		expect(nestChanges({ 'a.b': 1, 'a.c': 2, d: 3 })).toEqual({ a: { b: 1, c: 2 }, d: 3 })
	})
})

describe('fillSaveTemplate', () => {
	const scope = { value: false, field: 'a.b', changes: { a: { b: false } }, object: { slug: 'zuid', meta: { id: 7 } } }

	test('a whole-string token keeps the type', () => {
		expect(fillSaveTemplate({ enabled: '{value}', all: '{changes}', id: '{object.meta.id}' }, scope)).toEqual({ enabled: false, all: { a: { b: false } }, id: 7 })
	})

	test('a token inside text is written as text', () => {
		expect(fillSaveTemplate('/api/{object.slug}/{field}', scope)).toBe('/api/zuid/a.b')
	})

	test('an unknown object path is empty, arrays are walked', () => {
		expect(fillSaveTemplate(['{object.nope}', 'x{object.nope}y'], scope)).toEqual([null, 'xy'])
	})
})

describe('writeFields', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockPut.mockReset()
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: body }))
		mockPut.mockImplementation(() => Promise.resolve({ data: { ok: true } }))
	})

	test('top-level fields go out as one PATCH with no re-read', async () => {
		await writeFields(URL, { title: 'x', pageLimit: 3 })
		expect(mockGet).not.toHaveBeenCalled()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch.mock.calls[0][1]).toEqual({ title: 'x', pageLimit: 3 })
	})

	test('a nested leaf re-reads the object and PATCHes the whole enclosing top-level object', async () => {
		mockGet.mockResolvedValue({ data: { authentication: { registration: { policy: 'approval', contact: 'a@b.nl' }, methods: { digid: true } } } })
		await writeFields(URL, { 'authentication.registration.policy': 'open' })
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(mockPatch.mock.calls[0][1]).toEqual({
			authentication: { registration: { policy: 'open', contact: 'a@b.nl' }, methods: { digid: true } },
		})
	})

	test('two leaves under one top-level object and a plain field are one PATCH', async () => {
		mockGet.mockResolvedValue({ data: { authentication: { registration: { policy: 'approval' }, other: 1 } } })
		await writeFields(URL, { 'authentication.registration.policy': 'open', 'authentication.registration.notify': true, title: 'T' })
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch.mock.calls[0][1]).toEqual({
			authentication: { registration: { policy: 'open', notify: true }, other: 1 },
			title: 'T',
		})
	})

	test('a missing enclosing object is created', async () => {
		mockGet.mockResolvedValue({ data: {} })
		await writeFields(URL, { 'a.b.c': 1 })
		expect(mockPatch.mock.calls[0][1]).toEqual({ a: { b: { c: 1 } } })
	})

	test('a failed re-read writes nothing', async () => {
		mockGet.mockRejectedValue(new Error('boom'))
		await expect(writeFields(URL, { 'a.b': 1 })).rejects.toThrow('boom')
		expect(mockPatch).not.toHaveBeenCalled()
	})

	test('a save template writes to the endpoint, not the object', async () => {
		const data = await writeFields(URL, { 'auth.digid': false }, {
			save: { url: '/apps/portaliq/api/portals/{object.slug}/signin', method: 'put', payload: { method: '{field}', enabled: '{value}' } },
			object: { slug: 'zuid' },
		})
		expect(data).toEqual({ ok: true })
		expect(mockPatch).not.toHaveBeenCalled()
		expect(mockGet).not.toHaveBeenCalled()
		expect(mockPut.mock.calls[0][0]).toBe('/index.php/apps/portaliq/api/portals/zuid/signin')
		expect(mockPut.mock.calls[0][1]).toEqual({ method: 'auth.digid', enabled: false })
	})

	test('a token in the save address is encoded, and a missing one refuses the write', async () => {
		await writeFields(URL, { a: 1 }, { save: { url: '/apps/x/api/{object.slug}/y' }, object: { slug: 'a b/c' } })
		expect(mockPatch.mock.calls[0][0]).toContain('/apps/x/api/a%20b%2Fc/y')
		mockPatch.mockClear()
		await expect(writeFields(URL, { a: 1 }, { save: { url: '/apps/x/api/{object.slug}/y' }, object: {} })).rejects.toThrow('{object.slug}')
		expect(mockPatch).not.toHaveBeenCalled()
	})

	test('a save template without payload sends the nested changes, PATCH by default', async () => {
		await writeFields(URL, { 'a.b': 1, c: 2 }, { save: { url: '/apps/x/api/y' } })
		expect(mockPatch.mock.calls[0][0]).toBe('/index.php/apps/x/api/y')
		expect(mockPatch.mock.calls[0][1]).toEqual({ a: { b: 1 }, c: 2 })
	})
})
