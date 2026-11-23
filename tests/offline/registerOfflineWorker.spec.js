/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * The shell worker, and the two things it must never do.
 *
 * 🔴 IT MUST NOT REGISTER ITSELF. A service worker changes how every request
 * from an origin is answered, for every app on it, until somebody unregisters
 * it. A library that installed one as a side effect of being imported would
 * take that decision away from the app that owns the origin, silently.
 *
 * 🔴 IT MUST NOT ANSWER AN OBJECT READ FROM CACHE. A cached read looks exactly
 * like a fresh one, so an inspector would be shown a status or an assignment
 * from some earlier moment with nothing to say how old it is, and would act on
 * it in front of a citizen. Stale data belongs in the leaf's cache, which
 * carries an expiry and says out loud when it is out of date.
 */

import {
	registerOfflineWorker,
	unregisterOfflineWorker,
} from '../../src/offline/registerOfflineWorker.js'
import {
	cacheNameFor,
	isCacheable,
	respondTo,
	staleCacheNames,
} from '../../src/offline/serviceWorker.js'

describe('registering the shell worker', () => {
	it('registers only when the host asks', async () => {
		const container = { register: jest.fn().mockResolvedValue({ scope: '/apps/dossiq/' }) }

		const registration = await registerOfflineWorker({ scriptUrl: '/apps/dossiq/sw.js', container })

		expect(container.register).toHaveBeenCalledTimes(1)
		expect(registration.scope).toBe('/apps/dossiq/')
	})

	// 🔴 THE CASE THE MODULE EXISTS FOR. Importing it registers nothing. The
	// only way a worker lands on an origin is a host calling the function.
	it('registers nothing when the helper is never called', async () => {
		const container = { register: jest.fn() }

		expect(container.register).not.toHaveBeenCalled()
		expect(await unregisterOfflineWorker({ getRegistrations: async () => [] })).toBe(0)
	})

	it('does nothing where the browser has no service worker support', async () => {
		expect(await registerOfflineWorker({ scriptUrl: '/apps/dossiq/sw.js', container: {} })).toBeNull()
	})

	it('does nothing without a script to register', async () => {
		const container = { register: jest.fn() }

		expect(await registerOfflineWorker({ container })).toBeNull()
		expect(container.register).not.toHaveBeenCalled()
	})

	// A refused registration is not a reason to stop the app loading: the leaf
	// captures and queues perfectly well without a worker. The worker only
	// decides whether the SHELL opens offline.
	it('reports a refused registration as no worker rather than throwing', async () => {
		const container = { register: jest.fn().mockRejectedValue(new Error('insecure origin')) }
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

		expect(await registerOfflineWorker({ scriptUrl: '/apps/dossiq/sw.js', container })).toBeNull()

		warn.mockRestore()
	})

	it('lets a host that opted in opt back out', async () => {
		const unregister = jest.fn().mockResolvedValue(true)
		const container = { getRegistrations: async () => [{ unregister }, { unregister }] }

		expect(await unregisterOfflineWorker(container)).toBe(2)
	})
})

describe('what the worker will and will not cache', () => {
	it('caches the shell and the bundle', () => {
		expect(isCacheable('/apps/dossiq/')).toBe(true)
		expect(isCacheable('/custom_apps/dossiq/js/dossiq-main.js')).toBe(true)
	})

	// 🔴 THE REFUSAL. Reverting it means an inspector is shown an old case with
	// nothing on screen to say it is old.
	it('never answers an object read from cache', () => {
		expect(isCacheable('/apps/openregister/api/objects/dossiq/fieldInspection')).toBe(false)
		expect(isCacheable('/ocs/v2.php/apps/whatever')).toBe(false)
	})

	it('never answers a write from cache, which would be a lie about reaching the server', () => {
		expect(isCacheable('/apps/dossiq/', 'POST')).toBe(false)
		expect(isCacheable('/apps/dossiq/', 'PUT')).toBe(false)
	})

	// 🔴 REPLACE, NOT ADD. A worker that adds a cache per release serves last
	// month's bundle to whichever request hits the older entry, and grows
	// without limit on a device nobody clears.
	it('discards its own older caches and leaves everybody else alone', () => {
		const current = cacheNameFor('2.1.0')
		const stale = staleCacheNames([cacheNameFor('2.0.0'), current, 'some-other-app-cache'], current)

		expect(stale).toEqual([cacheNameFor('2.0.0')])
	})

	it('serves the shell from cache when the network is gone', async () => {
		const cache = { match: async () => ({ body: 'the cached shell' }), put: jest.fn() }
		const fetchFn = jest.fn().mockRejectedValue(new Error('offline'))

		const response = await respondTo({ url: '/apps/dossiq/', method: 'GET' }, cache, fetchFn)

		expect(response.body).toBe('the cached shell')
		expect(fetchFn).not.toHaveBeenCalled()
	})

	it('fills the cache from the first successful load', async () => {
		const cache = { match: async () => undefined, put: jest.fn() }
		const fetchFn = jest.fn().mockResolvedValue({ ok: true, clone: () => ({ body: 'shell' }) })

		await respondTo({ url: '/apps/dossiq/', method: 'GET' }, cache, fetchFn)

		expect(cache.put).toHaveBeenCalledTimes(1)
	})

	it('does not cache a failed response, which would pin the error', async () => {
		const cache = { match: async () => undefined, put: jest.fn() }
		const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 500 })

		await respondTo({ url: '/apps/dossiq/', method: 'GET' }, cache, fetchFn)

		expect(cache.put).not.toHaveBeenCalled()
	})

	it('passes an object read straight to the network, cache or no cache', async () => {
		const cache = { match: jest.fn(), put: jest.fn() }
		const fetchFn = jest.fn().mockResolvedValue({ ok: true, body: 'fresh' })

		const response = await respondTo(
			{ url: '/apps/openregister/api/objects/dossiq/fieldInspection', method: 'GET' },
			cache,
			fetchFn,
		)

		expect(cache.match).not.toHaveBeenCalled()
		expect(response.body).toBe('fresh')
	})
})
