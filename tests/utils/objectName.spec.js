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
