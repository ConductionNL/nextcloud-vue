/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A `matrix` chart can carry a notice band under its table (`notice`), such
 * as DqHandhaving's "Advies: last onder dwangsom": `{cell}`, `{row}` and
 * `{column}` name the outlined cell, and a notice that names them waits for
 * an outlined cell.
 */
import { mount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const MATRIX = {
	type: 'matrix',
	categories: ['A: minor', 'B: moderate', 'C: severe'],
	series: [
		{ key: '1', name: 'Behaviour 1', data: ['Talk', 'Talk', 'Warning'] },
		{ key: '2', name: 'Behaviour 2', data: ['Talk', 'Warning', 'Order'] },
	],
	highlight: { row: '@object.behaviour', column: '@object.consequence', columnKeys: ['A', 'B', 'C'] },
}

/**
 * Mount a matrix for a record.
 *
 * @param {object} props Extra props.
 * @param {object} object The record.
 * @return {object} The wrapper.
 */
function mountMatrix(props, object = { behaviour: 2, consequence: 'C' }) {
	return mount(CnChartWidget, {
		props: { ...MATRIX, ...props },
		global: { provide: { cnWorkspaceContext: {}, cnObjectContext: { objectId: 'h1', object } } },
	})
}

describe('CnChartWidget matrix notice', () => {
	it('draws the notice under the matrix with the outlined cell filled in', () => {
		const w = mountMatrix({ notice: { title: 'Advice: {cell}', text: 'From behaviour {row} and consequence {column}.' } })
		const notice = w.find('[data-testid="cn-chart-widget-notice"]')
		expect(notice.exists()).toBe(true)
		expect(notice.find('strong').text()).toBe('Advice: Order')
		expect(notice.text()).toContain('From behaviour Behaviour 2 and consequence C: severe.')
		const html = w.find('[data-testid="cn-chart-widget-matrix"]').html()
		expect(html.indexOf('cn-chart-widget-notice')).toBeGreaterThan(html.indexOf('role="table"'))
	})

	it('waits for an outlined cell when the notice names one', () => {
		const w = mountMatrix({ notice: { title: 'Advice: {cell}' } }, {})
		expect(w.find('[data-testid="cn-chart-widget-notice"]').exists()).toBe(false)
	})

	it('shows a notice without placeholders on its own, as a warning when asked', () => {
		const w = mountMatrix({ notice: { text: 'The matrix of version 2.', variant: 'warning' } }, {})
		const notice = w.find('[data-testid="cn-chart-widget-notice"]')
		expect(notice.text()).toBe('The matrix of version 2.')
		expect(notice.attributes('type')).toBe('warning')
	})

	it('draws no notice without the key', () => {
		expect(mountMatrix({}).find('[data-testid="cn-chart-widget-notice"]').exists()).toBe(false)
	})
})
