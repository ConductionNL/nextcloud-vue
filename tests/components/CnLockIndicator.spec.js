/**
 * Tests for CnLockIndicator and the objectLock helpers behind it.
 *
 * The behaviour these pin is the one a list gets wrong when each surface
 * re-implements it: an EXPIRED lock is not a lock. Painting padlocks on records
 * anyone may edit trains people to ignore the padlock, which costs more than
 * showing none at all.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: jest.fn(),
}))

const { getCurrentUser } = require('@nextcloud/auth')
const { mount } = require('@vue/test-utils')
const CnLockIndicator = require('../../src/components/CnLockIndicator/CnLockIndicator.vue').default
const {
	isObjectLocked,
	isLockedByCurrentUser,
	lockHolder,
	resolveObjectLock,
} = require('../../src/utils/objectLock.js')

/** An ISO timestamp N minutes from now. */
const inMinutes = (n) => new Date(Date.now() + (n * 60000)).toISOString()

/** A record carrying a `@self.locked` block. */
const withLock = (locked) => ({ '@self': { locked } })

describe('objectLock helpers', () => {
	beforeEach(() => {
		getCurrentUser.mockReturnValue({ uid: 'alice' })
	})

	it('reports no lock on a record that has none', () => {
		expect(isObjectLocked({ '@self': {} })).toBe(false)
		expect(isObjectLocked(null)).toBe(false)
		expect(isObjectLocked({})).toBe(false)
	})

	it('reports a live lock', () => {
		expect(isObjectLocked(withLock({ user: 'bob', expiresAt: inMinutes(10) }))).toBe(true)
	})

	it('an EXPIRED lock is not a lock', () => {
		// The server does not sweep expired locks; expiry is evaluated on read.
		// A surface that only checks for the key's presence marks stale locks
		// as live, which is the failure mode this whole helper exists to stop.
		expect(isObjectLocked(withLock({ user: 'bob', expiresAt: inMinutes(-1) }))).toBe(false)
	})

	it('a lock with no expiry is held until released', () => {
		expect(isObjectLocked(withLock({ user: 'bob' }))).toBe(true)
	})

	it('reads a flattened record as well as an enveloped one', () => {
		expect(isObjectLocked({ locked: { user: 'bob' } })).toBe(true)
	})

	it('names the holder, preferring the display name', () => {
		expect(lockHolder(withLock({ user: 'bob', displayName: 'Bob Bakker' }))).toBe('Bob Bakker')
		expect(lockHolder(withLock({ user: 'bob' }))).toBe('bob')
	})

	it('matches the current user on uid, never on display name', () => {
		// Two people can share a display name, and a false positive here is the
		// dangerous direction: it paints somebody else's lock as your own and
		// offers you an Unlock button for it.
		expect(isLockedByCurrentUser(withLock({ user: 'alice' }))).toBe(true)
		expect(isLockedByCurrentUser(withLock({ user: 'bob', displayName: 'alice' }))).toBe(false)
	})

	it('claims no lock as your own when there is no session', () => {
		getCurrentUser.mockReturnValue(null)
		expect(isLockedByCurrentUser(withLock({ user: 'alice' }))).toBe(false)
	})

	it('resolves the whole state at once', () => {
		const state = resolveObjectLock(withLock({ user: 'alice', displayName: 'Alice', expiresAt: inMinutes(5) }))
		expect(state.locked).toBe(true)
		expect(state.byMe).toBe(true)
		expect(state.holder).toBe('Alice')
		expect(state.expiresAt).toBeInstanceOf(Date)
	})

	it('resolves an expired lock to the same shape as no lock', () => {
		expect(resolveObjectLock(withLock({ user: 'bob', expiresAt: inMinutes(-5) })))
			.toEqual({ locked: false, byMe: false, holder: null, expiresAt: null })
	})
})

describe('CnLockIndicator', () => {
	beforeEach(() => {
		getCurrentUser.mockReturnValue({ uid: 'alice' })
	})

	it('renders nothing for an unlocked record', () => {
		const wrapper = mount(CnLockIndicator, { propsData: { object: { '@self': {} } } })
		expect(wrapper.find('[data-testid="cn-lock-indicator"]').exists()).toBe(false)
	})

	it('renders nothing for an expired lock', () => {
		const wrapper = mount(CnLockIndicator, {
			propsData: { object: withLock({ user: 'bob', expiresAt: inMinutes(-1) }) },
		})
		expect(wrapper.find('[data-testid="cn-lock-indicator"]').exists()).toBe(false)
	})

	it("names the holder of somebody else's lock, in the warning tone", () => {
		const wrapper = mount(CnLockIndicator, {
			propsData: { object: withLock({ user: 'bob', displayName: 'Bob Bakker' }) },
		})
		const badge = wrapper.find('[data-testid="cn-lock-indicator"]')
		expect(badge.exists()).toBe(true)
		expect(badge.classes()).toContain('cn-lock-indicator--other')
		expect(badge.attributes('aria-label')).toContain('Bob Bakker')
	})

	it('reads neutral for your own lock', () => {
		const wrapper = mount(CnLockIndicator, {
			propsData: { object: withLock({ user: 'alice' }) },
		})
		const badge = wrapper.find('[data-testid="cn-lock-indicator"]')
		expect(badge.classes()).toContain('cn-lock-indicator--mine')
		expect(badge.attributes('aria-label')).toBe('Locked by you')
	})

	it('prints no word unless asked, so a dense table keeps its width', () => {
		const bare = mount(CnLockIndicator, { propsData: { object: withLock({ user: 'bob' }) } })
		expect(bare.find('.cn-lock-indicator__text').exists()).toBe(false)

		const labelled = mount(CnLockIndicator, {
			propsData: { object: withLock({ user: 'bob' }), showLabel: true },
		})
		expect(labelled.find('.cn-lock-indicator__text').text()).toBe('Locked')
	})
})
