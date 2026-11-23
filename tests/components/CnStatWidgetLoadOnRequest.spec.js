/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A stat tile on an endpoint whose every read is recorded waits for the
 * reader to ask (`loadOn: "request"`), so a plain visit records nothing.
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
import { invalidateEndpointSourceCache, MIN_FORCED_LOADING_MS } from '../../src/composables/useEndpointSource.js'

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

describe('CnStatWidget: loadOn request', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('shows the request button instead of a value, and reads when pressed', async () => {
		axios.get.mockResolvedValue({ data: { total: 7 } })
		const wrapper = mount(CnStatWidget, {
			propsData: { content: { label: 'Reads', endpointSource: { url: '/api/recorded', loadOn: 'request', requestLabel: 'Count' }, valueField: 'total' } },
			global: { provide: { cnWorkspaceContext: {}, cnTranslate: (s) => `[${s}]` } },
		})
		await flush()

		expect(axios.get).not.toHaveBeenCalled()
		const button = wrapper.find('[data-testid="cn-endpoint-request"]')
		expect(button.text()).toBe('[Count]')

		await button.trigger('click')
		await flush()
		// A request is a forced read, which holds the spinner briefly.
		await new Promise((resolve) => setTimeout(resolve, MIN_FORCED_LOADING_MS + 20))
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(wrapper.find('[data-testid="cn-endpoint-request"]').exists()).toBe(false)
		expect(wrapper.text()).toContain('7')
	})
})
