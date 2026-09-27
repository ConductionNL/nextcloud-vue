/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Dexie loads on first use, never at import time.
 *
 * Dexie throws "Two different versions of Dexie loaded in the same app" at
 * module init when another copy at a different version is already on the
 * page, and Nextcloud loads several apps' every-page bundles at once. With a
 * static import, every app that imports anything from this library evaluated
 * Dexie on every page, so one app a patch release ahead of another blanked
 * apps that never use the offline core. These tests pin the fix: importing
 * the offline core evaluates Dexie zero times, and the first `openDb()`
 * evaluates it exactly once.
 */

// A polyfill: it has to run before Dexie opens a database.
import 'fake-indexeddb/auto'

// Counts how often the `dexie` module is evaluated. jest hoists this above
// the imports, and only `mock`-prefixed names may be read inside it.
let mockDexieLoads = 0
jest.mock('dexie', () => {
	mockDexieLoads++
	return jest.requireActual('dexie')
})

describe('offline core: Dexie is loaded lazily', () => {
	beforeEach(() => {
		jest.resetModules()
		mockDexieLoads = 0
	})

	it('importing the offline core does not evaluate Dexie', async () => {
		await import('../../../src/integrations/offline/index.js')

		expect(mockDexieLoads).toBe(0)
	})

	it('getDb() refuses before the database is opened, and names the way out', async () => {
		const offline = await import('../../../src/integrations/offline/index.js')

		expect(() => offline.getDb()).toThrow(/await openDb\(\)/)
		expect(mockDexieLoads).toBe(0)
	})

	it('the first openDb() evaluates Dexie once, and getDb() then returns the same handle', async () => {
		const offline = await import('../../../src/integrations/offline/index.js')

		const db = await offline.openDb()
		const again = await offline.openDb()

		expect(mockDexieLoads).toBe(1)
		expect(again).toBe(db)
		expect(offline.getDb()).toBe(db)
		expect(db.objectCache).toBeDefined()
		expect(db.mutationQueue).toBeDefined()
		expect(db.meta).toBeDefined()
	})

	it('an offline function opens the database on its own', async () => {
		const offline = await import('../../../src/integrations/offline/index.js')

		expect(await offline.countPending('device-lazy')).toBe(0)
		expect(mockDexieLoads).toBe(1)
	})
})
