/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnReportsPage growth: cards read from an endpoint (`cardsSource`),
 * a card that opens a modal (`action`), a card's format choice (`formats`),
 * a card's route query (`query`) and the search field (`search`).
 */

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => '/index.php' + url) }))

/**
 * Mount the page.
 *
 * @param {object} config The page config.
 * @param {object} [extra] `pushed` and `openModal` sinks.
 * @return {object} The wrapper.
 */
function mountPage(config, { pushed = [], openModal = jest.fn(), look = null } = {}) {
	return mount(CnReportsPage, {
		props: { page: { id: 'Reports', title: 'Reports', config }, look },
		global: {
			mocks: {
				$router: {
					push: (to) => {
						pushed.push(to)
						return Promise.resolve()
					},
					resolve: (to) => ({ href: `/resolved/${to.name}${to.query ? '?' + new URLSearchParams(to.query) : ''}` }),
				},
			},
			provide: { cnOpenModal: openModal },
		},
	})
}

const SOURCE_RESPONSE = {
	categories: { financial: 'Financial', tax: 'Tax' },
	types: [
		{ id: 'trial-balance', label: 'Trial balance', category: 'financial', formats: ['pdf', 'csv'] },
		{ id: 'vat-return', label: 'VAT return', category: 'tax', formats: ['xml'] },
	],
}

const SOURCE_CONFIG = {
	categories: { operational: 'Operational' },
	cards: [{ id: 'ledger', label: 'General ledger', category: 'operational', route: 'GeneralLedger', query: { subLedgerType: 'inventory' } }],
	cardsSource: {
		url: '/apps/books/api/reporting/types',
		path: 'types',
		categoriesPath: 'categories',
		action: { type: 'open-modal', modal: 'GenerateReportDialog', label: 'Generate', params: { mode: 'single' } },
	},
	search: true,
}

describe('CnReportsPage — cardsSource, action, formats, query, search', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: SOURCE_RESPONSE })
	})

	it('merges the endpoint cards after the declared ones, with their categories', async () => {
		const wrapper = mountPage(SOURCE_CONFIG)
		await flushPromises()

		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/books/api/reporting/types')
		const titles = wrapper.findAll('[data-testid="cn-report-card"]').map((c) => c.text())
		expect(titles[0]).toContain('General ledger')
		expect(titles[1]).toContain('Trial balance')
		expect(titles[2]).toContain('VAT return')
		const options = wrapper.findAll('[data-testid="cn-reports-category"] option').map((o) => o.text())
		expect(options).toEqual(expect.arrayContaining(['Operational', 'Financial', 'Tax']))
	})

	it('carries a card query into its route', async () => {
		const pushed = []
		const wrapper = mountPage(SOURCE_CONFIG, { pushed })
		await flushPromises()

		const ledger = wrapper.findAll('[data-testid="cn-report-card"]')[0]
		expect(ledger.attributes('href')).toBe('/resolved/GeneralLedger?subLedgerType=inventory')
	})

	it('opens the action modal with the card and the chosen format', async () => {
		const openModal = jest.fn()
		const wrapper = mountPage(SOURCE_CONFIG, { openModal })
		await flushPromises()

		const select = wrapper.find('[data-testid="cn-report-format-trial-balance"]')
		expect(select.findAll('option').map((o) => o.element.value)).toEqual(['pdf', 'csv'])
		await select.setValue('csv')
		await wrapper.find('[data-testid="cn-report-action-trial-balance"]').trigger('click')

		expect(openModal).toHaveBeenCalledWith('GenerateReportDialog', expect.objectContaining({
			mode: 'single',
			format: 'csv',
			report: expect.objectContaining({ id: 'trial-balance' }),
		}))
	})

	it('offers no format choice for a card with one format', async () => {
		const wrapper = mountPage(SOURCE_CONFIG)
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-report-format-vat-return"]').exists()).toBe(false)
	})

	it('filters the cards by the search text', async () => {
		const wrapper = mountPage(SOURCE_CONFIG)
		await flushPromises()

		await wrapper.find('[data-testid="cn-reports-search"]').setValue('vat')

		const titles = wrapper.findAll('[data-testid="cn-report-card"]').map((c) => c.text())
		expect(titles).toHaveLength(1)
		expect(titles[0]).toContain('VAT return')
	})

	it('keeps the declared cards when the source cannot be read', async () => {
		axios.get.mockRejectedValue(new Error('offline'))
		const wrapper = mountPage(SOURCE_CONFIG)
		await flushPromises()

		expect(wrapper.findAll('[data-testid="cn-report-card"]')).toHaveLength(1)
	})

	it('draws the action and format on the board look too', async () => {
		const openModal = jest.fn()
		const wrapper = mountPage(SOURCE_CONFIG, { openModal, look: 'board' })
		await flushPromises()

		await wrapper.find('[data-testid="cn-report-action-vat-return"]').trigger('click')
		expect(openModal).toHaveBeenCalledWith('GenerateReportDialog', expect.objectContaining({ format: 'xml' }))
		expect(wrapper.find('[data-testid="cn-reports-search"]').exists()).toBe(true)
	})
})
