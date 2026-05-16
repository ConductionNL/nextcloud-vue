/**
 * Tests for useObjectLock — reactive lock state, acquire/release,
 * typed errors, and beforeunload beacon.
 *
 * Covers REQ-CO-LOCK-002 / 003 / 004.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (path) => `/index.php${path}`,
}))
jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: jest.fn(() => ({ uid: 'alice' })),
}))

const axios = require('@nextcloud/axios').default
const auth = require('@nextcloud/auth')
const {
	useObjectLock,
	LockConflictError,
	PermissionError,
} = require('../../src/composables/useObjectLock.js')

const { defineComponent, h } = require('vue')
const { mount } = require('@vue/test-utils')

function makeStore(initialLocked = null) {
	return {
		objects: {
			meeting: {
				'uuid-1': {
					'@self': initialLocked ? { locked: initialLocked } : {},
				},
			},
		},
		fetchObject: jest.fn().mockResolvedValue({}),
	}
}

function mountLock(store, options = {}) {
	let composable
	const Comp = defineComponent({
		setup() {
			composable = useObjectLock(
				store,
				'decidesk',
				'meeting',
				'uuid-1',
				options,
			)
			return () => h('div')
		},
		render(h) { return h('div') },
	})
	const wrapper = mount(Comp)
	return { wrapper, lock: () => composable }
}

describe('useObjectLock — REQ-CO-LOCK-002 (reactive state from store cache)', () => {
	beforeEach(() => {
		axios.post.mockReset()
		axios.delete.mockReset()
		auth.getCurrentUser.mockReturnValue({ uid: 'alice' })
	})

	test('locked reads from @self.locked', () => {
		const store = makeStore({
			user: 'bob',
			expiresAt: '2030-01-01T00:00:00Z',
		})
		const { wrapper, lock } = mountLock(store)
		expect(lock().locked.value).toBe(true)
		expect(lock().lockedBy.value).toBe('bob')
		expect(lock().lockedByMe.value).toBe(false)
		wrapper.destroy()
	})

	test('lockedByMe true when current user matches', () => {
		const store = makeStore({
			user: 'alice',
			expiresAt: '2030-01-01T00:00:00Z',
		})
		const { wrapper, lock } = mountLock(store)
		expect(lock().lockedByMe.value).toBe(true)
		wrapper.destroy()
	})

	test('expiresAt parses', () => {
		const store = makeStore({
			user: 'bob',
			expiresAt: '2030-06-15T12:00:00Z',
		})
		const { wrapper, lock } = mountLock(store)
		expect(lock().expiresAt.value).toBeInstanceOf(Date)
		expect(lock().expiresAt.value.getUTCFullYear()).toBe(2030)
		wrapper.destroy()
	})

	test('expired lock reads as unlocked', () => {
		const store = makeStore({
			user: 'bob',
			expiresAt: '2000-01-01T00:00:00Z',
		})
		const { wrapper, lock } = mountLock(store)
		expect(lock().locked.value).toBe(false)
		wrapper.destroy()
	})
})

describe('useObjectLock — REQ-CO-LOCK-003 (acquire / release)', () => {
	beforeEach(() => {
		axios.post.mockReset()
		axios.delete.mockReset()
	})

	test('successful acquire posts and refreshes the object', async () => {
		const store = makeStore()
		axios.post.mockResolvedValueOnce({ status: 200 })
		const { wrapper, lock } = mountLock(store, { autoRenew: false })
		await lock().acquire()
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post.mock.calls[0][0]).toContain('/lock')
		expect(axios.post.mock.calls[0][1]).toEqual({ duration: 1800 })
		expect(store.fetchObject).toHaveBeenCalled()
		wrapper.destroy()
	})

	test('409 throws LockConflictError with lockedBy', async () => {
		const store = makeStore()
		axios.post.mockRejectedValueOnce({
			response: { status: 409, data: { lock: { user: 'bob' } } },
		})
		const { wrapper, lock } = mountLock(store, { autoRenew: false })
		await expect(lock().acquire()).rejects.toBeInstanceOf(LockConflictError)
		try { await lock().acquire() } catch (e) {
			expect(e.lockedBy).toBe('bob')
		}
		wrapper.destroy()
	})

	test('403 throws PermissionError', async () => {
		const store = makeStore()
		axios.post.mockRejectedValue({
			response: { status: 403, data: { message: 'no perm' } },
		})
		const { wrapper, lock } = mountLock(store, { autoRenew: false })
		await expect(lock().acquire()).rejects.toBeInstanceOf(PermissionError)
		wrapper.destroy()
	})

	test('release issues DELETE', async () => {
		const store = makeStore({ user: 'alice', expiresAt: '2030-01-01T00:00:00Z' })
		axios.delete.mockResolvedValue({ status: 204 })
		const { wrapper, lock } = mountLock(store)
		await lock().release()
		expect(axios.delete).toHaveBeenCalledTimes(1)
		wrapper.destroy()
	})
})

describe('useObjectLock — REQ-CO-LOCK-004 (auto-release lifecycle)', () => {
	test('beforeDestroy releases the lock when held by me', async () => {
		const store = makeStore({ user: 'alice', expiresAt: '2030-01-01T00:00:00Z' })
		axios.delete.mockResolvedValue({ status: 204 })
		const { wrapper } = mountLock(store)
		wrapper.destroy()
		// Allow any queued micro-tasks to flush
		await Promise.resolve()
		expect(axios.delete).toHaveBeenCalled()
	})

	test('beforeunload calls navigator.sendBeacon when locked by me', () => {
		const beacon = jest.fn()
		const origBeacon = navigator.sendBeacon
		navigator.sendBeacon = beacon
		const store = makeStore({ user: 'alice', expiresAt: '2030-01-01T00:00:00Z' })
		const { wrapper } = mountLock(store)
		window.dispatchEvent(new Event('beforeunload'))
		expect(beacon).toHaveBeenCalled()
		wrapper.destroy()
		navigator.sendBeacon = origBeacon
	})
})
