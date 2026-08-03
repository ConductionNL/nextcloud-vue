/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Regression suite for nextcloud-vue#573 — responses that are discarded
 * without their body being read keep the underlying HTTP request in flight.
 *
 * The bug is invisible to any assertion about return VALUES: `fetchSchema()`
 * correctly returned `null` on a 404 both before and after the fix. What
 * differed is whether the response stream was released. So these tests assert
 * on the stream, not on the return value — a fake body that records whether
 * `cancel()` was called is the only thing that can tell the two apart.
 */
import { createPinia, setActivePinia } from 'pinia'
import { createObjectStore } from '../../src/store/useObjectStore.js'
import { discardResponseBody } from '../../src/utils/discardResponseBody.js'

/**
 * Build a Response double whose body records cancellation.
 *
 * @param {object} init Response shape.
 * @param {boolean} init.ok Whether the response is a 2xx.
 * @param {number} init.status HTTP status code.
 * @param {object} [init.json] Payload returned by `.json()`.
 *
 * @return {object} `{ response, wasCancelled }`
 */
function responseWithTrackedBody({ ok, status, json = {} }) {
	const state = { cancelled: false }
	const response = {
		ok,
		status,
		statusText: `status ${status}`,
		bodyUsed: false,
		body: {
			cancel() {
				state.cancelled = true
				return Promise.resolve()
			},
		},
		async json() {
			response.bodyUsed = true
			return json
		},
	}
	return { response, wasCancelled: () => state.cancelled }
}

describe('discardResponseBody', () => {
	it('cancels an unread body', () => {
		const { response, wasCancelled } = responseWithTrackedBody({ ok: false, status: 404 })
		discardResponseBody(response)
		expect(wasCancelled()).toBe(true)
	})

	it('does not cancel a body that was already consumed', async () => {
		const { response, wasCancelled } = responseWithTrackedBody({ ok: true, status: 200 })
		await response.json()
		discardResponseBody(response)
		expect(wasCancelled()).toBe(false)
	})

	it('tolerates null, undefined and bodyless responses', () => {
		expect(() => discardResponseBody(null)).not.toThrow()
		expect(() => discardResponseBody(undefined)).not.toThrow()
		expect(() => discardResponseBody({ ok: false, status: 204 })).not.toThrow()
	})

	it('never throws when cancel() itself rejects', () => {
		const response = {
			ok: false,
			body: { cancel: () => Promise.reject(new Error('already locked')) },
		}
		expect(() => discardResponseBody(response)).not.toThrow()
	})
})

describe('useObjectStore — response bodies are always released (#573)', () => {
	let store
	let tracked

	beforeEach(() => {
		setActivePinia(createPinia())
		store = createObjectStore('leak-test-store')()
		store.registerObjectType('client', '28', '5')
		tracked = []
	})

	afterEach(() => {
		global.fetch = undefined
	})

	/**
	 * Install a fetch stub that always answers with the given shape and
	 * records every response it handed out.
	 *
	 * @param {object} init See responseWithTrackedBody.
	 *
	 * @return {void}
	 */
	function stubFetch(init) {
		global.fetch = jest.fn(async () => {
			const entry = responseWithTrackedBody(init)
			tracked.push(entry)
			return entry.response
		})
	}

	it('releases the body when a schema fetch 404s', async () => {
		stubFetch({ ok: false, status: 404 })

		await expect(store.fetchSchema('client')).resolves.toBe(null)

		expect(tracked).toHaveLength(1)
		expect(tracked[0].wasCancelled()).toBe(true)
	})

	it('releases the body when a register fetch 404s', async () => {
		stubFetch({ ok: false, status: 404 })

		await expect(store.fetchRegister('client')).resolves.toBe(null)

		expect(tracked).toHaveLength(1)
		expect(tracked[0].wasCancelled()).toBe(true)
	})

	it('releases the body of a successful DELETE, whose payload is never read', async () => {
		stubFetch({ ok: true, status: 204 })

		await expect(store.deleteObject('client', 'abc-123')).resolves.toBe(true)

		expect(tracked).toHaveLength(1)
		expect(tracked[0].wasCancelled()).toBe(true)
	})

	it('releases every body in a bulk delete', async () => {
		stubFetch({ ok: true, status: 204 })

		await store.deleteObjects('client', ['a', 'b', 'c'])

		expect(tracked).toHaveLength(3)
		expect(tracked.every((t) => t.wasCancelled())).toBe(true)
	})

	it('still parses the body on a successful schema fetch', async () => {
		stubFetch({ ok: true, status: 200, json: { id: '28', title: 'Client' } })

		await expect(store.fetchSchema('client')).resolves.toEqual({ id: '28', title: 'Client' })

		// Consumed, not cancelled — cancelling a stream that .json() already
		// drained throws in some engines.
		expect(tracked[0].wasCancelled()).toBe(false)
	})
})
