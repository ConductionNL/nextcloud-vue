/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

import {
	orderForReplay,
	delayForAttempt,
	canRetry,
	classifyConflict,
	isConflictRetryable,
	nextState,
	resolveConflictChoice,
	diffVersions,
	BACKOFF_SCHEDULE_MS,
	MAX_ATTEMPTS,
} from '../../../src/integrations/offline/syncQueueEngine.js'

describe('syncQueueEngine', () => {
	describe('orderForReplay', () => {
		it('orders FIFO by queuedAt and drops terminal ops', () => {
			const rows = [
				{ id: 'b', queuedAt: '2026-01-02', status: 'pending' },
				{ id: 'a', queuedAt: '2026-01-01', status: 'pending' },
				{ id: 'c', queuedAt: '2026-01-03', status: 'synced' },
				{ id: 'd', queuedAt: '2026-01-00', status: 'failed' },
			]
			expect(orderForReplay(rows).map((r) => r.id)).toEqual(['a', 'b'])
		})

		it('breaks ties on id deterministically', () => {
			const rows = [
				{ id: 'z', queuedAt: 't', status: 'pending' },
				{ id: 'a', queuedAt: 't', status: 'pending' },
			]
			expect(orderForReplay(rows).map((r) => r.id)).toEqual(['a', 'z'])
		})
	})

	describe('backoff', () => {
		it('returns the scheduled delay and clamps beyond the schedule', () => {
			expect(delayForAttempt(0)).toBe(BACKOFF_SCHEDULE_MS[0])
			expect(delayForAttempt(99)).toBe(BACKOFF_SCHEDULE_MS[BACKOFF_SCHEDULE_MS.length - 1])
		})

		it('canRetry until MAX_ATTEMPTS', () => {
			expect(canRetry(MAX_ATTEMPTS - 1)).toBe(true)
			expect(canRetry(MAX_ATTEMPTS)).toBe(false)
		})
	})

	describe('classifyConflict', () => {
		it('maps 403/404/409 to conflict types', () => {
			expect(classifyConflict(403)).toBe('permission_lost')
			expect(classifyConflict(404)).toBe('deleted_remote')
			expect(classifyConflict(409, { id: 1 })).toBe('concurrent_edit')
			expect(classifyConflict(409, {})).toBe('deleted_remote')
			expect(classifyConflict(200)).toBeNull()
		})

		it('permission_lost is not retryable, others are', () => {
			expect(isConflictRetryable('permission_lost')).toBe(false)
			expect(isConflictRetryable('concurrent_edit')).toBe(true)
		})
	})

	describe('nextState', () => {
		const now = new Date('2026-06-26T00:00:00.000Z')

		it('marks 2xx as synced', () => {
			const { patch } = nextState({ attemptCount: 0 }, { statusCode: 201, now })
			expect(patch.status).toBe('synced')
			expect(patch.syncedAt).toBe(now.toISOString())
		})

		it('marks 409 with a body as conflict', () => {
			const { patch, conflictType } = nextState({ attemptCount: 0 }, { statusCode: 409, serverObject: { v: 2 }, now })
			expect(patch.status).toBe('conflict')
			expect(conflictType).toBe('concurrent_edit')
		})

		it('marks 403 as failed (permission_lost)', () => {
			const { patch } = nextState({ attemptCount: 0 }, { statusCode: 403, now })
			expect(patch.status).toBe('failed')
		})

		it('retries a 5xx with a backoff while attempts remain', () => {
			const { patch, nextDelayMs } = nextState({ attemptCount: 0 }, { statusCode: 503, now })
			expect(patch.status).toBe('pending')
			expect(nextDelayMs).toBe(BACKOFF_SCHEDULE_MS[1])
		})

		it('fails a transient error once attempts are exhausted', () => {
			const { patch } = nextState({ attemptCount: MAX_ATTEMPTS }, { statusCode: 0, now })
			expect(patch.status).toBe('failed')
		})
	})

	describe('resolveConflictChoice', () => {
		it('requeues on client_wins', () => {
			const { patch, requeue } = resolveConflictChoice('client_wins')
			expect(requeue).toBe(true)
			expect(patch.status).toBe('pending')
			expect(patch.forceUpdate).toBe(true)
		})

		it('discards on server_wins', () => {
			const { patch, requeue } = resolveConflictChoice('server_wins')
			expect(requeue).toBe(false)
			expect(patch.status).toBe('synced')
		})

		it('throws on an unknown resolution', () => {
			expect(() => resolveConflictChoice('nope')).toThrow()
		})
	})

	describe('diffVersions', () => {
		it('returns one entry per differing field, sorted by field', () => {
			const diff = diffVersions({ a: 1, b: 2, c: 3 }, { a: 1, b: 9, d: 4 })
			expect(diff).toEqual([
				{ field: 'b', client: 2, server: 9 },
				{ field: 'c', client: 3, server: null },
				{ field: 'd', client: null, server: 4 },
			])
		})
	})
})
