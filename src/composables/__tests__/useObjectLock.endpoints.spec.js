/**
 * Tests for the two URLs useObjectLock talks to.
 *
 * 🔴 THE PROPERTY THAT MATTERS IS WHICH ROUTE IS CALLED, NOT THAT THE PROMISE
 * RESOLVED. OpenRegister declares exactly two lock routes, `objects#lock` and
 * `objects#unlock`, both POST (`appinfo/routes.php`, read 2026-09-18 on
 * `development`). `release()` used to send `DELETE /lock`, which no route
 * answers, and its own 404 branch reads a miss as "already released;
 * idempotent" and returns without a word. So every release succeeded loudly and
 * did nothing: the lock outlived the editor, the holder was told nothing, and
 * the next person was refused by a lock whose owner had closed the page twenty
 * minutes earlier.
 *
 * A test that only awaited `release()` passes in both worlds. These assert the
 * METHOD and the URL, which is the only thing that separates them.
 *
 * The second property is the slug. `schema` doubles as the object-cache key,
 * and CnDetailPage passes it `<register>-<schema>`; put into the URL that is a
 * schema no register has, so the acquire 404ed on every manifest-driven detail
 * page. `options.schemaSlug` is the URL half.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

// 🔑 HELD, NOT REQUIRED BACK: `@nextcloud/axios` is a peer dependency and is
// legitimately absent from this package's own tree. A `mock`-prefixed variable
// is the one thing a jest.mock factory may close over.
const mockAxios = {
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
}

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: mockAxios,
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path) => path,
}))

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: () => ({ uid: 'anna' }),
}))

const { effectScope } = require('vue')
const { useObjectLock, LockConflictError } = require('../useObjectLock.js')

/**
 * An object store holding one case, locked by whoever is named.
 *
 * @param {string|null} holder The uid holding the lock, or null for none.
 * @return {object} The store double.
 */
function storeWithLock(holder) {
	return {
		objects: {
			'dossiq-case': {
				'case-1': {
					'@self': holder === null ? {} : { locked: { user: holder } },
				},
			},
		},
		fetchObject: jest.fn().mockResolvedValue({}),
	}
}

/**
 * Run the composable inside a scope, so its dispose hook never fires mid-test.
 *
 * @param {object}   store The object store double.
 * @param {object}   opts  Options for the composable.
 * @param {Function} body  What to do with the lock state.
 * @return {Promise<*>} Whatever `body` returned.
 */
async function withLock(store, opts, body) {
	const scope = effectScope()
	let result
	let lock
	scope.run(() => {
		lock = useObjectLock(store, 'dossiq', 'dossiq-case', 'case-1', {
			autoRenew: false,
			...opts,
		})
	})
	try {
		result = await body(lock)
	} finally {
		scope.stop()
	}
	return result
}

describe('useObjectLock reaches the routes OpenRegister actually declares', () => {
	beforeEach(() => {
		mockAxios.post.mockReset().mockResolvedValue({ data: {} })
		mockAxios.delete.mockReset().mockResolvedValue({ data: {} })
	})

	it('acquires with a POST on the schema SLUG, not the cache key', async () => {
		await withLock(storeWithLock(null), { schemaSlug: 'case' }, async (lock) => {
			await lock.acquire()
		})

		expect(mockAxios.post).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/dossiq/case/case-1/lock',
			{ duration: 1800 },
		)
	})

	it('falls back to the schema argument when no slug is given', async () => {
		await withLock(storeWithLock(null), {}, async (lock) => {
			await lock.acquire()
		})

		expect(mockAxios.post).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/dossiq/dossiq-case/case-1/lock',
			{ duration: 1800 },
		)
	})

	it('🔴 releases with a POST to /unlock, and never a DELETE to /lock', async () => {
		await withLock(storeWithLock('anna'), { schemaSlug: 'case' }, async (lock) => {
			await lock.release()
		})

		expect(mockAxios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/case/case-1/unlock')
		// The assertion that separates a working release from the silent no-op
		// it replaces: the old code sent a DELETE, read its own 404 as success
		// and returned.
		expect(mockAxios.delete).not.toHaveBeenCalled()
	})

	it('turns a 423 into a LockConflictError naming the holder', async () => {
		mockAxios.post.mockRejectedValueOnce({
			response: {
				status: 423,
				data: { message: 'Being edited by Anna', lock: { user: 'anna' } },
			},
		})

		const caught = await withLock(
			storeWithLock('anna'),
			{ schemaSlug: 'case' },
			async (lock) => {
				try {
					await lock.acquire()
					return null
				} catch (e) {
					return e
				}
			},
		)

		expect(caught).toBeInstanceOf(LockConflictError)
		expect(caught.message).toBe('Being edited by Anna')
		expect(caught.lockedBy).toBe('anna')
	})

	it('reads the holder and whether it is me off the cached object', async () => {
		await withLock(storeWithLock('bram'), { schemaSlug: 'case' }, async (lock) => {
			expect(lock.locked.value).toBe(true)
			expect(lock.lockedBy.value).toBe('bram')
			expect(lock.lockedByMe.value).toBe(false)
		})

		await withLock(storeWithLock('anna'), { schemaSlug: 'case' }, async (lock) => {
			expect(lock.lockedByMe.value).toBe(true)
		})
	})
})
