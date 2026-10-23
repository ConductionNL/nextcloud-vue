/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/diagnostics-reports-name-their-app/specs/app-diagnostics/spec.md#requirement-every-diagnostics-report-names-the-app-it-came-from
 */
import { createPinia } from 'pinia'
import {
	addDiagnosticsListener,
	bindDiagnosticsApp,
	clearReportedDiagnostics,
	reportBindingProblems,
	reportDiagnostic,
	reportDiagnosticOnce,
	trackedFetch,
} from '../../src/utils/diagnostics.js'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('diagnostics reports name their app', () => {
	let remove
	afterEach(() => {
		remove?.()
		clearReportedDiagnostics()
		delete global.fetch
	})

	it('tags a store request with the app its pinia is bound to, and nothing without a store', async () => {
		const fn = jest.fn()
		remove = addDiagnosticsListener(fn)
		global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({}), clone() { return this } })
		const host = createPinia()
		const preview = createPinia()
		bindDiagnosticsApp(host, 'buildiq')
		bindDiagnosticsApp(preview, 'openbuild-preview')

		await trackedFetch('/objects/a/b', {}, 'store', { _p: host })
		await trackedFetch('/objects/a/c', {}, 'store', { _p: preview })
		await trackedFetch('/objects/a/d', {}, 'cnFetch')
		await tick()

		expect(fn.mock.calls.map((c) => c[0].appId)).toEqual(['buildiq', 'openbuild-preview', null])
	})

	it('puts appId on every report, null when nobody named it', async () => {
		const fn = jest.fn()
		remove = addDiagnosticsListener(fn)
		reportDiagnostic({ kind: 'render-error' })
		reportDiagnostic({ kind: 'render-error', appId: 'myapp' })
		await tick()
		expect(fn.mock.calls.map((c) => c[0].appId)).toEqual([null, 'myapp'])
	})

	it('reports the same once-report for each app', async () => {
		const fn = jest.fn()
		remove = addDiagnosticsListener(fn)
		const schema = { slug: 'permit', properties: { name: {} } }
		reportBindingProblems(schema, { columns: ['kvkNumber'], appId: 'a' })
		reportBindingProblems(schema, { columns: ['kvkNumber'], appId: 'a' })
		reportBindingProblems(schema, { columns: ['kvkNumber'], appId: 'b' })
		reportDiagnosticOnce('unknown-component|page|X', { kind: 'unknown-component', name: 'X', appId: 'a' })
		reportDiagnosticOnce('unknown-component|page|X', { kind: 'unknown-component', name: 'X', appId: 'b' })
		await tick()
		expect(fn.mock.calls.map((c) => `${c[0].kind}:${c[0].appId}`)).toEqual(['binding:a', 'binding:b', 'unknown-component:a', 'unknown-component:b'])
	})
})
