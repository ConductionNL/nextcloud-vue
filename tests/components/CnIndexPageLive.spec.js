/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page can follow live changes (`live: ["lead", "ticket"]`): it
 * subscribes to those object types, reads the list again shortly after a
 * change arrives, and lets go when it leaves.
 *
 * @spec openspec/changes/pl4-index-live/specs/pl4-index-live/spec.md#requirement-an-index-page-follows-live-changes
 */

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

/**
 * A page context around a fake store.
 *
 * @param {Array<string>} live The live types.
 * @return {object}
 */
function context(live) {
	const watchers = []
	const store = {
		liveLastEventAt: null,
		subscribe: jest.fn(async (type) => `handle-${type}`),
		unsubscribe: jest.fn(),
	}
	const ctx = {
		live,
		liveHandles: [],
		liveTimer: null,
		liveUnwatch: null,
		liveStore: () => store,
		onRefreshEvent: jest.fn(),
		$watch: jest.fn((getter, callback) => {
			watchers.push({ getter, callback })
			return jest.fn()
		}),
	}
	ctx.onLiveEvent = CnIndexPage.methods.onLiveEvent.bind(ctx)
	return { ctx, store, watchers }
}

describe('CnIndexPage live', () => {
	beforeEach(() => jest.useFakeTimers())
	afterEach(() => jest.useRealTimers())

	it('subscribes to each type and reads the list again after a change', async () => {
		const { ctx, store, watchers } = context(['lead', 'ticket'])
		await CnIndexPage.methods.startLive.call(ctx)
		expect(store.subscribe.mock.calls.map((c) => c[0])).toEqual(['lead', 'ticket'])
		expect(ctx.liveHandles).toEqual(['handle-lead', 'handle-ticket'])
		watchers[0].callback()
		watchers[0].callback()
		jest.advanceTimersByTime(500)
		expect(ctx.onRefreshEvent).toHaveBeenCalledTimes(1)
	})

	it('lets go of its subscriptions when it leaves, and does nothing without live', async () => {
		const { ctx, store } = context(['lead'])
		await CnIndexPage.methods.startLive.call(ctx)
		CnIndexPage.methods.stopLive.call(ctx)
		expect(store.unsubscribe).toHaveBeenCalledWith('handle-lead')
		expect(ctx.liveHandles).toEqual([])

		const none = context([])
		await CnIndexPage.methods.startLive.call(none.ctx)
		expect(none.store.subscribe).not.toHaveBeenCalled()
	})
})
