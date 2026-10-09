/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/app-diagnostics-channel/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn() }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('x')), get: jest.fn().mockRejectedValue(new Error('x')) },
}))
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
const { reportDiagnostic, hasDiagnosticsListener } = require('../../src/utils/diagnostics.js')

const manifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	dependencies: [],
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
function mountRoot(props = {}) {
	return mount(CnAppRoot, {
		props: { manifest, appId: 'myapp', requiresApps: [], ...props },
		global: { mocks: { $route: { name: 'home' } }, stubs: { 'router-view': true } },
	})
}

function thrower() {
	throw new Error('bad')
}

describe('CnAppRoot diagnostics', () => {
	it('listens while mounted, adds pageId, and stops on unmount', async () => {
		expect(hasDiagnosticsListener()).toBe(false)
		const fn = jest.fn()
		const w = mountRoot({ diagnostics: fn })
		expect(hasDiagnosticsListener()).toBe(true)
		reportDiagnostic({ kind: 'request', path: '/x' })
		await tick()
		expect(fn).toHaveBeenCalledWith(expect.objectContaining({ kind: 'request', pageId: 'home', at: expect.any(Number) }))
		w.unmount()
		expect(hasDiagnosticsListener()).toBe(false)
	})

	it('adds no listener without a diagnostics function', () => {
		const w = mountRoot()
		expect(hasDiagnosticsListener()).toBe(false)
		w.unmount()
	})

	it('survives a listener that throws', async () => {
		jest.spyOn(console, 'warn').mockImplementation(() => {})
		const w = mountRoot({ diagnostics: thrower })
		expect(() => reportDiagnostic({ kind: 'request' })).not.toThrow()
		await tick()
		expect(hasDiagnosticsListener()).toBe(false)
		w.unmount()
		jest.restoreAllMocks()
	})
})
