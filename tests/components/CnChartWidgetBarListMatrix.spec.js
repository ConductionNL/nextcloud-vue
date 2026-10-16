/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnChartWidget's two presentations drawn without ApexCharts: `bar-list`
 * (DqDashboard "Zaken per status", DqTermijnen "Op tijd beslist per
 * zaaktype") and `matrix` (DqProcesanalyse "Dagen per fase"), including the
 * endpointSource `rowsPath` mapping that feeds a matrix.
 *
 * @spec openspec/changes/chart-bar-list-and-matrix/specs/chart-bar-list-and-matrix/spec.md
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountChart(props, extra = {}) {
	return mount(CnChartWidget, {
		props,
		global: { provide: { cnWorkspaceContext: {} }, ...extra },
	})
}

const rowsOf = (w) => w.findAll('[data-testid="cn-chart-widget-bar-row"]').map((row) => ({
	label: row.find('.cn-chart-widget__bar-label').text(),
	value: row.find('.cn-chart-widget__bar-value').text(),
	width: row.find('.cn-chart-widget__bar-fill').attributes('style'),
}))

describe('CnChartWidget bar-list', () => {
	it('draws a row per category with a track at its share of the largest value', () => {
		const w = mountChart({
			type: 'bar-list',
			categories: ['Received', 'In progress', 'Decision'],
			series: [{ name: 'Cases', data: [14, 19, 8] }],
			footnote: 'Click a bar to see the cases',
		})
		const rows = rowsOf(w)
		expect(rows.map((r) => [r.label, r.value])).toEqual([['Received', '14'], ['In progress', '19'], ['Decision', '8']])
		expect(rows[1].width).toContain('width: 100%')
		expect(rows[2].width).toMatch(/width: 42\.10/)
		expect(w.find('.cn-chart-widget__footnote').text()).toBe('Click a bar to see the cases')
		expect(w.find('[data-testid="cn-chart-widget-bar-list"] button').exists()).toBe(false)
	})

	it('measures against barMax and formats the value', () => {
		const w = mountChart({
			type: 'bar-list',
			categories: ['Woo request', 'Subsidy'],
			series: [{ name: 'On time', data: [88, 100] }],
			barMax: 100,
			valueFormat: 'percent',
		})
		const rows = rowsOf(w)
		expect(rows[0].width).toContain('width: 88%')
		expect(rows[0].value).toBe('88%')
	})

	it('makes rows buttons that drill down when the source declares a drilldown', async () => {
		const push = jest.fn(() => Promise.resolve())
		const w = mount(CnChartWidget, {
			props: {
				type: 'bar-list',
				categories: ['open', 'closed'],
				series: [{ name: 'n', data: [3, 1] }],
				dataSource: { register: 'r', schema: 's', drilldown: { route: 'Cases', filterParam: 'status' } },
			},
			global: { provide: { cnWorkspaceContext: {} }, mocks: { $router: { push } } },
		})
		const buttons = w.findAll('button[data-testid="cn-chart-widget-bar-row"]')
		expect(buttons).toHaveLength(2)
		await buttons[1].trigger('click')
		expect(push).toHaveBeenCalledWith({ name: 'Cases', query: { status: 'closed' } })
	})
})

describe('CnChartWidget matrix', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('draws a row per series and tints each cell by its share of the largest value', () => {
		const w = mountChart({
			type: 'matrix',
			categories: ['Intake', 'Review', 'Advice'],
			series: [{ name: 'Woo', data: [2, 9, 18] }, { name: 'Objection', data: [3, 14, null] }],
			valueFormat: { name: 'number', suffix: ' d' },
		})
		expect(w.findAll('[role="columnheader"]').map((c) => c.text())).toEqual(['', 'Intake', 'Review', 'Advice'])
		expect(w.findAll('[role="rowheader"]').map((c) => c.text())).toEqual(['Woo', 'Objection'])
		const cells = w.findAll('[data-testid="cn-chart-widget-matrix-cell"]')
		expect(cells.map((c) => c.text())).toEqual(['2 d', '9 d', '18 d', '3 d', '14 d', ''])
		const levels = cells.map((c) => (c.classes().find((k) => /--\d$/.test(k)) || '').slice(-1))
		expect(levels).toEqual(['1', '2', '4', '1', '3', '0'])
	})

	it('reads its rows from an endpoint through rowsPath', async () => {
		axios.get.mockResolvedValue({
			data: {
				phases: ['Intake', 'Review'],
				rows: [{ caseType: 'Woo', days: [2, 9] }, { caseType: 'Permit', days: [3, 14] }],
			},
		})
		const w = mountChart({
			type: 'matrix',
			endpointSource: { url: '/apps/dossiq/api/analytics/phase-days', labelsPath: 'phases', rowsPath: 'rows', rowLabelPath: 'caseType', rowValuesPath: 'days' },
		})
		await flush()
		await flush()
		expect(w.findAll('[role="rowheader"]').map((c) => c.text())).toEqual(['Woo', 'Permit'])
		expect(w.findAll('[data-testid="cn-chart-widget-matrix-cell"]').map((c) => c.text())).toEqual(['2', '9', '3', '14'])
	})
})
