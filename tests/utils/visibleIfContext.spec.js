/**
 * Tests for the visibleIfContext utility.
 *
 * Covers `passesContextPredicates` — the evaluator that resolves
 * dot-path keys from a `visibleIf` block against `manifest.runtime`
 * data and evaluates predicate expressions.
 *
 * Operators tested: scalar shorthand, eq, in, notIn, gt, gte, lt, lte,
 * truthy. Also covers edge cases: missing runtime, missing path,
 * multiple conditions (implicit AND), and coexistence with the reserved
 * `appInstalled` key.
 */

const { passesContextPredicates } = require('../../src/utils/visibleIfContext.js')

describe('passesContextPredicates', () => {
	// ── No-op cases ─────────────────────────────────────────────────────────

	describe('no-op cases', () => {
		it('returns true when visibleIf is undefined', () => {
			expect(passesContextPredicates(undefined, {})).toBe(true)
		})

		it('returns true when visibleIf is null', () => {
			expect(passesContextPredicates(null, {})).toBe(true)
		})

		it('returns true when visibleIf is not an object (e.g. string)', () => {
			expect(passesContextPredicates('appInstalled', {})).toBe(true)
		})

		it('returns true when visibleIf has no context-path keys (only appInstalled)', () => {
			expect(passesContextPredicates({ appInstalled: 'mydash' }, {})).toBe(true)
		})

		it('returns true when visibleIf is an empty object', () => {
			expect(passesContextPredicates({}, null)).toBe(true)
		})
	})

	// ── Fail-safe: no runtime ────────────────────────────────────────────────

	describe('fail-safe: context predicates with no runtime', () => {
		it('returns false when runtime is null and context predicates are declared', () => {
			expect(passesContextPredicates({ 'user.primaryRole': 'hr' }, null)).toBe(false)
		})

		it('returns false when runtime is undefined and context predicates are declared', () => {
			expect(passesContextPredicates({ 'user.primaryRole': 'hr' }, undefined)).toBe(false)
		})
	})

	// ── Scalar shorthand (implicit eq) ───────────────────────────────────────

	describe('scalar shorthand (implicit eq)', () => {
		it('returns true when a string path matches the expected string value', () => {
			const runtime = { user: { primaryRole: 'compliance-officer' } }
			expect(passesContextPredicates({ 'user.primaryRole': 'compliance-officer' }, runtime)).toBe(true)
		})

		it('returns false when the string value does not match', () => {
			const runtime = { user: { primaryRole: 'employee' } }
			expect(passesContextPredicates({ 'user.primaryRole': 'compliance-officer' }, runtime)).toBe(false)
		})

		it('handles boolean true shorthand', () => {
			const runtime = { user: { isOverdueOnMandatoryTraining: true } }
			expect(passesContextPredicates({ 'user.isOverdueOnMandatoryTraining': true }, runtime)).toBe(true)
		})

		it('handles boolean false shorthand', () => {
			const runtime = { user: { isOverdueOnMandatoryTraining: false } }
			expect(passesContextPredicates({ 'user.isOverdueOnMandatoryTraining': true }, runtime)).toBe(false)
		})

		it('returns false when the path resolves to undefined', () => {
			const runtime = { user: {} }
			expect(passesContextPredicates({ 'user.primaryRole': 'hr' }, runtime)).toBe(false)
		})

		it('returns false when an intermediate path segment is missing', () => {
			const runtime = {}
			expect(passesContextPredicates({ 'user.primaryRole': 'hr' }, runtime)).toBe(false)
		})

		it('handles null shorthand (value must be null)', () => {
			const runtime = { user: { primaryRole: null } }
			expect(passesContextPredicates({ 'user.primaryRole': null }, runtime)).toBe(true)
		})
	})

	// ── eq operator ─────────────────────────────────────────────────────────

	describe('eq operator', () => {
		it('passes when value strictly equals eq operand', () => {
			const runtime = { user: { primaryRole: 'hr-coordinator' } }
			expect(passesContextPredicates({ 'user.primaryRole': { eq: 'hr-coordinator' } }, runtime)).toBe(true)
		})

		it('fails when value does not equal eq operand', () => {
			const runtime = { user: { primaryRole: 'employee' } }
			expect(passesContextPredicates({ 'user.primaryRole': { eq: 'hr-coordinator' } }, runtime)).toBe(false)
		})
	})

	// ── in operator ──────────────────────────────────────────────────────────

	describe('in operator', () => {
		it('passes when value is in the in array', () => {
			const runtime = { user: { primaryRole: 'compliance-officer' } }
			const visibleIf = { 'user.primaryRole': { in: ['compliance-officer', 'hr-coordinator'] } }
			expect(passesContextPredicates(visibleIf, runtime)).toBe(true)
		})

		it('fails when value is not in the in array', () => {
			const runtime = { user: { primaryRole: 'employee' } }
			const visibleIf = { 'user.primaryRole': { in: ['compliance-officer', 'hr-coordinator'] } }
			expect(passesContextPredicates(visibleIf, runtime)).toBe(false)
		})

		it('fails when value is undefined and not in the array', () => {
			const runtime = { user: {} }
			const visibleIf = { 'user.primaryRole': { in: ['compliance-officer'] } }
			expect(passesContextPredicates(visibleIf, runtime)).toBe(false)
		})
	})

	// ── notIn operator ───────────────────────────────────────────────────────

	describe('notIn operator', () => {
		it('passes when value is NOT in the notIn array', () => {
			const runtime = { user: { primaryRole: 'employee' } }
			const visibleIf = { 'user.primaryRole': { notIn: ['compliance-officer', 'hr-coordinator'] } }
			expect(passesContextPredicates(visibleIf, runtime)).toBe(true)
		})

		it('fails when value IS in the notIn array', () => {
			const runtime = { user: { primaryRole: 'compliance-officer' } }
			const visibleIf = { 'user.primaryRole': { notIn: ['compliance-officer', 'hr-coordinator'] } }
			expect(passesContextPredicates(visibleIf, runtime)).toBe(false)
		})
	})

	// ── gt / gte / lt / lte operators ───────────────────────────────────────

	describe('numeric comparison operators', () => {
		it('gt: passes when value > threshold', () => {
			const runtime = { user: { overdueCourseCount: 5 } }
			expect(passesContextPredicates({ 'user.overdueCourseCount': { gt: 0 } }, runtime)).toBe(true)
		})

		it('gt: fails when value <= threshold', () => {
			const runtime = { user: { overdueCourseCount: 0 } }
			expect(passesContextPredicates({ 'user.overdueCourseCount': { gt: 0 } }, runtime)).toBe(false)
		})

		it('gte: passes when value >= threshold', () => {
			const runtime = { user: { overdueCourseCount: 3 } }
			expect(passesContextPredicates({ 'user.overdueCourseCount': { gte: 3 } }, runtime)).toBe(true)
		})

		it('lt: passes when value < threshold', () => {
			const runtime = { user: { score: 40 } }
			expect(passesContextPredicates({ 'user.score': { lt: 50 } }, runtime)).toBe(true)
		})

		it('lte: passes when value <= threshold', () => {
			const runtime = { user: { score: 50 } }
			expect(passesContextPredicates({ 'user.score': { lte: 50 } }, runtime)).toBe(true)
		})

		it('lte: fails when value > threshold', () => {
			const runtime = { user: { score: 51 } }
			expect(passesContextPredicates({ 'user.score': { lte: 50 } }, runtime)).toBe(false)
		})
	})

	describe('ISO date string comparison via gt/lt', () => {
		it('passes gt when date value is after the threshold date', () => {
			const runtime = { user: { lastLoginDate: '2026-05-01' } }
			expect(passesContextPredicates({ 'user.lastLoginDate': { gt: '2026-01-01' } }, runtime)).toBe(true)
		})

		it('fails gt when date value is before the threshold date', () => {
			const runtime = { user: { lastLoginDate: '2025-12-01' } }
			expect(passesContextPredicates({ 'user.lastLoginDate': { gt: '2026-01-01' } }, runtime)).toBe(false)
		})
	})

	// ── truthy operator ──────────────────────────────────────────────────────

	describe('truthy operator', () => {
		it('passes when truthy: true and value is truthy', () => {
			const runtime = { user: { isOverdueOnMandatoryTraining: true } }
			expect(passesContextPredicates({ 'user.isOverdueOnMandatoryTraining': { truthy: true } }, runtime)).toBe(true)
		})

		it('fails when truthy: true but value is falsy', () => {
			const runtime = { user: { isOverdueOnMandatoryTraining: false } }
			expect(passesContextPredicates({ 'user.isOverdueOnMandatoryTraining': { truthy: true } }, runtime)).toBe(false)
		})

		it('passes when truthy: false and value is falsy', () => {
			const runtime = { user: { isOverdueOnMandatoryTraining: false } }
			expect(passesContextPredicates({ 'user.isOverdueOnMandatoryTraining': { truthy: false } }, runtime)).toBe(true)
		})

		it('fails when truthy: false but value is truthy', () => {
			const runtime = { user: { isOverdueOnMandatoryTraining: 1 } }
			expect(passesContextPredicates({ 'user.isOverdueOnMandatoryTraining': { truthy: false } }, runtime)).toBe(false)
		})
	})

	// ── Implicit AND across multiple keys ────────────────────────────────────

	describe('implicit AND across multiple predicate keys', () => {
		it('passes when all conditions are satisfied', () => {
			const runtime = { user: { primaryRole: 'compliance-officer', isActive: true } }
			const visibleIf = {
				'user.primaryRole': { in: ['compliance-officer', 'hr-coordinator'] },
				'user.isActive': true,
			}
			expect(passesContextPredicates(visibleIf, runtime)).toBe(true)
		})

		it('fails when one condition fails', () => {
			const runtime = { user: { primaryRole: 'compliance-officer', isActive: false } }
			const visibleIf = {
				'user.primaryRole': { in: ['compliance-officer', 'hr-coordinator'] },
				'user.isActive': true,
			}
			expect(passesContextPredicates(visibleIf, runtime)).toBe(false)
		})
	})

	// ── Coexistence with appInstalled ────────────────────────────────────────

	describe('coexistence with reserved appInstalled key', () => {
		it('ignores appInstalled and evaluates only context-path keys', () => {
			// appInstalled is handled by CnAppNav separately; passesContextPredicates
			// must skip it so it never influences the result here.
			const runtime = { user: { primaryRole: 'hr-coordinator' } }
			const visibleIf = {
				appInstalled: 'mydash',
				'user.primaryRole': { in: ['compliance-officer', 'hr-coordinator'] },
			}
			expect(passesContextPredicates(visibleIf, runtime)).toBe(true)
		})

		it('returns true when only appInstalled is set (no context-path keys)', () => {
			expect(passesContextPredicates({ appInstalled: 'mydash' }, null)).toBe(true)
		})
	})

	// ── Deep nested paths ────────────────────────────────────────────────────

	describe('deep nested paths', () => {
		it('resolves three-level dot path', () => {
			const runtime = { user: { profile: { department: 'legal' } } }
			expect(passesContextPredicates({ 'user.profile.department': 'legal' }, runtime)).toBe(true)
		})

		it('returns false when intermediate segment is not an object', () => {
			const runtime = { user: { profile: 'flat-string' } }
			expect(passesContextPredicates({ 'user.profile.department': 'legal' }, runtime)).toBe(false)
		})
	})
})
