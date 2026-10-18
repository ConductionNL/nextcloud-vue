/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Config strings CnDashboardPage draws go through the app's translate:
 * `editLabel` (DqDashboard "Edit layout", which dossiq has as "Indeling
 * aanpassen") and the `dateRange.presets[].label` ("Last 12 months",
 * DqProcesanalyse).
 */
const CnDashboardPage = require('../../src/components/CnDashboardPage/CnDashboardPage.vue').default

const DUTCH = { 'Edit layout': 'Indeling aanpassen', 'Last 12 months': 'Laatste 12 maanden', Done: 'Klaar' }
const translate = (key) => DUTCH[key] || key

describe('CnDashboardPage config labels', () => {
	it('draws editLabel and doneLabel through the app\'s translate', () => {
		const ctx = { editLabel: 'Edit layout', doneLabel: 'Done', effectiveTranslate: translate }
		expect(CnDashboardPage.computed.shownEditLabel.call(ctx)).toBe('Indeling aanpassen')
		expect(CnDashboardPage.computed.shownDoneLabel.call(ctx)).toBe('Klaar')
	})

	it('translates a manifest preset label', () => {
		const ctx = { dateRange: { presets: [{ id: 'last-365', label: 'Last 12 months', days: 365 }] }, effectiveTranslate: translate }
		expect(CnDashboardPage.computed.effectivePresets.call(ctx)[0].label).toBe('Laatste 12 maanden')
	})
})
