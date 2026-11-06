/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { flowRunBadge } from '../../src/utils/flowRunLog.js'
import { flowRunPicture } from '../../src/utils/flowRunPicture.js'

const NODES = ['start', 'check', 'mail', 'write', 'end'].map((id) => ({ id }))
const LINES = [
	{ id: 'e0', source: 'start', target: 'check' },
	{ id: 'e1', source: 'check', target: 'mail' },
	{ id: 'e2', source: 'check', target: 'write' },
	{ id: 'e3', source: 'mail', target: 'end' },
	{ id: 'e4', source: 'write', target: 'end' },
]
const step = (transition, status = 'completed', extra = {}) => ({ transition, status, ...extra })
const END = step('end', 'stopped', { reason: 'Flow stopped', checkId: null })

describe('flowRunPicture', () => {
	it('colours each step of a finished run and marks the branch it did not take', () => {
		const run = { status: 'stopped', log: [step('start'), step('check'), step('write'), END] }

		const { states, taken, notTaken } = flowRunPicture(run, NODES, LINES)

		expect(states).toEqual({ start: 'done', check: 'done', write: 'done', end: 'done', mail: 'skipped' })
		expect(taken).toEqual(['e0', 'e2', 'e4'])
		expect(notTaken).toEqual(['e1', 'e3'])
	})

	it('shows a failed step the run went past as a warning, and one that ended it as failed', () => {
		const mail = step('mail', 'failed', { error: 'No address' })

		expect(flowRunPicture({ status: 'stopped', log: [mail, END] }, NODES, LINES).states.mail).toBe('warning')
		expect(flowRunPicture({ status: 'failed', log: [mail] }, NODES, LINES).states.mail).toBe('failed')
	})

	it('shows a stop from an oversight check as a warning', () => {
		const run = { status: 'stopped', log: [step('write', 'stopped', { checkId: 'budget' })] }

		expect(flowRunPicture(run, NODES, LINES).states.write).toBe('warning')
	})

	it('says nothing yet about the steps a waiting run has still to reach', () => {
		const run = { status: 'suspended', log: [step('start'), step('check', 'suspended')] }

		const { states, notTaken } = flowRunPicture(run, NODES, LINES)

		expect(states).toEqual({ start: 'done', check: 'hold' })
		expect(notTaken).toEqual([])
	})

	it('shows the worst outcome of a step logged more than once and counts its lines', () => {
		const lines = [{ at: '2026-10-07T08:41:02Z', level: 'warning', message: 'a' }, { at: '2026-10-07T08:41:03Z', level: 'info', message: 'b' }]
		const run = {
			status: 'failed',
			log: [step('mail', 'completed', { report: { lines } }), step('mail', 'failed', { error: 'boom' })],
		}

		const { states, counts } = flowRunPicture(run, NODES, LINES)

		expect(states.mail).toBe('failed')
		expect(counts.mail).toBe(3)
	})

	it('draws an empty picture for no run', () => {
		expect(flowRunPicture(null, [], [])).toEqual({ states: {}, counts: {}, taken: [], notTaken: [] })
	})
})

describe('flowRunBadge', () => {
	it('says a run succeeded', () => {
		expect(flowRunBadge({ status: 'stopped', log: [END] })).toEqual({ label: 'Succeeded', variant: 'success' })
	})

	it('says a run finished with a warning when it went past a failed step', () => {
		const run = { status: 'stopped', log: [step('mail', 'failed', { error: 'boom' }), END] }

		expect(flowRunBadge(run)).toEqual({ label: 'Finished with a warning', variant: 'warning' })
	})

	it('names a status it does not know as it is', () => {
		expect(flowRunBadge({ status: 'new' })).toEqual({ label: 'new', variant: 'default' })
	})
})
