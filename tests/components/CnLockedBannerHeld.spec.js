/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqTicket: a held lock names who locked the record and when, Unlock stays
 * the holder's, and the detail page disables Edit until it is unlocked.
 *
 * @spec openspec/changes/record-lock-held/specs/object-lock/spec.md#requirement-a-held-lock-is-named-with-who-and-when-and-edit-waits-for-unlock
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
	translatePlural: (app, one, many, n) => (n === 1 ? one : many),
}))

const { mount } = require('@vue/test-utils')
const CnLockedBanner = require('../../src/components/CnLockedBanner/CnLockedBanner.vue').default
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const at = new Date(2026, 9, 12, 16, 40)

describe('CnLockedBanner for a held lock', () => {
	it('names who locked it and when, and offers Unlock to the holder', () => {
		const wrapper = mount(CnLockedBanner, { props: { held: true, lockedBy: 'Pieter Jansen', lockedByMe: true, lockedAt: at } })
		const text = wrapper.text()
		expect(text).toContain('Locked by Pieter Jansen on ')
		expect(text).toContain('2026 at 16:40.')
		expect(text).toContain('Nobody can change or delete this until it is unlocked')
		expect(wrapper.find('[data-testid="cn-locked-banner-unlock"]').exists()).toBe(true)
	})

	it('fills the app\'s own sentence', () => {
		const wrapper = mount(CnLockedBanner, { props: { held: true, lockedBy: 'Pieter Jansen', lockedByMe: false, lockedAt: at, heldMessage: '{user} locked this ticket at {time}.' } })
		expect(wrapper.find('.cn-locked-banner__message').text()).toBe('Pieter Jansen locked this ticket at 16:40.')
		expect(wrapper.find('[data-testid="cn-locked-banner-unlock"]').exists()).toBe(false)
	})

	it('keeps the edit-lock sentence for a lock that lapses', () => {
		const wrapper = mount(CnLockedBanner, { props: { lockedBy: 'bob', lockedByMe: false } })
		expect(wrapper.text()).toContain('You cannot edit this until the lock is released.')
	})
})

describe('CnDetailPage with a held lock', () => {
	const ref = (value) => ({ value })

	it('reads held only from the lock state', () => {
		const recordHeld = CnDetailPage.computed.recordHeld
		expect(recordHeld.call({ lockState: null })).toBe(false)
		expect(recordHeld.call({ lockState: { held: ref(true) } })).toBe(true)
		expect(recordHeld.call({ lockState: { held: ref(false) } })).toBe(false)
	})

	it('adds a Locked pill beside the status', () => {
		const headerPills = CnDetailPage.computed.headerPills
		const pills = headerPills.call({ typePill: null, statusPill: null, recordHeld: true, pillCounts: {}, pillRefLabels: {}, pillRefLooks: {}, effectiveTranslate: (x) => x })
		expect(pills).toEqual([expect.objectContaining({ key: 'lock', label: 'Locked', icon: 'LockOutline' })])
		expect(headerPills.call({ typePill: null, statusPill: null, recordHeld: false, pillCounts: {}, pillRefLabels: {}, pillRefLooks: {}, effectiveTranslate: (x) => x })).toEqual([])
	})

	it('does not open the edit form while held', () => {
		const ctx = { recordHeld: true, editFormOpen: false, editLockRefusal: '', acquireEditLock: jest.fn() }
		CnDetailPage.methods.openEditForm.call(ctx)
		expect(ctx.editFormOpen).toBe(false)
		expect(ctx.acquireEditLock).not.toHaveBeenCalled()
	})

	it('names the reader\'s own lock with their display name', () => {
		const lockHolderName = CnDetailPage.computed.lockHolderName
		expect(lockHolderName.call({ lockState: { lockedByMe: ref(false), lockedBy: ref('fatma') } })).toBe('fatma')
	})
})
