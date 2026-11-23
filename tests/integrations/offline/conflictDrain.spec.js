/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * The drain is what files the conflict, so the drain is what is tested here.
 *
 * `recordConflict()` is exercised on its own in conflictRecording.spec.js.
 * These assert the wiring: that a real 409 coming back from the object API
 * ends with an object queued for the conflict schema, and that leaving the
 * schema unset leaves the row saying the clash is local rather than silently
 * dropping it.
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import Dexie from 'dexie'
/* eslint-enable perfectionist/sort-imports */

jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const mockAxios = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: mockAxios }))

const offlineDb = require('../../../src/integrations/offline/offlineDb.js')
const { drainQueue } = require('../../../src/integrations/offline/syncReplayService.js')

const DEVICE = 'device-drain-1'
const SERVER_VERSION = { id: 'obj-9', note: 'the colleague wrote this' }

/**
 * Make the next PUT come back as a concurrent edit.
 *
 * @return {void}
 */
function respondWithConflict() {
	mockAxios.put.mockRejectedValue({ response: { status: 409, data: SERVER_VERSION } })
	mockAxios.post.mockResolvedValue({ status: 201, data: { id: 'conflict-obj-77' } })
}

/**
 * Queue one update that will collide.
 *
 * @return {Promise<string>} The operation id.
 */
async function pendingUpdate() {
	return await offlineDb.enqueueMutation({
		deviceId: DEVICE,
		operationType: 'update',
		register: 'dossiq',
		schema: 'fieldInspection',
		targetId: 'obj-9',
		payload: { note: 'I wrote this in the cellar' },
	})
}

describe('a drain that hits a conflict', () => {
	beforeEach(async () => {
		offlineDb.__setDexie(Dexie)
		await offlineDb.getDb().mutationQueue.clear()
		mockAxios.put.mockReset()
		mockAxios.post.mockReset()
		respondWithConflict()
	})

	afterEach(() => offlineDb.__resetDbForTests())

	it('files the collision as an object when a conflict schema is configured', async () => {
		const id = await pendingUpdate()

		await drainQueue(DEVICE, { register: 'dossiq', conflictSchema: 'syncConflict' })

		const record = await offlineDb.getDb().mutationQueue.get(`${offlineDb.CONFLICT_RECORD_PREFIX}${id}`)

		expect((await offlineDb.getDb().mutationQueue.get(id)).status).toBe('conflict')
		expect(record.schema).toBe('syncConflict')
		expect(record.payload.serverVersion.note).toBe('the colleague wrote this')
	})

	it('leaves the row saying the clash is local when no conflict schema is set', async () => {
		const id = await pendingUpdate()

		await drainQueue(DEVICE)

		const row = await offlineDb.getDb().mutationQueue.get(id)

		expect(row.status).toBe('conflict')
		expect(row.conflictScope).toBe('local')
	})

	// 🔴 THE ID THE SERVER GAVE IT. Without it a conflict record is write-once,
	// and the resolution somebody makes an hour later has nowhere to go: the
	// register keeps a collision with no outcome, which answers neither of the
	// questions it was filed for.
	it('keeps the id the server gave a synced operation', async () => {
		const id = await offlineDb.enqueueMutation({
			deviceId: DEVICE,
			operationType: 'create',
			register: 'dossiq',
			schema: 'syncConflict',
			payload: { conflictType: 'concurrent_edit' },
		})

		await drainQueue(DEVICE, {})

		const row = await offlineDb.getDb().mutationQueue.get(id)

		expect(row.status).toBe('synced')
		expect(row.serverObjectId).toBe('conflict-obj-77')
	})
})
