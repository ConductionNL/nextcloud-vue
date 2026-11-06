/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { flowRunLogLines, flowStepLevel, flowStepMessage } from '../../src/utils/flowRunLog.js'

const END = { transition: 'end', type: 'openregister.end', status: 'stopped', reason: 'Flow stopped', checkId: null }
const VETO = { transition: 'write', status: 'stopped', reason: 'Over budget', checkId: 'budget' }

describe('flowStepLevel', () => {
	it('reads a clean End step as a success', () => {
		expect(flowStepLevel(END)).toBe('success')
	})

	it('reads a stop from an oversight check as a warning', () => {
		expect(flowStepLevel(VETO)).toBe('warning')
	})

	it('reads a failed step on a run that went on to its End as a warning', () => {
		const failed = { transition: 'mail', status: 'failed', error: 'boom' }

		expect(flowStepLevel(failed, { status: 'stopped', log: [failed, END] })).toBe('warning')
	})

	it('reads a failed step on a run it ended as an error', () => {
		const failed = { transition: 'mail', status: 'failed', error: 'boom' }

		expect(flowStepLevel(failed, { status: 'failed', log: [failed] })).toBe('error')
	})
})

describe('flowStepMessage', () => {
	it('does not say stopped for an End step without a message of its own', () => {
		expect(flowStepMessage(END)).toBe('The run ended here.')
	})

	it('keeps the message an author wrote on the End step', () => {
		expect(flowStepMessage({ ...END, reason: 'Melding afgehandeld' })).toBe('Melding afgehandeld')
	})
})

describe('flowRunLogLines', () => {
	it('logs a clean End as a success line', () => {
		const lines = flowRunLogLines({ status: 'stopped', log: [END] })

		expect(lines.map((line) => line.level)).toEqual(['success'])
	})
})
