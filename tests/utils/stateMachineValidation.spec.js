/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every rule of validateStateMachine in isolation, plus a valid machine, the
 * JSON-string form hosts store, a host's own record keys and its own messages.
 */
import { STATE_MACHINE_RULES as RULES, validateStateMachine } from '../../src/utils/stateMachineValidation.js'

const codesOf = (issues) => issues.map((issue) => issue.code)

describe('validateStateMachine', () => {
	it('finds nothing wrong with an empty machine', () => {
		expect(validateStateMachine({ states: [], transitions: [] })).toEqual([])
		expect(validateStateMachine({})).toEqual([])
	})

	it('passes a well-formed machine', () => {
		const states = [
			{ id: 's1', label: 'Received' },
			{ id: 's2', label: 'In handling' },
			{ id: 's3', label: 'Handled', final: true },
		]
		const transitions = [
			{ id: 't1', from: 's1', to: 's2' },
			{ id: 't2', from: 's2', to: 's3' },
		]
		expect(validateStateMachine({ states, transitions })).toEqual([])
	})

	it('NO_FINAL_STATE is an error', () => {
		const issues = validateStateMachine({
			states: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B' }],
			transitions: [{ id: 't1', from: 's1', to: 's2' }],
		})
		expect(issues.find((issue) => issue.code === RULES.NO_FINAL_STATE).type).toBe('error')
	})

	it('UNREACHABLE_FINAL flags a final state no starting state leads to, and not CYCLE_NO_EXIT when the cycle has a way out', () => {
		const issues = validateStateMachine({
			states: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B' }, { id: 's3', label: 'Handled', final: true }],
			transitions: [
				{ id: 't1', from: 's1', to: 's2' },
				{ id: 't2', from: 's2', to: 's1' },
				{ id: 't3', from: 's2', to: 's3' },
			],
		})
		const issue = issues.find((candidate) => candidate.code === RULES.UNREACHABLE_FINAL)
		expect(issue.type).toBe('error')
		expect(issue.message).toContain('Handled')
		expect(codesOf(issues)).not.toContain(RULES.CYCLE_NO_EXIT)
	})

	it('DANGLING_TRANSITION is an error naming the transition', () => {
		const issues = validateStateMachine({
			states: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B', final: true }],
			transitions: [{ id: 't1', from: 's1', to: 'gone', label: 'Close' }],
		})
		const issue = issues.find((candidate) => candidate.code === RULES.DANGLING_TRANSITION)
		expect(issue.type).toBe('error')
		expect(issue.message).toContain('Close')
	})

	it('DUPLICATE_TRANSITION is a warning', () => {
		const issues = validateStateMachine({
			states: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B', final: true }],
			transitions: [{ id: 't1', from: 's1', to: 's2' }, { id: 't2', from: 's1', to: 's2' }],
		})
		expect(issues.find((issue) => issue.code === RULES.DUPLICATE_TRANSITION).type).toBe('warning')
	})

	it('ORPHAN_STATE is a warning naming the state, but not for a machine of one', () => {
		const issues = validateStateMachine({
			states: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B', final: true }, { id: 's3', label: 'Loose' }],
			transitions: [{ id: 't1', from: 's1', to: 's2' }],
		})
		const issue = issues.find((candidate) => candidate.code === RULES.ORPHAN_STATE)
		expect(issue.type).toBe('warning')
		expect(issue.message).toContain('Loose')

		const single = validateStateMachine({ states: [{ id: 's1', label: 'Solo', final: true }], transitions: [] })
		expect(codesOf(single)).not.toContain(RULES.ORPHAN_STATE)
	})

	it('CYCLE_NO_EXIT is a warning for a cycle that never reaches a final state', () => {
		const issues = validateStateMachine({
			states: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B' }, { id: 's3', label: 'End', final: true }],
			transitions: [{ id: 't1', from: 's1', to: 's2' }, { id: 't2', from: 's2', to: 's1' }],
		})
		const issue = issues.find((candidate) => candidate.code === RULES.CYCLE_NO_EXIT)
		expect(issue.type).toBe('warning')
		expect(issue.message).toContain('A → B')
	})

	it('reads transitions stored as a JSON string, and survives malformed JSON', () => {
		const states = [{ id: 's1', label: 'A' }, { id: 's2', label: 'B', final: true }]
		const transitions = [{ id: 't1', from: 's1', to: 's2' }]
		expect(validateStateMachine({ states, transitions: JSON.stringify(transitions) }))
			.toEqual(validateStateMachine({ states, transitions }))
		expect(() => validateStateMachine({ states, transitions: '{not json' })).not.toThrow()
	})

	it('reads a host\'s own record keys', () => {
		const issues = validateStateMachine(
			{
				states: [{ id: 's1', name: 'Received', isFinal: false }, { id: 's2', name: 'Handled', isFinal: true }],
				transitions: [{ id: 't1', fromStatus: 's1', toStatus: 's2' }],
			},
			{ keys: { label: 'name', final: 'isFinal', from: 'fromStatus', to: 'toStatus' } },
		)
		expect(issues).toEqual([])
	})

	it('uses a host\'s message, through its translate, with the placeholders filled', () => {
		const issues = validateStateMachine(
			{
				states: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B', final: true }, { id: 's3', label: 'Loose' }],
				transitions: [{ id: 't1', from: 's1', to: 's2' }],
			},
			{
				messages: { ORPHAN_STATE: 'Status "{name}" stands alone' },
				translate: (text) => text.replace('stands alone', 'staat los'),
			},
		)
		expect(issues.find((issue) => issue.code === RULES.ORPHAN_STATE).message).toBe('Status "Loose" staat los')
	})
})
