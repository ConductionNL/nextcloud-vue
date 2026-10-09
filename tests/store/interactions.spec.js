/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-1
 */
import { createPinia, setActivePinia } from 'pinia'
import { interactionsPlugin } from '../../src/store/plugins/interactions.js'
import { createObjectStore } from '../../src/store/useObjectStore.js'

const ok = (data = null, status = 200) => ({ ok: true, status, json: async () => data })

describe('interactionsPlugin', () => {
	let store
	beforeEach(() => {
		setActivePinia(createPinia())
		store = createObjectStore('interactions-test', { plugins: [interactionsPlugin()], liveUpdates: false })()
		store.registerObjectType('case', 'ticket', 'pipelinq')
		store.objects = { case: { c1: { id: 'c1', '@self': { favourite: false, watching: false, watcherCount: 1 } } } }
		global.fetch = jest.fn(async () => ok({}))
	})

	const call = () => ({ url: fetch.mock.calls.at(-1)[0], method: fetch.mock.calls.at(-1)[1].method })

	it('stars with PUT .../favourite and writes @self.favourite into the stored object', async () => {
		await store.favourite('case', 'c1')
		expect(call().method).toBe('PUT')
		expect(call().url).toContain('/objects/pipelinq/ticket/c1/favourite')
		expect(store.objects.case.c1['@self'].favourite).toBe(true)
		await store.unfavourite('case', 'c1')
		expect(call().method).toBe('DELETE')
		expect(store.objects.case.c1['@self'].favourite).toBe(false)
	})

	it('follows and unfollows through .../watch', async () => {
		await store.watch('case', 'c1')
		expect(call().url).toContain('/pipelinq/ticket/c1/watch')
		expect(store.objects.case.c1['@self'].watching).toBe(true)
		await store.unwatch('case', 'c1')
		expect(call().method).toBe('DELETE')
		expect(store.objects.case.c1['@self'].watching).toBe(false)
	})

	it('leaves the stored object alone when the call fails, and reports the message', async () => {
		global.fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'Database down' }) }))
		const result = await store.favourite('case', 'c1')
		expect(result.ok).toBe(false)
		expect(result.message).toContain('Database down')
		expect(store.objects.case.c1['@self'].favourite).toBe(false)
	})

	it('lists, adds and removes watchers', async () => {
		global.fetch = jest.fn(async () => ok({ results: [{ userId: 'jan' }], total: 1 }))
		const list = await store.fetchWatchers('case', 'c1')
		expect(list.data.total).toBe(1)
		expect(call().url).toContain('/c1/watchers')
		await store.addWatcher('case', 'c1', 'jan')
		expect(call()).toMatchObject({ method: 'PUT' })
		expect(call().url).toContain('/c1/watchers/jan')
		await store.removeWatcher('case', 'c1', 'jan')
		expect(call().method).toBe('DELETE')
	})

	it('never throws on a network failure', async () => {
		global.fetch = jest.fn(async () => {
			throw new Error('offline')
		})
		const result = await store.watch('case', 'c1')
		expect(result).toMatchObject({ ok: false, message: 'offline' })
	})
})

describe('fetchObject with extend', () => {
	it('sends _extend[] and keeps it in the in-flight key', async () => {
		setActivePinia(createPinia())
		const s = createObjectStore('extend-test', { liveUpdates: false })()
		s.registerObjectType('case', 'ticket', 'pipelinq')
		global.fetch = jest.fn(async () => ok({ id: 'c1' }))
		await s.fetchObject('case', 'c1', { extend: ['@self.can', '@self.unreadCounts'] })
		expect(decodeURIComponent(fetch.mock.calls[0][0])).toContain('_extend[]=@self.can&_extend[]=@self.unreadCounts')
		await s.fetchObject('case', 'c1')
		expect(fetch.mock.calls[1][0]).not.toContain('_extend')
	})
})
