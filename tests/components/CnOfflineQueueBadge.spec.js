/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * The badge variant: one pill that says what is waiting, in words, and a
 * press that asks the host to send it now.
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import { mount } from '@vue/test-utils'
import Dexie from 'dexie'
import CnOfflineQueue from '../../src/components/CnOfflineQueue/CnOfflineQueue.vue'
import { __setDexie, enqueueMutation, getDb } from '../../src/integrations/offline/offlineDb.js'
/* eslint-enable perfectionist/sort-imports */

const DEVICE = 'device-badge-1'

const stubs = {
	NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
	NcLoadingIcon: { template: '<span />' },
	NcEmptyContent: { template: '<div />' },
}

async function queued(status = 'pending') {
	const id = await enqueueMutation({ deviceId: DEVICE, operationType: 'create', register: 'shillinq', schema: 'StockMove', payload: {} })
	await getDb().mutationQueue.update(id, { status })
	return id
}

async function badge(props = {}) {
	const wrapper = mount(CnOfflineQueue, {
		props: { deviceId: DEVICE, refreshMs: 0, variant: 'badge', ...props },
		global: { stubs },
	})
	await wrapper.vm.load()
	await wrapper.vm.$nextTick()
	return wrapper
}

describe('CnOfflineQueue variant badge', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		await getDb().mutationQueue.clear()
	})

	it('says everything was sent when nothing waits, and draws no list', async () => {
		const w = await badge()
		expect(w.get('[data-testid="cn-offline-queue-badge"]').text()).toBe('Everything sent')
		expect(w.find('.cn-offline-queue__list').exists()).toBe(false)
	})

	it('counts waiting and stuck apart, in words', async () => {
		await queued('pending')
		await queued('pending')
		await queued('failed')
		const w = await badge()
		const pill = w.get('[data-testid="cn-offline-queue-badge"]')
		expect(pill.text()).toBe('2 waiting to be sent, 1 stuck')
		expect(pill.classes()).toContain('cn-offline-queue__badge--stuck')
	})

	it('asks the host to send now when pressed, and refreshes after', async () => {
		await queued('pending')
		const w = await badge()
		await w.get('[data-testid="cn-offline-queue-badge"]').trigger('click')
		expect(w.emitted('sync')).toHaveLength(1)
	})

	it('says when it is sending or offline, and does not ask to send while offline', async () => {
		await queued('pending')
		const sending = await badge({ syncing: true })
		expect(sending.get('[data-testid="cn-offline-queue-badge"]').text()).toBe('Sending…')

		const offline = await badge({ offline: true })
		expect(offline.get('[data-testid="cn-offline-queue-badge"]').text()).toBe('Offline, 1 waiting to be sent')
		await offline.get('[data-testid="cn-offline-queue-badge"]').trigger('click')
		expect(offline.emitted('sync')).toBeUndefined()
	})
})
