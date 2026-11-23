/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/app-diagnostics-channel/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'
import { addDiagnosticsListener, clearReportedDiagnostics } from '../../src/utils/diagnostics.js'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

const manifest = {
	version: '1.0.0',
	menu: [],
	pages: [
		{ id: 'broken', route: '/broken', type: 'custom', title: 't', component: 'Missing' },
		{ id: 'weird', route: '/weird', type: 'nonsense', title: 't' },
		{ id: 'thrower', route: '/thrower', type: 'custom', title: 't', component: 'Thrower' },
	],
}
const Thrower = {
	name: 'KpiOmzet',
	render() {
		throw new Error('kpi exploded')
	},
}

function mountAt(routeName, errorHandler) {
	return mount(CnPageRenderer, {
		props: { manifest },
		global: {
			provide: { cnCustomComponents: { Thrower }, cnTranslate: (k) => k },
			mocks: { $route: { name: routeName, params: {}, query: {} }, $router: { push: jest.fn() } },
			plugins: [(app) => { app.config.errorHandler = errorHandler }],
			stubs: { 'router-view': true },
		},
	})
}

describe('CnPageRenderer diagnostics', () => {
	let remove
	let fn
	beforeEach(() => {
		fn = jest.fn()
		remove = addDiagnosticsListener(fn)
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => {
		remove()
		clearReportedDiagnostics()
		jest.restoreAllMocks()
	})

	it('reports an unknown custom component and an unknown page type', async () => {
		mountAt('broken')
		mountAt('weird')
		await tick()
		const reports = fn.mock.calls.map((c) => c[0])
		expect(reports).toContainEqual(expect.objectContaining({ kind: 'unknown-component', name: 'Missing', where: 'page' }))
		expect(reports).toContainEqual(expect.objectContaining({ kind: 'unknown-component', name: 'nonsense', where: 'pageType' }))
	})

	it('reports a render error and still hands it to the app errorHandler', async () => {
		const handler = jest.fn()
		// Test Utils rethrows a mount error after calling the app handler.
		expect(() => mountAt('thrower', handler)).toThrow('kpi exploded')
		await tick()
		const report = fn.mock.calls.map((c) => c[0]).find((r) => r.kind === 'render-error')
		expect(report).toMatchObject({ component: 'KpiOmzet', message: 'kpi exploded' })
		expect(handler).toHaveBeenCalled()
	})
})
