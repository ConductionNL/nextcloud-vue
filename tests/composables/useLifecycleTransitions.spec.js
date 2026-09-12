/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useLifecycleTransitions: the one place that speaks OpenRegister's lifecycle
 * contract, so both CnLifecycleActions and CnStagesWidget mean the same thing
 * by a transition.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((path, params) => (params ? path.replace(/\{(\w+)\}/g, (_, k) => params[k]) : path)),
}))

import axios from '@nextcloud/axios'
import {
	actionNote,
	actionsByTarget,
	declaresInputs,
	performTransition,
	readAvailableActions,
	transitionError,
} from '../../src/composables/useLifecycleTransitions.js'

/**
 * An axios-shaped rejection: an Error carrying `response`, which is what axios
 * actually throws. A bare object has no stack, so a spec failing on one says
 * nothing about where it came from.
 *
 * @param {number} [status] The HTTP status.
 * @param {object} [data] The response body.
 * @return {Error} The rejection.
 */
function axiosError(status, data) {
	const error = new Error(`Request failed with status code ${status}`)
	error.response = { status, ...(data !== undefined ? { data } : {}) }
	return error
}

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
})

describe('readAvailableActions', () => {
	it('reads the actions OpenRegister allows for the record', async () => {
		axios.get.mockResolvedValue({ data: { actions: [{ action: 'start', to: 'open' }] } })

		const read = await readAvailableActions('case-1')

		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/case-1/available-actions')
		expect(read).toEqual({ actions: [{ action: 'start', to: 'open' }], failed: false })
	})

	// A 404 IS AN ANSWER. A schema without a lifecycle is a legitimate schema:
	// there are no moves, and that is a fact about the record, not a fault.
	it('reads a missing lifecycle as no moves, and not as a failure', async () => {
		axios.get.mockRejectedValue(axiosError(404))
		expect(await readAvailableActions('case-1')).toEqual({ actions: [], failed: false })
	})

	// A 500 IS NOT AN ANSWER, and collapsing the two let a failed read render
	// as a policy decision: every stage disabled, each one explaining it is not
	// reachable, when nothing had been read at all.
	it.each([
		[500],
		[503],
		[undefined],
	])('reports a %p as a failure', async (status) => {
		axios.get.mockRejectedValue(status ? axiosError(status) : new Error('Network Error'))
		expect(await readAvailableActions('case-1')).toEqual({ actions: [], failed: true })
	})

	it('asks nothing without a record id', async () => {
		expect(await readAvailableActions('')).toEqual({ actions: [], failed: false })
		expect(await readAvailableActions(null)).toEqual({ actions: [], failed: false })
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('drops an entry that names no action', async () => {
		axios.get.mockResolvedValue({ data: { actions: [{ to: 'open' }, null, 'x', { action: 'close', to: 'closed' }] } })
		expect((await readAvailableActions('c')).actions).toEqual([{ action: 'close', to: 'closed' }])
	})

	it('answers an empty list for a body that carries no actions array', async () => {
		axios.get.mockResolvedValue({ data: {} })
		expect(await readAvailableActions('c')).toEqual({ actions: [], failed: false })
	})
})

describe('performTransition', () => {
	it('posts the action alone when nothing was collected', async () => {
		axios.post.mockResolvedValue({ data: { id: 'case-1' } })

		await performTransition('case-1', 'close')

		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/case-1/transition', { action: 'close' })
	})

	it('posts the collected inputs under data', async () => {
		axios.post.mockResolvedValue({ data: {} })

		await performTransition('case-1', 'close', { reason: 'Granted' })

		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/case-1/transition', { action: 'close', data: { reason: 'Granted' } })
	})

	// The caller decides where a refusal is shown, so the error travels.
	it('throws the refusal through', async () => {
		axios.post.mockRejectedValue(axiosError(403, { error: 'Only a coordinator may close.' }))
		await expect(performTransition('c', 'close')).rejects.toBeTruthy()
	})
})

describe('transitionError', () => {
	it('prefers the sentence OpenRegister wrote', () => {
		expect(transitionError({ response: { data: { error: 'Only a coordinator may close.' } } })).toBe('Only a coordinator may close.')
	})

	it('falls back through message, then the caller’s words', () => {
		expect(transitionError({ response: { data: { message: 'Nope' } } })).toBe('Nope')
		expect(transitionError({ message: 'Network Error' }, 'The move could not be made')).toBe('The move could not be made')
		expect(transitionError({}, 'The move could not be made')).toBe('The move could not be made')
	})

	it('ignores a blank error body rather than showing an empty message', () => {
		expect(transitionError({ response: { data: { error: '   ' } } }, 'Fallback')).toBe('Fallback')
	})
})

describe('actionsByTarget', () => {
	it('indexes the actions by the stage they lead to', () => {
		const byTarget = actionsByTarget([{ action: 'start', to: 'open' }, { action: 'close', to: 'closed' }])
		expect(byTarget.get('open').action).toBe('start')
		expect(byTarget.get('closed').action).toBe('close')
	})

	// THE ABSENCE OF AN ACTION IS THE GUARD. There is no flag to read, so there
	// is no flag to misread: a stage nothing reaches simply is not in the map.
	it('leaves out a stage no action reaches', () => {
		expect(actionsByTarget([{ action: 'start', to: 'open' }]).has('closed')).toBe(false)
	})

	it('keeps the first of two actions reaching one stage, so renders agree', () => {
		const byTarget = actionsByTarget([{ action: 'first', to: 'open' }, { action: 'second', to: 'open' }])
		expect(byTarget.get('open').action).toBe('first')
	})

	it('ignores entries with no target and a body that is not a list', () => {
		expect(actionsByTarget([{ action: 'x' }, { action: 'y', to: '' }, null]).size).toBe(0)
		expect(actionsByTarget(null).size).toBe(0)
	})
})

describe('declaresInputs', () => {
	it('is true only for an action carrying at least one input', () => {
		expect(declaresInputs({ inputs: [{ field: 'reason' }] })).toBe(true)
		expect(declaresInputs({ inputs: [] })).toBe(false)
		expect(declaresInputs({})).toBe(false)
		expect(declaresInputs(null)).toBe(false)
	})
})

describe('actionNote', () => {
	it('reads the description and what the move requires', () => {
		expect(actionNote({ description: 'Close the case.' })).toBe('Close the case.')
		expect(actionNote({ requires: 'A decision document.' })).toBe('A decision document.')
		expect(actionNote({ description: 'Close the case.', requires: ['A document.', 'A result.'] }))
			.toBe('Close the case. A document. A result.')
	})

	it('says nothing when the action says nothing', () => {
		expect(actionNote({ action: 'close', to: 'closed', requires: null, description: null })).toBe('')
		expect(actionNote(null)).toBe('')
	})
})
