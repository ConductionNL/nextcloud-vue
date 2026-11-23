/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A preference set for everything, or for one case domain or record type.
 *
 * The failure each case guards is a preference that silently applies somewhere
 * it was not meant to, or stops applying somewhere it was: both leave somebody
 * either missing a notification or drowning in one, and neither shows up on
 * screen as anything but a setting that looks right.
 */

const {
	GLOBAL_SCOPE,
	flattenForScope,
	pruneToCatalogue,
	scopeRowsFor,
	setValue,
	valueForScope,
} = require('../../src/utils/preferenceScopes.js')

const VALUES = {
	'term-expires': {
		mail: { [GLOBAL_SCOPE]: false, bezwaar: true },
		sms: { [GLOBAL_SCOPE]: true },
	},
}

describe('which row applies', () => {
	it('uses the narrower row where it applies', () => {
		expect(valueForScope({ values: VALUES, eventId: 'term-expires', channelId: 'mail', scope: 'bezwaar' }))
			.toEqual({ value: true, scope: 'bezwaar' })
	})

	it('uses the global row everywhere else', () => {
		// A scope that replaced the global row would silence every other
		// domain the moment somebody narrowed one.
		expect(valueForScope({ values: VALUES, eventId: 'term-expires', channelId: 'mail', scope: 'wob' }))
			.toEqual({ value: false, scope: GLOBAL_SCOPE })
	})

	it('treats an absent scoped row as unanswered, not as a scoped no', () => {
		expect(valueForScope({ values: VALUES, eventId: 'term-expires', channelId: 'sms', scope: 'bezwaar' }))
			.toEqual({ value: true, scope: GLOBAL_SCOPE })
	})

	it('answers null when nothing is set at all', () => {
		// So the caller can fall through to the group and the app default
		// rather than reading an unset row as an explicit false.
		expect(valueForScope({ values: {}, eventId: 'x', channelId: 'mail' }))
			.toEqual({ value: null, scope: GLOBAL_SCOPE })
	})
})

describe('the rows a screen shows', () => {
	it('lists the global row first, then the scopes by name', () => {
		const rows = scopeRowsFor({ values: VALUES, eventId: 'term-expires' })

		expect(rows.map((row) => row.scope)).toEqual([GLOBAL_SCOPE, 'bezwaar'])
		expect(rows[0].isGlobal).toBe(true)
	})

	it('keeps the global row even when every value is scoped', () => {
		// It is the row somebody widens back to. A screen that hid it would
		// leave them unable to undo a narrowing.
		const rows = scopeRowsFor({
			values: { e: { mail: { bezwaar: true } } },
			eventId: 'e',
		})

		expect(rows[0].scope).toBe(GLOBAL_SCOPE)
	})
})

describe('setting a value', () => {
	it('does not disturb the others', () => {
		const next = setValue({ values: VALUES, eventId: 'term-expires', channelId: 'mail', scope: 'wob', value: true })

		expect(next['term-expires'].mail).toEqual({ [GLOBAL_SCOPE]: false, bezwaar: true, wob: true })
		expect(next['term-expires'].sms).toEqual({ [GLOBAL_SCOPE]: true })
	})

	it('returns a new object rather than mutating', () => {
		// The store hands its state to a component as props. Mutating would
		// change what is rendered before the write that justifies it has
		// succeeded.
		const next = setValue({ values: VALUES, eventId: 'term-expires', channelId: 'mail', value: true })

		expect(VALUES['term-expires'].mail[GLOBAL_SCOPE]).toBe(false)
		expect(next).not.toBe(VALUES)
	})

	it('clears a row rather than storing false, when the value is null', () => {
		// Clearing means "follow whatever is above me". A row left at false
		// would keep overriding a group default somebody has since changed.
		const next = setValue({ values: VALUES, eventId: 'term-expires', channelId: 'mail', scope: 'bezwaar', value: null })

		expect(next['term-expires'].mail.bezwaar).toBeUndefined()
		expect(next['term-expires'].mail[GLOBAL_SCOPE]).toBe(false)
	})
})

describe('pruning to the catalogue', () => {
	it('drops an event that no longer exists, and says which', () => {
		// Keeping it silently grows a store of rows nobody can see or delete,
		// and on the day the name is reused it comes back to life carrying a
		// decision made years ago about something else.
		const { kept, pruned } = pruneToCatalogue({
			values: { ...VALUES, 'gone-event': { mail: { [GLOBAL_SCOPE]: true } } },
			catalogue: [{ id: 'term-expires' }],
		})

		expect(Object.keys(kept)).toEqual(['term-expires'])
		expect(pruned).toEqual(['gone-event'])
	})

	it('keeps everything when the catalogue still has it, which is the control', () => {
		// Without this, a prune that dropped everything would pass the test
		// above and quietly wipe a person's settings.
		const { kept, pruned } = pruneToCatalogue({
			values: VALUES,
			catalogue: [{ id: 'term-expires' }],
		})

		expect(kept).toEqual(VALUES)
		expect(pruned).toEqual([])
	})
})

describe('what the matrix renders', () => {
	it('flattens one scope at a time', () => {
		// The component takes { event: { channel: boolean } } and knows
		// nothing about scopes, which is what keeps the matrix a matrix.
		expect(flattenForScope({ values: VALUES, scope: 'bezwaar' }))
			.toEqual({ 'term-expires': { mail: true, sms: true } })
	})

	it('shows the global values on the global scope', () => {
		expect(flattenForScope({ values: VALUES }))
			.toEqual({ 'term-expires': { mail: false, sms: true } })
	})

	it('leaves an unset cell out rather than rendering it as false', () => {
		// An unset cell has to fall through to the group and the default. A
		// false here would override both.
		expect(flattenForScope({ values: { e: { mail: {} } } })).toEqual({})
	})
})
