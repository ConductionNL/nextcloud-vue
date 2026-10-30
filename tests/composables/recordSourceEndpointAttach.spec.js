/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page over an app endpoint keeps the other parts of the answer:
 * `sourceConfig.attach` puts them on the record, so a widget reads them as a
 * field (a report answered as `{ report, messages, terms }`).
 *
 * @spec openspec/changes/detail-endpoint-answer-parts/specs/detail-page/spec.md#requirement-a-detail-page-over-an-app-endpoint-keeps-the-other-parts-of-the-answer
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

import { resolveRecordSource } from '../../src/composables/indexSources.js'

const ANSWER = {
	report: { id: 'r1', summary: 'Invoices paid twice', messages: 'kept' },
	messages: [{ id: 'm1', body: 'Thank you.' }],
	meta: { terms: { due: '2026-11-06' } },
}

beforeEach(() => mockGet.mockReset())

describe('endpoint record source: attach', () => {
	it('puts the named parts of the answer on the record', async () => {
		mockGet.mockResolvedValue({ data: ANSWER })
		const source = resolveRecordSource('endpoint')
		source.configure({ url: '/apps/x/api/reports/{id}', recordPath: 'report', attach: { messages: 'messages', terms: 'meta.terms' } })
		await source.loadRecord('r1')
		expect(source.record('r1')).toEqual({
			id: 'r1',
			summary: 'Invoices paid twice',
			messages: [{ id: 'm1', body: 'Thank you.' }],
			terms: { due: '2026-11-06' },
		})
	})

	it('leaves out a path the answer does not hold, so a field of the record stays', async () => {
		mockGet.mockResolvedValue({ data: { report: ANSWER.report } })
		const source = resolveRecordSource('endpoint')
		source.configure({ url: '/apps/x/api/reports/{id}', recordPath: 'report', attach: { messages: 'messages', empty: '' } })
		await source.loadRecord('r1')
		expect(source.record('r1')).toEqual(ANSWER.report)
	})

	it('reads the record as before without attach, or with an attach that is not a map', async () => {
		mockGet.mockResolvedValue({ data: ANSWER })
		const source = resolveRecordSource('endpoint')
		source.configure({ url: '/apps/x/api/reports/{id}', recordPath: 'report' })
		await source.loadRecord('r1')
		expect(source.record('r1')).toEqual(ANSWER.report)
		source.configure({ url: '/apps/x/api/reports/{id}', recordPath: 'report', attach: ['messages'] })
		await source.loadRecord('r2')
		expect(source.record('r2')).toEqual(ANSWER.report)
	})

	it('still shows a missing record when only the attached parts are there', async () => {
		mockGet.mockResolvedValue({ data: { messages: ANSWER.messages } })
		const source = resolveRecordSource('endpoint')
		source.configure({ url: '/apps/x/api/reports/{id}', recordPath: 'report', attach: { messages: 'messages' } })
		await source.loadRecord('r1')
		expect(source.record('r1')).toBeNull()
		expect(source.recordError('r1')).toBe(404)
	})
})
