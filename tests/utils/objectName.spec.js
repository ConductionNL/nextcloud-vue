/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the OpenRegister object-name helpers.
 */
import { objectDisplayName, objectFieldValue } from '../../src/utils/objectName.js'

describe('objectDisplayName', () => {
	it('prefers @self.name — the backend’s derived display name', () => {
		// A Barn's display property is `name`, a Cow's may differ; @self.name is right
		// for every schema, so it wins even when a top-level `name` is also present.
		const obj = { '@self': { name: 'De Grote Schuur' }, name: 'ignored-lower-priority' }
		expect(objectDisplayName(obj)).toBe('De Grote Schuur')
	})

	it('falls back to top-level fields for objects with no envelope', () => {
		expect(objectDisplayName({ name: 'Betty' })).toBe('Betty')
		expect(objectDisplayName({ title: 'Untitled Case' })).toBe('Untitled Case')
	})

	it('coerces a numeric id rather than returning empty', () => {
		expect(objectDisplayName({ id: 42 })).toBe('42')
	})

	it('returns an empty string for nothing nameable', () => {
		expect(objectDisplayName({})).toBe('')
		expect(objectDisplayName(null)).toBe('')
		expect(objectDisplayName({ '@self': { name: '   ' } })).toBe('')
	})
})

describe('objectFieldValue', () => {
	it('reads a top-level field', () => {
		expect(objectFieldValue({ name: 'Betty' }, 'name')).toBe('Betty')
	})

	it('falls back to @self for a flat key the object lacks at the top level', () => {
		expect(objectFieldValue({ '@self': { owner: 'admin' } }, 'owner')).toBe('admin')
	})

	it('lets a top-level value win over @self', () => {
		expect(objectFieldValue({ name: 'top', '@self': { name: 'self' } }, 'name')).toBe('top')
	})

	it('walks dot-notation without touching @self', () => {
		expect(objectFieldValue({ address: { city: 'Baarn' } }, 'address.city')).toBe('Baarn')
	})

	it('returns undefined for a missing field', () => {
		expect(objectFieldValue({ '@self': {} }, 'nope')).toBeUndefined()
		expect(objectFieldValue(null, 'name')).toBeUndefined()
	})
})

/**
 * A property called `name` is not necessarily a string.
 *
 * Haal Centraal naming — the Dutch government standard for person records —
 * gives a person `name: { givenNames, namePrefix, surname }`. Every chain in
 * this library that picked "the first truthy name-ish key" therefore returned
 * that OBJECT as the display label, and it rendered as `[object Object]`
 * wherever a name belonged.
 *
 * Measured on a dossiq `brpPerson` row: `name` is the structured block,
 * `displayName` is "Stephan Janssen", and `@self.name` — the display name
 * OpenRegister derived for exactly this purpose — is "Stephan Janssen" too.
 * The right answer was one candidate away the whole time.
 */
describe('objectDisplayName — a structured name is not a label', () => {
	const HAAL_CENTRAAL = {
		id: 'person-1',
		name: { givenNames: 'Stephan', surname: 'Janssen' },
		displayName: 'Stephan Janssen',
		'@self': { id: 'person-1', name: 'Stephan Janssen' },
	}

	it('prefers the backend\'s derived @self.name over a structured name block', () => {
		expect(objectDisplayName(HAAL_CENTRAAL)).toBe('Stephan Janssen')
	})

	it('never returns a non-string', () => {
		expect(typeof objectDisplayName(HAAL_CENTRAAL)).toBe('string')
	})

	it('falls through a structured name to displayName when there is no envelope', () => {
		// An object handed over outside an OpenRegister response — a picker
		// option built from a raw record, a test fixture — has no `@self`.
		expect(objectDisplayName({
			id: 'person-1',
			name: { givenNames: 'Stephan', surname: 'Janssen' },
			displayName: 'Stephan Janssen',
		})).toBe('Stephan Janssen')
	})

	it('falls back to the id rather than an object when nothing nameable is a string', () => {
		expect(objectDisplayName({ id: 'person-1', name: { surname: 'Janssen' } })).toBe('person-1')
	})

	it('still answers the legacy keys the hand-rolled chains covered', () => {
		expect(objectDisplayName({ id: 'x', naam: 'Achternaam' })).toBe('Achternaam')
		expect(objectDisplayName({ id: 'x', label: 'A label' })).toBe('A label')
		expect(objectDisplayName({ id: 'x', identifier: 'ZAAK-1' })).toBe('ZAAK-1')
	})

	it('an empty or whitespace-only name is not a name', () => {
		expect(objectDisplayName({ id: 'x', name: '   ' })).toBe('x')
	})
})
