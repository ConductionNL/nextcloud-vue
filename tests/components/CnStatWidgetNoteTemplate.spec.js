/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A stat tile's second caption line fills `{path}` placeholders from the
 * endpoint answer, as its caption does: "Not delivered: 5 held back, 1 failed".
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

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

describe('CnStatWidget: note placeholders', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('fills the note from the endpoint answer after translating it', async () => {
		axios.get.mockResolvedValue({ data: { rate: 20, responded: 10, delivered: 50, suppressed: 5, failed: 1 } })
		const wrapper = mount(CnStatWidget, {
			propsData: {
				content: {
					label: 'Survey response rate',
					endpointSource: { url: '/api/response-rate' },
					valueField: 'rate',
					caption: '{responded} of {delivered} delivered invitations answered',
					note: 'Not delivered: {suppressed} held back, {failed} failed',
				},
			},
			global: { provide: { cnWorkspaceContext: {}, cnTranslate: (s) => s.replace('Not delivered', 'Niet bezorgd') } },
		})
		await flush()

		expect(wrapper.find('[data-testid="cn-stat-widget-note"]').text()).toBe('Niet bezorgd: 5 held back, 1 failed')
		expect(wrapper.find('[data-testid="cn-stat-widget-caption"]').text()).toBe('10 of 50 delivered invitations answered')
	})

	it('keeps a note without placeholders as written', async () => {
		axios.get.mockResolvedValue({ data: { rate: 20 } })
		const wrapper = mount(CnStatWidget, {
			propsData: { content: { label: 'Rate', endpointSource: { url: '/api/r' }, valueField: 'rate', note: 'Last 30 days' } },
			global: { provide: { cnWorkspaceContext: {} } },
		})
		await flush()

		expect(wrapper.find('[data-testid="cn-stat-widget-note"]').text()).toBe('Last 30 days')
	})
})
