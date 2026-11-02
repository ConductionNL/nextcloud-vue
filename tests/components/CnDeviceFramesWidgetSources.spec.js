/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * device-frames-widget as board DqInspectie draws it: the checklist frame is
 * titled by the inspection underway ("Kerkplein 7", `titleFrom`), and the
 * offline status line names the time of the last synchronisation
 * ("Offline · gesynchroniseerd om 07:42", `syncedFrom` + `offlineSyncedText`).
 *
 * @spec openspec/changes/device-frames-read-title-and-sync-time/specs/device-frames-read-title-and-sync-time/spec.md
 */
jest.mock('@nextcloud/auth', () => ({ __esModule: true, getCurrentUser: () => ({ uid: 'pieter' }), getCurrentUserGroups: () => [] }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDeviceFramesWidget from '../../src/components/CnDeviceFramesWidget/CnDeviceFramesWidget.vue'
import { fetchReferenceObjects } from '../../src/utils/boardReferenceColumns.js'

const CONTENT = {
	status: {
		followConnection: true,
		offlineText: 'Offline · synchronised earlier',
		offlineSyncedText: 'Offline · synchronised at {time}',
		onlineText: 'Online',
		syncedFrom: { source: { register: 'app', schema: 'outbox', filter: { status: 'synced' } }, field: 'lastAttemptAt' },
	},
	frames: [
		{ key: 'today', title: 'Today', widgetIds: [] },
		{ key: 'checklist', title: 'Checklist', widgetIds: [], titleFrom: { source: { register: 'app', schema: 'inspection', filter: { inspector: '@me', status: 'in_progress' } }, field: 'location' } },
	],
}

/** Let the reads settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

/**
 * @param {boolean} online The connection state.
 * @param {object} content The content.
 * @return {object} Wrapper.
 */
function mountFrames(online, content = CONTENT) {
	Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online })
	return mount(CnDeviceFramesWidget, {
		props: { content },
		global: { stubs: { CnSectionsWidget: true } },
	})
}

const titles = (w) => w.findAll('h3').map((h) => h.text())
const statuses = (w) => w.findAll('[data-testid="cn-device-frame-status"]').map((s) => s.text())

describe('CnDeviceFramesWidget titles and sync time from records', () => {
	beforeEach(() => {
		fetchReferenceObjects.mockReset()
	})

	it('titles a frame by the first matching record, and reads it as the reader', async () => {
		fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'inspection' ? [{ location: 'Kerkplein 7' }] : []))
		const w = mountFrames(false)
		await flush()
		expect(titles(w)).toEqual(['Today', 'Kerkplein 7'])
		expect(fetchReferenceObjects).toHaveBeenCalledWith(expect.objectContaining({ register: 'app', schema: 'inspection', filter: { inspector: 'pieter', status: 'in_progress' }, limit: 1 }))
		w.unmount()
	})

	it('keeps the configured title when no record matches', async () => {
		fetchReferenceObjects.mockResolvedValue([])
		const w = mountFrames(false)
		await flush()
		expect(titles(w)).toEqual(['Today', 'Checklist'])
		w.unmount()
	})

	it('names the time of the newest synchronisation while offline', async () => {
		fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'outbox' ? [{ lastAttemptAt: '2026-11-02T07:42:00' }] : []))
		const w = mountFrames(false)
		await flush()
		expect(statuses(w)).toEqual(['Offline · synchronised at 07:42', 'Offline · synchronised at 07:42'])
		expect(fetchReferenceObjects).toHaveBeenCalledWith(expect.objectContaining({ schema: 'outbox', filter: { status: 'synced', '_order[lastAttemptAt]': 'desc' }, limit: 1 }))
		w.unmount()
	})

	it('falls back to the offline text without a synchronisation, and reads online as online', async () => {
		fetchReferenceObjects.mockResolvedValue([])
		const offline = mountFrames(false)
		await flush()
		expect(statuses(offline)[0]).toBe('Offline · synchronised earlier')
		offline.unmount()
		fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'outbox' ? [{ lastAttemptAt: '2026-11-02T07:42:00' }] : []))
		const online = mountFrames(true)
		await flush()
		expect(statuses(online)[0]).toBe('Online')
		online.unmount()
	})
})
