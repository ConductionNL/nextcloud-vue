/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnStatWidget `noPreviousText`: the sublabel shown instead of the trend when
 * `previousField` is set but there is no earlier value to compare with.
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
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

async function render(data, extra = {}, url = '/api/np') {
	axios.get.mockResolvedValue({ data })
	const wrapper = mount(CnStatWidget, {
		propsData: {
			content: {
				endpointSource: { url },
				valueField: 'v',
				previousField: 'prev',
				noPreviousText: 'No earlier period to compare with',
				...extra,
			},
		},
		stubs,
	})
	await flush()
	await wrapper.vm.$nextTick()
	return wrapper
}

describe('CnStatWidget noPreviousText', () => {
	beforeEach(() => {
		invalidateEndpointSourceCache()
		axios.get.mockReset()
	})

	it('shows the text when the previous value is null', async () => {
		const w = await render({ v: 10, prev: null }, {}, '/api/a')
		const el = w.find('[data-testid="cn-stat-widget-no-previous"]')
		expect(el.exists()).toBe(true)
		expect(el.text()).toBe('No earlier period to compare with')
		expect(w.find('[data-testid="cn-stat-widget-trend"]').exists()).toBe(false)
	})

	it('shows the text when the previous value is 0 or absent', async () => {
		const zero = await render({ v: 10, prev: 0 }, {}, '/api/b')
		expect(zero.find('[data-testid="cn-stat-widget-no-previous"]').exists()).toBe(true)
		const absent = await render({ v: 10 }, {}, '/api/c')
		expect(absent.find('[data-testid="cn-stat-widget-no-previous"]').exists()).toBe(true)
	})

	it('shows the trend, not the text, when there is a previous value', async () => {
		const w = await render({ v: 120, prev: 100 }, {}, '/api/d')
		expect(w.find('[data-testid="cn-stat-widget-trend"]').text()).toContain('+20.0%')
		expect(w.find('[data-testid="cn-stat-widget-no-previous"]').exists()).toBe(false)
	})

	it('renders nothing extra without noPreviousText', async () => {
		const w = await render({ v: 10, prev: null }, { noPreviousText: undefined }, '/api/e')
		expect(w.find('[data-testid="cn-stat-widget-no-previous"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-stat-widget-trend"]').exists()).toBe(false)
	})

	it('translates the text through the provided translator', async () => {
		axios.get.mockResolvedValue({ data: { v: 1, prev: 0 } })
		const w = mount(CnStatWidget, {
			propsData: {
				content: { endpointSource: { url: '/api/f' }, valueField: 'v', previousField: 'prev', noPreviousText: 'No earlier period to compare with' },
			},
			provide: { cnTranslate: (s) => `NL:${s}` },
			stubs,
		})
		await flush()
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-stat-widget-no-previous"]').text()).toBe('NL:No earlier period to compare with')
	})
})
