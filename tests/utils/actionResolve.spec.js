/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An action's `resolve` block looks a record up (board PqProject, "Close
 * cycle": the programme's open cycle) and the action's url and payload read
 * it as `@resolved.<field>`.
 *
 * @spec openspec/changes/screens-action-resolve/specs/manifest-actions/spec.md#requirement-an-action-can-name-a-looked-up-record
 */
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ fetchReferenceObjects: jest.fn() }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(() => Promise.resolve({ data: {} })), put: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const axios = require('@nextcloud/axios').default
const dialogs = require('@nextcloud/dialogs')
const { resolveActionRecord } = require('../../src/utils/actionResolve.js')
const { dispatchAction, hasActionTargetTokens } = require('../../src/utils/actionsDispatcher.js')
const { fetchReferenceObjects } = require('../../src/utils/boardReferenceColumns.js')

const RESOLVE = { register: 'pipelinq', schema: 'cycle', filter: { programme: '@objectId', status: 'open' }, reason: 'No open cycle' }
const CLOSE = { id: 'close', label: 'Close cycle', type: 'api-call', url: '/apps/pipelinq/api/cycles/@resolved.id/close', payload: { cycle: '@resolved.id', programme: '@objectId' }, resolve: RESOLVE }

beforeEach(() => {
	jest.clearAllMocks()
})

describe('resolveActionRecord', () => {
	it('fetches the first match with the filter tokens resolved', async () => {
		fetchReferenceObjects.mockResolvedValue([{ id: 'c-7', status: 'open' }])
		expect(await resolveActionRecord(RESOLVE, { objectId: 'p-1' })).toEqual({ id: 'c-7', status: 'open' })
		expect(fetchReferenceObjects).toHaveBeenCalledWith({ register: 'pipelinq', schema: 'cycle', filter: { programme: 'p-1', status: 'open' }, limit: 1 })
	})

	it('answers null without a match, with an unresolved token, or when the lookup fails', async () => {
		fetchReferenceObjects.mockResolvedValue([])
		expect(await resolveActionRecord(RESOLVE, { objectId: 'p-1' })).toBeNull()
		expect(await resolveActionRecord(RESOLVE, {})).toBeNull()
		expect(fetchReferenceObjects).toHaveBeenCalledTimes(1)
		fetchReferenceObjects.mockRejectedValue(new Error('500'))
		expect(await resolveActionRecord(RESOLVE, { objectId: 'p-1' })).toBeNull()
	})
})

describe('dispatching an action with resolve', () => {
	it('looks the record up and posts to its url with its fields', async () => {
		fetchReferenceObjects.mockResolvedValue([{ id: 'c-7' }])
		const result = await dispatchAction(CLOSE, { tokenCtx: { objectId: 'p-1' } })
		expect(result.ok).toBe(true)
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/pipelinq/api/cycles/c-7/close', { cycle: 'c-7', programme: 'p-1' })
	})

	it('does not run without a record and says why', async () => {
		fetchReferenceObjects.mockResolvedValue([])
		const result = await dispatchAction(CLOSE, { tokenCtx: { objectId: 'p-1' }, translate: (s) => (s === 'No open cycle' ? 'Geen open cyclus' : s) })
		expect(result.ok).toBe(false)
		expect(axios.post).not.toHaveBeenCalled()
		expect(dialogs.showError).toHaveBeenCalledWith('Geen open cyclus')
	})

	it('treats @resolved as a target token', () => {
		expect(hasActionTargetTokens('/cycles/@resolved.id')).toBe(true)
	})
})
