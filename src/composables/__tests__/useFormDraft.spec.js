/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * What the draft store keeps, and the four times it deliberately keeps nothing.
 *
 * 🔴 THE ASSERTIONS THAT CARRY THIS are the refusals, not the round trip. A
 * store that hands back whatever it was given is easy to write and passes any
 * test that only saves and loads. What makes this safe to put in front of a
 * municipal service desk is that it declines: an expired draft, a draft from
 * another user, a draft older than the record it belongs to, and a corrupted
 * entry all read as "no draft" rather than as something to offer somebody.
 *
 * 🔴 AND THAT BLOCKED STORAGE IS NOT A CRASH. `localStorage` throws in a
 * private window and with site data blocked. Losing the recovery is a small
 * failure; a dialog that will not open because saving a draft threw is a large
 * one, and it would be this library's fault in somebody else's app.
 */

import {
	clearDraft,
	DRAFT_MAX_AGE_MS,
	draftKey,
	readDraft,
	writeDraft,
} from '../useFormDraft.js'

describe('draftKey', () => {
	it('separates two users on one browser profile', () => {
		// 🔴 A shared profile at a counter is the ordinary case in a
		// municipality, and a key without the user hands the next person what
		// the last one typed.
		const a = draftKey({ appId: 'dossiq', schema: 'case', objectId: 'new', userId: 'anne' })
		const b = draftKey({ appId: 'dossiq', schema: 'case', objectId: 'new', userId: 'bram' })

		expect(a).not.toBe(b)
		expect(a).toContain('anne')
	})

	it('separates two forms and two records', () => {
		const base = { appId: 'dossiq', userId: 'anne' }

		expect(draftKey({ ...base, schema: 'case' }))
			.not.toBe(draftKey({ ...base, schema: 'task' }))
		expect(draftKey({ ...base, schema: 'case', objectId: 'a' }))
			.not.toBe(draftKey({ ...base, schema: 'case', objectId: 'b' }))
	})

	it('is stable and prefixed, so a sweep can find every draft', () => {
		const key = draftKey({ appId: 'dossiq', schema: 'case', userId: 'anne' })

		expect(key).toBe(draftKey({ appId: 'dossiq', schema: 'case', userId: 'anne' }))
		expect(key.startsWith('cn-form-draft:')).toBe(true)
		// A new record and an absent objectId are the same thing.
		expect(key).toContain(':new:')
	})
})

describe('the draft round trip', () => {
	beforeEach(() => window.localStorage.clear())

	it('gives back what was typed', () => {
		const key = draftKey({ appId: 'a', schema: 's', userId: 'u' })

		expect(writeDraft(key, { title: 'Dakkapel', note: 'half getypt' })).toBe(true)

		const draft = readDraft(key)
		expect(draft.values).toEqual({ title: 'Dakkapel', note: 'half getypt' })
		expect(typeof draft.savedAt).toBe('number')
	})

	it('answers null when there is nothing', () => {
		// The control for every refusal below: "null" has to be reachable for
		// a reason other than the reader never returning anything.
		expect(readDraft(draftKey({ appId: 'a', schema: 's', userId: 'u' }))).toBeNull()
	})

	it('forgets a draft on request, and says nothing afterwards', () => {
		const key = draftKey({ appId: 'a', schema: 's', userId: 'u' })
		writeDraft(key, { title: 'x' })

		clearDraft(key)

		expect(readDraft(key)).toBeNull()
	})
})

describe('the four refusals', () => {
	beforeEach(() => window.localStorage.clear())

	it('refuses a draft older than seven days, and removes it', () => {
		const key = draftKey({ appId: 'a', schema: 's', userId: 'u' })
		const now = Date.now()
		writeDraft(key, { title: 'vorige maand' }, (now - DRAFT_MAX_AGE_MS - 1000))

		expect(readDraft(key, { now })).toBeNull()
		// Swept rather than left to be refused again on every open.
		expect(window.localStorage.getItem(key)).toBeNull()

		// The boundary from the other side, against the same limit: an
		// off-by-one here silently halves or doubles how long a draft lives.
		writeDraft(key, { title: 'gisteren' }, (now - DRAFT_MAX_AGE_MS + 1000))
		expect(readDraft(key, { now })).not.toBeNull()
	})

	it('refuses a draft the record has moved past', () => {
		const key = draftKey({ appId: 'a', schema: 's', userId: 'u' })
		const now = Date.now()
		writeDraft(key, { title: 'mijn versie' }, now)

		// 🔴 A colleague saved after this draft was written. Offering the
		// draft on top invites overwriting them without being told.
		expect(readDraft(key, { objectUpdated: new Date(now + 60000).toISOString(), now })).toBeNull()

		// The control: a record saved BEFORE the draft does not refuse it.
		writeDraft(key, { title: 'mijn versie' }, now)
		expect(readDraft(key, { objectUpdated: new Date(now - 60000).toISOString(), now })).not.toBeNull()
	})

	it('refuses an entry it cannot parse, and removes it', () => {
		const key = draftKey({ appId: 'a', schema: 's', userId: 'u' })
		window.localStorage.setItem(key, 'not json at all')

		expect(readDraft(key)).toBeNull()
		// Nothing here can repair it, and half a form is worse than none.
		expect(window.localStorage.getItem(key)).toBeNull()
	})

	it('refuses an entry with no savedAt or no values', () => {
		const key = draftKey({ appId: 'a', schema: 's', userId: 'u' })

		window.localStorage.setItem(key, JSON.stringify({ values: { a: 1 } }))
		expect(readDraft(key)).toBeNull()

		window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now() }))
		expect(readDraft(key)).toBeNull()
	})
})

describe('when storage is not available', () => {
	/** @type {object} */
	let original

	beforeEach(() => {
		original = Object.getOwnPropertyDescriptor(window, 'localStorage')
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			get() {
				throw new Error('The operation is insecure.')
			},
		})
	})

	afterEach(() => Object.defineProperty(window, 'localStorage', original))

	it('reads as no draft rather than throwing', () => {
		// A private window, or site data blocked. The dialog still has to open.
		expect(() => readDraft('cn-form-draft:a:s:new:u')).not.toThrow()
		expect(readDraft('cn-form-draft:a:s:new:u')).toBeNull()
	})

	it('reports a write it could not make, rather than claiming success', () => {
		// 🔴 The indicator reads this. Saying "Saved" about a draft that is not
		// stored is the exact class of defect this library has been paying
		// down, in the one place a user is trusting it.
		expect(writeDraft('cn-form-draft:a:s:new:u', { a: 1 })).toBe(false)
	})

	it('forgets without throwing', () => {
		expect(() => clearDraft('cn-form-draft:a:s:new:u')).not.toThrow()
	})
})
