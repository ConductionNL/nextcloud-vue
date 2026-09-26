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
import { openDb, recordConflict } from './offlineDb.js'
import { nextState, orderForReplay } from './syncQueueEngine.js'

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
 * @param {object} operation       The queue operation row.
 * @param {object} [offlineConfig] The leaf's offline config (`register`,
 *                                 `conflictSchema`).
 *
 * @return {Promise<object>} The applied patch from the engine.
 */
export async function replayOperation(operation, offlineConfig = {}) {
	const db = await openDb()
	let statusCode
	let serverObject = null
	let responseBody = null

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
		responseBody = response.data ?? null
	} catch (error) {
		statusCode = error?.response?.status ?? 0
		serverObject = error?.response?.data ?? null
	}

	const { patch, conflictType } = nextState(operation, { statusCode, serverObject })

	// The id the server gave this object, kept so a later write can address it.
	// Without it a conflict record is write-once: the resolution somebody makes
	// an hour later has nowhere to go, and the register holds a collision with
	// no outcome, which answers neither of the questions it was filed for.
	const serverObjectId = idOf(responseBody)
	if (patch.status === 'synced' && serverObjectId !== '') {
		patch.serverObjectId = serverObjectId
	}

	await db.mutationQueue.update(operation.id, patch)

	// A conflict is recorded where other people can see it, not only here.
	// `permission_lost` is recorded too: it lands as `failed` rather than
	// `conflict`, and it is precisely the case where the person holding the
	// capture can do nothing and somebody else must.
	if (conflictType !== null) {
		await recordConflict({
			operation,
			conflictType,
			serverObject,
			register: offlineConfig.register ?? '',
			conflictSchema: offlineConfig.conflictSchema ?? '',
		})
	}

	return patch
}

/**
 * The id inside an OpenRegister object response, wherever it is carried.
 *
 * @param {object|null} body The response body.
 *
 * @return {string} The id, or an empty string.
 */
function idOf(body) {
	if (body === null || typeof body !== 'object') {
		return ''
	}
	return String(body.id ?? body['@self']?.id ?? body.uuid ?? '')
}

/**
 * Drain the device's pending queue in FIFO order.
 *
 * @param {string} deviceId        The owning device.
 * @param {object} [offlineConfig] The leaf's offline config; `register` and
 *                                 `conflictSchema` decide where a conflict is
 *                                 filed. Omitted, conflicts stay on the device
 *                                 and the queue row says so.
 *
 * @return {Promise<{ processed: number, synced: number, conflicts: number, failed: number }>}
 */
export async function drainQueue(deviceId, offlineConfig = {}) {
	if (typeof navigator !== 'undefined' && navigator.onLine === false) {
		return { processed: 0, synced: 0, conflicts: 0, failed: 0 }
	}

	const db = await openDb()
	const rows = await db.mutationQueue.where('deviceId').equals(deviceId).toArray()
	const ordered = orderForReplay(rows)

	const tally = { processed: 0, synced: 0, conflicts: 0, failed: 0 }
	for (const operation of ordered) {
		const patch = await replayOperation(operation, offlineConfig)
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
