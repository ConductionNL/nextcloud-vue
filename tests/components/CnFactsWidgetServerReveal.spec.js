/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContact: the BSN arrives masked; Tonen asks the server for it, uncached,
 * so the server can check and record every look.
 *
 * @spec openspec/changes/facts-reveal-from-server/specs/facts-widget/spec.md#requirement-a-masked-fact-can-be-revealed-by-the-server
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

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const URL = '/apps/openregister/api/objects/dossiq/brpPerson/@objectId?_reveal=citizenServiceNumber'

function mountWidget(reveal) {
	return mount(CnFactsWidget, {
		props: {
			content: { fields: [{ label: 'BSN', path: 'citizenServiceNumber', format: 'masked', reveal }] },
			objectData: { id: 'p-1', citizenServiceNumber: '*****7609' },
			objectId: 'p-1',
		},
	})
}

beforeEach(() => mockGet.mockReset())

describe('CnFactsWidget server reveal', () => {
	it('asks the server on Show and shows what it answered', async () => {
		mockGet.mockResolvedValue({ data: { id: 'p-1', citizenServiceNumber: '123457609' } })
		const w = mountWidget({ url: URL })
		expect(w.text()).toContain('*****7609')
		await w.find('[data-testid="cn-fact-reveal-citizenServiceNumber"]').trigger('click')
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(mockGet.mock.calls[0][0]).toBe('/index.php/apps/openregister/api/objects/dossiq/brpPerson/p-1?_reveal=citizenServiceNumber')
		expect(w.text()).toContain('123457609')
		expect(w.emitted('reveal')).toHaveLength(1)
	})

	it('keeps the mask and says so when the server refuses', async () => {
		mockGet.mockRejectedValue(new Error('403'))
		const w = mountWidget({ url: URL })
		await w.find('[data-testid="cn-fact-reveal-citizenServiceNumber"]').trigger('click')
		await flushPromises()
		expect(w.text()).toContain('*****7609')
		expect(w.find('[data-testid="cn-fact-reveal-error-citizenServiceNumber"]').exists()).toBe(true)
		expect(w.emitted('reveal')).toBeUndefined()
	})

	it('reveal: true still unmasks the record\'s own value without a request', async () => {
		const w = mount(CnFactsWidget, {
			props: { content: { fields: [{ label: 'BSN', path: 'bsn', format: 'masked', reveal: true }] }, objectData: { bsn: '123457609' } },
		})
		await w.find('[data-testid="cn-fact-reveal-bsn"]').trigger('click')
		expect(w.text()).toContain('123457609')
		expect(mockGet).not.toHaveBeenCalled()
	})
})
