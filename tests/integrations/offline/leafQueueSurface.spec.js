/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * The leaf shows the queue, and stops calling a stranded device synced.
 *
 * 🔴 THE DEFECT THIS EXISTS FOR. The tab and the card each render one line of
 * sync state, and that line was computed from `pendingCount` alone.
 * `countPending()` counts `pending`, `conflict` and `syncing`; an operation
 * that exhausted its retries or lost its permission is `failed`, which is none
 * of them. So a device holding a stranded inspection fell through to the last
 * branch and showed "All changes synced" in green. The single surface that
 * could have told an inspector their morning had not left the device told them
 * the opposite, in the most reassuring colour available.
 *
 * 🔴 AND THE PLANNING NEVER AGED. `getPlanningMeta()` was called in the tab and
 * its result discarded, so a planning downloaded on Monday rendered on
 * Thursday exactly like one downloaded an hour ago.
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import { mount } from '@vue/test-utils'
import Dexie from 'dexie'
import CnFieldInspectionTab from '../../../src/integrations/builtin/field-inspection/CnFieldInspectionTab.vue'
import {
	__resetDbForTests,
	__setDexie,
	enqueueMutation,
	getDb,
	resolveDeviceId,
	storePlanning,
} from '../../../src/integrations/offline/offlineDb.js'
/* eslint-enable perfectionist/sort-imports */

const REGISTER = 'dossiq'
const SCHEMA = 'fieldInspection'

const stubs = {
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcLoadingIcon: { template: '<span />' },
	ClipboardCheckOutline: { template: '<span />' },
	Sync: { template: '<span />' },
}

/**
 * Mount the sidebar tab against the fake IndexedDB.
 *
 * @return {Promise<object>} The mounted wrapper.
 */
async function mountTab() {
	const wrapper = mount(CnFieldInspectionTab, {
		props: { register: REGISTER, schema: SCHEMA, objectId: 'case-1' },
		global: { stubs },
	})
	await wrapper.vm.loadLocal()
	await wrapper.vm.$nextTick()
	return wrapper
}

/**
 * Queue one operation and optionally force it into a terminal state.
 *
 * @param {object} [patch] A status patch to apply after queueing.
 * @return {Promise<string>} The operation id.
 */
async function queued(patch = null) {
	const id = await enqueueMutation({
		// The same device the component resolves, or the queue is somebody
		// else's and `countStuck` correctly reports nothing.
		deviceId: resolveDeviceId(),
		operationType: 'create',
		register: REGISTER,
		schema: 'checklistResult',
		payload: { note: 'the boiler room was locked' },
	})
	if (patch) {
		await getDb().mutationQueue.update(id, patch)
	}
	return id
}

describe('the leaf renders the queue', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		// The table is emptied, not just the handle: `__resetDbForTests()` drops
		// the cached Dexie instance and the fake-indexeddb data survives it.
		await getDb().mutationQueue.clear()
		await getDb().objectCache.clear()
		await getDb().meta.clear()
	})

	afterEach(() => __resetDbForTests())

	it('renders the queue component under the planning, scoped to this device', async () => {
		await queued()
		const wrapper = await mountTab()

		const queue = wrapper.find('[data-testid="cn-offline-queue"]')

		expect(queue.exists()).toBe(true)
		expect(wrapper.vm.deviceId).not.toBe('')

		wrapper.unmount()
	})

	it('keeps the pending count as a summary rather than replacing it', async () => {
		await queued()
		await queued()
		const wrapper = await mountTab()

		expect(wrapper.vm.pendingCount).toBe(2)

		wrapper.unmount()
	})

	// 🔴 THE REGRESSION. Reverting the `stuckCount` branch in `syncIndicator`,
	// or dropping the third argument at either call site, reddens this line.
	it('does not tell a device holding a stranded capture that everything is synced', async () => {
		await queued({ status: 'failed', lastError: 'server said 500' })
		const wrapper = await mountTab()

		expect(wrapper.vm.stuckCount).toBe(1)
		expect(wrapper.vm.indicator.tone).toBe('error')
		expect(wrapper.find('[data-testid="cn-fi-tab-sync"]').text()).not.toContain('All changes synced')

		wrapper.unmount()
	})

	it('names how many are stuck, because one and nine are different mornings', async () => {
		await queued({ status: 'failed', lastError: 'server said 500' })
		await queued({ status: 'failed', lastError: 'permission_lost' })
		const wrapper = await mountTab()

		expect(wrapper.find('[data-testid="cn-fi-tab-sync"]').text()).toContain('2')

		wrapper.unmount()
	})

	it('still reads green when nothing is waiting and nothing is stuck', async () => {
		const wrapper = await mountTab()

		expect(wrapper.vm.indicator.tone).toBe('success')

		wrapper.unmount()
	})
})

describe('a planning that has aged', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		await getDb().mutationQueue.clear()
		await getDb().objectCache.clear()
		await getDb().meta.clear()
	})

	afterEach(() => __resetDbForTests())

	it('says it is out of date and when it was downloaded', async () => {
		await storePlanning({
			register: REGISTER,
			schema: SCHEMA,
			items: [{ id: 'i-1', caseRef: 'Kerkstraat 4' }],
			// Already expired when it was written.
			ttlMs: -1000,
		})
		const wrapper = await mountTab()

		const banner = wrapper.find('[data-testid="cn-fi-tab-stale"]')

		expect(banner.exists()).toBe(true)
		expect(banner.text()).toContain('out of date')
		// The download time is what makes "out of date" judgeable.
		expect(wrapper.vm.downloadedAtLabel).not.toBe('')
		expect(banner.text()).toContain(wrapper.vm.downloadedAtLabel)

		wrapper.unmount()
	})

	it('says nothing about age while the planning is still current', async () => {
		await storePlanning({
			register: REGISTER,
			schema: SCHEMA,
			items: [{ id: 'i-1', caseRef: 'Kerkstraat 4' }],
		})
		const wrapper = await mountTab()

		expect(wrapper.find('[data-testid="cn-fi-tab-stale"]').exists()).toBe(false)

		wrapper.unmount()
	})

	it('says nothing about age when no planning was ever downloaded', async () => {
		const wrapper = await mountTab()

		expect(wrapper.vm.planningIsStale).toBe(false)

		wrapper.unmount()
	})
})
