/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useOfflineQueue: keep writes made without a connection and send them once
 * there is one. A write (`method`, `url`, `body`) is stored in IndexedDB
 * under an idempotency key, and the queue is flushed in order on the
 * `online` event and when the page loads. An entry is dropped only after the
 * server answered 2xx, or 409 (it has that write already). Any other answer,
 * or no answer, stops the flush and keeps the rest for the next one, so the
 * writes arrive in the order they were made.
 *
 * Each request carries `Idempotency-Key: <key>`, so a write that reached the
 * server before the answer was lost is not stored twice.
 *
 * @module composables/useOfflineQueue
 * @spec openspec/changes/use-offline-queue/specs/use-offline-queue/spec.md
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue'

const DB_NAME = 'conduction-offline-queue'
const STORE = 'writes'

/**
 * Open the queue database.
 *
 * @param {IDBFactory} idb The IndexedDB factory.
 * @return {Promise<IDBDatabase>}
 */
function openQueueDb(idb) {
	return new Promise((resolve, reject) => {
		const request = idb.open(DB_NAME, 1)
		request.onupgradeneeded = () => {
			const store = request.result.createObjectStore(STORE, { keyPath: 'id' })
			store.createIndex('queue', 'queue')
		}
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error)
	})
}

/**
 * Run one IndexedDB request in its own transaction.
 *
 * @param {IDBDatabase} db The database.
 * @param {'readonly'|'readwrite'} mode The mode.
 * @param {(store: IDBObjectStore) => IDBRequest} work The request to make.
 * @return {Promise<unknown>} Its result.
 */
function inStore(db, mode, work) {
	return new Promise((resolve, reject) => {
		const request = work(db.transaction(STORE, mode).objectStore(STORE))
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error)
	})
}

/**
 * A new idempotency key.
 *
 * @return {string}
 */
function newKey() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID()
	}
	return `w-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

let lastSeq = 0

/**
 * A rising sequence number that keeps the order of writes made in the same millisecond.
 *
 * @return {number}
 */
function nextSeq() {
	lastSeq = Math.max(Date.now(), lastSeq + 0.001)
	return lastSeq
}

/**
 * An offline write queue.
 *
 * @param {string} name The queue's name; queues of different names never mix.
 * @param {object} [options] Options.
 * @param {IDBFactory} [options.idb] The IndexedDB factory (default `window.indexedDB`).
 * @param {(write: object) => Promise<{status: number}>} [options.send] Sends one write; default axios with the idempotency key.
 * @return {{pendingCount: import('vue').Ref<number>, enqueue: Function, flush: Function, start: Function, stop: Function}}
 * @spec openspec/changes/use-offline-queue/specs/use-offline-queue/spec.md#requirement-a-write-made-offline-is-sent-once-there-is-a-connection
 */
export function useOfflineQueue(name, { idb = (typeof window !== 'undefined' ? window.indexedDB : undefined), send = null } = {}) {
	const pendingCount = ref(0)
	let dbPromise = null
	let flushing = null

	const db = () => {
		if (!dbPromise) {
			dbPromise = openQueueDb(idb)
		}
		return dbPromise
	}

	const entries = async () => {
		const rows = await inStore(await db(), 'readonly', (store) => store.index('queue').getAll(name))
		return rows.sort((a, b) => (a.seq - b.seq))
	}

	const recount = async () => {
		pendingCount.value = (await entries()).length
	}

	const deliver = send || (async (write) => {
		const target = /^https?:\/\//i.test(write.url) ? write.url : generateUrl(write.url)
		return axios.request({ method: write.method, url: target, data: write.body, headers: { 'Idempotency-Key': write.id } })
	})

	/**
	 * Send the queue in order until a write does not go through.
	 *
	 * @return {Promise<number>} How many writes are still waiting.
	 */
	const flush = () => {
		if (flushing) {
			return flushing
		}
		flushing = (async () => {
			try {
				for (const write of await entries()) {
					let status = 0
					try {
						status = (await deliver(write)).status
					} catch (error) {
						status = (error && error.response && error.response.status) || 0
					}
					if ((status >= 200 && status < 300) || status === 409) {
						await inStore(await db(), 'readwrite', (store) => store.delete(write.id))
					} else {
						break
					}
				}
			} finally {
				await recount()
				flushing = null
			}
			return pendingCount.value
		})()
		return flushing
	}

	/**
	 * Keep one write and try to send the queue when online.
	 *
	 * @param {{method?: string, url: string, body?: unknown, key?: string}} write The write; `key` is its idempotency key (default a new one).
	 * @return {Promise<string>} The idempotency key.
	 */
	const enqueue = async ({ method = 'POST', url, body = null, key } = {}) => {
		const id = key || newKey()
		await inStore(await db(), 'readwrite', (store) => store.put({ id, queue: name, method: String(method).toUpperCase(), url, body, seq: nextSeq() }))
		await recount()
		if (typeof navigator === 'undefined' || navigator.onLine !== false) {
			await flush()
		}
		return id
	}

	const onOnline = () => {
		flush()
	}

	/** Flush now and on every `online` event. */
	const start = () => {
		if (typeof window !== 'undefined') {
			window.addEventListener('online', onOnline)
		}
		return flush()
	}

	/** Stop listening for `online`. */
	const stop = () => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('online', onOnline)
		}
	}

	if (getCurrentInstance()) {
		onMounted(start)
		onBeforeUnmount(stop)
	}

	return { pendingCount, enqueue, flush, start, stop }
}
