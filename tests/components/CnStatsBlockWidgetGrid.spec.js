/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `layout: "grid"` draws a stats-block as a title and its `stats` (stat tile
 * contents, any source kind) in columns inside one card: the board's
 * "Je week tot nu toe" card on PqMijnWerk.
 *
 * @spec openspec/changes/screens-stats-block-grid/specs/stats-block-grid/spec.md#requirement-a-stats-block-can-hold-stat-tiles-in-a-grid
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnStatsBlockWidget from '@/components/CnStatsBlockWidget/CnStatsBlockWidget.vue'

const stats = [
	{ label: 'Beantwoord', caption: 'deze week', source: { register: 'r', schema: 'ticket', metric: 'count', filter: { status: 'resolved' } } },
	{ label: 'Gemiddelde antwoordtijd', format: { style: 'decimal', decimals: 1, suffix: ' dagen' }, source: { kind: 'elapsed', register: 'r', schema: 'ticket', from: 'occurredAt', to: 'resolvedAt' } },
	{ label: 'Omgezet naar een zaak', source: { register: 'r', schema: 'ticket', metric: 'count', filter: { status: 'converted' } } },
]

function mountGrid(props = {}) {
	return mount(CnStatsBlockWidget, {
		propsData: { title: 'Je week tot nu toe', layout: 'grid', stats, ...props },
		mocks: { $router: { resolve: (to) => ({ href: '/#/' + to.name }), push: jest.fn() } },
	})
}

describe('CnStatsBlockWidget — layout grid', () => {
	let errorSpy

	beforeEach(() => {
		errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		axios.get.mockImplementation((url, config) => {
			if (url.includes('/aggregat') || (config && config.params && config.params.metric)) {
				return Promise.resolve({ data: { value: config.params.status === 'converted' ? 3 : 14 } })
			}
			// The elapsed source lists the objects: two tickets, 1 and 2 days.
			return Promise.resolve({ data: { value: 14, results: [
				{ occurredAt: '2026-10-01T09:00:00Z', resolvedAt: '2026-10-02T09:00:00Z' },
				{ occurredAt: '2026-10-01T09:00:00Z', resolvedAt: '2026-10-03T09:00:00Z' },
			] } })
		})
	})

	afterEach(() => {
		errorSpy.mockRestore()
	})

	it('draws one stat tile per entry of `stats` in one card, the title left to the card', async () => {
		const wrapper = mountGrid()
		await flushPromises()
		expect(wrapper.find('h2').exists()).toBe(false)
		const tiles = wrapper.findAll('[data-testid="cn-stats-block-grid-stat"]')
		expect(tiles).toHaveLength(3)
		expect(tiles[0].text()).toContain('Beantwoord')
		expect(wrapper.find('.cn-stats-block').exists()).toBe(false)
	})

	it('resolves a stat source kind the entries cannot: the elapsed average', async () => {
		const wrapper = mountGrid()
		await flushPromises()
		const tiles = wrapper.findAll('[data-testid="cn-stats-block-grid-stat"]')
		expect(tiles[1].text()).toMatch(/1[.,]5 dagen/)
	})

	it('lays the tiles out in `columns` columns, two by default, clamped to 1-4', async () => {
		expect(mountGrid().find('[data-testid="cn-stats-block-grid"]').attributes('style')).toContain('--cn-stats-block-columns: 2')
		expect(mountGrid({ columns: 3 }).find('[data-testid="cn-stats-block-grid"]').attributes('style')).toContain('--cn-stats-block-columns: 3')
		expect(mountGrid({ columns: 9 }).find('[data-testid="cn-stats-block-grid"]').attributes('style')).toContain('--cn-stats-block-columns: 4')
	})

	it('does not flag a grid without dataSource or entries as misconfigured', async () => {
		mountGrid()
		await flushPromises()
		const flagged = errorSpy.mock.calls.some((args) => String(args[0]).includes('Exactly one of'))
		expect(flagged).toBe(false)
	})

	it('keeps the KPI card when the layout is not grid', async () => {
		const wrapper = mountGrid({ layout: '', dataSource: { register: 'r', schema: 'ticket' } })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-stats-block-grid"]').exists()).toBe(false)
	})
})
