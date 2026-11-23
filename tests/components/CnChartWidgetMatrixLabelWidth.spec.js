/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A matrix can give its row labels a fixed width (DqProcesanalyse "Dagen per
 * fase": a 240px case-type column), so a long label wraps instead of pushing
 * the cells right.
 *
 * @spec openspec/changes/chart-matrix-label-width/specs/chart-matrix-label-width/spec.md
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const MATRIX = { type: 'matrix', categories: ['Intake', 'Review'], series: [{ name: 'Omgevingsvergunning kleine bouwactiviteit', data: [2, 9] }] }

function grid(props) {
	const w = mount(CnChartWidget, { props: { ...MATRIX, ...props }, global: { provide: { cnWorkspaceContext: {} } } })
	return w.find('[role="table"], [role="grid"]').attributes('style') || ''
}

describe('CnChartWidget matrix label width', () => {
	it('gives the row labels the declared width', () => {
		expect(grid({ matrixLabelWidth: 240 })).toContain('grid-template-columns: 240px repeat(2, minmax(0, 1fr))')
	})

	it('keeps the content width without it, or for a width that is not a positive number', () => {
		for (const props of [{}, { matrixLabelWidth: 0 }, { matrixLabelWidth: -5 }]) {
			expect(grid(props)).toContain('grid-template-columns: minmax(120px, max-content) repeat(2, minmax(0, 1fr))')
		}
	})

	it('reaches the chart from a dashboard widget', () => {
		const page = fs.readFileSync(path.join(__dirname, '../../src/components/CnDashboardPage/CnDashboardPage.vue'), 'utf8')
		expect(page).toMatch(/'matrixLabelWidth',/)
	})
})
