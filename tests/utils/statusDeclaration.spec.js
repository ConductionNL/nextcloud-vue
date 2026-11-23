/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The shapes a status declares, as a reader reads them. Ported from dossiq
 * (caseDerivedStatusReasons, transitionWithheldReason, statusFieldRules).
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-can-explain-its-status
 */
import { fieldRulesOf, hasFieldRules } from '../../src/utils/fieldRules.js'
import {
	derivationHeading,
	derivationReasons,
	dwellLabel,
	isDwellBreached,
	waitingOnLabel,
	withheldSentence,
	withheldTransitions,
} from '../../src/utils/statusDeclaration.js'

describe('statusDeclaration', () => {
	it('says nothing about a record that is ours to move', () => {
		expect(waitingOnLabel('us')).toBe('')
		expect(waitingOnLabel('')).toBe('')
		expect(waitingOnLabel(undefined)).toBe('')
	})

	it('tells the applicant apart from a third party', () => {
		expect(waitingOnLabel('applicant')).toContain('applicant')
		expect(waitingOnLabel('thirdParty')).not.toBe(waitingOnLabel('applicant'))
	})

	it('says nothing about a record that entered its status today', () => {
		expect(dwellLabel({ days: 0 })).toBe('')
		expect(dwellLabel(undefined)).toBe('')
		expect(dwellLabel({ days: 1 })).toBe('1 working day in this status')
	})

	it('reads the breach off the engine rather than recomputing the boundary', () => {
		expect(isDwellBreached({ days: 20, maximum: 20, breached: false })).toBe(false)
		expect(isDwellBreached({ days: 21, maximum: 20, breached: true })).toBe(true)
	})

	it('treats an empty unmet list as nothing to say', () => {
		expect(derivationReasons({ name: 'Complete', unmet: [] })).toBeNull()
		expect(derivationReasons({ name: 'Complete', unmet: ['  ', ''] })).toBeNull()
		expect(derivationReasons(null)).toBeNull()
	})

	it('names the status in the heading', () => {
		expect(derivationHeading('Complete')).toContain('Complete')
	})

	it('drops a withheld move that names no reason and keeps one that does', () => {
		expect(withheldTransitions([{ id: 't1', label: 'Close', reasons: [] }, { id: 't2', label: 'Withdraw', reasons: [' ', ''] }])).toEqual([])
		expect(withheldTransitions([{ id: 't1', label: 'Close', reasons: ['the advice request'] }])).toEqual([{ id: 't1', label: 'Close', reasons: ['the advice request'] }])
		expect(withheldTransitions(undefined)).toEqual([])
	})

	it('names the move and its first reason in one sentence', () => {
		expect(withheldSentence({ label: 'Close', reasons: ['the advice request', 'the fee'] })).toBe('Close is waiting on the advice request')
		expect(withheldSentence({ label: '', reasons: ['the advice request'] })).toBe('Waiting on the advice request')
	})
})

describe('fieldRules', () => {
	it('reads the published answer off the record', () => {
		const rules = fieldRulesOf({ '@self': { fieldRules: { state: 'open', required: ['a', ''], readOnly: ['b'], hidden: null } } })
		expect(rules).toEqual({ state: 'open', required: ['a'], readOnly: ['b'], hidden: [] })
		expect(hasFieldRules(rules)).toBe(true)
	})

	it('answers nothing for a record that carries no answer', () => {
		expect(hasFieldRules(fieldRulesOf({}))).toBe(false)
		expect(hasFieldRules(fieldRulesOf(null))).toBe(false)
	})
})
