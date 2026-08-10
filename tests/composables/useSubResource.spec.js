/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for useSubResource() — component-scoped sub-resource fetcher
 * (CalDAV tasks, ICommentsManager notes, etc.) that lives outside the
 * shared Pinia store.
 *
 * Covers URL composition off the registered object-type config, transform
 * application on the result rows, error parsing on non-ok responses, network
 * error trapping, clear() reset, and the "unregistered type" guard.
 */

import { useSubResource } from '../../src/composables/useSubResource.js'

function makeStore() {
	return {
		_options: { baseUrl: '/api' },
		objectTypeRegistry: {
			task: { register: 'tasks', schema: 'caldav' },
			note: { register: 'notes', schema: 'comments' },
		},
	}
}

describe('useSubResource', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('initialises with an empty paginated data envelope', () => {
		const sub = useSubResource(makeStore(), 'tasks', { limit: 10 })
		expect(sub.data.results).toEqual([])
		expect(sub.data.total).toBe(0)
		expect(sub.data.page).toBe(1)
		expect(sub.data.limit).toBe(10)
		expect(sub.loading.value).toBe(false)
		expect(sub.error.value).toBeNull()
	})

	it('composes the URL from the registered type and calls fetch with NC headers', async () => {
		const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ results: [{ id: 'a' }], total: 1, page: 1, pages: 1 }),
		})

		const sub = useSubResource(makeStore(), 'tasks')
		const out = await sub.fetch('task', 'object-123', { _limit: 5 })

		expect(out).toEqual([{ id: 'a' }])
		expect(sub.data.total).toBe(1)
		expect(sub.loading.value).toBe(false)

		const calledUrl = fetchSpy.mock.calls[0][0]
		expect(calledUrl).toContain('/api/tasks/caldav/object-123/tasks')
		expect(calledUrl).toContain('_limit=5')
	})

	it('applies the transform function to each result row', async () => {
		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ results: [{ uid: 'u1', summary: 'Buy milk' }, { uid: 'u2', summary: 'Walk dog' }] }),
		})

		const sub = useSubResource(makeStore(), 'tasks', {
			transform: (t) => ({ id: t.uid, title: t.summary }),
		})

		const out = await sub.fetch('task', 'parent')
		expect(out).toEqual([
			{ id: 'u1', title: 'Buy milk' },
			{ id: 'u2', title: 'Walk dog' },
		])
	})

	it('reads results from a bare-array payload too', async () => {
		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ([{ id: 'x' }, { id: 'y' }]),
		})

		const sub = useSubResource(makeStore(), 'tasks')
		const out = await sub.fetch('task', 'parent')
		expect(out.length).toBe(2)
		expect(sub.data.total).toBe(2)
	})

	it('throws when the object type is not registered', async () => {
		const sub = useSubResource(makeStore(), 'tasks')
		// Sync throw bubbles up inside the try/catch and surfaces as error state.
		await sub.fetch('unknown', 'x')
		expect(sub.error.value).not.toBeNull()
		expect(sub.data.results).toEqual([])
	})

	// An expected 404 must not be written to the console. scholiq's credential
	// -verification page exists to answer "is this credential real?", so an
	// unknown id is the DESIGNED path; the console.error failed its
	// "no fatal JS errors" e2e check on a page that behaved correctly, and no
	// consuming app could suppress it (#612).
	it('does NOT console.error on an expected 404, but still records the error', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: false,
			status: 404,
			statusText: 'Not Found',
			text: async () => 'not found',
			json: async () => { throw new Error('no json') },
		})

		const sub = useSubResource(makeStore(), 'tasks')
		const out = await sub.fetch('task', 'missing-id')

		expect(errSpy).not.toHaveBeenCalled()
		// The outcome is still REPORTED — silencing the console must not silence
		// the state the component renders.
		expect(sub.error.value).not.toBeNull()
		expect(out).toEqual([])
	})

	it('still console.errors a genuine fault, naming the status', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: false,
			status: 503,
			statusText: 'Service Unavailable',
			text: async () => 'down',
			json: async () => { throw new Error('no json') },
		})

		const sub = useSubResource(makeStore(), 'tasks')
		await sub.fetch('task', 'parent')

		expect(errSpy).toHaveBeenCalledTimes(1)
		// The old line named the resource but not the failure, so the console
		// read `Proxy(Object)` and said nothing about what went wrong.
		expect(String(errSpy.mock.calls[0][0])).toContain('503')
		expect(String(errSpy.mock.calls[0][0])).toContain('Service Unavailable')
	})

	it('captures parsed error envelopes on non-ok responses', async () => {
		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: false,
			status: 500,
			text: async () => 'boom',
			json: async () => { throw new Error('no json') },
		})

		const sub = useSubResource(makeStore(), 'tasks')
		const out = await sub.fetch('task', 'parent')

		expect(out).toEqual([])
		expect(sub.error.value).not.toBeNull()
		expect(sub.loading.value).toBe(false)
	})

	it('treats TypeError from fetch as a networkError envelope', async () => {
		jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
			throw new TypeError('offline')
		})

		const sub = useSubResource(makeStore(), 'tasks')
		const out = await sub.fetch('task', 'parent')

		expect(out).toEqual([])
		expect(sub.error.value).not.toBeNull()
		expect(typeof sub.error.value.message).toBe('string')
	})

	it('clear() resets data + flags but keeps the configured limit', async () => {
		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ results: [{ id: 'a' }, { id: 'b' }], total: 2 }),
		})

		const sub = useSubResource(makeStore(), 'tasks', { limit: 25 })
		await sub.fetch('task', 'parent')
		expect(sub.data.results.length).toBe(2)

		sub.clear()
		expect(sub.data.results).toEqual([])
		expect(sub.data.total).toBe(0)
		expect(sub.data.limit).toBe(25)
		expect(sub.loading.value).toBe(false)
		expect(sub.error.value).toBeNull()
	})
})
