/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `matrix` widget: a categorical grid with row and column headers, a
 * tone per cell and the cell the record chose outlined (board DqHandhaving,
 * the LHS matrix: behaviour by consequence, the advised measure in each cell).
 */
import { mount } from '@vue/test-utils'

const LHS = {
	subtitle: 'The chosen cell is outlined',
	rowField: 'behaviour',
	columnField: 'consequence',
	columns: [{ value: 'A', label: 'Consequence A: minor' }, { value: 'B', label: 'Consequence B: moderate' }],
	rows: [
		{ value: '1', label: 'Behaviour 1: willing', cells: ['Talk', 'Warning'] },
		{ value: '2', label: 'Behaviour 2: unaware', cells: { A: 'Warning', B: { text: 'Penalty', tone: 'error' } } },
	],
	tones: { Talk: 'success', Warning: 'warning' },
}

const DUTCH = { Talk: 'Gesprek', Warning: 'Waarschuwing', 'Consequence A: minor': 'Gevolg A: gering' }

/**
 * @param {object} content The widget content.
 * @param {object|null} objectData The record.
 * @return {Promise<object>} The wrapper.
 */
async function mountMatrix(content, objectData = null) {
	const { default: CnMatrixWidget } = await import('../../src/components/CnMatrixWidget/CnMatrixWidget.vue')
	return mount(CnMatrixWidget, {
		props: { content, objectData },
		global: { provide: { cnTranslate: (s) => DUTCH[s] || s } },
	})
}

describe('CnMatrixWidget', () => {
	it('draws the column and row headers and every cell, translated', async () => {
		const w = await mountMatrix(LHS)
		expect(w.findAll('thead th[scope="col"]').map((th) => th.text())).toEqual(['Gevolg A: gering', 'Consequence B: moderate'])
		expect(w.findAll('tbody th[scope="row"]').map((th) => th.text())).toEqual(['Behaviour 1: willing', 'Behaviour 2: unaware'])
		expect(w.findAll('tbody td').map((td) => td.find('.cn-matrix-widget__text').text())).toEqual(['Gesprek', 'Waarschuwing', 'Waarschuwing', 'Penalty'])
		expect(w.find('.cn-matrix-widget__subtitle').text()).toBe('The chosen cell is outlined')
	})

	it('gives each cell its tone, from the cell or the tones map', async () => {
		const w = await mountMatrix(LHS)
		const tones = w.findAll('tbody td').map((td) => td.attributes('data-tone'))
		expect(tones).toEqual(['success', 'warning', 'warning', 'error'])
	})

	it('outlines the cell the record chose and says so', async () => {
		const w = await mountMatrix(LHS, { behaviour: '2', consequence: 'B' })
		const chosen = w.findAll('tbody td.cn-matrix-widget__cell--chosen')
		expect(chosen).toHaveLength(1)
		expect(chosen[0].find('.cn-matrix-widget__text').text()).toBe('Penalty')
		expect(chosen[0].attributes('aria-current')).toBe('true')
		expect(chosen[0].find('.hidden-visually').exists()).toBe(true)
	})

	it('chooses no cell without a record or a matching value', async () => {
		expect((await mountMatrix(LHS)).findAll('.cn-matrix-widget__cell--chosen')).toHaveLength(0)
		expect((await mountMatrix(LHS, { behaviour: '9', consequence: 'A' })).findAll('.cn-matrix-widget__cell--chosen')).toHaveLength(0)
	})

	it('takes a fixed chosen cell', async () => {
		const w = await mountMatrix({ ...LHS, rowField: '', columnField: '', selected: { row: '1', column: 'B' } })
		expect(w.find('.cn-matrix-widget__cell--chosen .cn-matrix-widget__text').text()).toBe('Waarschuwing')
	})

	it('is registered as the matrix widget type', async () => {
		const { getWidgetTypeEntry } = await import('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		await import('../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
		const { LIBRARY_WIDGET_KEYS } = await import('../../src/utils/libraryWidgetKeys.js')
		expect(getWidgetTypeEntry('matrix')).toBeTruthy()
		expect(LIBRARY_WIDGET_KEYS).toContain('matrix')
	})
})
