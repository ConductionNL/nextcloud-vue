/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A queued change says in words what it is about ("Molenweg 4, checklist",
 * board DqInspectie): the queue keeps the label it was given, and the list
 * reads it, falling back to the technical name without one.
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import { mount } from '@vue/test-utils'
import Dexie from 'dexie'
import CnOfflineQueue from '../../../src/components/CnOfflineQueue/CnOfflineQueue.vue'
import {
	__setDexie,
	enqueueMutation,
	getDb,
	listQueue,
} from '../../../src/integrations/offline/offlineDb.js'
/* eslint-enable perfectionist/sort-imports */

const DEVICE = 'device-label-1'

const stubs = {
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcLoadingIcon: { template: '<span />' },
	NcEmptyContent: { template: '<div />' },
}

describe('the label of a queued change', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		await getDb().mutationQueue.clear()
	})

	it('is kept on the queue row, and empty when none was given', async () => {
		await enqueueMutation({ deviceId: DEVICE, operationType: 'submit', register: 'dossiq', schema: 'run', label: 'Molenweg 4, checklist', queuedAt: '2026-10-23T09:00:00Z' })
		await enqueueMutation({ deviceId: DEVICE, operationType: 'create', register: 'dossiq', schema: 'photo', queuedAt: '2026-10-23T09:01:00Z' })
		const rows = await listQueue(DEVICE)
		expect(rows.map((row) => row.label)).toEqual(['Molenweg 4, checklist', ''])
	})

	it('names the row in the list, with the technical name as the fallback', async () => {
		await enqueueMutation({ deviceId: DEVICE, operationType: 'submit', register: 'dossiq', schema: 'run', label: 'Molenweg 4, checklist', queuedAt: '2026-10-23T09:00:00Z' })
		await enqueueMutation({ deviceId: DEVICE, operationType: 'create', register: 'dossiq', schema: 'photo', queuedAt: '2026-10-23T09:01:00Z' })
		const wrapper = mount(CnOfflineQueue, { props: { deviceId: DEVICE, refreshMs: 0 }, global: { stubs } })
		await wrapper.vm.load()
		await wrapper.vm.$nextTick()
		const names = wrapper.findAll('.cn-offline-queue__operation').map((node) => node.text())
		expect(names[0]).toBe('Molenweg 4, checklist')
		expect(names[1]).toContain('create · photo')
		wrapper.unmount()
	})
})
