/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Getting your own words back out of a queue that will not send them.
 *
 * Listing a stranded capture tells somebody their work is stuck. It does not
 * give it back to them. An inspection somebody stood in a doorway to give is
 * text a person wrote, and when this device will never deliver it they should
 * still be able to take it somewhere that works: a mail, a form, a note.
 *
 * The offer is made on a lost permission too. They may no longer be allowed to
 * write it here, but they still wrote it.
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
	getDb,
} from '../../src/integrations/offline/offlineDb.js'
/* eslint-enable perfectionist/sort-imports */

const DEVICE = 'device-copy-1'
const NOTE = 'Trap in de kelder los, bewoner aanwezig.'

const stubs = {
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcLoadingIcon: { template: '<span />' },
	NcEmptyContent: { template: '<div />' },
}

/**
 * Queue one operation and force it into a terminal state.
 *
 * @param {object} [patch] A status patch to apply after queueing.
 * @return {Promise<string>} The operation id.
 */
async function queued(patch = null) {
	const id = await enqueueMutation({
		deviceId: DEVICE,
		operationType: 'create',
		register: 'dossiq',
		schema: 'checklistResult',
		payload: { note: NOTE },
	})
	if (patch) {
		await getDb().mutationQueue.update(id, patch)
	}
	return id
}

/**
 * Mount the queue for this device.
 *
 * @return {Promise<object>} The mounted wrapper.
 */
async function mountQueue() {
	const wrapper = mount(CnOfflineQueue, {
		props: { deviceId: DEVICE, refreshMs: 0 },
		global: { stubs },
	})
	await wrapper.vm.load()
	await wrapper.vm.$nextTick()
	return wrapper
}

describe('taking your own text back out', () => {
	let written = []

	beforeEach(async () => {
		__setDexie(Dexie)
		await getDb().mutationQueue.clear()
		written = []
		Object.defineProperty(window.navigator, 'clipboard', {
			value: {
				writeText: (text) => {
					written.push(text)
					return Promise.resolve()
				},
			},
			configurable: true,
		})
	})

	afterEach(() => __resetDbForTests())

	it('offers the capture back on an entry that failed', async () => {
		const id = await queued({ status: 'failed', lastError: 'server said 500' })
		const wrapper = await mountQueue()

		expect(wrapper.find(`[data-testid="cn-offline-queue-copy-${id}"]`).exists()).toBe(true)

		wrapper.unmount()
	})

	// 🔴 THE ENTRY THAT CAN NEVER BE REPLAYED. No retry is offered, because no
	// retry can help. That is exactly when the text has to be recoverable: the
	// alternative is that a citizen's statement exists only in one browser's
	// IndexedDB with no way to read it out.
	it('offers it on a lost permission, where no retry is offered', async () => {
		const id = await queued({ status: 'failed', lastError: 'permission_lost' })
		const wrapper = await mountQueue()

		expect(wrapper.find(`[data-testid="cn-offline-queue-retry-${id}"]`).exists()).toBe(false)
		expect(wrapper.find(`[data-testid="cn-offline-queue-copy-${id}"]`).exists()).toBe(true)

		wrapper.unmount()
	})

	it('puts the captured words on the clipboard, not a reference to them', async () => {
		const id = await queued({ status: 'failed', lastError: 'permission_lost' })
		const wrapper = await mountQueue()

		await wrapper.find(`[data-testid="cn-offline-queue-copy-${id}"]`).trigger('click')
		await wrapper.vm.$nextTick()

		expect(written).toHaveLength(1)
		expect(written[0]).toContain(NOTE)

		wrapper.unmount()
	})

	it('confirms the copy only where the copy happened', async () => {
		const id = await queued({ status: 'failed', lastError: 'permission_lost' })
		const wrapper = await mountQueue()

		await wrapper.find(`[data-testid="cn-offline-queue-copy-${id}"]`).trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.find(`[data-testid="cn-offline-queue-copied-${id}"]`).text()).toContain('Copied')

		wrapper.unmount()
	})

	// A field device without a secure context has no clipboard at all. Saying
	// "Copied" over an empty clipboard sends somebody away believing they have
	// their words, which is the one outcome worse than saying nothing.
	it('says the copy failed rather than claiming it worked', async () => {
		Object.defineProperty(window.navigator, 'clipboard', {
			value: { writeText: () => Promise.reject(new Error('not allowed')) },
			configurable: true,
		})
		const id = await queued({ status: 'failed', lastError: 'permission_lost' })
		const wrapper = await mountQueue()

		await wrapper.find(`[data-testid="cn-offline-queue-copy-${id}"]`).trigger('click')
		await wrapper.vm.$nextTick()

		const said = wrapper.find(`[data-testid="cn-offline-queue-copied-${id}"]`).text()

		expect(said).not.toContain('Copied')
		expect(said).toContain('by hand')
		// The host is handed the text so it can render it for selection.
		expect(wrapper.emitted('copy-refused')[0][0].text).toContain(NOTE)

		wrapper.unmount()
	})

	it('offers nothing to copy on an entry that is still expected to send', async () => {
		const id = await queued()
		const wrapper = await mountQueue()

		expect(wrapper.find(`[data-testid="cn-offline-queue-copy-${id}"]`).exists()).toBe(false)

		wrapper.unmount()
	})
})
