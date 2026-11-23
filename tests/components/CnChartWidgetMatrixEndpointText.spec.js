/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A matrix fed through `endpointSource.rowsPath` keeps its text and empty
 * cells (DqProcesanalyse "Dagen per fase"): dossiq answers `"none"` for a
 * phase a case type never passes, which used to become 0 and read "0 d".
 *
 * @spec openspec/changes/chart-bar-list-and-matrix/specs/chart-bar-list-and-matrix/spec.md#requirement-a-chart-can-draw-a-matrix
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
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const PAYLOAD = {
	columns: ['Intake', 'Review', 'Advice'],
	rows: [
		{ label: 'Woo', values: [2, 'none', '7'] },
		{ label: 'Permit', values: [3, null, 0] },
	],
}

/**
 * Mount a chart over the endpoint payload and wait for the read.
 *
 * @param {object} props Extra props.
 * @param {object} [provide] Values to provide.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The mounted chart.
 */
async function mountMatrix(props, provide = {}) {
	axios.get.mockResolvedValue({ data: { phaseDays: { mean: PAYLOAD } } })
	const w = mount(CnChartWidget, {
		props: {
			type: 'matrix',
			valueFormat: { name: 'number', suffix: ' d' },
			endpointSource: {
				url: '/apps/dossiq/api/reports/process-mining',
				responsePath: 'phaseDays.mean',
				labelsPath: 'columns',
				rowsPath: 'rows',
				rowLabelPath: 'label',
				rowValuesPath: 'values',
			},
			...props,
		},
		global: { provide: { cnWorkspaceContext: {}, ...provide } },
	})
	await flush()
	await flush()
	return w
}

const cellTexts = (w) => w.findAll('[data-testid="cn-chart-widget-matrix-cell"]').map((c) => c.text())

describe('CnChartWidget matrix from an endpoint with text and empty cells', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('keeps a text cell as text and never reads it as "0 d"', async () => {
		const w = await mountMatrix({})
		expect(cellTexts(w)).toEqual(['2 d', 'none', '7 d', '3 d', '', '0 d'])
	})

	it('reads a text cell through the host translate', async () => {
		const w = await mountMatrix({}, { cnTranslate: (key) => (key === 'none' ? 'geen' : key) })
		expect(cellTexts(w)[1]).toBe('geen')
	})

	it('draws emptyCellLabel in a cell without a value', async () => {
		const w = await mountMatrix({ emptyCellLabel: 'none' }, { cnTranslate: (key) => (key === 'none' ? 'geen' : key) })
		expect(cellTexts(w)).toEqual(['2 d', 'geen', '7 d', '3 d', 'geen', '0 d'])
	})

	it('gives a text cell no value tint', async () => {
		const w = await mountMatrix({})
		const cells = w.findAll('[data-testid="cn-chart-widget-matrix-cell"]')
		expect(cells[1].classes().some((k) => /--[1-4]$/.test(k))).toBe(false)
		expect(cells[4].classes()).toContain('cn-chart-widget__matrix-cell--0')
	})

	it('still reads a text value as 0 on a line chart', async () => {
		axios.get.mockResolvedValue({ data: PAYLOAD })
		const w = mount(CnChartWidget, {
			props: {
				type: 'line',
				endpointSource: { url: '/apps/dossiq/api/x', labelsPath: 'columns', rowsPath: 'rows' },
			},
			global: { provide: { cnWorkspaceContext: {} } },
		})
		await flush()
		await flush()
		expect(w.vm.endpointChartData.series[0].data).toEqual([2, 0, 7])
		expect(w.vm.endpointChartData.series[1].data).toEqual([3, null, 0])
	})
})

describe('CnDashboardPage forwards emptyCellLabel to the chart', () => {
	it('passes content.emptyCellLabel through getChartProps', () => {
		const def = { id: 'pm', type: 'chart', content: { chartKind: 'matrix', emptyCellLabel: 'none' } }
		const ctx = { getWidgetDef: () => def }
		const out = CnDashboardPage.methods.getChartProps.call(ctx, { widgetId: 'pm' })
		expect(out.emptyCellLabel).toBe('none')
	})
})
