/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A count column with `aggregate.filterable` gets a funnel whose panel offers
 * only "Any" and "Yes": the related-row filter asks for at least one row and
 * the server has no "none" (DqOrganisaties "Lopende zaken").
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { total: 0, results: [] } })) },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const { mount, flushPromises } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const columns = [
	{ key: 'tradeName', label: 'Name' },
	{ key: 'openCases', label: 'Open cases', aggregate: { register: 'dossiq', schema: 'case', op: 'count', where: { requester: '@self.id', isFinalStatus: false }, filterable: true } },
]

describe('a related-row count filter on CnDataTable', () => {
	it('offers Any and Yes, and applies Yes as the related-row block', async () => {
		const wrapper = mount(CnDataTable, {
			props: { rows: [{ id: 'a', tradeName: 'Slagerij' }], columns, schema: { properties: { tradeName: { type: 'string' } } }, filterable: true },
			global: { stubs: { CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } } },
			attachTo: document.body,
		})
		const header = wrapper.findAll('th').find((w) => w.text().includes('Open cases'))
		await header.find('[data-testid="cn-table-header-filter"]').trigger('click')
		const options = [...document.querySelectorAll('[data-testid="cn-column-filter-option"]')]
		expect(options.map((o) => o.parentElement.textContent.trim())).toEqual(['Any', 'Yes'])
		options[1].click()
		options[1].dispatchEvent(new Event('change'))
		document.querySelector('[data-testid="cn-column-filter-apply"]').click()
		await flushPromises()
		expect(wrapper.emitted('column-filter')[0][0]).toEqual({ key: 'openCases', params: { '_related[case][requester][isFinalStatus]': ['false'] } })
		wrapper.unmount()
	})
})
