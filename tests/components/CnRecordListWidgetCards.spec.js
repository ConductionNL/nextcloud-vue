/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list can draw its rows as cards (record-list-cards): board ShBank
 * draws the four bank accounts as framed cards with a name, a pill, the IBAN
 * and the balance as a large figure.
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
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
	{ bankAccountId: 'a1', accountName: 'ING zakelijk', iban: 'NL12INGB0001234567', ledgerBalance: '412.380,16', feed: 'psd2' },
	{ bankAccountId: 'a2', accountName: 'USD-rekening', iban: 'NL71ABNA0417164300', ledgerBalance: '48.200,00', feed: 'import' },
]

const CARDS = {
	endpointSource: { url: '/apps/shillinq/api/v1/cash-position', responsePath: 'accounts' },
	presentation: 'cards',
	title: '{accountName}',
	meta: '{iban}',
	trailing: 'EUR {ledgerBalance}',
	pill: { field: 'feed', labels: { psd2: 'PSD2', import: 'Afschrift importeren' }, colorMap: { psd2: 'success', import: 'warning' } },
	icon: 'Bank',
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: { accounts: ACCOUNTS } })
})

describe('CnRecordListWidget cards', () => {
	it('draws a card per row with the title, the pill, the meta line and the figure', async () => {
		const w = mount(CnRecordListWidget, { props: { content: CARDS } })
		await flush()
		expect(w.classes()).toContain('cn-record-list--cards')
		const cards = w.findAll('[data-testid="cn-record-list-card"]')
		expect(cards).toHaveLength(2)
		expect(cards[0].find('.cn-record-list__title').text()).toBe('ING zakelijk')
		expect(cards[0].find('.cn-record-list__meta').text()).toBe('NL12INGB0001234567')
		expect(cards[0].find('[data-testid="cn-record-list-card-value"]').text()).toBe('EUR 412.380,16')
		expect(cards[1].find('.cn-record-list__card-pills').text()).toContain('Afschrift importeren')
		expect(cards[0].find('.cn-record-list__card-icon').exists()).toBe(true)
		expect(w.find('.cn-record-list__chevron').exists()).toBe(false)
	})

	it('leaves the icon out when the list declares none, and links a card with a row route', async () => {
		const push = jest.fn()
		const w = mount(CnRecordListWidget, {
			props: { content: { ...CARDS, icon: undefined, rowRoute: 'BankAccount', rowIdField: 'bankAccountId' } },
			global: {
				mocks: { $router: { push, resolve: () => ({ href: '/x' }) } },
				stubs: { 'router-link': { props: ['to'], template: '<a class="rl" :data-to="JSON.stringify(to)"><slot /></a>' } },
			},
		})
		await flush()
		const card = w.find('[data-testid="cn-record-list-card"]')
		expect(card.classes()).toContain('cn-record-list__card--link')
		expect(JSON.parse(card.attributes('data-to'))).toEqual({ name: 'BankAccount', params: { id: 'a1' } })
		expect(w.find('.cn-record-list__card-icon').exists()).toBe(false)
	})

	it('keeps rows when presentation is absent or unknown', async () => {
		for (const presentation of [undefined, 'tiles']) {
			const w = mount(CnRecordListWidget, { props: { content: { ...CARDS, presentation } } })
			await flush()
			expect(w.classes()).toContain('cn-record-list--rows')
			expect(w.find('[data-testid="cn-record-list-card"]').exists()).toBe(false)
			expect(w.findAll('.cn-record-list__row')).toHaveLength(2)
		}
	})
})
