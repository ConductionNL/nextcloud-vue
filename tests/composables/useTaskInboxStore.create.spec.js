/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/tasks-tab-flow-task-source/tasks.md#task-1
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

import axios from '@nextcloud/axios'
import { createPinia, setActivePinia } from 'pinia'
import { buildFlowTaskBody, useTaskInboxStore } from '../../src/composables/useTaskInboxStore.js'

const anchor = { objectUuid: 'o-1', registerId: 'dossiq', schemaId: 'case' }

beforeEach(() => {
	setActivePinia(createPinia())
	axios.get.mockReset()
	axios.post.mockReset()
})

describe('buildFlowTaskBody', () => {
	it('sends assignee and the anchor for a user, and nothing else', () => {
		const body = buildFlowTaskBody({ title: ' Bel aanvrager terug ', dueAt: '2026-10-09T00:00:00.000Z', anchor, assignee: { kind: 'user', id: 'jan' }, requester: 'evil', state: 'completed' })
		expect(body).toEqual({ title: 'Bel aanvrager terug', dueAt: '2026-10-09T00:00:00.000Z', objectUuid: 'o-1', registerId: 'dossiq', schemaId: 'case', assignee: 'jan' })
		expect(body).not.toHaveProperty('requester')
		expect(body).not.toHaveProperty('state')
		expect(body).not.toHaveProperty('performerType')
	})

	it('sends performerType group with candidateGroups and no assignee for a group', () => {
		const body = buildFlowTaskBody({ title: 'x', anchor, assignee: { kind: 'group', id: 'backoffice' } })
		expect(body.performerType).toBe('group')
		expect(body.candidateGroups).toEqual(['backoffice'])
		expect(body).not.toHaveProperty('assignee')
	})

	it('omits assignee, due date and description when not given', () => {
		const body = buildFlowTaskBody({ title: 'x', anchor })
		expect(Object.keys(body).sort()).toEqual(['objectUuid', 'registerId', 'schemaId', 'title'])
	})
})

describe('useTaskInboxStore create and verbs', () => {
	it('creates with POST /api/flow-tasks and returns the task', async () => {
		axios.post.mockResolvedValue({ status: 201, data: { id: 't1', title: 'x' } })
		const result = await useTaskInboxStore().createTask({ title: 'x', anchor })
		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks', expect.objectContaining({ title: 'x', objectUuid: 'o-1' }))
		expect(result).toMatchObject({ ok: true, status: 201 })
	})

	it('returns the refusal with the server message instead of throwing', async () => {
		axios.post.mockRejectedValue({ response: { status: 404, data: { error: 'Not found' } } })
		const result = await useTaskInboxStore().createTask({ title: 'x', anchor })
		expect(result).toEqual({ ok: false, status: 404, task: null, message: 'Not found' })
	})

	it('runs a verb with POST .../{uuid}/{verb} and a body', async () => {
		axios.post.mockResolvedValue({ status: 200, data: {} })
		await useTaskInboxStore().runVerb('u 1', 'reassign', { assignee: 'jan' })
		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/u%201/reassign', { assignee: 'jan' })
	})

	it('returns a refused verb with its message', async () => {
		axios.post.mockRejectedValue({ response: { status: 403, data: { message: 'Not in the pool' } } })
		expect(await useTaskInboxStore().runVerb('u1', 'claim')).toMatchObject({ ok: false, status: 403, message: 'Not in the pool' })
	})

	it('fetchFor reads without touching the store state', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 1 }], total: 1 } })
		const store = useTaskInboxStore()
		store.tasks = [{ id: 'inbox' }]
		const out = await store.fetchFor({ objectUuid: 'o-1', scope: 'all' })
		expect(axios.get.mock.calls[0][1].params).toMatchObject({ objectUuid: 'o-1', scope: 'all' })
		expect(out).toEqual({ results: [{ id: 1 }], total: 1 })
		expect(store.tasks).toEqual([{ id: 'inbox' }])
	})
})
