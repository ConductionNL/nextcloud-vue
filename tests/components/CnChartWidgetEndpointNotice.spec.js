/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A chart on an endpoint shows the refusal sentence instead of an empty
 * chart, says when its answer is short, and words its empty state in the
 * reader's language.
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

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const endpointSource = {
	url: '/apps/app/api/reports/x',
	responsePath: 'distribution',
	labelsPath: 'label',
	series: [{ name: 'Cases', path: 'count' }],
}

/**
 * Mount a bar chart on the endpoint with a translator that marks its output.
 *
 * @param {object} [props] Extra props.
 * @return {object} The wrapper.
 */
function mountChart(props = {}) {
	return mount(CnChartWidget, {
		propsData: { type: 'bar', endpointSource, emptyLabel: 'No data available', ...props },
		global: { provide: { cnWorkspaceContext: {}, cnTranslate: (s) => `[${s}]` } },
	})
}

describe('CnChartWidget: endpoint notices', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('shows the refusal sentence instead of the empty state', async () => {
		axios.get.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403, data: { message: 'Only for controllers.' } } }))
		const wrapper = mountChart()
		await flush()

		expect(wrapper.find('[data-testid="cn-endpoint-notice-refused"]').text()).toBe('Only for controllers.')
		expect(wrapper.find('[data-testid="cn-chart-widget-empty"]').exists()).toBe(false)
	})

	it('says a short answer is short and still draws it', async () => {
		axios.get.mockResolvedValue({ data: { truncated: true, distribution: [{ label: '0-7', count: 2 }] } })
		const wrapper = mountChart()
		await flush()

		expect(wrapper.find('[data-testid="cn-endpoint-notice-truncated"]').exists()).toBe(true)
		expect(wrapper.vm.resolvedSeries).toEqual([{ name: 'Cases', data: [2] }])
	})

	it('names a series from the response at namePath', async () => {
		axios.get.mockResolvedValue({ data: { labels: { workingHours: 'Working hours' }, distribution: [{ label: 'Intake', count: 4 }] } })
		const wrapper = mountChart({ endpointSource: { ...endpointSource, series: [{ name: 'Hours', namePath: 'labels.workingHours', path: 'count' }] } })
		await flush()

		expect(wrapper.vm.resolvedSeries).toEqual([{ name: 'Working hours', data: [4] }])
	})

	it('waits for the request button with loadOn: request, then draws', async () => {
		axios.get.mockResolvedValue({ data: { distribution: [{ label: '0-7', count: 2 }] } })
		const wrapper = mountChart({ endpointSource: { ...endpointSource, loadOn: 'request' } })
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-chart-widget-empty"]').exists()).toBe(false)

		await wrapper.find('[data-testid="cn-endpoint-request"]').trigger('click')
		await flush()
		expect(wrapper.vm.resolvedSeries).toEqual([{ name: 'Cases', data: [2] }])
	})

	it('words the empty state through the app translate', async () => {
		axios.get.mockResolvedValue({ data: { distribution: [] } })
		const wrapper = mountChart()
		await flush()

		expect(wrapper.find('[data-testid="cn-chart-widget-empty"]').text()).toBe('[No data available]')
	})
})
