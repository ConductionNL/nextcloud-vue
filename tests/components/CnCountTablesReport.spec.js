/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCountTablesReport draws an endpoint report about one record as
 * name/count tables, says what is empty, and shows a refusal instead of the
 * last answer.
 */

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

import { flushPromises, mount } from '@vue/test-utils'
import CnCountTablesReport, { countTablesUrl } from '../../src/components/CnCountTablesReport/CnCountTablesReport.vue'

const PROPS = {
	url: '/apps/dossiq/api/cases/{id}/reports/mail-parties',
	objectId: 'case 1',
	lists: [
		{ key: 'senders', label: 'Sender', nameField: 'address' },
		{ key: 'domains', label: 'Domain', nameField: 'domain' },
	],
	totals: 'Mails collected: {mails}. Headers that could not be read: {unreadable}.',
	emptyField: 'mails',
	emptyText: 'No mail collected on this case',
	csvParam: 'format=csv',
}

const ANSWER = {
	mails: 3,
	unreadable: 1,
	senders: [{ address: 'a@example.org', count: 2 }],
	domains: [{ domain: 'example.org', count: 3 }],
}

/**
 * Mount, choose Show, and let the read settle.
 *
 * @param {object} props The props.
 * @return {Promise<object>} The wrapper.
 */
async function shown(props = PROPS) {
	const wrapper = mount(CnCountTablesReport, { props, global: { provide: { cnTranslate: (s) => s } } })
	await wrapper.find('[data-testid="cn-count-tables-report-show"]').trigger('click')
	await flushPromises()
	return wrapper
}

describe('CnCountTablesReport', () => {
	beforeEach(() => mockGet.mockReset())

	it('builds the record url, and the CSV url with the csv query', () => {
		expect(countTablesUrl(PROPS.url, 'case 1')).toBe('/index.php/apps/dossiq/api/cases/case%201/reports/mail-parties')
		expect(countTablesUrl(PROPS.url, 'c1', 'format=csv')).toBe('/index.php/apps/dossiq/api/cases/c1/reports/mail-parties?format=csv')
	})

	it('draws one name/count table per list and fills the totals sentence', async () => {
		mockGet.mockResolvedValue({ data: ANSWER })
		const wrapper = await shown()

		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/dossiq/api/cases/case%201/reports/mail-parties')
		expect(wrapper.find('[data-testid="cn-count-tables-report-totals"]').text())
			.toBe('Mails collected: 3. Headers that could not be read: 1.')
		const senders = wrapper.find('[data-testid="cn-count-tables-report-senders"]')
		expect(senders.find('th').text()).toBe('Sender')
		expect(senders.findAll('tbody td').map((td) => td.text())).toEqual(['a@example.org', '2'])
		expect(wrapper.find('[data-testid="cn-count-tables-report-csv"]').exists()).toBe(true)
	})

	it('says there is nothing to count when the empty field is zero', async () => {
		mockGet.mockResolvedValue({ data: { mails: 0, unreadable: 0, senders: [], domains: [] } })
		const wrapper = await shown()

		expect(wrapper.html()).toContain('No mail collected on this case')
		expect(wrapper.find('[data-testid="cn-count-tables-report-csv"]').exists()).toBe(false)
	})

	it('shows the refusal sentence and drops the last answer', async () => {
		mockGet.mockResolvedValueOnce({ data: ANSWER })
		const wrapper = await shown()
		mockGet.mockRejectedValueOnce(Object.assign(new Error('403'), { response: { status: 403, data: { message: 'You may not read this case.' } } }))
		await wrapper.find('[data-testid="cn-count-tables-report-show"]').trigger('click')
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-count-tables-report-refusal"]').text()).toBe('You may not read this case.')
		expect(wrapper.find('[data-testid="cn-count-tables-report-senders"]').exists()).toBe(false)
	})

	it('words a failure without a server sentence', async () => {
		mockGet.mockRejectedValue(new Error('Network Error'))
		const wrapper = await shown()

		expect(wrapper.find('[data-testid="cn-count-tables-report-refusal"]').text()).toBe('The report could not be read.')
	})

	it('cannot be asked without a record', () => {
		const wrapper = mount(CnCountTablesReport, { props: { ...PROPS, objectId: '' } })
		expect(wrapper.find('[data-testid="cn-count-tables-report-show"]').attributes('disabled')).toBeDefined()
	})
})
