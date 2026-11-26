/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A write made offline is sent once there is a connection (`useOfflineQueue`),
 * in order, with an idempotency key, dropped only after a 2xx or a 409
 * (pipelinq time-entry-mobile-offline 1.1).
 *
 * @spec openspec/changes/use-offline-queue/specs/use-offline-queue/spec.md
 */
import { IDBFactory } from 'fake-indexeddb'
import { useOfflineQueue } from '../../src/composables/useOfflineQueue.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { request: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}` }))

const axios = require('@nextcloud/axios').default

let online = true
beforeEach(() => {
	online = true
	Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online })
	axios.request.mockReset()
})

describe('useOfflineQueue', () => {
	it('sends a write at once when online, with its idempotency key, and drops it on a 2xx', async () => {
		axios.request.mockResolvedValue({ status: 201 })
		const q = useOfflineQueue('time', { idb: new IDBFactory() })
		const key = await q.enqueue({ method: 'post', url: '/apps/openregister/api/time', body: { minutes: 30 } })
		expect(axios.request).toHaveBeenCalledWith({ method: 'POST', url: '/index.php/apps/openregister/api/time', data: { minutes: 30 }, headers: { 'Idempotency-Key': key } })
		expect(q.pendingCount.value).toBe(0)
	})

	it('keeps writes made offline and sends them in order once online, a 409 counting as delivered', async () => {
		online = false
		const q = useOfflineQueue('time', { idb: new IDBFactory() })
		await q.enqueue({ url: '/a', body: 1, key: 'k1' })
		await q.enqueue({ url: '/b', body: 2, key: 'k2' })
		expect(axios.request).not.toHaveBeenCalled()
		expect(q.pendingCount.value).toBe(2)
		online = true
		axios.request.mockResolvedValueOnce({ status: 200 }).mockRejectedValueOnce({ response: { status: 409 } })
		expect(await q.flush()).toBe(0)
		expect(axios.request.mock.calls.map((c) => c[0].headers['Idempotency-Key'])).toEqual(['k1', 'k2'])
	})

	it('keeps the order of writes made in the same millisecond', async () => {
		online = false
		const now = jest.spyOn(Date, 'now').mockReturnValue(1700000000000)
		const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValueOnce(0.1)
		const q = useOfflineQueue('time', { idb: new IDBFactory() })
		await q.enqueue({ url: '/a', key: 'k1' })
		await q.enqueue({ url: '/b', key: 'k2' })
		now.mockRestore()
		random.mockRestore()
		online = true
		axios.request.mockResolvedValue({ status: 200 })
		expect(await q.flush()).toBe(0)
		expect(axios.request.mock.calls.map((c) => c[0].headers['Idempotency-Key'])).toEqual(['k1', 'k2'])
	})

	it('stops at a write that does not go through and keeps it and the rest', async () => {
		online = false
		const idb = new IDBFactory()
		const q = useOfflineQueue('time', { idb })
		await q.enqueue({ url: '/a', key: 'k1' })
		await q.enqueue({ url: '/b', key: 'k2' })
		online = true
		axios.request.mockRejectedValueOnce(new Error('Network Error'))
		expect(await q.flush()).toBe(2)
		expect(axios.request).toHaveBeenCalledTimes(1)
		axios.request.mockResolvedValueOnce({ status: 500 })
		expect(await q.flush()).toBe(2)
		const again = useOfflineQueue('time', { idb })
		axios.request.mockResolvedValue({ status: 200 })
		expect(await again.start()).toBe(0)
		again.stop()
	})

	it('keeps queues of different names apart', async () => {
		online = false
		const idb = new IDBFactory()
		await useOfflineQueue('time', { idb }).enqueue({ url: '/a' })
		const other = useOfflineQueue('notes', { idb })
		await other.flush()
		expect(other.pendingCount.value).toBe(0)
	})
})
