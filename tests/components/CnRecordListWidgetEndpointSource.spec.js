/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list and a card grid read their rows from an app endpoint
 * (endpoint-source-card-grid-record-list). Board ShBank draws the bank
 * accounts with the balances only `/api/v1/cash-position` has.
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import CnWidgetCardGrid from '../../src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const ACCOUNTS = [
	{ id: 'a1', name: 'ING zakelijk', iban: 'NL12INGB0001234567', balance: 412380.16 },
	{ id: 'a2', name: 'Rabobank', iban: 'NL44RABO0123456789', balance: 96004.22 },
]

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget endpointSource', () => {
	it('draws the rows at responsePath with its templates, and never asks OpenRegister', async () => {
		axios.get.mockResolvedValue({ data: { accounts: ACCOUNTS } })
		const w = mount(CnRecordListWidget, {
			props: { content: { endpointSource: { url: '/apps/shillinq/api/v1/cash-position', responsePath: 'accounts' }, title: '{name}', meta: '{iban}', headerCount: true } },
		})
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toBe('/nc/apps/shillinq/api/v1/cash-position')
		expect(w.findAll('.cn-record-list__title').map((i) => i.text())).toEqual(['ING zakelijk', 'Rabobank'])
		expect(w.findAll('.cn-record-list__meta').map((i) => i.text())).toEqual(['NL12INGB0001234567', 'NL44RABO0123456789'])
		const headers = w.emitted('header')
		expect(headers[headers.length - 1][0].count).toBe(2)
	})

	it('shows the error text when the endpoint fails, and the empty text for a payload that is not a list', async () => {
		axios.get.mockRejectedValueOnce(new Error('500'))
		const failed = mount(CnRecordListWidget, { props: { content: { endpointSource: { url: '/apps/shillinq/api/fail' }, title: '{name}' } } })
		await flush()
		expect(failed.find('[data-testid="cn-record-list-error"]').exists()).toBe(true)

		axios.get.mockResolvedValueOnce({ data: { accounts: 'none' } })
		const odd = mount(CnRecordListWidget, { props: { content: { endpointSource: { url: '/apps/shillinq/api/odd', responsePath: 'accounts' }, title: '{name}' } } })
		await flush()
		expect(odd.find('[data-testid="cn-record-list-empty"]').exists()).toBe(true)
	})
})

describe('CnWidgetCardGrid endpointSource', () => {
	it('draws a card per object the endpoint returns, unless objects are given', async () => {
		axios.get.mockResolvedValue({ data: { accounts: ACCOUNTS } })
		const stubs = { CnWidgetWrapper: { template: '<div><slot /></div>' }, CnObjectCard: { props: ['object'], template: '<div class="card">{{ object.name }}</div>' } }
		const fed = mount(CnWidgetCardGrid, { props: { endpointSource: { url: '/apps/shillinq/api/v1/cash-position', responsePath: 'accounts' } }, global: { stubs } })
		await flush()
		expect(fed.findAll('.card').map((c) => c.text())).toEqual(['ING zakelijk', 'Rabobank'])

		axios.get.mockClear()
		const given = mount(CnWidgetCardGrid, { props: { objects: [{ id: 'x', name: 'Kas' }], endpointSource: { url: '/apps/shillinq/api/other' } }, global: { stubs } })
		await flush()
		expect(given.findAll('.card').map((c) => c.text())).toEqual(['Kas'])
		expect(axios.get).not.toHaveBeenCalled()
	})
})
