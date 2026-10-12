/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every widget the dashboard registrar wires in is reachable from the package
 * entry, or is named below with the reason it is not yet.
 *
 * CnBannerWidget was registered under the `banner` type key but never exported,
 * so an app's `import { CnBannerWidget }` resolved to undefined, Vue rendered
 * an unknown element and the dashboard grid kept an empty cell for it. This
 * spec reads the registrar, derives each widget component it imports, and
 * asserts the package entry exports it.
 */
const fs = require('fs')
const path = require('path')
const root = require('../../src/index.js')

const REGISTRAR = path.resolve(__dirname, '../../src/components/CnWidgetGrid/registerDashboardWidgets.js')

/**
 * Widgets that are registered but not exported yet. Each is resolved by its
 * type key only. Exporting one means deleting its line here, so this list can
 * only shrink: a NEW widget missing from the entry fails the spec.
 */
const NOT_EXPORTED_YET = [
	'CnConversationWidget',
	'CnDocumentReviewWidget',
	'CnNextStepWidget',
	'CnAuditTrailWidget',
	'CnKbSearchWidget',
	'CnInteractionFormWidget',
	'CnWorkspaceFilterWidget',
]

/**
 * The widget component names the registrar imports.
 *
 * @return {string[]} Component names ending in `Widget`.
 */
function registeredWidgets() {
	const source = fs.readFileSync(REGISTRAR, 'utf8')
	const names = new Set()
	for (const match of source.matchAll(/import (?:\w+ from )?'\.\.\/([^/']+)\/([^']+)'/g)) {
		const base = match[2].replace(/\.(vue|js)$/, '')
		names.add(/^(index|dashboardRegistration)$/.test(base) ? match[1] : base)
	}
	return [...names].filter((name) => /^Cn\w+Widget$/.test(name))
}

describe('registered dashboard widgets are exported from the package entry', () => {
	const widgets = registeredWidgets()

	it('finds the widgets the registrar imports', () => {
		expect(widgets).toContain('CnBannerWidget')
		expect(widgets.length).toBeGreaterThan(30)
	})

	it.each(widgets.filter((name) => !NOT_EXPORTED_YET.includes(name)))('exports %s', (name) => {
		expect(root[name]).toBeDefined()
	})

	it.each(NOT_EXPORTED_YET)('%s is still unexported (remove it from the list once it is)', (name) => {
		expect(widgets).toContain(name)
		expect(root[name]).toBeUndefined()
	})

	it('exports CnBannerWidget as the component the banner type renders', () => {
		const { getWidgetTypeEntry } = root
		expect(root.CnBannerWidget).toBeDefined()
		expect(getWidgetTypeEntry('banner').renderer).toBe(root.CnBannerWidget)
	})
})
