/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A fresh module registry that loads ONLY CnDashboardPage still has the
 * dashboard widget catalog (stat, delta, gauge, ...), and registering twice is
 * a no-op.
 */
describe('CnDashboardPage registers the widget catalog', () => {
	beforeEach(() => {
		jest.resetModules()
	})

	it('populates the catalog on import of CnDashboardPage alone', () => {
		const registry = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		expect(registry.dashboardWidgetRegistry.stat).toBeUndefined()
		require('../../src/components/CnDashboardPage/CnDashboardPage.vue')
		const reg = registry.dashboardWidgetRegistry
		expect(reg.stat).toBeDefined()
		expect(reg.delta).toBeDefined()
		expect(reg.gauge).toBeDefined()
		expect(reg.countdown).toBeDefined()
	})

	it('is idempotent: a second call changes nothing and warns about nothing', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const registry = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		const mod = require('../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
		const before = Object.keys(registry.dashboardWidgetRegistry).sort()
		const stat = registry.dashboardWidgetRegistry.stat
		warn.mockClear()
		mod.registerBuiltinDashboardWidgets()
		mod.registerBuiltinDashboardWidgets()
		expect(Object.keys(registry.dashboardWidgetRegistry).sort()).toEqual(before)
		expect(registry.dashboardWidgetRegistry.stat).toBe(stat)
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})
