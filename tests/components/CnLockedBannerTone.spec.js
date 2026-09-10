/**
 * Tests for the two tones of CnLockedBanner and its Unlock action.
 *
 * The behaviour these pin is the gap the banner used to leave: it rendered only
 * for a lock held by SOMEONE ELSE, which meant the one person who could do
 * anything about a stale lock — its holder — was the only person the UI never
 * told about it.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

const { mount } = require('@vue/test-utils')
const CnLockedBanner = require('../../src/components/CnLockedBanner/CnLockedBanner.vue').default

describe('CnLockedBanner', () => {
	it("reads as an error for somebody else's lock, and names them", () => {
		const wrapper = mount(CnLockedBanner, { propsData: { lockedBy: 'Bob Bakker' } })
		const card = wrapper.find('[data-testid="cn-locked-banner"]')

		expect(card.classes()).toContain('cn-locked-banner--other')
		expect(card.attributes('role')).toBe('alert')
		expect(card.text()).toContain('Bob Bakker')
	})

	it('never offers to release a lock that is not yours', () => {
		// A Release here would either fail at the server or, worse, succeed and
		// take the record out from under whoever is editing it.
		const wrapper = mount(CnLockedBanner, { propsData: { lockedBy: 'Bob Bakker' } })
		expect(wrapper.find('[data-testid="cn-locked-banner-unlock"]').exists()).toBe(false)
	})

	it('reads neutral for your own lock, and offers Unlock', () => {
		const wrapper = mount(CnLockedBanner, { propsData: { lockedBy: 'Alice', lockedByMe: true } })
		const card = wrapper.find('[data-testid="cn-locked-banner"]')

		expect(card.classes()).toContain('cn-locked-banner--mine')
		expect(card.attributes('role')).toBe('status')
		expect(wrapper.find('[data-testid="cn-locked-banner-unlock"]').exists()).toBe(true)
	})

	it('asks the host to release rather than releasing on its own', () => {
		const wrapper = mount(CnLockedBanner, { propsData: { lockedByMe: true } })

		wrapper.find('[data-testid="cn-locked-banner-unlock"]').trigger('click')

		expect(wrapper.emitted('unlock')).toHaveLength(1)
	})

	it('defaults to the error tone when the host does not say whose lock it is', () => {
		// The safe reading: a lock of unknown ownership must not come with an
		// Unlock button.
		const wrapper = mount(CnLockedBanner, { propsData: {} })
		expect(wrapper.find('[data-testid="cn-locked-banner"]').classes()).toContain('cn-locked-banner--other')
		expect(wrapper.find('[data-testid="cn-locked-banner-unlock"]').exists()).toBe(false)
	})

	it('can suppress the Unlock button on a read-only surface', () => {
		const wrapper = mount(CnLockedBanner, { propsData: { lockedByMe: true, showUnlock: false } })
		expect(wrapper.find('[data-testid="cn-locked-banner-unlock"]').exists()).toBe(false)
	})

	it('reports the expiry when it has one', () => {
		const wrapper = mount(CnLockedBanner, {
			propsData: { lockedBy: 'Bob', expiresAt: new Date(Date.now() + (10 * 60000)) },
		})
		expect(wrapper.find('.cn-locked-banner__sub').text()).toContain('10')
	})

	it('honours a message override', () => {
		const wrapper = mount(CnLockedBanner, { propsData: { message: 'Held for review' } })
		expect(wrapper.find('.cn-locked-banner__message').text()).toBe('Held for review')
	})
})
