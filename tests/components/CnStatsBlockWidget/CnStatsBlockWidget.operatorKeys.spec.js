/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stats-block filter that spells its operator in the key
 * (`{ 'meetingDate[gte]': '2026-01-01' }`, the flat form a list page and a
 * lens use) reaches the /value aggregation as `filter[meetingDate][gte]`, the
 * nested form it reads. It went out as `filter[meetingDate[gte]]`, a field the
 * endpoint does not have, and the count answered 0 (decidiq Rapportages).
 *
 * @spec openspec/changes/screens-stats-block-operator-keys/specs/stats-block/spec.md#requirement-a-stats-block-filter-can-spell-its-operator-in-the-key
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const CnStatsBlockWidget = require('../../../src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue').default

const StatsBlockStub = {
	name: 'CnStatsBlock',
	props: ['title', 'count', 'countLabel', 'loading', 'variant', 'clickable', 'route', 'showZeroCount', 'horizontal'],
	template: '<div class="stats-stub" :data-title="title" :data-count="count" :data-variant="variant" :data-count-label="countLabel" :data-clickable="String(clickable)" />',
}

/**
 * Let pending promises (incl. the lazy axios/router imports) settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve))
	}
}

/**
 * Mount helper with a stubbed CnStatsBlock.
 *
 * @param {object} propsData Component props.
 * @return {import('@vue/test-utils').Wrapper} The mounted wrapper.
 */
function mountWidget(propsData) {
	return mount(CnStatsBlockWidget, {
		propsData,
		stubs: { CnStatsBlock: StatsBlockStub },
	})
}

beforeEach(() => {
	axios.get.mockReset()
})

describe('CnStatsBlockWidget: an operator spelled in a filter key', () => {
	it('sends an entry\'s `field[gte]` key as filter[field][gte]', async () => {
		axios.get.mockResolvedValue({ data: { value: 4 } })
		const wrapper = mountWidget({
			entries: [{ title: 'This year', register: 'decidiq', schema: 'meeting', filter: { 'meetingDate[gte]': '2026-01-01', 'meetingDate[lt]': '2027-01-01', status: 'held' } }],
		})
		await flush()
		const [, config] = axios.get.mock.calls[0]
		expect(config.params['filter[meetingDate][gte]']).toBe('2026-01-01')
		expect(config.params['filter[meetingDate][lt]']).toBe('2027-01-01')
		expect(config.params['filter[status]']).toBe('held')
		expect(Object.keys(config.params).some((key) => key.includes('[gte]]'))).toBe(false)
		expect(wrapper.find('.stats-stub').attributes('data-count')).toBe('4')
	})

	it('sends the single dataSource\'s `field[gte]` key the same way', async () => {
		axios.get.mockResolvedValue({ data: { value: 2 } })
		mountWidget({ dataSource: { register: 'decidiq', schema: 'decision', filter: { 'decidedOn[gte]': '2026-01-01' } } })
		await flush()
		const [, config] = axios.get.mock.calls[0]
		expect(config.params['filter[decidedOn][gte]']).toBe('2026-01-01')
	})
})
