/**
 * Who else has this record open, on a clock the test controls.
 *
 * 🔴 THE LIST HAS TWO SOURCES AND BOTH HAVE TO WORK. Every beat answers the
 * current list, so presence is correct on an instance with no notify_push at
 * all — it simply learns at beat pace. The push is the optimisation. Relying on
 * the push alone would make this a feature that silently does nothing wherever
 * notify_push is not installed, which is most development instances and some
 * production ones, and it would look exactly like working.
 *
 * 🔴 THE VIEWER IS FILTERED OUT HERE, NOT ONLY BY THE SERVER. The beat's answer
 * already excludes the caller, but a PUSH carries the whole list: it is one
 * payload for every recipient and cannot be personalised. Without the filter a
 * reader sees their own avatar appear the moment somebody else arrives.
 *
 * 🔑 A FAILED BEAT IS NOT AN EMPTY LIST. Clearing on error would tell this
 * reader they are alone on a page two colleagues are looking at.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

const mockAxios = {
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
}

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: mockAxios,
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path) => path,
}))

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: () => ({ uid: 'anna' }),
}))

/** The subscription the composable made, so a test can push into it. */
const mockTransport = {
	handler: null,
	subscribe: jest.fn((key, cb) => {
		mockTransport.handler = cb
		return { key }
	}),
	unsubscribe: jest.fn(),
}

jest.mock('../../store/liveUpdates/transport.js', () => ({
	__esModule: true,
	getLiveUpdates: () => mockTransport,
}))

const { effectScope, nextTick } = require('vue')
const { useObjectPresence } = require('../useObjectPresence.js')

/**
 * Run the composable in a scope and hand it to the body.
 *
 * @param {Function} body What to do with the presence state.
 * @return {Promise<*>} Whatever the body returned.
 */
async function withPresence(body) {
	const scope = effectScope()
	let presence
	scope.run(() => {
		presence = useObjectPresence('dossiq', 'case', 'case-1')
	})
	try {
		return await body(presence)
	} finally {
		scope.stop()
	}
}

describe('useObjectPresence', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		mockAxios.put.mockReset().mockResolvedValue({ data: { present: [], beatSeconds: 30 } })
		mockAxios.delete.mockReset().mockResolvedValue({ data: {} })
		mockTransport.handler = null
		mockTransport.subscribe.mockClear()
		mockTransport.unsubscribe.mockClear()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('🔴 beats the presence endpoint of the object it was given', async () => {
		await withPresence(async () => {
			await nextTick()
		})

		expect(mockAxios.put).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/dossiq/case/case-1/presence',
		)
	})

	it('🔴 takes the list from the BEAT, so it works with no push at all', async () => {
		mockAxios.put.mockResolvedValue({
			data: { present: [{ user: 'bram' }], beatSeconds: 30 },
		})

		const seen = await withPresence(async (presence) => {
			await nextTick()
			await Promise.resolve()
			return presence.others.value
		})

		expect(seen).toEqual([{ user: 'bram' }])
	})

	it('🔴 takes the list from a PUSH on the object channel', async () => {
		const seen = await withPresence(async (presence) => {
			await nextTick()
			mockTransport.handler('or-object-case-1', {
				action: 'presence',
				present: [{ user: 'bram' }, { user: 'chris' }],
			})
			return presence.count.value
		})

		expect(seen).toBe(2)
	})

	it('🔴 ignores a lifecycle payload on the same channel', async () => {
		const seen = await withPresence(async (presence) => {
			await nextTick()
			mockTransport.handler('or-object-case-1', {
				action: 'presence',
				present: [{ user: 'bram' }],
			})
			// The SAME channel carries create/update/delete. Adopting one would
			// blank the list on every save, because it has no `present` key.
			mockTransport.handler('or-object-case-1', { action: 'update', uuid: 'case-1' })
			return presence.count.value
		})

		expect(seen).toBe(1)
	})

	it('🔴 leaves the viewer out of their own list', async () => {
		const seen = await withPresence(async (presence) => {
			await nextTick()
			// A push carries the WHOLE list: one payload for every recipient.
			mockTransport.handler('or-object-case-1', {
				action: 'presence',
				present: [{ user: 'anna' }, { user: 'bram' }],
			})
			return presence.others.value
		})

		expect(seen).toEqual([{ user: 'bram' }])
	})

	it('🔴 a failed beat does not empty the list', async () => {
		const seen = await withPresence(async (presence) => {
			await nextTick()
			mockTransport.handler('or-object-case-1', {
				action: 'presence',
				present: [{ user: 'bram' }],
			})

			mockAxios.put.mockRejectedValueOnce(new Error('network gone'))
			jest.advanceTimersByTime(30000)
			await Promise.resolve()

			return presence.count.value
		})

		expect(seen).toBe(1)
	})

	it('keeps beating on the interval', async () => {
		await withPresence(async () => {
			await nextTick()
			expect(mockAxios.put).toHaveBeenCalledTimes(1)

			jest.advanceTimersByTime(30000)
			expect(mockAxios.put).toHaveBeenCalledTimes(2)

			jest.advanceTimersByTime(30000)
			expect(mockAxios.put).toHaveBeenCalledTimes(3)
		})
	})

	it('🔴 departs and stops beating when the scope goes', async () => {
		await withPresence(async () => {
			await nextTick()
		})

		expect(mockAxios.delete).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/dossiq/case/case-1/presence',
		)

		// And the timer is gone: a torn-down page must not keep claiming a
		// reader is there.
		const beatsBefore = mockAxios.put.mock.calls.length
		jest.advanceTimersByTime(120000)
		expect(mockAxios.put).toHaveBeenCalledTimes(beatsBefore)
	})

	it('unsubscribes from the channel when the scope goes', async () => {
		await withPresence(async () => {
			await nextTick()
		})

		expect(mockTransport.unsubscribe).toHaveBeenCalled()
	})

	it('does nothing at all when disabled', async () => {
		const scope = effectScope()
		scope.run(() => {
			useObjectPresence('dossiq', 'case', 'case-1', { enabled: false })
		})
		await nextTick()
		scope.stop()

		expect(mockAxios.put).not.toHaveBeenCalled()
	})
})
