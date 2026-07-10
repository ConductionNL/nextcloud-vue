/**
 * Unit tests for the promoteCustomDashboard transform (audit items 11/25).
 */

import { promoteCustomDashboard } from '../../../src/cli/transforms/promoteCustomDashboard.js'

describe('promoteCustomDashboard', () => {
	it('promotes a named custom dashboard to type:"dashboard" and strips component', () => {
		const page = {
			id: 'Dashboard',
			type: 'custom',
			component: 'DashboardView',
			config: { widgets: [{ id: 'w1', type: 'stat' }], layout: [{ widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 }] },
		}
		const { page: out, promoted, flagged } = promoteCustomDashboard(page)
		expect(promoted).toBe(true)
		expect(flagged).toBeNull() // has manifest widgets → convergeTypedWidgets will fold them
		expect(out.type).toBe('dashboard')
		expect(out.component).toBeUndefined()
		expect(out.config.widgets).toHaveLength(1) // left in place for convergeTypedWidgets
	})

	it('promotes but flags for manual review when there are no manifest widgets', () => {
		const page = { id: 'Dash', type: 'custom', component: 'ScholiqDashboards', config: { register: 'x' } }
		const { page: out, promoted, flagged } = promoteCustomDashboard(page)
		expect(promoted).toBe(true)
		expect(flagged).toBe('ScholiqDashboards')
		expect(out.type).toBe('dashboard')
		expect(out.widgets).toEqual([])
		expect(out._note).toMatch(/manual review/i)
		expect(out._note).toContain('ScholiqDashboards') // component name not silently dropped
	})

	it('ignores custom pages whose component is not a known bespoke dashboard', () => {
		const page = { id: 'x', type: 'custom', component: 'SomeOtherThing' }
		const { page: out, promoted } = promoteCustomDashboard(page)
		expect(promoted).toBe(false)
		expect(out).toBe(page)
	})

	// --- Idempotence ---
	it('is a byte-identical no-op on a page already type:"dashboard" (same reference)', () => {
		const page = { id: 'Dashboard', type: 'dashboard', widgets: [] }
		const { page: out, promoted } = promoteCustomDashboard(page)
		expect(out).toBe(page)
		expect(promoted).toBe(false)
	})

	it('re-run on promoted output is byte-identical', () => {
		const page = { id: 'Dash', type: 'custom', component: 'DashboardIndex', config: {} }
		const first = promoteCustomDashboard(page).page
		const second = promoteCustomDashboard(first).page
		expect(JSON.stringify(second)).toBe(JSON.stringify(first))
	})
})
