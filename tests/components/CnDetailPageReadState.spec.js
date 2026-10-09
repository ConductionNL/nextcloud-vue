/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/record-unread-markers/tasks.md#task-2
 */
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'

const mockSetReadState = jest.fn()
jest.mock('../../src/utils/recordInteractions.js', () => ({
	__esModule: true,
	setReadState: (...a) => mockSetReadState(...a),
	setFavourite: jest.fn(),
	setWatching: jest.fn(),
	listWatchers: jest.fn(),
	setWatcher: jest.fn(),
}))

import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function makeStore(self, { fail = false } = {}) {
	const store = reactive({
		objects: fail ? {} : { 'pipelinq-ticket': { t1: { id: 't1', title: 'Broken printer', '@self': self } } },
		objectTypeRegistry: { 'pipelinq-ticket': { register: 'pipelinq', schema: 'ticket' } },
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn().mockResolvedValue(null),
		fetchSchema: jest.fn().mockResolvedValue(null),
		getSchema: () => ({ title: 'Ticket', properties: { title: { type: 'string' } } }),
		getError: () => (fail ? { status: 500 } : null),
		getObject: () => null,
	})
	return store
}

const stubs = { CnFavouriteToggle: true, CnFollowToggle: true }

function mountPage(store, props = {}) {
	return mount(CnDetailPage, {
		props: { title: 'Ticket', register: 'pipelinq', schema: 'ticket', objectId: 't1', objectStore: store, ...props },
		global: { stubs, mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), back: jest.fn() } } },
	})
}

beforeEach(() => {
	mockSetReadState.mockReset()
	mockSetReadState.mockResolvedValue({ ok: true, status: 200 })
})

describe('CnDetailPage read-state', () => {
	it('declares markRead on by default', () => {
		expect(CnDetailPage.props.markRead.default).toBe(true)
		expect(CnDetailPage.props.markUnreadNavigatesBack.default).toBe(false)
	})

	it('sends exactly one PUT .../read-state after the object rendered unread', async () => {
		const w = mountPage(makeStore({ unread: true }))
		await flushPromises()
		expect(mockSetReadState).toHaveBeenCalledTimes(1)
		expect(mockSetReadState).toHaveBeenCalledWith('pipelinq', 'ticket', 't1', true)
		await w.vm.$forceUpdate()
		await flushPromises()
		expect(mockSetReadState).toHaveBeenCalledTimes(1)
	})

	it('sends nothing for a record already read or without the marker', async () => {
		mountPage(makeStore({ unread: false }))
		mountPage(makeStore({}))
		await flushPromises()
		expect(mockSetReadState).not.toHaveBeenCalled()
	})

	it('sends nothing when the object failed to load', async () => {
		mountPage(makeStore({}, { fail: true }))
		await flushPromises()
		expect(mockSetReadState).not.toHaveBeenCalled()
	})

	it('sends nothing with markRead:false', async () => {
		mountPage(makeStore({ unread: true }), { markRead: false })
		await flushPromises()
		expect(mockSetReadState).not.toHaveBeenCalled()
	})

	it('offers Mark as unread when the object carries @self.unread, sends DELETE and emits marked-unread', async () => {
		const w = mountPage(makeStore({ unread: false }))
		await flushPromises()
		expect(w.vm.showMarkUnread).toBe(true)
		await w.vm.onMarkUnread()
		expect(mockSetReadState).toHaveBeenCalledWith('pipelinq', 'ticket', 't1', false)
		expect(w.emitted('marked-unread')).toBeTruthy()
		expect(w.vm.$router.back).not.toHaveBeenCalled()
	})

	it('does not mark it read again right after it was marked unread', async () => {
		const store = makeStore({ unread: true })
		const w = mountPage(store)
		await flushPromises()
		mockSetReadState.mockClear()
		store.objects['pipelinq-ticket'].t1['@self'].unread = true
		await w.vm.onMarkUnread()
		await flushPromises()
		expect(mockSetReadState).toHaveBeenCalledTimes(1)
		expect(mockSetReadState).toHaveBeenLastCalledWith('pipelinq', 'ticket', 't1', false)
	})

	it('goes back after Mark as unread only when asked', async () => {
		const w = mountPage(makeStore({ unread: false }), { markUnreadNavigatesBack: true })
		await flushPromises()
		await w.vm.onMarkUnread()
		expect(w.vm.$router.back).toHaveBeenCalled()
	})

	it('offers no Mark as unread without the marker', async () => {
		const w = mountPage(makeStore({}))
		await flushPromises()
		expect(w.vm.showMarkUnread).toBe(false)
	})
})
