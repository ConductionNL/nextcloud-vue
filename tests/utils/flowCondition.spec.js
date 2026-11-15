/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { flowConditionText, flowEdgeCondition, flowEdgeConditionText } from '../../src/utils/flowCondition.js'

const amount = { var: 'json.amount' }

describe('flowConditionText', () => {
	it.each([
		[{ '==': [{ var: 'json.status' }, 'open'] }, 'status is open'],
		[{ '!=': [{ var: 'status' }, 'open'] }, 'status is not open'],
		[{ '>': [amount, 1000] }, 'amount is more than 1000'],
		[{ '>=': [amount, 1000] }, 'amount is at least 1000'],
		[{ '<': [amount, 3] }, 'amount is less than 3'],
		[{ '<=': [amount, 3] }, 'amount is at most 3'],
		[{ in: [{ var: 'json.kind' }, ['a', 'b']] }, 'kind is one of a, b'],
		[{ '!!': [{ var: 'json.description' }] }, 'description is filled in'],
		[{ '!': { var: 'json.description' } }, 'description is empty'],
	])('says %j in words', (logic, text) => {
		expect(flowConditionText(logic)).toBe(text)
	})

	it('joins conditions and brackets a nested group', () => {
		const logic = { and: [{ '>': [amount, 1] }, { or: [{ '!!': [{ var: 'a' }] }, { '!': [{ var: 'b' }] }] }] }

		expect(flowConditionText(logic)).toBe('amount is more than 1 and (a is filled in or b is empty)')
	})

	it('reads a default in a var as the field', () => {
		expect(flowConditionText({ '==': [{ var: ['json.status', 'new'] }, 'open'] })).toBe('status is open')
	})

	it.each([
		[{ '+': [1, 2] }],
		[{ '==': [1, 2] }],
		[{ '==': [amount, { var: 'json.limit' }] }],
		[{ and: [{ '>': [amount, 1] }, { '+': [1, 2] }] }],
		[{ and: [] }],
		[{ '!!': [1] }],
	])('falls back to a fixed line for %j', (logic) => {
		expect(flowConditionText(logic)).toBe('A custom condition')
	})

	it.each([[null], [undefined], [{}], [[]], ['text']])('is empty for %j', (logic) => {
		expect(flowConditionText(logic)).toBe('')
	})
})

describe('flowEdgeCondition', () => {
	const large = { '>': [amount, 1000] }
	const source = { id: 'check', exits: [{ id: 'large', condition: large }, { id: 'small' }] }

	it('reads the exit the edge leaves through', () => {
		expect(flowEdgeCondition({ from: 'check', fromExit: 'large' }, source)).toEqual(large)
	})

	it('reads a condition stored on the edge first', () => {
		const own = { '<': [amount, 1] }

		expect(flowEdgeCondition({ condition: own, fromExit: 'large' }, source)).toEqual(own)
	})

	it('finds nothing without an exit or a source', () => {
		expect(flowEdgeCondition({ fromExit: 'small' }, source)).toBeNull()
		expect(flowEdgeCondition({ fromExit: 'gone' }, source)).toBeNull()
		expect(flowEdgeCondition({ fromExit: 'large' }, null)).toBeNull()
	})
})

describe('flowEdgeConditionText', () => {
	const source = { id: 'check', exits: [{ id: 'large', condition: { '>': [amount, 1000] } }, { id: 'small' }] }

	it('says the condition', () => {
		expect(flowEdgeConditionText({ fromExit: 'large' }, source)).toBe('amount is more than 1000')
	})

	it('calls the exit without a condition Otherwise', () => {
		expect(flowEdgeConditionText({ fromExit: 'small' }, source)).toBe('Otherwise')
	})

	it('says nothing on a line that is simply followed', () => {
		expect(flowEdgeConditionText({ from: 'a', to: 'b' }, { id: 'a' })).toBe('')
		expect(flowEdgeConditionText({ fromExit: 'one' }, { id: 'a', exits: [{ id: 'one' }, { id: 'two' }] })).toBe('')
	})
})
