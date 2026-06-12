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
