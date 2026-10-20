/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `tasks` source reads one task for a detail page (tasks-record-source):
 * `GET /api/flow-tasks/{uuid}`, the record keyed on its uuid with the row's
 * display fields, and a refused read kept as its status with no record.
 *
 * @spec openspec/changes/tasks-record-source/specs/tasks-record-source/spec.md#requirement-the-tasks-source-reads-one-task
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

import { createPinia, setActivePinia } from 'pinia'
import { resolveRecordSource } from '../../src/composables/indexSources.js'

const UUID = '5b0c9d3e-0000-4000-8000-000000000042'
const TASK = { uuid: UUID, title: 'Hoorzitting inplannen', state: 'active', priority: 'high', assignee: 'pieter', dueAt: '2026-10-07T00:00:00+00:00' }

beforeEach(() => {
	setActivePinia(createPinia())
	mockGet.mockReset()
})

describe('the tasks source as a record source', () => {
	it('resolves as a record source', () => {
		const source = resolveRecordSource('tasks')
		expect(typeof source.loadRecord).toBe('function')
		expect(typeof source.record).toBe('function')
	})

	it('reads one task by uuid and keys it on its uuid with the row labels', async () => {
		mockGet.mockResolvedValue({ data: TASK })
		const source = resolveRecordSource('tasks')
		await source.loadRecord(UUID)
		expect(mockGet).toHaveBeenCalledWith(`/index.php/apps/openregister/api/flow-tasks/${UUID}`)
		const record = source.record(UUID)
		expect(record).toMatchObject({ id: UUID, title: 'Hoorzitting inplannen', stateLabel: 'In progress', priorityLabel: 'High' })
		expect(source.recordError(UUID)).toBeNull()
	})

	it('reads a task the endpoint wraps in `results`', async () => {
		mockGet.mockResolvedValue({ data: { results: TASK } })
		const source = resolveRecordSource('tasks')
		await source.loadRecord(UUID)
		expect(source.record(UUID).title).toBe('Hoorzitting inplannen')
	})

	it('keeps the status of a refused read and holds no record', async () => {
		const error = jest.spyOn(console, 'error').mockImplementation(() => {})
		mockGet.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403 } }))
		const source = resolveRecordSource('tasks')
		expect(await source.loadRecord(UUID)).toBeNull()
		expect(source.record(UUID)).toBeNull()
		expect(source.recordError(UUID)).toBe(403)
		error.mockRestore()
	})
})
