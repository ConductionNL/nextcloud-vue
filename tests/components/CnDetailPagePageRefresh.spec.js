/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnDetailPage answers `cn:page:refresh`.
 *
 * That channel is what a successful write announces itself on — the manifest
 * `refresh` and `api-call` actions bump it, and an app's own dialog emits it
 * after a save. In the library only `useEndpointSource` and CnChartWidget
 * consumed it, so nothing re-read the page's OBJECT. Every widget bound to it
 * (`type: "data"` above all) reads the copy this component fetched once, and a
 * page therefore went on rendering values the backend had already changed.
 *
 * Measured on a dossiq draft: the publish endpoint returned
 * `{"published":true,"version":1}`, a direct re-read showed `isDraft: false`,
 * and the page still said draft, version 1, empty change note.
 *
 * The subscription lives on the PAGE rather than in each widget so that one
 * write is one read however many object-bound widgets the page carries — the
 * failure mode a broadcast channel invites is a burst, and the two tests at
 * the bottom of this file are the ones that hold that line.
 */

import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

import { subscribe, unsubscribe } from '@nextcloud/event-bus'

const CHANNEL = 'cn:page:refresh'

function makeFakeStore() {
	const store = {
		objects: {},
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(function(slug) {
			store.objectTypeRegistry = { ...store.objectTypeRegistry, [slug]: {} }
		}),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
	return store
}

/** @return {Function} The handler CnDetailPage registered for the channel. */
function busHandler() {
	const call = subscribe.mock.calls.find(([channel]) => channel === CHANNEL)
	return call && call[1]
}

const mountPage = (store, propsData = {}) => mount(CnDetailPage, {
	propsData: {
		register: 'openbuilt',
		schema: 'application',
		objectId: 'a-1',
		objectStore: store,
		...propsData,
	},
})

describe('CnDetailPage — cn:page:refresh', () => {
	beforeEach(() => jest.clearAllMocks())

	it('subscribes to the channel on mount', () => {
		mountPage(makeFakeStore())
		expect(busHandler()).toBeInstanceOf(Function)
	})

	it('re-reads the object when the channel fires', async () => {
		const store = makeFakeStore()
		mountPage(store)
		await Promise.resolve()
		store.fetchObject.mockClear()

		busHandler()({})
		await Promise.resolve()

		// THE DEFECT. Pre-fix this was 0: a successful write announced itself
		// and the page carried on showing what it had fetched on mount.
		expect(store.fetchObject).toHaveBeenCalledWith('openbuilt-application', 'a-1')
	})

	it('does not re-register the type, which would blank the object mid-refresh', async () => {
		const store = makeFakeStore()
		mountPage(store)
		await Promise.resolve()
		expect(store.registerObjectType).toHaveBeenCalledTimes(1)

		busHandler()({})
		await Promise.resolve()

		expect(store.registerObjectType).toHaveBeenCalledTimes(1)
	})

	it('unsubscribes on unmount, so a destroyed page cannot keep fetching', () => {
		const wrapper = mountPage(makeFakeStore())
		const handler = busHandler()
		wrapper.unmount()
		expect(unsubscribe).toHaveBeenCalledWith(CHANNEL, handler)
	})

	it('ignores the channel on a page that does not self-fetch', () => {
		const store = makeFakeStore()
		// No objectId → hasSchemaDrivenFetch is false; the host owns the data
		// and the page has nothing of its own to re-read.
		mount(CnDetailPage, { propsData: { title: 'Expense', objectStore: store } })
		const handler = busHandler()
		expect(() => handler({})).not.toThrow()
		expect(store.fetchObject).not.toHaveBeenCalled()
	})

	// THE BURST. A channel every widget answers turns one write into a storm
	// of reads. Two guards, one test each.

	it('reads ONCE for a header Refresh, which emits @refresh and then the channel', async () => {
		const store = makeFakeStore()
		const wrapper = mountPage(store)
		await Promise.resolve()
		store.fetchObject.mockClear()

		// CnActionsMenu.onRefreshClick emits `@refresh` first and only then
		// emits on the bus, so the page sees both for one click.
		const pending = wrapper.vm.onHeaderRefresh({ widgetId: 'w', title: 'T' }, {})
		busHandler()({})
		await pending
		await Promise.resolve()

		expect(store.fetchObject).toHaveBeenCalledTimes(1)
	})

	it('reads ONCE when the channel fires twice before the first read settles', async () => {
		const store = makeFakeStore()
		let release
		store.fetchObject.mockImplementation(() => new Promise((resolve) => { release = resolve }))
		mountPage(store)
		await Promise.resolve()
		store.fetchObject.mockClear()

		busHandler()({})
		busHandler()({})
		await Promise.resolve()

		expect(store.fetchObject).toHaveBeenCalledTimes(1)
		release(null)
	})
})
