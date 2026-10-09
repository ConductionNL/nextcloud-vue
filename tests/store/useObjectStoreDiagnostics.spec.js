/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/app-diagnostics-channel/tasks.md#task-2
 */
const fs = require('fs')
const path = require('path')
const { setActivePinia, createPinia } = require('pinia')
const { useObjectStore } = require('../../src/store/useObjectStore.js')
const { addDiagnosticsListener, clearReportedDiagnostics } = require('../../src/utils/diagnostics.js')

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function walk(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
}

describe('store requests are reported', () => {
	let remove
	beforeEach(() => {
		setActivePinia(createPinia())
	})
	afterEach(() => {
		if (remove) {
			remove()
		}
		clearReportedDiagnostics()
		delete global.fetch
	})

	it('calls fetch in the store and its plugins only through trackedFetch', () => {
		const offenders = walk(path.resolve(__dirname, '../../src/store'))
			.filter((f) => f.endsWith('.js'))
			.filter((f) => /(^|[^A-Za-z.])await fetch\(/.test(fs.readFileSync(f, 'utf8').split('\n').filter((l) => !l.trim().startsWith('*')).join('\n')))
		expect(offenders).toEqual([])
	})

	it('reports a list request, and a 404 schema as a binding problem', async () => {
		const fn = jest.fn()
		remove = addDiagnosticsListener(fn)
		global.fetch = jest.fn().mockImplementation(async (url) => (String(url).includes('/schemas/')
			? { status: 404, ok: false, text: async () => '', json: async () => ({}) }
			: { status: 200, ok: true, json: async () => ({ results: [{ id: 1 }] }), clone() { return { json: async () => ({ results: [{ id: 1 }] }) } } }))
		const store = useObjectStore()
		store.registerObjectType('permit', 'permit', 'permits', {})
		await store.fetchCollection('permit')
		await store.fetchSchema('permit')
		await tick()
		const reports = fn.mock.calls.map((c) => c[0])
		expect(reports.find((r) => r.kind === 'request' && r.rows === 1)).toBeTruthy()
		expect(reports.find((r) => r.kind === 'binding')).toMatchObject({ problem: 'missing-schema' })
	})
})
