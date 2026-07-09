/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Generic sync-replay glue for the offline data-collection core.
 *
 * Drains the device's queued mutations against the standard OpenRegister
 * object API on reconnect and applies the pure-engine status transition to each
 * queue row. Unlike procest's bespoke service this carries no app-specific
 * outcome callback: re-authorization happens inside OR's own object API (RBAC +
 * multitenancy on `/apps/openregister/api/objects/...`), so any consuming app
 * gets conflict marking, backoff and IDOR-safe replay for free.
 *
 * Browser-only (axios + IndexedDB + navigator.onLine). The decision logic it
 * calls is the pure {@link module:integrations/offline/syncQueueEngine}.
 *
 * @module integrations/offline/syncReplayService
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { getDb } from './offlineDb.js'
import { orderForReplay, nextState } from './syncQueueEngine.js'

/**
 * Build the OR object-collection URL for a register/schema.
 *
 * @param {string} register Register slug or id.
 * @param {string} schema   Schema slug or id.
 *
 * @return {string} The generated collection URL.
 */
function objectsUrl(register, schema) {
	return generateUrl(`/apps/openregister/api/objects/${register}/${schema}`)
}

/**
 * Replay one queued mutation against the OR object API.
 *
 * @param {object} operation The queue operation row.
 *
 * @return {Promise<object>} The applied patch from the engine.
 */
export async function replayOperation(operation) {
	const db = getDb()
	let statusCode = 0
	let serverObject = null

	const base = objectsUrl(operation.register, operation.schema)
	const payload = operation.payload ?? {}

	try {
		let response
		if (operation.operationType === 'create' || operation.operationType === 'upload') {
			response = await axios.post(base, payload)
		} else if (operation.operationType === 'update') {
			response = await axios.put(`${base}/${operation.targetId}`, payload)
		} else if (operation.operationType === 'delete') {
			response = await axios.delete(`${base}/${operation.targetId}`)
		} else {
			response = await axios.post(base, payload)
		}
		statusCode = response.status
	} catch (error) {
		statusCode = error?.response?.status ?? 0
		serverObject = error?.response?.data ?? null
	}

	const { patch } = nextState(operation, { statusCode, serverObject })
	await db.mutationQueue.update(operation.id, patch)
	return patch
}

/**
 * Drain the device's pending queue in FIFO order.
 *
 * @param {string} deviceId The owning device.
 *
 * @return {Promise<{ processed: number, synced: number, conflicts: number, failed: number }>}
 */
export async function drainQueue(deviceId) {
	if (typeof navigator !== 'undefined' && navigator.onLine === false) {
		return { processed: 0, synced: 0, conflicts: 0, failed: 0 }
	}

	const db = getDb()
	const rows = await db.mutationQueue.where('deviceId').equals(deviceId).toArray()
	const ordered = orderForReplay(rows)

	const tally = { processed: 0, synced: 0, conflicts: 0, failed: 0 }
	for (const operation of ordered) {
		const patch = await replayOperation(operation)
		tally.processed += 1
		if (patch.status === 'synced') {
			tally.synced += 1
		} else if (patch.status === 'conflict') {
			tally.conflicts += 1
		} else if (patch.status === 'failed') {
			tally.failed += 1
		}
	}

	return tally
}
