/**
 * Unit tests for eventKeys.js
 *
 * Verifies event key constants and builder functions match the OR backend
 * event-string format defined in PushEvents.php.
 */

import {
	OR_OBJECT_PREFIX,
	OR_COLLECTION_PREFIX,
	buildObjectKey,
	buildCollectionKey,
} from '../../../src/store/liveUpdates/eventKeys.js'

describe('eventKeys', () => {
	describe('constants', () => {
		it('OR_OBJECT_PREFIX equals or-object', () => {
			expect(OR_OBJECT_PREFIX).toBe('or-object')
		})

		it('OR_COLLECTION_PREFIX equals or-collection', () => {
			expect(OR_COLLECTION_PREFIX).toBe('or-collection')
		})
	})

	describe('buildObjectKey', () => {
		it('builds correct event key for a UUID', () => {
			expect(buildObjectKey('uuid-abc')).toBe('or-object-uuid-abc')
		})

		it('handles real-world UUIDs', () => {
			const uuid = '550e8400-e29b-41d4-a716-446655440000'
			expect(buildObjectKey(uuid)).toBe(`or-object-${uuid}`)
		})
	})

	describe('buildCollectionKey', () => {
		it('builds correct event key for register+schema slugs', () => {
			expect(buildCollectionKey('zaken', 'meldingen')).toBe('or-collection-zaken-meldingen')
		})

		it('handles slugs with hyphens', () => {
			expect(buildCollectionKey('my-register', 'my-schema')).toBe('or-collection-my-register-my-schema')
		})
	})
})
