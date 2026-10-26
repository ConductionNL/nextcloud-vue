/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * ISO week categories as short weeks (DqProcesanalyse and DqDoorlooptijd
 * Doorstroom: "w30", "w31").
 *
 * @spec openspec/changes/chart-week-categories/specs/chart-week-categories/spec.md#requirement-a-chart-can-name-iso-week-categories-as-short-weeks
 */

jest.mock('../../src/composables/useDataSource.js', () => ({
	useDataSource: () => ({
		data: { value: null },
		loading: { value: false },
		error: { value: null },
		refetch: jest.fn(),
	}),
}))

import { mount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

describe('CnChartWidget week categories', () => {
	it('writes ISO week keys as short weeks and leaves the rest', () => {
		const w = mount(CnChartWidget, { props: { type: 'line', series: [{ name: 'Closed', data: [1, 2, 3, 4] }], categories: ['2026-W30', '2026-W31', '2026-W05', 'Q3'], categoryFormat: 'week' } })
		expect(w.vm.mergedOptions.xaxis.categories).toEqual(['w30', 'w31', 'w5', 'Q3'])
	})
})
