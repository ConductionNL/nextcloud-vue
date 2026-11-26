/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The walkthrough preferences a page carries in its initial state replace the
 * two preference GETs CnAppRoot makes on every load.
 *
 * @spec openspec/changes/setup-and-walkthrough-from-initial-state/specs/cn-walkthrough/spec.md#requirement-a-page-may-carry-the-walkthrough-preferences
 */

import {
	loadWalkthroughProgress,
	loadWalkthroughSeenVersion,
	readPreloadedWalkthroughPreferences,
} from '@/composables/useWalkthrough.js'

/**
 * Minimal in-memory `Storage` double.
 *
 * @return {object} A storage-shaped object.
 */
function makeStorage() {
	const store = new Map()
	return {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => store.set(k, v),
		removeItem: (k) => store.delete(k),
	}
}

/**
 * Inject the `walkthrough_preferences` initial state the way Nextcloud does.
 *
 * @param {string} appId The app the state belongs to.
 * @param {object} value The carried value.
 */
function inject(appId, value) {
	const el = document.createElement('input')
	el.type = 'hidden'
	el.id = `initial-state-${appId}-walkthrough_preferences`
	el.value = Buffer.from(JSON.stringify(value)).toString('base64')
	document.body.appendChild(el)
}

describe('walkthrough preferences from initial state', () => {
	afterEach(() => {
		document.body.innerHTML = ''
	})

	it('hands out each carried part in the endpoint shape', () => {
		inject('launchpad', { seen: '1.2.0', progress: null })
		expect(readPreloadedWalkthroughPreferences('launchpad')).toEqual({
			seen: { value: '1.2.0' },
			progress: { value: null },
		})
	})

	it('gives null for a part, or a page, that carries nothing', () => {
		expect(readPreloadedWalkthroughPreferences('launchpad')).toEqual({ seen: null, progress: null })
		inject('launchpad', { seen: '1.0.0' })
		expect(readPreloadedWalkthroughPreferences('launchpad').progress).toBeNull()
	})

	it('resolves both loaders from the carried parts without a request', async () => {
		inject('launchpad', {
			seen: '1.2.0',
			progress: JSON.stringify({ tourId: 'main', stepId: 's2', index: 1, version: '1.2.0' }),
		})
		const http = { get: jest.fn() }
		const storage = makeStorage()
		const preloaded = readPreloadedWalkthroughPreferences('launchpad')
		const seen = await loadWalkthroughSeenVersion('launchpad', 'walkthrough_completed_version', { http, storage, preloaded: preloaded.seen })
		const progress = await loadWalkthroughProgress('launchpad', 'walkthrough_completed_version', { http, storage, preloaded: preloaded.progress })
		expect(http.get).not.toHaveBeenCalled()
		expect(seen).toBe('1.2.0')
		expect(progress).toMatchObject({ tourId: 'main', stepId: 's2', index: 1 })
	})

	it('a carried null reads as a fresh user, without a request', async () => {
		const http = { get: jest.fn() }
		const storage = makeStorage()
		const seen = await loadWalkthroughSeenVersion('launchpad', 'walkthrough_completed_version', { http, storage, preloaded: { value: null } })
		const progress = await loadWalkthroughProgress('launchpad', 'walkthrough_completed_version', { http, storage, preloaded: { value: null } })
		expect(http.get).not.toHaveBeenCalled()
		expect(seen).toBe('')
		expect(progress).toBeNull()
	})

	it('POSITIVE CONTROL: without a carried part the loaders ask the endpoint', async () => {
		const http = { get: jest.fn().mockResolvedValue({ data: { value: '2.0.0' } }) }
		const seen = await loadWalkthroughSeenVersion('launchpad', 'walkthrough_completed_version', { http, storage: makeStorage(), preloaded: null })
		expect(http.get).toHaveBeenCalledTimes(1)
		expect(seen).toBe('2.0.0')
	})
})
