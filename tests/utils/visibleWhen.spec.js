/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for the shared visibleWhen predicate (#91 Wave 3 — the Wave-1
 * banner shape extracted so manifest actions reuse it). Covers the three
 * evaluation modes (endpoint / OpenRegister source / local object
 * context), the operator set, and the fail-safe default.
 */

import {
	compareVisibleWhen,
	evaluateVisibleWhen,
	evaluateVisibleWhenLocal,
	readVisibleWhenPath,
	VISIBLE_WHEN_OPS,
} from '../../src/utils/visibleWhen.js'

describe('compareVisibleWhen', () => {
	it('eq / neq compare loosely-normalised primitives (JSON round-trip safe)', () => {
		expect(compareVisibleWhen(3, 'eq', 3)).toBe(true)
		expect(compareVisibleWhen('3', 'eq', 3)).toBe(true)
		expect(compareVisibleWhen('a', 'neq', 'b')).toBe(true)
		expect(compareVisibleWhen('a', 'neq', 'a')).toBe(false)
	})

	it('ordering operators coerce both sides to Number', () => {
		expect(compareVisibleWhen(5, 'gt', 3)).toBe(true)
		expect(compareVisibleWhen(3, 'gte', 3)).toBe(true)
		expect(compareVisibleWhen(2, 'lt', 3)).toBe(true)
		expect(compareVisibleWhen(3, 'lte', 3)).toBe(true)
		expect(compareVisibleWhen('x', 'gt', 3)).toBe(false)
	})

	it('unknown operators fall back to eq', () => {
		expect(compareVisibleWhen(1, 'nope', 1)).toBe(true)
	})

	it('exports the operator set', () => {
		expect(VISIBLE_WHEN_OPS).toEqual(['eq', 'neq', 'gt', 'gte', 'lt', 'lte'])
	})
})

describe('readVisibleWhenPath', () => {
	it('reads a dot-path and tolerates missing segments', () => {
		expect(readVisibleWhenPath({ a: { b: 2 } }, 'a.b')).toBe(2)
		// A null segment short-circuits and returns that null (never throws).
		expect(readVisibleWhenPath({ a: null }, 'a.b')).toBeNull()
		expect(readVisibleWhenPath({ a: { b: 2 } }, 'a.z')).toBeUndefined()
		expect(readVisibleWhenPath({ a: 1 }, undefined)).toEqual({ a: 1 })
	})
})

describe('evaluateVisibleWhen', () => {
	afterEach(() => {
		if (global.fetch && global.fetch.mockReset) global.fetch.mockReset()
	})

	it('a null condition is always visible', async () => {
		expect(await evaluateVisibleWhen(null)).toBe(true)
	})

	it('LOCAL mode: evaluates a field against the object context (no request)', async () => {
		const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => {
			throw new Error('should not fetch')
		})
		const cond = { field: 'lifecycleState', op: 'eq', value: 'approved' }
		expect(await evaluateVisibleWhen(cond, { object: { lifecycleState: 'approved' } })).toBe(true)
		expect(await evaluateVisibleWhen(cond, { object: { lifecycleState: 'draft' } })).toBe(false)
		expect(fetchSpy).not.toHaveBeenCalled()
		fetchSpy.mockRestore()
	})

	it('ENDPOINT mode: reads the field off a JSON endpoint body', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ pending: 4 }),
		})
		expect(await evaluateVisibleWhen({ endpoint: '/api/status', field: 'pending', op: 'gt', value: 0 })).toBe(true)
	})

	it('is FAIL-SAFE: a rejected fetch resolves false (hidden), never throws', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('network'))
		expect(await evaluateVisibleWhen({ endpoint: '/api/status', field: 'pending', op: 'gt', value: 0 })).toBe(false)
	})

	it('is FAIL-SAFE: an unusable condition (no endpoint/source/object) resolves false', async () => {
		expect(await evaluateVisibleWhen({ field: 'x', op: 'eq', value: 1 }, {})).toBe(false)
	})
})

/**
 * evaluateVisibleWhenLocal — manifest-form-logic (REQ-MFL-9). The SYNC
 * LOCAL-mode counterpart CnFormPage evaluates on every formData change.
 */
describe('evaluateVisibleWhenLocal', () => {
	it('a nullish condition is always visible (true)', () => {
		expect(evaluateVisibleWhenLocal(null, { kind: 'person' })).toBe(true)
		expect(evaluateVisibleWhenLocal(undefined, { kind: 'person' })).toBe(true)
	})

	it('a malformed condition resolves false: non-object', () => {
		expect(evaluateVisibleWhenLocal('nope', {})).toBe(false)
		expect(evaluateVisibleWhenLocal(42, {})).toBe(false)
	})

	it('a malformed condition resolves false: missing field', () => {
		expect(evaluateVisibleWhenLocal({ op: 'eq', value: 1 }, {})).toBe(false)
		expect(evaluateVisibleWhenLocal({ field: '', op: 'eq', value: 1 }, {})).toBe(false)
	})

	it('a malformed condition resolves false: endpoint/source are NOT local-mode', () => {
		expect(evaluateVisibleWhenLocal({ endpoint: '/x', field: 'a', op: 'eq', value: 1 }, { a: 1 })).toBe(false)
		expect(evaluateVisibleWhenLocal({ source: { register: 'r', schema: 's' }, field: 'a', op: 'eq', value: 1 }, { a: 1 })).toBe(false)
	})

	it('resolves a dot-path into the data object', () => {
		const cond = { field: 'address.country', op: 'eq', value: 'NL' }
		expect(evaluateVisibleWhenLocal(cond, { address: { country: 'NL' } })).toBe(true)
		expect(evaluateVisibleWhenLocal(cond, { address: { country: 'BE' } })).toBe(false)
	})

	it.each([
		// [op, actual field value, condition.value, expected result]
		['eq', 'company', 'company', true],
		['eq', 'person', 'company', false],
		['neq', 'person', 'company', true],
		['gt', 10, 5, true],
		['gte', 5, 5, true],
		['lt', 3, 5, true],
		['lte', 5, 5, true],
	])('supports operator %s', (op, actual, conditionValue, result) => {
		expect(evaluateVisibleWhenLocal({ field: 'kind', op, value: conditionValue }, { kind: actual })).toBe(result)
	})

	it('defaults to eq when op is omitted', () => {
		expect(evaluateVisibleWhenLocal({ field: 'kind', value: 'company' }, { kind: 'company' })).toBe(true)
	})

	it('a hidden (undefined) upstream value never matches a literal condition (cascade support)', () => {
		expect(evaluateVisibleWhenLocal({ field: 'b', op: 'eq', value: 'y' }, { b: undefined })).toBe(false)
	})
})
