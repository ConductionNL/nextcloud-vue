/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Pressing Run on a synchronous flow runs it, rather than queueing it.
 *
 * THE DEFECT. `run()` POSTed only the subject, so the endpoint fell back to its
 * async default and every press of Run produced a row reading `queued` —
 * including for a flow whose `executionMode` was `sync`. The endpoint has
 * accepted a `sync` flag all along; nothing was asking for it.
 *
 * That is invisible until you watch someone press the button: they wait, the
 * canvas does nothing, and the run sits queued until a worker happens by. On an
 * instance whose cron is not running, it never moves at all.
 */

import axios from '@nextcloud/axios'
import { createPinia, setActivePinia } from 'pinia'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: { uuid: 'run-1', status: 'queued' } })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * @param {string|undefined} executionMode The flow's mode.
 * @return {object} The store.
 */
function storeWith(executionMode) {
	setActivePinia(createPinia())
	const store = useFlowStore()
	store.flow = { id: 'f-1', name: 'A flow', executionMode, nodes: [], edges: [] }
	return store
}

/**
 * @return {object} The body of the run POST.
 */
function runBody() {
	const call = axios.post.mock.calls.find(([url]) => String(url).endsWith('/run'))
	return call ? call[1] : null
}

describe('Run honours the flow’s execution mode', () => {
	beforeEach(() => {
		axios.post.mockClear()
	})

	it('a sync flow is run immediately', async () => {
		await storeWith('sync').run()

		expect(runBody()).toMatchObject({ sync: true })
	})

	it('an async flow is queued, because that is what async means', async () => {
		await storeWith('async').run()

		expect(runBody()).toMatchObject({ sync: false })
	})

	it('a flow that says nothing is queued: async is the engine’s default', async () => {
		await storeWith(undefined).run()

		expect(runBody()).toMatchObject({ sync: false })
	})

	it('is not fooled by the case the API happens to use', () => {
		expect(storeWith('SYNC').runsSynchronously).toBe(true)
		expect(storeWith('Sync').runsSynchronously).toBe(true)
	})

	it('still sends the subject, which is the other half of the request', async () => {
		await storeWith('sync').run({ uuid: 'obj-1' })

		expect(runBody()).toMatchObject({ subject: { uuid: 'obj-1' }, sync: true })
	})
})
