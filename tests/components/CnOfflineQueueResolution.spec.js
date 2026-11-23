/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Settling a clash from the list somebody is already looking at.
 *
 * The queue is where a person finds out two of them wrote the same record, so
 * it is where they should be able to say which version stands. Sending them to
 * another screen to decide is how a conflict sits for a week.
 *
 * Three choices, and each one is a different sentence: keep mine sends my
 * version again, keep theirs abandons mine and leaves this device showing the
 * server's, merge by hand takes fields from both. A single "Resolve" button
 * would be a choice made for them.
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import { mount } from '@vue/test-utils'
import Dexie from 'dexie'
import CnOfflineQueue from '../../src/components/CnOfflineQueue/CnOfflineQueue.vue'
import {
	__resetDbForTests,
	__setDexie,
	enqueueMutation,
	getCachedObject,
	getDb,
	recordConflict,
} from '../../src/integrations/offline/offlineDb.js'
/* eslint-enable perfectionist/sort-imports */

const DEVICE = 'device-resolve-1'
const SERVER_VERSION = { id: 'obj-9', note: 'the colleague wrote this', status: 'closed' }

const stubs = {
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcLoadingIcon: { template: '<span />' },
	NcEmptyContent: { template: '<div />' },
}

/**
 * Queue one conflicting operation and file its conflict.
 *
 * @param {object} [options]              Options.
 * @param {string} [options.conflictSchema] Where the conflict is filed.
 * @param {object|null} [options.serverObject] The server's version.
 * @param {object} [options.patch]        A status patch for the row.
 * @return {Promise<string>} The operation id.
 */
async function conflicting({ conflictSchema = 'syncConflict', serverObject = SERVER_VERSION, patch = { status: 'conflict' } } = {}) {
	const id = await enqueueMutation({
		deviceId: DEVICE,
		operationType: 'update',
		register: 'dossiq',
		schema: 'fieldInspection',
		targetId: 'obj-9',
		payload: { note: 'I wrote this in the cellar', status: 'open' },
	})
	await getDb().mutationQueue.update(id, patch)
	const operation = await getDb().mutationQueue.get(id)
	await recordConflict({ operation, conflictType: 'concurrent_edit', serverObject, conflictSchema })
	return id
}

/**
 * Let every awaited IndexedDB write in the click handler settle.
 *
 * A single `$nextTick` only flushes Vue's render queue; the resolution runs
 * several awaited Dexie writes after it, and asserting before they land reads
 * the row as still in conflict. fake-indexeddb resolves each of those over more
 * than one macrotask, so this drains a handful rather than one.
 *
 * @return {Promise<void>} Nothing.
 */
async function settled() {
	for (let pass = 0; pass < 10; pass += 1) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

/**
 * Mount the queue for this device.
 *
 * @return {Promise<object>} The mounted wrapper.
 */
async function mountQueue() {
	const wrapper = mount(CnOfflineQueue, {
		props: { deviceId: DEVICE, refreshMs: 0, resolvedBy: 'jdoe' },
		global: { stubs },
	})
	await wrapper.vm.load()
	await wrapper.vm.$nextTick()
	return wrapper
}

describe('settling a conflict from the queue', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		await getDb().mutationQueue.clear()
		await getDb().objectCache.clear()
	})

	afterEach(() => __resetDbForTests())

	it('offers all three choices on a conflicting row', async () => {
		const id = await conflicting()
		const wrapper = await mountQueue()

		expect(wrapper.find(`[data-testid="cn-offline-queue-mine-${id}"]`).exists()).toBe(true)
		expect(wrapper.find(`[data-testid="cn-offline-queue-theirs-${id}"]`).exists()).toBe(true)
		expect(wrapper.find(`[data-testid="cn-offline-queue-merge-${id}"]`).exists()).toBe(true)

		wrapper.unmount()
	})

	it('keep mine sends my version again', async () => {
		const id = await conflicting()
		const wrapper = await mountQueue()

		await wrapper.find(`[data-testid="cn-offline-queue-mine-${id}"]`).trigger('click')
		await settled()

		const row = await getDb().mutationQueue.get(id)

		expect(row.status).toBe('pending')
		expect(row.forceUpdate).toBe(true)
		expect(wrapper.emitted('resolved')).toHaveLength(1)
		expect(wrapper.emitted('resolved')[0][0].resolution).toBe('client_wins')

		wrapper.unmount()
	})

	// 🔴 THE CACHE MOVES WITH THE DECISION. Ending the row while this device
	// still renders the abandoned local text is how somebody reads their own
	// discarded answer back as the current record, and then acts on it.
	it('keep theirs ends the row and leaves this device holding the server version', async () => {
		const id = await conflicting()
		const wrapper = await mountQueue()

		await wrapper.find(`[data-testid="cn-offline-queue-theirs-${id}"]`).trigger('click')
		await settled()

		expect((await getDb().mutationQueue.get(id)).status).toBe('synced')
		expect((await getCachedObject('dossiq', 'fieldInspection', 'planning', 'obj-9')).note)
			.toBe('the colleague wrote this')
		expect(wrapper.emitted('resolved')[0][0].resolution).toBe('server_wins')

		wrapper.unmount()
	})

	// 🔴 THE MERGE PANEL STARTS ON THEIRS. Pre-setting every field to the local
	// answer puts a colleague's edit one Save away from being silently
	// discarded, which is the outcome this whole surface exists to prevent.
	it('opens the merge on the server values, field by field', async () => {
		const id = await conflicting()
		const wrapper = await mountQueue()

		await wrapper.find(`[data-testid="cn-offline-queue-merge-${id}"]`).trigger('click')
		await settled()

		expect(wrapper.find(`[data-testid="cn-offline-queue-merge-panel-${id}"]`).exists()).toBe(true)
		expect(wrapper.vm.mergeFields.map((field) => field.field).sort()).toEqual(['id', 'note', 'status'])
		expect(Object.values(wrapper.vm.mergeChoices).every((choice) => choice === 'server')).toBe(true)

		wrapper.unmount()
	})

	it('a merge by hand replays exactly the fields that were chosen', async () => {
		const id = await conflicting()
		const wrapper = await mountQueue()

		await wrapper.find(`[data-testid="cn-offline-queue-merge-${id}"]`).trigger('click')
		await settled()
		wrapper.vm.mergeChoices.note = 'client'
		await wrapper.find(`[data-testid="cn-offline-queue-merge-apply-${id}"]`).trigger('click')
		await settled()

		const row = await getDb().mutationQueue.get(id)

		expect(row.status).toBe('pending')
		expect(row.payload.note).toBe('I wrote this in the cellar')
		expect(row.payload.status).toBe('closed')
		expect(wrapper.emitted('resolved')[0][0].resolution).toBe('manual_merge')

		wrapper.unmount()
	})

	// 🔴 A ROW WITH NOTHING TO MERGE AGAINST. A target deleted server-side has
	// one version, and a Merge button that opens an empty panel is a button
	// that cannot do what it says.
	it('offers no merge when the server sent no version', async () => {
		const id = await conflicting({ serverObject: null })
		const wrapper = await mountQueue()

		expect(wrapper.find(`[data-testid="cn-offline-queue-merge-${id}"]`).exists()).toBe(false)
		expect(wrapper.find(`[data-testid="cn-offline-queue-mine-${id}"]`).exists()).toBe(true)

		wrapper.unmount()
	})

	// 🔴 NOTHING TO PRESS, AND A REASON WHY. No choice a person makes here can
	// re-grant a permission, so every button would be a gesture that fails.
	it('offers no resolution on a lost permission, and says why', async () => {
		const id = await conflicting({ patch: { status: 'failed', lastError: 'permission_lost' } })
		const wrapper = await mountQueue()

		expect(wrapper.find(`[data-testid="cn-offline-queue-mine-${id}"]`).exists()).toBe(false)
		expect(wrapper.find(`[data-testid="cn-offline-queue-theirs-${id}"]`).exists()).toBe(false)
		expect(wrapper.find(`[data-testid="cn-offline-queue-merge-${id}"]`).exists()).toBe(false)
		expect(wrapper.find(`[data-testid="cn-offline-queue-permission-${id}"]`).text())
			.toContain('withdrawn')

		wrapper.unmount()
	})

	// 🔴 A ROW THAT SAYS "CONFLICT" AND NOTHING ELSE LETS SOMEBODY WAIT FOR A
	// COLLEAGUE WHO WILL NEVER SEE IT.
	it('says when the clash was recorded on this device only', async () => {
		const id = await conflicting({ conflictSchema: '' })
		const wrapper = await mountQueue()

		expect(wrapper.find(`[data-testid="cn-offline-queue-local-${id}"]`).text())
			.toContain('this device only')

		wrapper.unmount()
	})

	it('says nothing of the sort when the clash was filed in the register', async () => {
		const id = await conflicting()
		const wrapper = await mountQueue()

		expect(wrapper.find(`[data-testid="cn-offline-queue-local-${id}"]`).exists()).toBe(false)

		wrapper.unmount()
	})

	it('records who settled it on the conflict object', async () => {
		const id = await conflicting()
		const wrapper = await mountQueue()

		await wrapper.find(`[data-testid="cn-offline-queue-mine-${id}"]`).trigger('click')
		await settled()

		const record = await getDb().mutationQueue.get(`conflict-${id}`)

		expect(record.payload.resolvedBy).toBe('jdoe')
		expect(record.payload.resolution).toBe('client_wins')

		wrapper.unmount()
	})
})
