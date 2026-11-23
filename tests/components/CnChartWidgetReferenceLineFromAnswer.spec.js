/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A reference line that reads its value from the endpoint answer, and a year
 * bucket under a month format (DqDoorlooptijd "norm 28 dagen", "Jaar").
 *
 * @spec openspec/changes/chart-reference-line-from-answer/specs/chart-reference-line-from-answer/spec.md
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

const annotations = (ctx) => CnChartWidget.computed.referenceAnnotations.call({ hostTranslate: (s) => s, ...ctx })

describe('CnChartWidget: a reference line from the answer', () => {
	it('draws the line at the answer\'s value, the value in its label', () => {
		const lines = annotations({
			referenceLines: [{ valuePath: 'summary.normDays', label: 'norm {value} days' }],
			epData: { summary: { normDays: 28 } },
		})
		expect(lines).toHaveLength(1)
		expect(lines[0].y).toBe(28)
		expect(lines[0].label.text).toBe('norm 28 days')
	})

	it('draws nothing while the value is missing', () => {
		expect(annotations({ referenceLines: [{ valuePath: 'summary.normDays', label: 'norm {value} days' }], epData: { summary: { normDays: null } } })).toEqual([])
		expect(annotations({ referenceLines: [{ valuePath: 'summary.normDays' }], epData: null })).toEqual([])
	})

	it('keeps a fixed value as before', () => {
		expect(annotations({ referenceLines: [{ value: 100, label: '100% target' }], epData: null })[0].y).toBe(100)
	})
})

describe('CnChartWidget: a year bucket under a month format', () => {
	it('keeps "2026" as written', () => {
		const w = mount(CnChartWidget, { props: { type: 'line', series: [{ name: 'a', data: [1, 2] }], categories: ['2025', '2026'], categoryFormat: 'month' } })
		expect(w.vm.mergedOptions.xaxis.categories).toEqual(['2025', '2026'])
	})
})
