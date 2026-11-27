/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-1
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-2
 */
import { dashboardWidgetRegistry, registerDashboardWidget } from '../dashboardWidgetRegistry.js'
import { isValidWidgetPlaceholder, resolveWidgetPlaceholder } from '../../../utils/resolveWidgetPlaceholder.js'

import '../registerDashboardWidgets.js'
// Registered by the barrel (src/index.js), outside the aggregator.
import '../../CnObjectPresenceWidget/index.js'

const Stub = { name: 'Stub', render: (h) => h('div') }

beforeEach(() => {
	jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	jest.restoreAllMocks()
	for (const type of Object.keys(dashboardWidgetRegistry).filter((t) => t.startsWith('test-placeholder-'))) {
		delete dashboardWidgetRegistry[type]
	}
})

describe('every library widget type declares a placeholder', () => {
	it('every registered type has a valid placeholder', () => {
		const types = Object.keys(dashboardWidgetRegistry)
		expect(types.length).toBeGreaterThan(80)
		const missing = types.filter((type) => !isValidWidgetPlaceholder(dashboardWidgetRegistry[type].placeholder))
		expect(missing).toEqual([])
	})

	it.each([
		['object-table', 'rows'],
		['chart', 'block'],
		['stat', 'counter'],
		['app-tiles', 'tiles'],
		['markdown', 'lines'],
		['divider', 'heading'],
	])('%s waits as %s', (type, shape) => {
		expect(resolveWidgetPlaceholder({ type }, dashboardWidgetRegistry[type])).toEqual({ shape })
	})
})

describe('registerDashboardWidget and placeholder', () => {
	it('accepts a shape name and a shape with a count, for an app-registered type too', () => {
		registerDashboardWidget('test-placeholder-kpi', { renderer: Stub, form: null, placeholder: 'counter' })
		registerDashboardWidget('test-placeholder-list', { renderer: Stub, form: null, placeholder: { shape: 'rows', count: 5 } })
		expect(dashboardWidgetRegistry['test-placeholder-kpi'].placeholder).toBe('counter')
		expect(dashboardWidgetRegistry['test-placeholder-list'].placeholder).toEqual({ shape: 'rows', count: 5 })
	})

	it('accepts an entry without a placeholder (it then waits in rows)', () => {
		registerDashboardWidget('test-placeholder-none', { renderer: Stub, form: null })
		expect(resolveWidgetPlaceholder({}, dashboardWidgetRegistry['test-placeholder-none'])).toEqual({ shape: 'rows' })
	})

	it.each([['spinner'], [{ shape: 'rows', count: 0 }], [{ shape: 'grid' }], [42]])('throws a TypeError naming the type for %p', (placeholder) => {
		expect(() => registerDashboardWidget('test-placeholder-bad', { renderer: Stub, form: null, placeholder }))
			.toThrow(new TypeError('[dashboardWidgetRegistry] widget type "test-placeholder-bad": `placeholder` must be one of rows, lines, block, tiles, counter, heading, or { shape, count } with count 1 to 24.'))
		expect(dashboardWidgetRegistry['test-placeholder-bad']).toBeUndefined()
	})
})
