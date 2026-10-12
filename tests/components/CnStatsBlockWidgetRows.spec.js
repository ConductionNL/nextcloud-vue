/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `layout: "rows"` draws a stats-block as a title and label-left, number-right
 * rows (the board's "Mijn Zuiddrecht nu" card). Without it the KPI tiles are
 * unchanged.
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnStatsBlockWidget from '@/components/CnStatsBlockWidget/CnStatsBlockWidget.vue'

const entries = [
	{ title: 'Actieve accounts', register: 'r', schema: 'account', filter: { status: 'active' }, route: { name: 'Accounts' } },
	{ title: 'Actieve sessies', register: 'r', schema: 'session' },
	{ title: 'Niets', register: 'r', schema: 'none', hideWhenZero: true },
]

function mountRows(props = {}, provide = {}) {
	return mount(CnStatsBlockWidget, {
		propsData: { title: 'Mijn Zuiddrecht nu', layout: 'rows', entries, ...props },
		global: { provide },
		provide,
		mocks: { $router: { resolve: (to) => ({ href: '/#/' + to.name }), push: jest.fn() } },
	})
}

describe('CnStatsBlockWidget — layout rows', () => {
	beforeEach(() => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: { value: url.includes('/none/') ? 0 : (url.includes('/account/') ? 31 : 342) } }))
	})

	it('draws the title and one label/number row per entry, hiding a zero entry that asks to', async () => {
		const wrapper = mountRows()
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-stats-block-rows-title"]').text()).toBe('Mijn Zuiddrecht nu')
		const rows = wrapper.findAll('[data-testid="cn-stats-block-row"]')
		expect(rows).toHaveLength(2)
		expect(rows[0].text()).toContain('Actieve accounts')
		expect(rows[0].find('[data-testid="cn-stats-block-row-value"]').text()).toBe('31')
		expect(rows[1].find('[data-testid="cn-stats-block-row-value"]').text()).toBe('342')
		expect(wrapper.find('.cn-stats-block').exists()).toBe(false)
	})

	it('makes the label a link when the entry has a route', async () => {
		const wrapper = mountRows()
		await flushPromises()
		const rows = wrapper.findAll('[data-testid="cn-stats-block-row"]')
		expect(rows[0].find('a').exists()).toBe(true)
		expect(rows[1].find('a').exists()).toBe(false)
	})

	it('shows a dash for an entry whose count could not be read', async () => {
		axios.get.mockRejectedValue(new Error('x'))
		const wrapper = mountRows()
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-stats-block-row-value"]').text()).toBe('—')
	})

	it('keeps the KPI tiles without the layout', async () => {
		const wrapper = mountRows({ layout: '' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-stats-block-rows"]').exists()).toBe(false)
		expect(wrapper.findAll('.cn-stats-block').length).toBeGreaterThan(0)
	})
})
