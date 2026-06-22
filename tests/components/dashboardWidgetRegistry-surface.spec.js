/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import {
	registerDashboardWidget,
	listWidgetTypes,
	widgetTypeAllowsSurface,
} from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

describe('dashboardWidgetRegistry surface filtering', () => {
	const stub = { renderer: {}, form: {}, defaultContent: {}, displayName: 'x', icon: 'X' }

	it('widgetTypeAllowsSurface: no surfaces means everywhere', () => {
		expect(widgetTypeAllowsSurface({ ...stub }, 'app-dashboard')).toBe(true)
		expect(widgetTypeAllowsSurface({ ...stub }, 'detail-page')).toBe(true)
		expect(widgetTypeAllowsSurface({ ...stub, surfaces: ['detail-page'] }, 'app-dashboard')).toBe(false)
		expect(widgetTypeAllowsSurface({ ...stub, surfaces: ['detail-page'] }, 'detail-page')).toBe(true)
	})

	it('listWidgetTypes excludes detail-only types from the default (dashboard) surface', () => {
		registerDashboardWidget('test-dash', { ...stub })
		registerDashboardWidget('test-detail', { ...stub, surfaces: ['detail-page'] })
		expect(listWidgetTypes()).toContain('test-dash')
		expect(listWidgetTypes()).not.toContain('test-detail')
		expect(listWidgetTypes('detail-page')).toContain('test-detail')
	})
})
