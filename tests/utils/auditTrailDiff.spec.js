/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for `foldAuditTrailEntries` — folding a range of OpenRegister
 * audit-trail entries' per-field `changed` diffs into a single
 * before/after state pair for CnVersionHistory's range compare.
 */

const { foldAuditTrailEntries } = require('../../src/utils/auditTrailDiff.js')

describe('foldAuditTrailEntries', () => {
	it('folds a single entry to its own changed map', () => {
		const entry = { changed: { status: { old: 'draft', new: 'published' } } }
		expect(foldAuditTrailEntries([entry])).toEqual({
			oldState: { status: 'draft' },
			newState: { status: 'published' },
		})
	})

	it('keeps the first old and the last new when a field is touched by multiple entries', () => {
		const entry1 = { changed: { status: { old: 'draft', new: 'review' } } }
		const entry2 = { changed: { status: { old: 'review', new: 'published' } } }
		expect(foldAuditTrailEntries([entry1, entry2])).toEqual({
			oldState: { status: 'draft' },
			newState: { status: 'published' },
		})
	})

	it('unions fields touched across different entries in the range', () => {
		const entry1 = { changed: { name: { old: 'A', new: 'B' } } }
		const entry2 = { changed: { email: { old: 'a@x.nl', new: 'b@x.nl' } } }
		expect(foldAuditTrailEntries([entry1, entry2])).toEqual({
			oldState: { name: 'A', email: 'a@x.nl' },
			newState: { name: 'B', email: 'b@x.nl' },
		})
	})

	it('returns empty states for an empty array', () => {
		expect(foldAuditTrailEntries([])).toEqual({ oldState: {}, newState: {} })
	})

	it('returns empty states when given a non-array', () => {
		expect(foldAuditTrailEntries(undefined)).toEqual({ oldState: {}, newState: {} })
		expect(foldAuditTrailEntries(null)).toEqual({ oldState: {}, newState: {} })
	})

	it('skips null/malformed entries without throwing', () => {
		const entries = [
			null,
			{ id: '1' }, // no changed
			{ changed: null },
			{ changed: 'not-an-object' },
			{ changed: { status: { old: 'draft', new: 'published' } } },
		]
		expect(() => foldAuditTrailEntries(entries)).not.toThrow()
		expect(foldAuditTrailEntries(entries)).toEqual({
			oldState: { status: 'draft' },
			newState: { status: 'published' },
		})
	})

	it('skips a field whose delta is malformed but keeps other valid fields in the same entry', () => {
		const entry = {
			changed: {
				status: { old: 'draft', new: 'published' },
				broken: 'not-an-object',
			},
		}
		expect(foldAuditTrailEntries([entry])).toEqual({
			oldState: { status: 'draft' },
			newState: { status: 'published' },
		})
	})

	it('preserves explicit null values in old/new', () => {
		const entry = { changed: { email: { old: 'x@y.nl', new: null } } }
		expect(foldAuditTrailEntries([entry])).toEqual({
			oldState: { email: 'x@y.nl' },
			newState: { email: null },
		})
	})
})
