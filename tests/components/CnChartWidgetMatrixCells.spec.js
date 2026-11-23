/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A `matrix` chart reads its cells from records in a register (`cellSource`):
 * one record per cell, the filter token-resolved against the record on a
 * detail page, and `highlight` outlining the record's cell.
 *
 * @spec openspec/changes/matrix-cell-records/specs/matrix-cell-records/spec.md
 */
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({
	__esModule: true,
	fetchReferenceObjects: jest.fn(),
}))

import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import { fetchReferenceObjects } from '../../src/utils/boardReferenceColumns.js'

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const CELLS = [
	{ behaviour: '1', consequence: 'A', step: 'talk' },
	{ behaviour: '1', consequence: 'B', step: 'warning' },
	{ behaviour: '2', consequence: 'A', step: 'warning' },
	{ behaviour: '2', consequence: 'B', step: 'order' },
]

const SOURCE = {
	register: 'app',
	schema: 'matrix-cell',
	filter: { matrix: '@object.matrixVersion' },
	rowField: 'behaviour',
	columnField: 'consequence',
	valueField: 'step',
	rowLabels: { 1: 'Behaviour 1', 2: 'Behaviour 2' },
	columnLabels: { A: 'Minor', B: 'Severe' },
	valueLabels: { talk: 'Talk', warning: 'Warning', order: 'Order' },
}

function mountMatrix(object, props = {}) {
	return mount(CnChartWidget, {
		props: {
			type: 'matrix',
			cellSource: SOURCE,
			colorMap: { talk: 'success', warning: 'warning', order: 'error' },
			highlight: { row: '@object.behaviour', column: '@object.consequence' },
			...props,
		},
		global: { provide: { cnWorkspaceContext: {}, cnObjectContext: object } },
	})
}

beforeEach(() => {
	fetchReferenceObjects.mockReset()
	fetchReferenceObjects.mockResolvedValue(CELLS)
})

describe('CnChartWidget matrix from cell records', () => {
	it('lists the cells with the filter resolved and lays them out with labels and tones', async () => {
		const w = mountMatrix({ objectId: 'h1', object: { matrixVersion: 'v2', behaviour: '2', consequence: 'B' } })
		await flush()
		expect(fetchReferenceObjects).toHaveBeenCalledWith({ register: 'app', schema: 'matrix-cell', filter: { matrix: 'v2' }, limit: 500 })
		expect(w.findAll('[role="rowheader"]').map((c) => c.text())).toEqual(['Behaviour 1', 'Behaviour 2'])
		expect(w.findAll('[role="columnheader"]').map((c) => c.text())).toEqual(['', 'Minor', 'Severe'])
		const cells = w.findAll('[data-testid="cn-chart-widget-matrix-cell"]')
		expect(cells.map((c) => c.text())).toEqual(['Talk', 'Warning', 'Warning', 'Order'])
		expect(cells[3].classes()).toContain('cn-chart-widget__matrix-cell--error')
		expect(cells.filter((c) => c.attributes('aria-current') === 'true').map((c) => c.text())).toEqual(['Order'])
	})

	it('reads the row and column labels through the host translate, as the cells are', async () => {
		const dutch = { 'Behaviour 1': 'Gedrag 1', 'Behaviour 2': 'Gedrag 2', Minor: 'Gering', Severe: 'Ernstig' }
		const w = mount(CnChartWidget, {
			props: { type: 'matrix', cellSource: SOURCE, highlight: { row: '@object.behaviour', column: '@object.consequence' } },
			global: { provide: { cnWorkspaceContext: {}, cnObjectContext: { objectId: 'h1', object: { matrixVersion: 'v2', behaviour: '2', consequence: 'B' } }, cnTranslate: (key) => dutch[key] || key } },
		})
		await flush()
		expect(w.findAll('[role="rowheader"]').map((c) => c.text())).toEqual(['Gedrag 1', 'Gedrag 2'])
		expect(w.findAll('[role="columnheader"]').map((c) => c.text())).toEqual(['', 'Gering', 'Ernstig'])
		expect(w.findAll('[data-testid="cn-chart-widget-matrix-cell"]').filter((c) => c.attributes('aria-current') === 'true').map((c) => c.text())).toEqual(['Order'])
	})

	it('waits while a filter token is unresolved and fetches once the record names it', async () => {
		const ctx = ref({ objectId: 'h1', object: { behaviour: '1', consequence: 'A' } })
		const w = mountMatrix(ctx)
		await flush()
		expect(fetchReferenceObjects).not.toHaveBeenCalled()
		ctx.value = { objectId: 'h1', object: { matrixVersion: 'v3', behaviour: '1', consequence: 'A' } }
		await flush()
		expect(fetchReferenceObjects).toHaveBeenCalledWith(expect.objectContaining({ filter: { matrix: 'v3' } }))
		expect(w.findAll('[data-testid="cn-chart-widget-matrix-cell"]').filter((c) => c.attributes('aria-current') === 'true').map((c) => c.text())).toEqual(['Talk'])
	})

	it('draws the static series when there is no cellSource', async () => {
		const w = mountMatrix(null, { cellSource: null, categories: ['A'], series: [{ name: 'Row', data: ['talk'] }] })
		await flush()
		expect(fetchReferenceObjects).not.toHaveBeenCalled()
		expect(w.findAll('[role="rowheader"]').map((c) => c.text())).toEqual(['Row'])
	})
})

describe('CnChartWidget matrix inside one record', () => {
	const MATRIX = {
		version: 'v2',
		behaviourAxis: ['2', '1'],
		severityAxis: ['A', 'C'],
		cells: [
			{ behaviour: '1', severity: 'A', actorType: 'company', intervention: 'talk' },
			{ behaviour: '2', severity: 'C', actorType: 'company', intervention: 'order' },
			{ behaviour: '2', severity: 'C', actorType: 'person', intervention: 'warning' },
		],
	}
	const RECORD_SOURCE = {
		register: 'app',
		schema: 'matrix',
		filter: { version: '@object.matrixVersion' },
		fallbackFilter: { active: true },
		cellsPath: 'cells',
		cellFilter: { actorType: '@object.actorType' },
		rowField: 'behaviour',
		columnField: 'severity',
		valueField: 'intervention',
		rowOrderPath: 'behaviourAxis',
		columnOrderPath: 'severityAxis',
		valueLabels: SOURCE.valueLabels,
	}
	const object = { objectId: 'h1', object: { matrixVersion: 'v2', actorType: 'company', behaviour: '2', severity: 'C' } }

	it('reads one record, narrows its cells to the record\'s slice, orders by its axes and outlines the record\'s cell', async () => {
		fetchReferenceObjects.mockResolvedValue([MATRIX])
		const w = mountMatrix(object, { cellSource: RECORD_SOURCE, highlight: { row: '@object.behaviour', column: '@object.severity' } })
		await flush()
		expect(fetchReferenceObjects).toHaveBeenCalledWith({ register: 'app', schema: 'matrix', filter: { version: 'v2' }, limit: 1 })
		expect(w.findAll('[role="rowheader"]').map((c) => c.text())).toEqual(['2', '1'])
		expect(w.findAll('[role="columnheader"]').map((c) => c.text())).toEqual(['', 'A', 'C'])
		const cells = w.findAll('[data-testid="cn-chart-widget-matrix-cell"]')
		expect(cells.map((c) => c.text())).toEqual(['', 'Order', 'Talk', ''])
		expect(cells.filter((c) => c.attributes('aria-current') === 'true').map((c) => c.text())).toEqual(['Order'])
	})

	it('falls back to fallbackFilter when the version finds no record', async () => {
		fetchReferenceObjects.mockResolvedValueOnce([]).mockResolvedValueOnce([MATRIX])
		const w = mountMatrix(object, { cellSource: RECORD_SOURCE })
		await flush()
		expect(fetchReferenceObjects).toHaveBeenLastCalledWith({ register: 'app', schema: 'matrix', filter: { active: true }, limit: 1 })
		expect(w.findAll('[role="rowheader"]').map((c) => c.text())).toEqual(['2', '1'])
	})
})
