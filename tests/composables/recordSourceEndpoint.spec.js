/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page can read its record from an app endpoint
 * (`entitySource: "endpoint"`, `sourceConfig.url` with `{id}`), for a record
 * that is not a register object: pipelinq's cash register audit entry,
 * dossiq's StUF audit row.
 *
 * @spec openspec/changes/detail-endpoint-source/specs/detail-page/spec.md#requirement-a-detail-page-can-read-its-record-from-an-app-endpoint
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

import { resolveRecordSource } from '../../src/composables/indexSources.js'

beforeEach(() => mockGet.mockReset())

describe('endpoint record source', () => {
	it('is a source that reads one record', () => {
		expect(resolveRecordSource('endpoint')).not.toBeNull()
	})

	it('reads the record at the url with the id filled in', async () => {
		mockGet.mockResolvedValue({ data: { entry: { id: 'a 1', amount: 12.5 } } })
		const source = resolveRecordSource('endpoint')
		source.configure({ url: '/apps/pipelinq/api/kassakoppeling/audit/{id}', recordPath: 'entry' })
		await source.loadRecord('a 1')
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/kassakoppeling/audit/a%201')
		expect(source.record('a 1')).toEqual({ id: 'a 1', amount: 12.5 })
		expect(source.recordError('a 1')).toBeNull()
	})

	it('reports a refused or missing record by its status, and an answer without a record as missing', async () => {
		const source = resolveRecordSource('endpoint')
		source.configure({ url: '/apps/x/api/y/{id}' })
		mockGet.mockRejectedValue({ response: { status: 403 } })
		await source.loadRecord('r1')
		expect(source.record('r1')).toBeNull()
		expect(source.recordError('r1')).toBe(403)
		mockGet.mockResolvedValue({ data: [] })
		await source.loadRecord('r2')
		expect(source.recordError('r2')).toBe(404)
	})

	it('requests nothing without a url that names the id', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const source = resolveRecordSource('endpoint')
		source.configure({ url: '/apps/x/api/y' })
		await source.loadRecord('r1')
		expect(mockGet).not.toHaveBeenCalled()
		expect(source.recordError('r1')).toBe(404)
		spy.mockRestore()
	})
})
