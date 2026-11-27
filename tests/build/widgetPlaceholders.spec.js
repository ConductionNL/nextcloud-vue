/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-4
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import pkg from '../../package.json'
const { collectWidgetPlaceholders, writeWidgetPlaceholders } = require('../../scripts/build-widget-placeholders.js')
import { dashboardWidgetRegistry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { normalizeWidgetPlaceholder } from '../../src/utils/resolveWidgetPlaceholder.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
// Registered by the barrel (src/index.js), outside the aggregator.
import '../../src/components/CnObjectPresenceWidget/index.js'

describe('widget-placeholders.json', () => {
	it('maps every registered library widget type to the placeholder its registration declares', () => {
		const fromRegistry = Object.fromEntries(Object.keys(dashboardWidgetRegistry).sort()
			.map((type) => [type, normalizeWidgetPlaceholder(dashboardWidgetRegistry[type].placeholder)]))
		expect(collectWidgetPlaceholders()).toEqual(fromRegistry)
	})

	it('maps object-table to rows', () => {
		expect(collectWidgetPlaceholders()['object-table']).toEqual({ shape: 'rows' })
	})

	it('reads a shape with a count and refuses an unknown shape', () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-placeholders-'))
		const dir = path.join(root, 'src', 'components', 'CnX')
		fs.mkdirSync(dir, { recursive: true })
		fs.writeFileSync(path.join(dir, 'index.js'), "registerDashboardWidget('x-list', {\n\tplaceholder: { shape: 'rows', count: 5 },\n\trenderer: X,\n})\n")
		expect(collectWidgetPlaceholders(root)).toEqual({ 'x-list': { shape: 'rows', count: 5 } })
		const out = writeWidgetPlaceholders(root)
		expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toEqual({ 'x-list': { shape: 'rows', count: 5 } })

		fs.writeFileSync(path.join(dir, 'index.js'), "registerDashboardWidget('x-bad', {\n\tplaceholder: 'grid',\n})\n")
		expect(() => collectWidgetPlaceholders(root)).toThrow('not one of')
		fs.rmSync(root, { recursive: true, force: true })
	})

	it('is exported with the placeholder CSS, and the build writes it', () => {
		expect(pkg.exports['./widget-placeholders.json']).toBe('./dist/widget-placeholders.json')
		expect(pkg.exports['./css/*']).toBe('./css/*')
		expect(fs.existsSync(path.join(__dirname, '../../css/widget-placeholder.css'))).toBe(true)
		expect(pkg.scripts.build).toContain('node scripts/build-widget-placeholders.js')
	})
})
