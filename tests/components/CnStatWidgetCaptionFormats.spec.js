/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stat tile's caption token can carry a format, as a template token does:
 * board PqContract reads "per maand, uit € 42.000 per jaar" and "opzegdatum
 * 1 nov" from the contract's figures.
 *
 * @spec openspec/changes/stat-caption-formats/specs/stat-widget/spec.md#requirement-a-stat-caption-token-can-carry-a-format
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } }
const CAPTION = '[data-testid="cn-stat-widget-caption"]'

async function mountTile(content, payload) {
	axios.get.mockResolvedValue({ data: payload })
	const wrapper = mount(CnStatWidget, { propsData: { content }, stubs, provide: { cnWorkspaceContext: {} } })
	for (let i = 0; i < 4; i++) {
		await flush()
	}
	return wrapper
}

describe('CnStatWidget: a caption token with a format', () => {
	beforeEach(() => jest.clearAllMocks())

	it('formats a money token', async () => {
		const w = await mountTile({
			label: 'Recurring value',
			endpointSource: { url: '/apps/x/api/contracts/c1/figures' },
			valueField: 'monthlyValue',
			caption: 'per month, from {annualValue|currency:EUR} a year',
		}, { monthlyValue: 3500, annualValue: 42000 })
		expect(w.find(CAPTION).text()).toMatch(/^per month, from € ?42[.,]000([.,]00)? a year$/)
	})

	it('keeps a plain token as it was', async () => {
		const w = await mountTile({
			label: 'Invoiced this year',
			endpointSource: { url: '/apps/x/api/contracts/c2/figures' },
			valueField: 'invoicedThisYear',
			caption: '{invoicesSent} of {invoicesDue} invoices sent',
		}, { invoicedThisYear: 42000, invoicesSent: 1, invoicesDue: 1 })
		expect(w.find(CAPTION).text()).toBe('1 of 1 invoices sent')
	})
})
