/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.confirmCreate`: which question, if any, a create with these values asks.
 */
import { createConfirmationFor } from '../../src/utils/createConfirmation.js'

const PUBLIC = { when: { field: 'audience', op: 'eq', value: 'public' }, text: 'Anyone can read this. Publish it?', confirmLabel: 'Publish publicly' }
const PENTEST = {
	when: { all: [{ field: 'audience', op: 'eq', value: 'public' }, { field: 'documentType', op: 'eq', value: 'pentest' }] },
	text: 'Publish this pentest report publicly?',
}

describe('createConfirmationFor', () => {
	it('returns the first entry whose condition holds against the values', () => {
		expect(createConfirmationFor([PENTEST, PUBLIC], { audience: 'public', documentType: 'pentest' })).toBe(PENTEST)
		expect(createConfirmationFor([PENTEST, PUBLIC], { audience: 'public', documentType: 'dpa' })).toBe(PUBLIC)
	})

	it('returns null when nothing holds', () => {
		expect(createConfirmationFor([PENTEST, PUBLIC], { audience: 'named' })).toBeNull()
	})

	it('returns null without rules', () => {
		expect(createConfirmationFor(undefined, { audience: 'public' })).toBeNull()
		expect(createConfirmationFor({}, { audience: 'public' })).toBeNull()
	})

	it('never matches an entry without a condition or a text', () => {
		expect(createConfirmationFor([{ text: 'Always?' }], { audience: 'public' })).toBeNull()
		expect(createConfirmationFor([{ when: PUBLIC.when, text: ' ' }], { audience: 'public' })).toBeNull()
		expect(createConfirmationFor([null, 'x'], { audience: 'public' })).toBeNull()
	})
})
