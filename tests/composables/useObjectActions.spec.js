/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useObjectActions and utils/objectActions: OpenRegister's object-actions
 * contract (object-actions-declared-and-run), mocked at the HTTP edge.
 *
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md
 */
import { effectScope, nextTick } from 'vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/event-bus', () => ({
	__esModule: true,
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

const axios = require('@nextcloud/axios').default
const { emit } = require('@nextcloud/event-bus')
const { useObjectActions } = require('../../src/composables/useObjectActions.js')
const {
	actionFieldErrors,
	actionsForSurface,
	hasActionInputs,
	normaliseObjectAction,
	readActionHistory,
	readObjectActions,
	readSelectionActions,
	runObjectAction,
	runSelectionAction,
	sentInputs,
	watchActionRun,
} = require('../../src/utils/objectActions.js')

const TARGET = { register: 'zaken', schema: 'case', id: 'c-1' }

const LIST = {
	actions: [
		{ key: 'claim', kind: 'steps', label: { nl: 'Oppakken', en: 'Claim' }, available: false, reason: { nl: 'Al opgepakt', en: 'Already claimed' }, surfaces: ['header', 'row', 'bulk'] },
		{ key: 'publish', kind: 'steps', label: 'Publish', available: true, surfaces: ['header'], mode: 'async', inputs: { type: 'object', required: ['from'], properties: { from: { type: 'string', format: 'date' } } }, confirm: { en: 'The decision becomes public.' } },
		{ key: 'finish', kind: 'transition', available: true },
		{ kind: 'flow', label: 'no key' },
	],
}

/**
 * An axios error with a response.
 *
 * @param {number} status The HTTP status.
 * @param {object} data The body.
 * @return {object}
 */
function httpError(status, data = {}) {
	return { response: { status, data } }
}

beforeEach(() => {
	jest.clearAllMocks()
	jest.useRealTimers()
})

describe('normaliseObjectAction', () => {
	it('reads label, reason and confirm per locale and fills the defaults', () => {
		const claim = normaliseObjectAction(LIST.actions[0], { language: 'nl' })
		expect(claim).toMatchObject({ key: 'claim', kind: 'steps', label: 'Oppakken', available: false, reason: 'Al opgepakt', mode: 'sync', next: 'stay' })
		const finish = normaliseObjectAction(LIST.actions[2])
		expect(finish.surfaces).toEqual(['header', 'row'])
		expect(finish.label).toBe('Finish')
		expect(finish.reason).toBe('')
	})

	it('reads the older macro kind as flow and drops an entry without a key', () => {
		expect(normaliseObjectAction({ key: 'm', kind: 'macro' }).kind).toBe('flow')
		expect(normaliseObjectAction({ label: 'x' })).toBeNull()
	})
})

describe('actionsForSurface', () => {
	const actions = LIST.actions.map((a) => normaliseObjectAction(a)).filter(Boolean)

	it('keeps the actions offered on the surface', () => {
		expect(actionsForSurface(actions, 'header').map((a) => a.key)).toEqual(['claim', 'publish', 'finish'])
		expect(actionsForSurface(actions, 'bulk').map((a) => a.key)).toEqual(['claim'])
	})

	it('narrows to include, in its order', () => {
		expect(actionsForSurface(actions, 'header', ['finish', 'nope', 'claim']).map((a) => a.key)).toEqual(['finish', 'claim'])
	})

	it('knows which action asks for inputs', () => {
		expect(hasActionInputs(actions[1])).toBe(true)
		expect(hasActionInputs(actions[2])).toBe(false)
	})
})

describe('readObjectActions', () => {
	it('reads the object list from OpenRegister', async () => {
		axios.get.mockResolvedValue({ data: LIST })
		const answer = await readObjectActions(TARGET)
		expect(axios.get.mock.calls[0][0]).toContain('/apps/openregister/api/objects/zaken/case/c-1/actions')
		expect(answer.actions.map((a) => a.key)).toEqual(['claim', 'publish', 'finish'])
		expect(answer.failed).toBe(false)
	})

	it('tells an OpenRegister without the route from a failed read', async () => {
		axios.get.mockRejectedValueOnce(httpError(404))
		expect(await readObjectActions(TARGET)).toEqual({ actions: [], failed: false, unsupported: true })
		axios.get.mockRejectedValueOnce(httpError(500))
		expect(await readObjectActions(TARGET)).toEqual({ actions: [], failed: true, unsupported: false })
		axios.get.mockRejectedValueOnce(httpError(403))
		expect(await readObjectActions(TARGET)).toEqual({ actions: [], failed: false, unsupported: false })
	})

	it('reads nothing without a complete target', async () => {
		expect((await readObjectActions({ register: 'r', schema: 's' })).actions).toEqual([])
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('reads the selection list of a schema', async () => {
		axios.get.mockResolvedValue({ data: { actions: [LIST.actions[0]] } })
		const answer = await readSelectionActions({ register: 'zaken', schema: 'case' })
		expect(axios.get.mock.calls[0][0]).toContain('/apps/openregister/api/object-actions/zaken/case')
		expect(answer.actions.map((a) => a.key)).toEqual(['claim'])
	})
})

describe('runObjectAction', () => {
	it('posts the inputs, leaving empty optional ones to the server default', async () => {
		axios.post.mockResolvedValue({ status: 200, data: { run: 'r-1', outcome: 'completed', next: 'next' } })
		const result = await runObjectAction(TARGET, 'publish', { from: '2026-11-01', note: '' })
		expect(axios.post.mock.calls[0][0]).toContain('/apps/openregister/api/objects/zaken/case/c-1/actions/publish')
		expect(axios.post.mock.calls[0][1]).toEqual({ inputs: { from: '2026-11-01' } })
		expect(result).toMatchObject({ ok: true, status: 'completed', run: 'r-1', next: 'next' })
	})

	it('reads a 202 as queued or suspended, never as completed', async () => {
		axios.post.mockResolvedValueOnce({ status: 202, data: { run: 'r-2', status: 'queued', links: { run: '/api/flow-runs/r-2' } } })
		expect(await runObjectAction(TARGET, 'export')).toMatchObject({ ok: true, status: 'queued', run: 'r-2' })
		axios.post.mockResolvedValueOnce({ status: 202, data: { run: { uuid: 'r-3' }, status: 'suspended' } })
		expect(await runObjectAction(TARGET, 'export')).toMatchObject({ ok: true, status: 'suspended', run: 'r-3' })
	})

	it('keeps a precondition refusal apart from a permission refusal', async () => {
		axios.post.mockRejectedValueOnce(httpError(409, { error: 'action-precondition-unmet', message: 'Only a decided decision can be published.' }))
		expect(await runObjectAction(TARGET, 'publish')).toMatchObject({ ok: false, httpStatus: 409, error: 'action-precondition-unmet', message: 'Only a decided decision can be published.' })
		axios.post.mockRejectedValueOnce(httpError(403, { error: 'You may not perform "publish" on this object.' }))
		expect(await runObjectAction(TARGET, 'publish')).toMatchObject({ ok: false, httpStatus: 403, error: '', message: 'You may not perform "publish" on this object.' })
	})

	it('names the inputs a 422 refused', async () => {
		axios.post.mockRejectedValueOnce(httpError(422, { message: 'Invalid inputs', errors: [{ field: 'from', message: 'not a date' }] }))
		expect(await runObjectAction(TARGET, 'publish', { from: 'tomorrow-ish' })).toMatchObject({ httpStatus: 422, fieldErrors: ['from'] })
		expect(actionFieldErrors({ errors: { from: ['x'] } })).toEqual(['from'])
		expect(actionFieldErrors({ fields: ['a'], errors: [{ path: '/b/c' }] })).toEqual(['a', 'b.c'])
	})

	it('sends no empty values', () => {
		expect(sentInputs({ a: '', b: null, c: 0, d: false, e: ' x ' })).toEqual({ c: 0, d: false, e: ' x ' })
	})
})

describe('runSelectionAction', () => {
	it('answers the per-object summary', async () => {
		axios.post.mockResolvedValue({ status: 200, data: { summary: { succeeded: 2, failed: 1 }, results: [{ id: 'a' }], next: 'list' } })
		const result = await runSelectionAction({ register: 'zaken', schema: 'case' }, 'claim', ['a', 'b', 'c'])
		expect(axios.post.mock.calls[0][0]).toContain('/apps/openregister/api/object-actions/zaken/case/claim')
		expect(axios.post.mock.calls[0][1]).toEqual({ ids: ['a', 'b', 'c'], inputs: {} })
		expect(result).toMatchObject({ ok: true, status: 'completed', summary: { succeeded: 2, failed: 1 }, next: 'list' })
	})

	it('answers a bulk job for a large selection', async () => {
		axios.post.mockResolvedValue({ status: 202, data: { job: { uuid: 'j-1' } } })
		expect(await runSelectionAction({ register: 'zaken', schema: 'case' }, 'claim', ['a'])).toMatchObject({ status: 'queued', job: { uuid: 'j-1' } })
	})
})

describe('watchActionRun', () => {
	it('reads the run until it ends', async () => {
		jest.useFakeTimers()
		axios.get
			.mockResolvedValueOnce({ data: { status: 'running', log: [{}] } })
			.mockResolvedValueOnce({ data: { status: 'completed', log: [{}, {}] } })
		const updates = []
		const watch = watchActionRun('r-1', { interval: 10, onUpdate: (run) => updates.push(run.status) })
		await jest.advanceTimersByTimeAsync(50)
		const run = await watch.done
		expect(axios.get.mock.calls[0][0]).toContain('/apps/openregister/api/flow-runs/r-1')
		expect(updates).toEqual(['running', 'completed'])
		expect(run).toMatchObject({ status: 'completed', steps: 2, failed: false })
	})
})

describe('readActionHistory', () => {
	it('reads the history route', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ action: 'action.run', created: '2026-10-21T10:00:00Z', changed: { declaredAction: 'hold', kind: 'steps', run: 'r-9', changes: [{ step: 'status', kind: 'write' }, { step: 'mail', kind: 'message' }] } }] } })
		const history = await readActionHistory(TARGET)
		expect(axios.get.mock.calls[0][0]).toContain('/actions/history')
		expect(history[0]).toEqual({ action: 'hold', kind: 'steps', run: 'r-9', outcome: '', created: '2026-10-21T10:00:00Z', changes: [{ step: 'status', kind: 'write' }, { step: 'mail', kind: 'message' }] })
	})

	it('falls back to the audit trail, reading both names, newest first', async () => {
		axios.get.mockImplementation((url, options) => {
			if (url.includes('/actions/history')) {
				return Promise.reject(httpError(404))
			}
			return Promise.resolve({
				data: {
					results: options.params.action === 'action.run'
						? [{ action: 'action.run', created: '2026-10-21T10:00:00Z', changed: { declaredAction: 'hold' } }]
						: [{ action: 'action.macro', created: '2026-10-20T10:00:00Z', changed: { declaredAction: 'suspend' } }],
				},
			})
		})
		const history = await readActionHistory(TARGET)
		expect(history.map((entry) => entry.action)).toEqual(['hold', 'suspend'])
		expect(history[1].kind).toBe('flow')
	})
})

describe('useObjectActions', () => {
	/**
	 * Run the composable in its own scope.
	 *
	 * @param {object} target The target.
	 * @return {{api: object, scope: object}}
	 */
	function setup(target = TARGET) {
		const scope = effectScope()
		const api = scope.run(() => useObjectActions(target, { pollInterval: 5 }))
		return { api, scope }
	}

	it('reads the list and offers it per surface', async () => {
		axios.get.mockResolvedValue({ data: LIST })
		const { api, scope } = setup()
		await nextTick()
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(api.forSurface('header', ['publish']).map((a) => a.key)).toEqual(['publish'])
		expect(api.find('claim').available).toBe(false)
		scope.stop()
	})

	it('runs an action, refreshes the page and reads the list again', async () => {
		axios.get.mockResolvedValue({ data: LIST })
		axios.post.mockResolvedValue({ status: 200, data: { run: 'r-1', outcome: 'completed' } })
		const { api, scope } = setup()
		await new Promise((resolve) => setTimeout(resolve, 0))
		const result = await api.run('finish')
		expect(result.ok).toBe(true)
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', { source: 'object-action', action: 'finish' })
		expect(axios.get).toHaveBeenCalledTimes(2)
		scope.stop()
	})

	it('follows an async run and shows its progress', async () => {
		axios.get.mockImplementation((url) => Promise.resolve(url.includes('/flow-runs/')
			? { data: { status: 'completed', log: [{}, {}, {}] } }
			: { data: LIST }))
		axios.post.mockResolvedValue({ status: 202, data: { run: 'r-5', status: 'queued' } })
		const { api, scope } = setup()
		await new Promise((resolve) => setTimeout(resolve, 0))
		const result = await api.run('publish', { from: '2026-11-01' })
		expect(result).toMatchObject({ ok: true, status: 'completed' })
		expect(api.progress.value).toMatchObject({ action: 'publish', run: 'r-5', status: 'completed', steps: 3 })
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', expect.any(Object))
		scope.stop()
	})

	it('does not refresh after a refusal', async () => {
		axios.get.mockResolvedValue({ data: LIST })
		axios.post.mockRejectedValue(httpError(409, { error: 'action-precondition-unmet', message: 'Already claimed' }))
		const { api, scope } = setup()
		await new Promise((resolve) => setTimeout(resolve, 0))
		const result = await api.run('claim')
		expect(result.message).toBe('Already claimed')
		expect(emit).not.toHaveBeenCalled()
		scope.stop()
	})

	it('reads the selection list without an id', async () => {
		axios.get.mockResolvedValue({ data: { actions: [LIST.actions[0]] } })
		const { api, scope } = setup({ register: 'zaken', schema: 'case' })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(axios.get.mock.calls[0][0]).toContain('/api/object-actions/zaken/case')
		expect(api.forSurface('bulk').map((a) => a.key)).toEqual(['claim'])
		scope.stop()
	})
})
