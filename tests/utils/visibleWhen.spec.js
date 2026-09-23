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
	isLocallyDecidableVisibleWhen,
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
		expect(VISIBLE_WHEN_OPS).toEqual(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'notEmpty'])
	})
})

describe('visibleWhen — empty, @me and composition', () => {
	// The three gaps that kept dossiq's Claim and Release offered together: an
	// unclaimed case has no value to compare, the handler is only known at read
	// time, and a gate needed two facts at once.
	beforeEach(() => {
		// Same way resolveFilterTokens.spec establishes a reader under jsdom.
		global.window = global.window || {}
		global.window.OC = { currentUser: 'admin' }
	})

	it('treats undefined, null, an empty string and an empty array as empty', () => {
		for (const blank of [undefined, null, '', []]) {
			expect(compareVisibleWhen(blank, 'empty')).toBe(true)
			expect(compareVisibleWhen(blank, 'notEmpty')).toBe(false)
		}
	})

	it('does not call a present value empty, including a falsy one', () => {
		for (const set of ['alice', 0, false, ['a']]) {
			expect(compareVisibleWhen(set, 'empty')).toBe(false)
			expect(compareVisibleWhen(set, 'notEmpty')).toBe(true)
		}
	})

	it('resolves @me on the right-hand side, so a condition can name the reader', () => {
		// The jest setup signs in as `admin`; `eq` against the literal proves the
		// token was resolved rather than compared as the string "@me".
		expect(compareVisibleWhen('admin', 'eq', '@me')).toBe(true)
		expect(compareVisibleWhen('bob', 'eq', '@me')).toBe(false)
		expect(compareVisibleWhen('admin', 'neq', '@me')).toBe(false)
	})

	it('leaves a literal that is not a token alone', () => {
		expect(compareVisibleWhen('open', 'eq', 'open')).toBe(true)
		expect(compareVisibleWhen(true, 'neq', false)).toBe(true)
	})

	it('all requires every condition, any requires one', () => {
		const record = { isFinalStatus: false, assignee: '' }
		const notClosed = { field: 'isFinalStatus', op: 'neq', value: true }
		const unheld = { field: 'assignee', op: 'empty' }
		const held = { field: 'assignee', op: 'notEmpty' }

		expect(evaluateVisibleWhenLocal({ all: [notClosed, unheld] }, record)).toBe(true)
		expect(evaluateVisibleWhenLocal({ all: [notClosed, held] }, record)).toBe(false)
		expect(evaluateVisibleWhenLocal({ any: [notClosed, held] }, record)).toBe(true)
		expect(evaluateVisibleWhenLocal({ any: [held] }, record)).toBe(false)
	})

	it('gates Claim and Release apart on the same record', () => {
		const claim = { all: [{ field: 'isFinalStatus', op: 'neq', value: true }, { field: 'assignee', op: 'empty' }] }
		const release = { all: [{ field: 'isFinalStatus', op: 'neq', value: true }, { field: 'assignee', op: 'eq', value: '@me' }] }

		const unclaimed = { isFinalStatus: false, assignee: null }
		const mine = { isFinalStatus: false, assignee: 'admin' }
		const someoneElses = { isFinalStatus: false, assignee: 'bob' }
		const closed = { isFinalStatus: true, assignee: null }

		expect([evaluateVisibleWhenLocal(claim, unclaimed), evaluateVisibleWhenLocal(release, unclaimed)]).toEqual([true, false])
		expect([evaluateVisibleWhenLocal(claim, mine), evaluateVisibleWhenLocal(release, mine)]).toEqual([false, true])
		// Somebody else's: neither, because the server refuses both.
		expect([evaluateVisibleWhenLocal(claim, someoneElses), evaluateVisibleWhenLocal(release, someoneElses)]).toEqual([false, false])
		expect([evaluateVisibleWhenLocal(claim, closed), evaluateVisibleWhenLocal(release, closed)]).toEqual([false, false])
	})

	it('composes asynchronously too, so an endpoint condition can join one', async () => {
		const record = { object: { isFinalStatus: false, assignee: '' } }
		const cond = { all: [{ field: 'isFinalStatus', op: 'neq', value: true }, { field: 'assignee', op: 'empty' }] }
		await expect(evaluateVisibleWhen(cond, record)).resolves.toBe(true)
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
		if (global.fetch && global.fetch.mockReset) {
			global.fetch.mockReset()
		}
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

describe('appInstalled precondition', () => {
	beforeEach(() => {
		global.OC = { appswebroots: { humaniq: '/apps/humaniq' } }
	})
	afterEach(() => {
		delete global.OC
	})

	it('shows when the named app is installed and nothing else is asked', async () => {
		await expect(evaluateVisibleWhen({ appInstalled: 'humaniq' }, {})).resolves.toBe(true)
	})

	it('hides when the named app is absent', async () => {
		await expect(evaluateVisibleWhen({ appInstalled: 'nosuchapp' }, {})).resolves.toBe(false)
	})

	it('gates a local field condition behind the app check', async () => {
		// Both must hold: the app is here AND the record is in the right state.
		const ctx = { object: { status: 'open' } }
		await expect(evaluateVisibleWhen(
			{ appInstalled: 'humaniq', field: 'status', op: 'eq', value: 'open' },
			ctx,
		)).resolves.toBe(true)
		await expect(evaluateVisibleWhen(
			{ appInstalled: 'humaniq', field: 'status', op: 'eq', value: 'closed' },
			ctx,
		)).resolves.toBe(false)
	})

	it('hides on the app check even when the field condition would pass', async () => {
		const ctx = { object: { status: 'open' } }
		await expect(evaluateVisibleWhen(
			{ appInstalled: 'nosuchapp', field: 'status', op: 'eq', value: 'open' },
			ctx,
		)).resolves.toBe(false)
	})

	it('is honoured by the synchronous local evaluator too', () => {
		// Without this the two evaluators disagree, and a form field gated on an
		// app would show in one code path and hide in the other.
		expect(evaluateVisibleWhenLocal({ appInstalled: 'humaniq' }, {})).toBe(true)
		expect(evaluateVisibleWhenLocal({ appInstalled: 'nosuchapp' }, {})).toBe(false)
	})

	it('leaves a condition with no appInstalled key untouched', async () => {
		await expect(evaluateVisibleWhen({ field: 'a', op: 'eq', value: 1 }, { object: { a: 1 } })).resolves.toBe(true)
	})
})

/**
 * A malformed composition must hide ONE element, not throw out of the computed
 * that evaluates it and take the render with it. `{ all: {}, any: [] }` enters
 * the branch on `any` while `cond.all ?? cond.any` would hand the object to
 * `.map` — the shape that turns a bad manifest into a blank page.
 */
describe('visibleWhen — malformed composition', () => {
	const broken = { all: {}, any: [] }

	it('does not throw out of the sync evaluator', () => {
		expect(() => evaluateVisibleWhenLocal(broken, {})).not.toThrow()
		expect(evaluateVisibleWhenLocal({ all: { nope: true }, any: [{ field: 'a', value: 1 }] }, { a: 1 })).toBe(true)
	})

	it('does not reject out of the async evaluator', async () => {
		await expect(evaluateVisibleWhen(broken, {})).resolves.toBe(false)
	})
})

/**
 * isLocallyDecidableVisibleWhen — the guard a surface that had NO gate before
 * checks first, so gaining one cannot silently delete an element whose
 * condition names an endpoint the sync evaluator simply cannot ask.
 */
describe('isLocallyDecidableVisibleWhen', () => {
	it('a local field condition is decidable', () => {
		expect(isLocallyDecidableVisibleWhen({ field: 'status', op: 'eq', value: 'open' })).toBe(true)
		expect(isLocallyDecidableVisibleWhen({ appInstalled: 'humaniq' })).toBe(true)
	})

	it('a nullish condition is decidable — there is nothing to decide', () => {
		expect(isLocallyDecidableVisibleWhen(null)).toBe(true)
		expect(isLocallyDecidableVisibleWhen(undefined)).toBe(true)
	})

	it('an endpoint or source condition is not', () => {
		expect(isLocallyDecidableVisibleWhen({ endpoint: '/x', field: 'a' })).toBe(false)
		expect(isLocallyDecidableVisibleWhen({ source: { register: 'r', schema: 's' }, field: 'a' })).toBe(false)
	})

	it('a composition is decidable only when every leaf is', () => {
		const local = { field: 'status', op: 'neq', value: 'closed' }
		const remote = { endpoint: '/held', field: 'by' }
		expect(isLocallyDecidableVisibleWhen({ all: [local, local] })).toBe(true)
		expect(isLocallyDecidableVisibleWhen({ all: [local, remote] })).toBe(false)
		expect(isLocallyDecidableVisibleWhen({ any: [local, remote] })).toBe(false)
	})

	it('a non-object is not decidable, so the caller falls through to visible', () => {
		expect(isLocallyDecidableVisibleWhen('nope')).toBe(false)
		expect(isLocallyDecidableVisibleWhen([{ field: 'a' }])).toBe(false)
	})
})

/**
 * The @-token grammar on the RIGHT-hand side. `@me` always resolved; the object
 * tokens compared as their own nine literal characters, because the local
 * evaluator passed an empty context to a function that had the record in hand.
 */
describe('compareVisibleWhen — token context', () => {
	it('resolves @object.<field> against the supplied context', () => {
		const record = { owner: 'ada', assignee: 'ada' }
		expect(compareVisibleWhen('ada', 'eq', '@object.owner', { object: record })).toBe(true)
		expect(compareVisibleWhen('bob', 'eq', '@object.owner', { object: record })).toBe(false)
	})

	it('the local evaluator passes the record as that context', () => {
		const cond = { field: 'assignee', op: 'eq', value: '@object.owner' }
		expect(evaluateVisibleWhenLocal(cond, { owner: 'ada', assignee: 'ada' })).toBe(true)
		expect(evaluateVisibleWhenLocal(cond, { owner: 'ada', assignee: 'bob' })).toBe(false)
	})

	it('an unresolvable token still compares as its literal, as before', () => {
		expect(compareVisibleWhen('@object.nope', 'eq', '@object.nope', {})).toBe(true)
	})
})
