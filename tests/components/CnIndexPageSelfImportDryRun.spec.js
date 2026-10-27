// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { runSelfImportRequest } from '../../src/components/CnIndexPage/selfModeIO.js'

jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, getRootUrl: () => '/nc' }))
jest.mock('@nextcloud/auth', () => ({ __esModule: true, getRequestToken: () => 'token' }))

describe('the self-fetch import request', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('asks OpenRegister to check only, and hands back its report', async () => {
		const summary = { Sheet: { found: 2, created: [], errors: [] } }
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Import successful', summary }) }))
		const file = new File(['title\nA\n'], 'tickets.csv', { type: 'text/csv' })
		const report = await runSelfImportRequest({ register: 'pipelinq', schema: 'ticket', file, dryRun: true })
		const url = global.fetch.mock.calls[0][0]
		expect(url).toContain('/apps/openregister/api/registers/pipelinq/import?')
		expect(url).toContain('schema=ticket')
		expect(url).toContain('dryRun=true')
		expect(report.summary).toEqual(summary)
	})

	it('sends no dryRun for a real import', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('no body')) }))
		const file = new File(['{}'], 'set.json', { type: 'application/json' })
		const report = await runSelfImportRequest({ register: 'pipelinq', schema: 'ticket', file })
		expect(global.fetch.mock.calls[0][0]).not.toContain('dryRun')
		expect(report).toBeNull()
	})
})
