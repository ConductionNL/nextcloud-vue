import { pickBranchTarget } from '../../src/components/CnJourney/useJourneyBranching.js'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-2
 */
import * as shared from '../../src/utils/visibleWhen.js'

const rules = [
	{ when: { field: 'kind', op: 'eq', value: 'a' }, goto: 'step-a' },
	{ when: { field: 'kind', op: 'eq', value: 'b' }, goto: 'step-b' },
]

describe('journey branching', () => {
	afterEach(() => {
		jest.restoreAllMocks()
		delete global.fetch
	})

	it('routes every rule decision through the shared evaluator', async () => {
		const spy = jest.spyOn(shared, 'evaluateVisibleWhen').mockResolvedValueOnce(false).mockResolvedValueOnce(true)
		expect(await pickBranchTarget(rules, { kind: 'zzz' })).toBe('step-b')
		expect(spy).toHaveBeenCalledTimes(2)
		expect(spy.mock.calls[0][0]).toBe(rules[0].when)
		expect(spy.mock.calls[0][1].object).toEqual({ kind: 'zzz' })
	})

	it('local mode: the first matching rule wins, none returns null', async () => {
		expect(await pickBranchTarget(rules, { kind: 'b' })).toBe('step-b')
		expect(await pickBranchTarget(rules, { kind: 'c' })).toBeNull()
	})

	it('endpoint mode reads the response', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ open: true }) })
		const r = [{ when: { endpoint: '/apps/x/api/status', field: 'open', value: true }, goto: 'late' }]
		expect(await pickBranchTarget(r, {})).toBe('late')
	})

	it('source mode reads the first result', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ tier: 'gold' }] }) })
		const r = [{ when: { source: { register: 'r', schema: 's' }, field: 'tier', value: 'gold' }, goto: 'vip' }]
		expect(await pickBranchTarget(r, {})).toBe('vip')
	})

	it('an erroring rule is false, falls through and is reported', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('down'))
		const onError = jest.fn()
		const r = [{ when: { source: { register: 'r', schema: 's' }, field: 'tier', value: 'gold' }, goto: 'vip' }]
		expect(await pickBranchTarget(r, {}, onError)).toBeNull()
		expect(onError).toHaveBeenCalledTimes(1)
		expect(onError.mock.calls[0][0].message).toBe('down')
	})
})
