/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-live-values/tasks.md#task-1
 */
import { assignReads, computeAssignments, pickAssignment, resolveAssignValue, resolveFieldDefaults } from '../../src/utils/formAssign.js'

const fields = [
	{ key: 'country', type: 'string' },
	{
		key: 'currency',
		type: 'string',
		assign: [
			{ when: { field: 'country', op: 'eq', value: 'NL' }, value: 'EUR' },
			{ when: { field: 'country', op: 'eq', value: 'BE' }, value: 'EUR' },
			{ when: { field: 'country', op: 'eq', value: 'US' }, value: 'USD' },
		],
	},
	{ key: 'label', type: 'string', assign: [{ value: '@answer.currency' }] },
]

describe('assign rules', () => {
	it('reads the answers a rule list depends on', () => {
		expect([...assignReads(fields[1].assign)]).toEqual(['country'])
		expect([...assignReads(fields[2].assign)]).toEqual(['currency'])
		expect([...assignReads([{ when: { all: [{ field: 'a' }, { field: 'b.c' }] }, value: 1 }])].sort()).toEqual(['a', 'b'])
	})

	it('the first matching rule gives the value; no match gives none', () => {
		expect(pickAssignment(fields[1].assign, { country: 'BE' })).toEqual({ matched: true, value: 'EUR' })
		expect(pickAssignment(fields[1].assign, { country: 'ZZ' })).toEqual({ matched: false })
	})

	it('resolves @answer.<field>, tokens and literals', () => {
		expect(resolveAssignValue('@answer.a.b', { a: { b: 7 } })).toBe(7)
		expect(resolveAssignValue('@me.email', {}, { me: { email: 'a@b.nl' } })).toBe('a@b.nl')
		expect(resolveAssignValue('plain', {})).toBe('plain')
	})

	it('sets a field when an answer it reads changes, and cascades in field order', () => {
		const out = computeAssignments({ fields, answers: { country: 'NL', currency: null, label: null }, changed: ['country'] })
		expect(out.values).toEqual({ currency: 'EUR', label: 'EUR' })
		expect(out.from.currency).toBe('country')
	})

	it('does nothing when the changed answer is not one the rule reads', () => {
		expect(computeAssignments({ fields, answers: { country: 'NL' }, changed: ['unrelated'] }).values).toEqual({})
	})

	it('a hand-edited field is left alone (typing wins)', () => {
		const out = computeAssignments({ fields, answers: { country: 'BE', currency: 'USD' }, changed: ['country'], edited: ['currency'] })
		expect(out.values.currency).toBeUndefined()
	})

	it('a rule that reads its own field does not loop or re-trigger itself', () => {
		const self = [{ key: 'x', assign: [{ when: { field: 'x', op: 'eq', value: 'a' }, value: 'b' }] }]
		expect(computeAssignments({ fields: self, answers: { x: 'a' }, changed: ['x'] }).values).toEqual({})
	})

	it('the pass at open fills only empty fields', () => {
		const out = computeAssignments({ fields, answers: { country: 'NL', currency: 'USD', label: '' }, changed: null })
		expect(out.values).toEqual({ label: 'USD' })
	})
})

describe('field defaults', () => {
	const ctx = { me: { displayName: 'Jan Jansen', email: 'jan@example.nl' } }

	it('resolves tokens once and leaves literals as they are', () => {
		const out = resolveFieldDefaults([
			{ key: 'name', default: '@me.displayName' },
			{ key: 'email', default: '@me.email' },
			{ key: 'kind', default: 'request' },
			{ key: 'copy', default: '@object.title' },
		], { title: 'Hello' }, ctx)
		expect(out).toEqual({ name: 'Jan Jansen', email: 'jan@example.nl', kind: 'request', copy: 'Hello' })
	})

	it('an initial value wins over a default', () => {
		expect(resolveFieldDefaults([{ key: 'email', default: '@me.email' }], { email: 'stored@x.nl' }, ctx)).toEqual({})
	})

	it('leaves out a token that cannot resolve yet', () => {
		expect(resolveFieldDefaults([{ key: 'email', default: '@me.email' }], {}, {})).toEqual({})
	})
})
