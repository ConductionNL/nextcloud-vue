/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppRoot sends its own offline-form queue (manifest-offline-block task 5,
 * design D7): on mount while online and on each `online` event, limited to
 * the register and schema pairs its offline forms write.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-an-offline-form-queues-its-submission-and-the-root-sends-it
 */

import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))

const mockDrainQueue = jest.fn(() => Promise.resolve({ processed: 0, synced: 0, conflicts: 0, failed: 0 }))
jest.mock('../../src/integrations/offline/syncReplayService.js', () => ({
	drainQueue: (...args) => mockDrainQueue(...args),
}))
jest.mock('../../src/integrations/offline/offlineDb.js', () => ({
	resolveDeviceId: () => 'device-test',
}))

const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

/**
 * A manifest with an inspection report form; offline when `offline` is given.
 *
 * @param {object} [offline] The offline block.
 * @return {object} The manifest.
 */
function manifest(offline) {
	const m = {
		version: '1.0.0',
		dependencies: [],
		menu: [{ id: 'home', label: 'Home', route: 'home' }],
		pages: [
			{ id: 'home', route: '/', type: 'index', title: 'Home', config: { register: 'toezicht', schema: 'inspection' } },
			{ id: 'report', route: '/report', type: 'form', title: 'Report', config: { register: 'toezicht', schema: 'report', fields: [] } },
		],
	}
	if (offline) {
		m.offline = offline
	}
	return m
}

/**
 * Mount CnAppRoot nested in a wrapper, as production does.
 *
 * @param {object} m The manifest.
 * @return {object} The wrapper.
 */
function mountShell(m) {
	const Wrapper = {
		render() {
			return h(CnAppRoot, { manifest: m, appId: 'toezicht', isLoading: false, translate: (k) => k, requiresApps: [] })
		},
	}
	return mount(Wrapper, {
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div />' } },
	})
}

/**
 * Set navigator.onLine.
 *
 * @param {boolean} value Online or not.
 * @return {void}
 */
function setOnline(value) {
	Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value })
}

describe('CnAppRoot sends its offline-form queue', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		global.OC = global.OC || {}
		global.OC.appswebroots = {}
		mockDrainQueue.mockClear()
		setOnline(true)
	})

	it('drains on mount while online, keeping only its own forms\' register and schema', async () => {
		const wrapper = mountShell(manifest({ forms: ['report'] }))
		await flushPromises()

		expect(mockDrainQueue).toHaveBeenCalledTimes(1)
		const [deviceId, config, options] = mockDrainQueue.mock.calls[0]
		expect(deviceId).toBe('device-test')
		expect(config).toEqual({})
		expect(options.filter({ register: 'toezicht', schema: 'report' })).toBe(true)
		expect(options.filter({ register: 'other', schema: 'fieldInspection' })).toBe(false)
		expect(options.filter({ register: 'toezicht', schema: 'inspection' })).toBe(false)
		wrapper.unmount()
	})

	it('drains again when the connection returns', async () => {
		setOnline(false)
		const wrapper = mountShell(manifest({ forms: ['report'] }))
		await flushPromises()
		expect(mockDrainQueue).not.toHaveBeenCalled()

		setOnline(true)
		window.dispatchEvent(new Event('online'))
		await flushPromises()

		expect(mockDrainQueue).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})

	it('stops listening once unmounted', async () => {
		const wrapper = mountShell(manifest({ forms: ['report'] }))
		await flushPromises()
		wrapper.unmount()
		mockDrainQueue.mockClear()

		window.dispatchEvent(new Event('online'))
		await flushPromises()

		expect(mockDrainQueue).not.toHaveBeenCalled()
	})

	it('never loads the offline core for a manifest without offline forms', async () => {
		const wrapper = mountShell(manifest({ takeAlong: [{ schema: 'inspection' }] }))
		window.dispatchEvent(new Event('online'))
		await flushPromises()

		expect(mockDrainQueue).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
