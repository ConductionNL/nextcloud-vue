/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Why a person is getting a notification, and whether they can stop it.
 *
 * The failure every case here guards is the same one: a screen that shows a
 * setting which does not apply. A toggle the person moves that changes
 * nothing is worse than a locked one, because they believe they have acted.
 */

const {
	PREFERENCE_LEVELS,
	channelAvailability,
	resolvePreference,
} = require('../../src/utils/notificationPreference.js')

describe('the ordinary three levels', () => {
	it('falls back to the app default and says so', () => {
		// "Why am I getting this" has to be answerable from the cell.
		const cell = resolvePreference({ appDefault: true })

		expect(cell.value).toBe(true)
		expect(cell.level).toBe(PREFERENCE_LEVELS.DEFAULT)
		expect(cell.editable).toBe(true)
	})

	it('lets a group value beat the app default', () => {
		const cell = resolvePreference({ appDefault: true, groupValue: false })

		expect(cell.value).toBe(false)
		expect(cell.level).toBe(PREFERENCE_LEVELS.GROUP)
	})

	it('lets the person beat their group', () => {
		const cell = resolvePreference({ appDefault: true, groupValue: true, personalValue: false })

		expect(cell.value).toBe(false)
		expect(cell.level).toBe(PREFERENCE_LEVELS.PERSONAL)
	})

	it('treats an explicit false as set, not as unset', () => {
		// The bug a truthiness check makes: switching something off reads as
		// never having chosen, and the group default switches it back on.
		const cell = resolvePreference({ appDefault: true, personalValue: false })

		expect(cell.level).toBe(PREFERENCE_LEVELS.PERSONAL)
		expect(cell.value).toBe(false)
	})
})

describe('a forced channel', () => {
	it('beats the person, and is not editable', () => {
		// An administrator saying this kind goes out whatever anybody prefers.
		// Rendering it as a movable toggle would let somebody switch off a
		// notification they keep receiving, with nothing saying why.
		const cell = resolvePreference({
			appDefault: false,
			personalValue: false,
			forced: { value: true, by: 'Gemeente Amsterdam', reason: 'Wettelijke kennisgeving' },
		})

		expect(cell.value).toBe(true)
		expect(cell.level).toBe(PREFERENCE_LEVELS.FORCED)
		expect(cell.editable).toBe(false)
	})

	it('carries who forced it and why, so the cell can say', () => {
		const cell = resolvePreference({
			forced: { value: true, by: 'Gemeente Amsterdam', reason: 'Wettelijke kennisgeving' },
		})

		expect(cell.forcedBy).toBe('Gemeente Amsterdam')
		expect(cell.reason).toBe('Wettelijke kennisgeving')
	})

	it('can force a channel OFF as well as on', () => {
		// Forcing is about removing the choice, not about the answer being
		// yes. A resolver that read forced as "always on" would switch on a
		// channel an administrator had forbidden.
		const cell = resolvePreference({ appDefault: true, personalValue: true, forced: { value: false } })

		expect(cell.value).toBe(false)
		expect(cell.editable).toBe(false)
	})

	it('leaves every other cell editable, which is the control', () => {
		// A resolver that locked everything would pass the tests above and
		// make the whole screen read-only.
		expect(resolvePreference({ appDefault: true }).editable).toBe(true)
	})
})

describe('whether a channel can carry this at all', () => {
	it('says unconfigured with the instance reason', () => {
		const state = channelAvailability({
			channel: { id: 'sms', configured: false, unconfiguredReason: 'No SMS gateway is set up' },
		})

		expect(state.usable).toBe(false)
		expect(state.cause).toBe('unconfigured')
		expect(state.reason).toBe('No SMS gateway is set up')
	})

	it('says refused, with the rule, rather than reading as a gap', () => {
		// An internal kind addressed to somebody outside the organisation.
		// "No channels available" would read as a configuration gap somebody
		// should fix, when it is a rule working correctly.
		const state = channelAvailability({
			channel: { id: 'mail', configured: true },
			refusal: { reason: 'An internal notice is not sent to an external recipient' },
		})

		expect(state.usable).toBe(false)
		expect(state.cause).toBe('refused')
		expect(state.reason).toContain('internal notice')
	})

	it('prefers the refusal when a channel is both unconfigured and refused', () => {
		// The more specific answer, and the one worth reading: fixing the
		// configuration would not change the outcome.
		const state = channelAvailability({
			channel: { id: 'sms', configured: false, unconfiguredReason: 'No gateway' },
			refusal: { reason: 'Not for this recipient' },
		})

		expect(state.cause).toBe('refused')
	})

	it('says usable when it is, which is the control', () => {
		expect(channelAvailability({ channel: { id: 'mail', configured: true } }).usable).toBe(true)
	})
})
