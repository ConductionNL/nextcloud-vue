/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An edit writes only the keys it changed: the store's PATCH, the diff that
 * decides what to send, and the edit save sites that use it.
 *
 * @spec openspec/changes/forms-save-edited-keys/specs/object-store/spec.md#requirement-an-edit-writes-only-the-keys-it-changed
 */
import { createPinia, setActivePinia } from 'pinia'
import { createSelfModeActions } from '../../src/components/CnIndexPage/selfModeActions.js'
import { createObjectStore } from '../../src/store/useObjectStore.js'
import { changedKeys, objectIdOf, saveEdited } from '../../src/utils/saveEdited.js'

const STATUS = { id: 's1', '@self': { id: 's1' }, name: 'Intake', order: 1, capacity: 5, phaseTermDays: 10, checklist: [{ title: 'Call' }] }

describe('changedKeys', () => {
	it('keeps the keys whose value changed, by content', () => {
		expect(changedKeys(STATUS, { ...STATUS, name: 'Intake 2' })).toEqual({ name: 'Intake 2' })
		expect(changedKeys(STATUS, { ...STATUS, checklist: [{ title: 'Call' }] })).toEqual({})
		expect(changedKeys(STATUS, { ...STATUS, checklist: [{ title: 'Call' }, { title: 'Mail' }] })).toEqual({ checklist: [{ title: 'Call' }, { title: 'Mail' }] })
	})

	it('treats a key the form leaves out as no change, and never writes id or @self', () => {
		expect(changedKeys(STATUS, { name: 'Intake', id: 'other', '@self': {} })).toEqual({})
	})

	it('sees a cleared value as a change, and null for undefined as none', () => {
		expect(changedKeys(STATUS, { capacity: null })).toEqual({ capacity: null })
		expect(changedKeys({ a: null }, { a: undefined })).toEqual({})
	})

	it('reads an id from id, @self.id or uuid', () => {
		expect(objectIdOf({ '@self': { id: 'x' } })).toBe('x')
		expect(objectIdOf({ uuid: 'u' })).toBe('u')
		expect(objectIdOf(null)).toBe('')
	})
})

describe('saveEdited', () => {
	const storeWith = (extra = {}) => ({ saveObject: jest.fn(async (t, d) => d), patchObject: jest.fn(async (t, id, c) => ({ ...STATUS, ...c })), ...extra })

	it('patches only the changed keys of an existing object', async () => {
		const store = storeWith()
		const saved = await saveEdited(store, 'status', STATUS, { name: 'Review', order: 1 })
		expect(store.patchObject).toHaveBeenCalledWith('status', 's1', { name: 'Review' })
		expect(store.saveObject).not.toHaveBeenCalled()
		expect(saved.capacity).toBe(5)
	})

	it('writes nothing when nothing changed', async () => {
		const store = storeWith()
		expect(await saveEdited(store, 'status', STATUS, { name: 'Intake' })).toBe(STATUS)
		expect(store.patchObject).not.toHaveBeenCalled()
	})

	it('creates through saveObject, and falls back to it for a store that cannot patch', async () => {
		const store = storeWith()
		await saveEdited(store, 'status', null, { name: 'New' })
		expect(store.saveObject).toHaveBeenCalledWith('status', { name: 'New' })
		const old = { saveObject: jest.fn(async () => ({})) }
		await saveEdited(old, 'status', STATUS, { ...STATUS, name: 'x' })
		expect(old.saveObject).toHaveBeenCalledWith('status', { ...STATUS, name: 'x' })
	})
})

describe('the store PATCH', () => {
	beforeEach(() => setActivePinia(createPinia()))
	afterEach(() => jest.restoreAllMocks())

	it('sends PATCH with the changes only and caches the answer', async () => {
		const store = createObjectStore('patch-store')()
		store.registerObjectType('status', 'statusType', 'dossiq')
		const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...STATUS, order: 2 }) })
		const saved = await store.patchObject('status', 's1', { order: 2 })
		const [url, init] = fetchSpy.mock.calls[0]
		expect(url).toContain('/objects/dossiq/statusType/s1')
		expect(init.method).toBe('PATCH')
		expect(JSON.parse(init.body)).toEqual({ order: 2 })
		expect(saved.order).toBe(2)
		expect(store.objects.status.s1.capacity).toBe(5)
	})

	it('records a refusal and resolves to null', async () => {
		const store = createObjectStore('patch-store-2')()
		store.registerObjectType('status', 'statusType', 'dossiq')
		jest.spyOn(console, 'error').mockImplementation(() => {})
		jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 422, statusText: 'Unprocessable', text: async () => '{"message":"A case type keeps one final status"}', json: async () => ({ message: 'A case type keeps one final status' }) })
		expect(await store.patchObject('status', 's1', { isFinal: false })).toBeNull()
		expect(store.errors.status).not.toBeNull()
	})
})

describe('the index page edit save', () => {
	it('patches only what the form changed', async () => {
		const store = { saveObject: jest.fn(), patchObject: jest.fn(async () => ({ ...STATUS, name: 'Review' })), getError: () => null }
		const results = { form: jest.fn() }
		const ctx = {
			isSelfFetchMode: () => true,
			register: () => 'dossiq',
			schema: () => 'statusType',
			selfObjectStore: () => store,
			selfObjectType: () => 'status',
			editItem: () => STATUS,
			emit: jest.fn(),
			setResults: results,
			list: () => ({ refresh: jest.fn() }),
		}
		const actions = createSelfModeActions(ctx)
		await actions.handleFormSave({ name: 'Review', order: 1, capacity: 5 })
		expect(store.patchObject).toHaveBeenCalledWith(expect.any(String), 's1', { name: 'Review' })
		expect(store.saveObject).not.toHaveBeenCalled()
	})
})
