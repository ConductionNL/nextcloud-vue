/**
 * Tests for the walkthrough completion-persistence helpers (ADR-043).
 *
 * The defect these cover: `manifest.walkthrough.completionConfigKey` was
 * declared in the manifest schema and required by REQ-WALK-NV-004 /
 * REQ-WALK-NV-006, but nothing in the library ever read or wrote it. Dismissing
 * a tour issued no request at all, so a returning user (or any fresh browser
 * profile — e.g. every Playwright run) got the first-visit tour again, forever.
 */

import {
	useWalkthrough,
	__resetWalkthroughCacheForTests,
	loadWalkthroughSeenVersion,
	persistWalkthroughSeenVersion,
	readLocalWalkthroughSeenVersion,
	normaliseSeenVersion,
	walkthroughPreferenceUrl,
	WALKTHROUGH_SEEN_STORAGE_PREFIX,
} from '@/composables/useWalkthrough.js'

/**
 * Minimal in-memory `Storage` double.
 *
 * @return {object} A storage-shaped object with an inspectable `_store`.
 */
function makeStorage() {
	const store = new Map()
	return {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => store.set(k, v),
		removeItem: (k) => store.delete(k),
		_store: store,
	}
}

/**
 * axios double with `get` / `put` jest mocks.
 *
 * @param {*} getData Payload resolved by `get`.
 * @return {object} `{ get, put }`.
 */
function makeHttp(getData) {
	return {
		get: jest.fn().mockResolvedValue({ data: getData }),
		put: jest.fn().mockResolvedValue({ data: { value: 'ok' } }),
	}
}

const KEY = 'walkthrough_completed_version'

describe('walkthrough completion persistence', () => {
	describe('normaliseSeenVersion', () => {
		it('treats only null / undefined / empty string as "never seen"', () => {
			expect(normaliseSeenVersion(null)).toBe('')
			expect(normaliseSeenVersion(undefined)).toBe('')
			expect(normaliseSeenVersion('')).toBe('')
		})

		it('keeps JS-falsy scalars as SEEN — a plain truthiness check would re-open the tour', () => {
			// `0` / `false` / `'0'` are all values a preferences backend can hand
			// back for a completed user. Reading them as "fresh user" is exactly
			// the mis-read that makes a persisted completion look unpersisted.
			expect(normaliseSeenVersion(0)).toBe('0')
			expect(normaliseSeenVersion(false)).toBe('false')
			expect(normaliseSeenVersion('0')).toBe('0')
			expect(normaliseSeenVersion(0)).not.toBe('')
			expect(normaliseSeenVersion(false)).not.toBe('')
		})
	})

	describe('loadWalkthroughSeenVersion', () => {
		it('reads the per-user preference at /apps/{appId}/api/preferences/{key}', async () => {
			const http = makeHttp({ value: '2.1.0' })
			const storage = makeStorage()
			const seen = await loadWalkthroughSeenVersion('openbuild', KEY, { http, storage })
			expect(http.get).toHaveBeenCalledWith(
				expect.stringContaining('/apps/openbuild/api/preferences/' + KEY),
			)
			expect(seen).toBe('2.1.0')
		})

		it('mirrors a server-recorded version into localStorage for the next boot', async () => {
			const http = makeHttp({ value: '2.1.0' })
			const storage = makeStorage()
			await loadWalkthroughSeenVersion('openbuild', KEY, { http, storage })
			expect(storage.getItem(WALKTHROUGH_SEEN_STORAGE_PREFIX + 'openbuild')).toBe('2.1.0')
		})

		it('treats {"value": null} as never-seen (the live shape observed on a fresh user)', async () => {
			const http = makeHttp({ value: null })
			const storage = makeStorage()
			expect(await loadWalkthroughSeenVersion('openbuild', KEY, { http, storage })).toBe('')
		})

		it('treats a falsy-but-present stored value as seen', async () => {
			const http = makeHttp({ value: 0 })
			const storage = makeStorage()
			expect(await loadWalkthroughSeenVersion('openbuild', KEY, { http, storage })).toBe('0')
		})

		it('falls back to the local mirror when the app serves SPA HTML instead of the endpoint', async () => {
			const http = makeHttp('<!DOCTYPE html><html lang="en"></html>')
			const storage = makeStorage()
			storage.setItem(WALKTHROUGH_SEEN_STORAGE_PREFIX + 'openbuild', '1.4.0')
			expect(await loadWalkthroughSeenVersion('openbuild', KEY, { http, storage })).toBe('1.4.0')
		})

		it('falls back to the local mirror when the request fails', async () => {
			const http = { get: jest.fn().mockRejectedValue(new Error('401')), put: jest.fn() }
			const storage = makeStorage()
			storage.setItem(WALKTHROUGH_SEEN_STORAGE_PREFIX + 'openbuild', '1.4.0')
			expect(await loadWalkthroughSeenVersion('openbuild', KEY, { http, storage })).toBe('1.4.0')
		})

		it('issues no request when the manifest declares no completionConfigKey', async () => {
			const http = makeHttp({ value: '9.9.9' })
			const storage = makeStorage()
			storage.setItem(WALKTHROUGH_SEEN_STORAGE_PREFIX + 'openbuild', '1.0.0')
			expect(await loadWalkthroughSeenVersion('openbuild', '', { http, storage })).toBe('1.0.0')
			expect(http.get).not.toHaveBeenCalled()
		})
	})

	describe('persistWalkthroughSeenVersion', () => {
		it('PUTs the version to the SAME key the load path reads', async () => {
			const http = makeHttp({ value: null })
			const storage = makeStorage()
			await persistWalkthroughSeenVersion('openbuild', KEY, '2.1.0', { http, storage })
			expect(http.put).toHaveBeenCalledWith(
				walkthroughPreferenceUrl('openbuild', KEY),
				{ value: '2.1.0' },
			)
			// Read and write must address one identical URL: a persist that lands
			// on a different key reads back as "never seen" forever.
			await loadWalkthroughSeenVersion('openbuild', KEY, { http, storage })
			expect(http.get.mock.calls[0][0]).toBe(http.put.mock.calls[0][0])
		})

		it('writes the local mirror too, so the next boot is synchronous', async () => {
			const http = makeHttp({ value: null })
			const storage = makeStorage()
			await persistWalkthroughSeenVersion('openbuild', KEY, '2.1.0', { http, storage })
			expect(readLocalWalkthroughSeenVersion('openbuild', storage)).toBe('2.1.0')
		})

		it('round-trips: a persisted version reads back as seen', async () => {
			const storage = makeStorage()
			const backend = { value: null }
			const http = {
				get: jest.fn(() => Promise.resolve({ data: { value: backend.value } })),
				put: jest.fn((url, body) => {
					backend.value = body.value
					return Promise.resolve({})
				}),
			}
			expect(await loadWalkthroughSeenVersion('openbuild', KEY, { http, storage: makeStorage() })).toBe('')
			await persistWalkthroughSeenVersion('openbuild', KEY, '2.1.0', { http, storage })
			expect(await loadWalkthroughSeenVersion('openbuild', KEY, { http, storage: makeStorage() })).toBe('2.1.0')
		})

		it('resolves false instead of throwing when the write fails', async () => {
			const http = {
				get: jest.fn(),
				put: jest.fn().mockRejectedValue(new Error('403')),
			}
			const storage = makeStorage()
			await expect(persistWalkthroughSeenVersion('openbuild', KEY, '2.1.0', { http, storage }))
				.resolves.toBe(false)
			// The local mirror is still written — dismissal sticks for this browser.
			expect(readLocalWalkthroughSeenVersion('openbuild', storage)).toBe('2.1.0')
		})

		it('writes only the local mirror when no completionConfigKey is declared', async () => {
			const http = makeHttp({ value: null })
			const storage = makeStorage()
			await expect(persistWalkthroughSeenVersion('openbuild', '', '2.1.0', { http, storage }))
				.resolves.toBe(false)
			expect(http.put).not.toHaveBeenCalled()
			expect(readLocalWalkthroughSeenVersion('openbuild', storage)).toBe('2.1.0')
		})
	})

	describe('useWalkthrough seen-version handling', () => {
		const tourManifest = {
			version: '1.0.0',
			walkthrough: {
				enabled: true,
				completionConfigKey: KEY,
				tours: [{
					id: 'getting-started',
					trigger: 'first-visit',
					steps: [{ id: 's1', sinceVersion: '1.0.0', title: 'Hi' }],
				}],
			},
		}

		beforeEach(() => __resetWalkthroughCacheForTests())

		it('auto-starts the first-visit tour for a user with no recorded version', () => {
			const wt = useWalkthrough('wt-fresh', tourManifest, { seenVersion: '' })
			expect(wt.autoStartTour.value).not.toBeNull()
		})

		it('does not auto-start once a version is recorded', () => {
			const wt = useWalkthrough('wt-seen', tourManifest, { seenVersion: '1.0.0' })
			expect(wt.autoStartTour.value).toBeNull()
		})

		it('does not auto-start for a recorded version that is a JS-falsy scalar', () => {
			// `0` / `false` are still a RECORDED completion. Coercing them to ''
			// would hand the engine a fresh-user state and re-open the tour.
			expect(useWalkthrough('wt-zero', tourManifest, { seenVersion: 0 }).autoStartTour.value).toBeNull()
			expect(useWalkthrough('wt-false', tourManifest, { seenVersion: false }).autoStartTour.value).toBeNull()
		})
	})
})
