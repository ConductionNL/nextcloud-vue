/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A schema TITLE is kebab-cased into the objects-API path (`ReportPeriod`
 * -> `report-period`), but some registers hold the title as written
 * (learniq `LearniqSettings`, `SubjectTeacherAssignment`). For a type it
 * registered from a kebab-cased title, resolveObjectOpType leaves the title as
 * a fallback, and the store retries with it ONCE on a 404, keeping it after a
 * success. The kebab form is still tried first, so a schema registered under
 * it, and every type registered any other way, makes the one request it
 * always made.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-a-schema-title-falls-back-to-its-written-form
 */
import { createPinia, setActivePinia } from 'pinia'
import { createObjectStore } from '../../src/store/useObjectStore.js'
import { resolveObjectOpType } from '../../src/utils/actionsDispatcher.js'

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const notFound = () => ({ ok: false, status: 404, statusText: 'Not Found', text: async () => '', json: async () => ({ message: 'Not found' }) })

describe('useObjectStore: schema fallback on 404', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = createObjectStore('fallback-store')()
		global.fetch = jest.fn()
		jest.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.restoreAllMocks()
		delete global.fetch
	})

	it('makes one request and no fallback for a kebab schema (today)', async () => {
		const type = resolveObjectOpType(store, { register: 'learniq', schema: 'report-period' })
		global.fetch.mockResolvedValue(notFound())
		await store.fetchCollection(type)
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(store.objectTypeRegistry[type].schemaFallback).toBeUndefined()
	})

	it('makes one request when the kebab form answers', async () => {
		const type = resolveObjectOpType(store, { register: 'learniq', schema: 'ReportPeriod' })
		global.fetch.mockResolvedValue(ok({ results: [{ id: 'a' }], total: 1 }))
		const rows = await store.fetchCollection(type)
		expect(rows).toEqual([{ id: 'a' }])
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(global.fetch.mock.calls[0][0]).toContain('/learniq/report-period')
	})

	it('retries with the title as written on a 404 and keeps it', async () => {
		const type = resolveObjectOpType(store, { register: 'learniq', schema: 'LearniqSettings' })
		expect(type).toBe('learniq/learniq-settings')
		global.fetch
			.mockResolvedValueOnce(notFound())
			.mockResolvedValueOnce(ok({ results: [{ id: 's' }], total: 1 }))
		const rows = await store.fetchCollection(type)
		expect(rows).toEqual([{ id: 's' }])
		expect(global.fetch.mock.calls.map((c) => c[0])).toEqual([
			expect.stringContaining('/learniq/learniq-settings'),
			expect.stringContaining('/learniq/LearniqSettings'),
		])
		expect(store.objectTypeRegistry[type].schema).toBe('LearniqSettings')

		global.fetch.mockResolvedValueOnce(ok({ id: 's' }))
		await store.fetchObject(type, 's')
		expect(global.fetch.mock.calls[2][0]).toContain('/learniq/LearniqSettings/s')
	})

	it('keeps the kebab schema and the first answer when the fallback also fails', async () => {
		const type = resolveObjectOpType(store, { register: 'learniq', schema: 'SubjectTeacherAssignment' })
		global.fetch.mockResolvedValue(notFound())
		const saved = await store.saveObject(type, { name: 'x' })
		expect(saved).toBeNull()
		expect(global.fetch).toHaveBeenCalledTimes(2)
		expect(global.fetch.mock.calls[1][1].method).toBe('POST')
		expect(store.objectTypeRegistry[type].schema).toBe('subject-teacher-assignment')
		expect(store.errors[type]).not.toBeNull()
	})

	it('does not retry a type registered without a fallback', async () => {
		store.registerObjectType('case', 'Case', 'dossiq')
		global.fetch.mockResolvedValue(notFound())
		await store.deleteObject('case', 'c1')
		expect(global.fetch).toHaveBeenCalledTimes(1)
	})
})
