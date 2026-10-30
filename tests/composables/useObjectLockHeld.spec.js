/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A lock taken without a duration holds the record until it is unlocked
 * (PqTicket: a finished ticket locked from its menu). OpenRegister writes an
 * edit lock's expiry as `expiration`; a held lock has none.
 *
 * @spec openspec/changes/record-lock-held/specs/object-lock/spec.md#requirement-a-lock-without-an-expiry-holds-the-record
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (path) => `/index.php${path}`,
}))
jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: jest.fn(() => ({ uid: 'pieter' })),
}))

const axios = require('@nextcloud/axios').default
const { mount } = require('@vue/test-utils')
const { defineComponent, h } = require('vue')
const { useObjectLock } = require('../../src/composables/useObjectLock.js')
const { isHeldLock, isObjectLocked, lockExpiryOf } = require('../../src/utils/objectLock.js')

function makeStore(locked) {
	return {
		objects: { ticket: { 't-1': { '@self': { locked } } } },
		fetchObject: jest.fn().mockResolvedValue({}),
	}
}

function mountLock(store) {
	let composable
	const Comp = defineComponent({
		setup() {
			composable = useObjectLock(store, 'pipelinq', 'ticket', 't-1')
			return () => h('div')
		},
	})
	return { wrapper: mount(Comp), lock: () => composable }
}

const heldByPieter = { kind: 'user', user: 'pieter', process: null, created: '2026-10-12T16:40:00+02:00', duration: null }

describe('a held lock', () => {
	beforeEach(() => {
		axios.post.mockReset()
		navigator.sendBeacon = jest.fn()
	})

	test('reads OpenRegister\'s expiration, and a lock without one as held', () => {
		expect(lockExpiryOf({ expiration: '2030-01-01T00:00:00Z' })?.toISOString()).toBe('2030-01-01T00:00:00.000Z')
		expect(isObjectLocked({ '@self': { locked: { user: 'bob', expiration: '2020-01-01T00:00:00Z' } } })).toBe(false)
		expect(isHeldLock(heldByPieter)).toBe(true)
		expect(isHeldLock({ user: 'bob', expiration: '2030-01-01T00:00:00Z' })).toBe(false)
		expect(isHeldLock(null)).toBe(false)
	})

	test('reports held and when it was taken', () => {
		const { wrapper, lock } = mountLock(makeStore(heldByPieter))
		expect(lock().locked.value).toBe(true)
		expect(lock().held.value).toBe(true)
		expect(lock().lockedAt.value?.toISOString()).toBe('2026-10-12T14:40:00.000Z')
		expect(lock().expiresAt.value).toBe(null)
		wrapper.unmount()
	})

	test('is not released when its holder leaves the page', () => {
		const { wrapper } = mountLock(makeStore(heldByPieter))
		window.dispatchEvent(new Event('beforeunload'))
		wrapper.unmount()
		expect(navigator.sendBeacon).not.toHaveBeenCalled()
		expect(axios.post).not.toHaveBeenCalled()
	})

	test('an edit lock of the holder is still released on leaving', () => {
		const { wrapper, lock } = mountLock(makeStore({ user: 'pieter', expiration: '2030-01-01T00:00:00Z' }))
		expect(lock().held.value).toBe(false)
		window.dispatchEvent(new Event('beforeunload'))
		expect(navigator.sendBeacon).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/pipelinq/ticket/t-1/unlock')
		wrapper.unmount()
	})
})
