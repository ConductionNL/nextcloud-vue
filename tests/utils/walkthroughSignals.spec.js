/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every create through the object store announces itself to the walkthrough
 * (pipelinq review C1: "Click New and save a product" never advanced when the
 * product was saved through a form that was not the index page's own).
 */
import { createPinia, setActivePinia } from 'pinia'
import { useObjectStore } from '@/store/useObjectStore.js'
import { __resetObjectCreatedDedupeForTests, dispatchObjectCreated, OBJECT_CREATED_EVENT } from '@/utils/walkthroughSignals.js'

let events
const listener = (e) => events.push(e.detail)

beforeEach(() => {
	events = []
	__resetObjectCreatedDedupeForTests()
	window.addEventListener(OBJECT_CREATED_EVENT, listener)
	setActivePinia(createPinia())
})
afterEach(() => window.removeEventListener(OBJECT_CREATED_EVENT, listener))

describe('dispatchObjectCreated', () => {
	it('sends the register and schema slugs with the object', () => {
		dispatchObjectCreated({ register: 'pipelinq', schema: 'product', object: { id: 'p-1', '@self': { schema: 85 } } })
		expect(events).toHaveLength(1)
		expect(events[0].register).toBe('pipelinq')
		expect(events[0].schema).toBe('product')
		expect(events[0].object.id).toBe('p-1')
	})

	it('announces one create once, even when two layers report it', () => {
		dispatchObjectCreated({ register: 'pipelinq', schema: 'product', object: { id: 'p-1' } })
		dispatchObjectCreated({ register: 'pipelinq', schema: 'product', object: { id: 'p-1' } })
		expect(events).toHaveLength(1)
	})
})

describe('useObjectStore.saveObject', () => {
	const okResponse = (body) => Promise.resolve({ ok: true, json: async () => body })

	it('announces a create with the registered slugs', async () => {
		global.fetch = jest.fn(() => okResponse({ id: 'p-9', name: 'Hosting', '@self': { register: 3, schema: 85 } }))
		const store = useObjectStore()
		store.registerObjectType('product', 'product', 'pipelinq')
		await store.saveObject('product', { name: 'Hosting' })
		expect(events).toHaveLength(1)
		expect(events[0]).toEqual(expect.objectContaining({ register: 'pipelinq', schema: 'product' }))
	})

	it('stays silent on an update', async () => {
		global.fetch = jest.fn(() => okResponse({ id: 'p-9', name: 'Hosting' }))
		const store = useObjectStore()
		store.registerObjectType('product', 'product', 'pipelinq')
		await store.saveObject('product', { id: 'p-9', name: 'Hosting' })
		expect(events).toHaveLength(0)
	})
})
