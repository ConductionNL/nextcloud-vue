/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/app-diagnostics-channel/tasks.md#task-1
 */
import {
	addDiagnosticsListener,
	cleanDiagnosticPath,
	clearReportedDiagnostics,
	reportBindingProblems,
	reportDiagnostic,
	safeCall,
	trackedFetch,
} from '../../src/utils/diagnostics.js'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('diagnostics helper', () => {
	let remove = []
	afterEach(() => {
		remove.forEach((r) => r())
		remove = []
		clearReportedDiagnostics()
		jest.restoreAllMocks()
		delete global.fetch
	})
	const listen = (fn) => {
		remove.push(addDiagnosticsListener(fn))
	}

	it('keeps query keys and drops query values', () => {
		expect(cleanDiagnosticPath('https://x.nl/index.php/apps/openregister/api/objects/a/permit?_search=Jansen&_limit=20&_limit=5#h'))
			.toBe('/index.php/apps/openregister/api/objects/a/permit?_search&_limit')
		expect(cleanDiagnosticPath('/api/x')).toBe('/api/x')
	})

	it('drops a throwing listener with one warning and never throws into the caller', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const bad = jest.fn(() => {
			throw new Error('boom')
		})
		listen(bad)
		expect(() => reportDiagnostic({ kind: 'x' })).not.toThrow()
		expect(bad).not.toHaveBeenCalled() // runs outside the call that caused the report
		await tick()
		reportDiagnostic({ kind: 'x' })
		await tick()
		expect(bad).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('safeCall delivers the report', async () => {
		const fn = jest.fn()
		safeCall(fn, { kind: 'k' })
		await tick()
		expect(fn).toHaveBeenCalledWith({ kind: 'k' })
	})

	it('two listeners both hear a request, with method, status, duration and rows', async () => {
		const a = jest.fn()
		const b = jest.fn()
		listen(a)
		listen(b)
		global.fetch = jest.fn().mockResolvedValue({ status: 403, ok: false, clone: () => ({ json: async () => ({}) }) })
		await trackedFetch('/apps/openregister/api/objects/r/permit?_limit=1&_search=Jansen', { method: 'GET' })
		await tick()
		for (const fn of [a, b]) {
			expect(fn).toHaveBeenCalledTimes(1)
			const report = fn.mock.calls[0][0]
			expect(report).toMatchObject({ kind: 'request', method: 'GET', status: 403, source: 'store', objectType: 'permit', rows: null })
			expect(report.path).toBe('/apps/openregister/api/objects/r/permit?_limit&_search')
			expect(JSON.stringify(report)).not.toContain('Jansen')
			expect(typeof report.durationMs).toBe('number')
		}
	})

	it('counts rows of a list and reports status 0 when the request fails', async () => {
		const fn = jest.fn()
		listen(fn)
		global.fetch = jest.fn().mockResolvedValueOnce({ status: 200, ok: true, clone: () => ({ json: async () => ({ results: [1, 2, 3] }) }) })
		await trackedFetch('/api/objects/r/s', { method: 'GET' })
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('offline'))
		await expect(trackedFetch('/api/objects/r/s', { method: 'POST' })).rejects.toThrow('offline')
		await tick()
		expect(fn.mock.calls[0][0]).toMatchObject({ rows: 3, status: 200 })
		expect(fn.mock.calls[1][0]).toMatchObject({ status: 0, method: 'POST' })
	})

	it('takes no timing and builds no report without a listener', async () => {
		const now = jest.spyOn(performance, 'now')
		global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true })
		await trackedFetch('/api/x', { method: 'GET' })
		expect(now).not.toHaveBeenCalled()
		const build = jest.fn(() => ({ kind: 'x' }))
		reportDiagnostic(build)
		expect(build).not.toHaveBeenCalled()
	})

	it('reports a missing column and field once, skipping @self, dotted, aggregate and expression keys', async () => {
		const fn = jest.fn()
		listen(fn)
		const schema = { slug: 'permit', properties: { title: {} } }
		const binding = {
			register: 'permits',
			columns: ['title', 'kvkNumber', '@self.created', 'owner.name', { key: 'total', aggregate: { fn: 'sum' } }, { key: 'calc', expression: 'a+b' }],
			includeFields: ['title', 'gone'],
		}
		reportBindingProblems(schema, binding)
		reportBindingProblems(schema, binding)
		await tick()
		expect(fn.mock.calls.map((c) => [c[0].property, c[0].where])).toEqual([['kvkNumber', 'column'], ['gone', 'field']])
		expect(fn.mock.calls[0][0]).toMatchObject({ kind: 'binding', problem: 'missing-property', register: 'permits', schema: 'permit' })
	})
})
