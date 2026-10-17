/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * facts-from-object: a facts card that shows another object (`source`, the
 * client of a ticket) can read one entry from the page's own object with
 * `from: "object"` (board PqTicket "Klant": the client's name and the ticket's
 * channel on one card). Without the flag an entry reads the source, as before.
 *
 * @spec openspec/changes/facts-from-object/specs/facts-widget/spec.md#requirement-an-entry-can-read-the-page-object-on-a-sourced-card
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { flushPromises, mount } from '@vue/test-utils'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

describe('CnFactsWidget: from object', () => {
	it('reads a from-object entry from the page object and the others from the source', async () => {
		mockGet.mockResolvedValue({ data: { id: 'k-1', name: 'Sanne de Vries', kind: 'Inwoner', channel: 'Mijn Zuiddrecht' } })
		const w = mount(CnFactsWidget, {
			props: {
				objectData: { id: 't-1', client: 'k-1', channel: 'Telefoon' },
				content: {
					source: { register: 'pipelinq', schema: 'client', id: '@object.client' },
					fields: [
						{ as: 'lead', title: 'name', subtitle: ['kind'], initialsPath: 'name' },
						{ path: 'channel', label: 'Channel', from: 'object' },
						{ path: 'channel', label: 'Client channel', key: 'client-channel' },
					],
				},
			},
			global: { provide: { cnTranslate: (key) => key }, stubs: { NcLoadingIcon: true } },
		})
		await flushPromises()
		expect(w.find('.cn-facts-widget__lead-title').text()).toBe('Sanne de Vries')
		expect(w.find('[data-testid="cn-fact-channel"] dd').text()).toBe('Telefoon')
		expect(w.find('[data-testid="cn-fact-client-channel"] dd').text()).toBe('Mijn Zuiddrecht')
	})
})
