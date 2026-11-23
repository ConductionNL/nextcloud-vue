/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A matrix notice can name fields of the record the matrix read its cells
 * from (`@source.<field>`), so DqHandhaving's notice names the matrix it
 * applied ("Handhavingsmatrix Zuiddrecht versie 2").
 */
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({
	__esModule: true,
	fetchReferenceObjects: jest.fn(() => Promise.resolve([{ name: 'Handhavingsmatrix Zuiddrecht', version: 2, cells: [{ behaviour: 'b2', severity: 'c', intervention: 'order' }] }])),
}))

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const SOURCE = {
	register: 'app',
	schema: 'matrix',
	filter: { version: '@object.matrixVersion' },
	cellsPath: 'cells',
	rowField: 'behaviour',
	columnField: 'severity',
	valueField: 'intervention',
}

describe('CnChartWidget notice from the cell source', () => {
	it('fills @source values from the record the cells came from', async () => {
		const w = mount(CnChartWidget, {
			props: {
				type: 'matrix',
				cellSource: SOURCE,
				notice: { text: 'Outcome of {matrix} version {version}.', values: { matrix: '@source.name', version: '@source.version' } },
			},
			global: { provide: { cnWorkspaceContext: {}, cnObjectContext: { objectId: 'h1', object: { matrixVersion: 2 } } } },
		})
		await flush()
		expect(w.find('[data-testid="cn-chart-widget-notice"]').text()).toBe('Outcome of Handhavingsmatrix Zuiddrecht version 2.')
	})
})
