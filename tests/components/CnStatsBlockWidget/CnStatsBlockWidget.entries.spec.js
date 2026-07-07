/**
 * Tests for CnStatsBlockWidget multi-entry mode (list-widget-enrichment
 * "stats-block supports multi-entry declarative sources"):
 * - entries[] renders N CnStatsBlock KPIs in one card, each self-fetched
 *   over the REST /value aggregation
 * - hideWhenZero omits an entry whose resolved count is 0
 * - per-entry route / variant / countLabel forwarding
 * - single-dataSource path unchanged (backward compatibility)
 * - "exactly one of dataSource / entries" flagged with a console error
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

describe('CnStatsBlockWidget — multi-entry mode', () => {
	it('renders one CnStatsBlock per entry, each with its own fetched count', async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes('/expiring/')) return Promise.resolve({ data: { value: 3 } })
			if (url.includes('/review/')) return Promise.resolve({ data: { value: 7 } })
			return Promise.resolve({ data: { value: 0 } })
		})
		const wrapper = mountWidget({
			entries: [
				{ title: 'Expiring soon', register: 'docudesk', schema: 'expiring', variant: 'warning', countLabel: 'documents' },
				{ title: 'Review required', register: 'docudesk', schema: 'review', route: { name: 'reviews' } },
			],
		})
		await flush()
		const blocks = wrapper.findAll('.stats-stub')
		expect(blocks.length).toBe(2)
		expect(blocks.at(0).attributes('data-title')).toBe('Expiring soon')
		expect(blocks.at(0).attributes('data-count')).toBe('3')
		expect(blocks.at(0).attributes('data-variant')).toBe('warning')
		expect(blocks.at(0).attributes('data-count-label')).toBe('documents')
		expect(blocks.at(1).attributes('data-title')).toBe('Review required')
		expect(blocks.at(1).attributes('data-count')).toBe('7')
		expect(blocks.at(1).attributes('data-clickable')).toBe('true')
	})

	it('fetches each entry over the REST /value aggregation with filter params', async () => {
		axios.get.mockResolvedValue({ data: { value: 1 } })
		window.OC = { currentUser: 'alice' }
		mountWidget({
			entries: [
				{ register: 'pipelinq', schema: 'case', filter: { assignee: '@me', value: { gt: 10 } } },
			],
		})
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		const [url, config] = axios.get.mock.calls[0]
		expect(url).toContain('/apps/openregister/api/objects/aggregations/pipelinq/case/value')
		expect(config.params.metric).toBe('count')
		expect(config.params['filter[assignee]']).toBe('alice')
		expect(config.params['filter[value][gt]']).toBe(10)
	})

	it('omits an entry whose resolved count is 0 when hideWhenZero is set', async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes('/archived/')) return Promise.resolve({ data: { value: 0 } })
			return Promise.resolve({ data: { value: 5 } })
		})
		const wrapper = mountWidget({
			entries: [
				{ title: 'Active', register: 'docudesk', schema: 'active' },
				{ title: 'Archived', register: 'docudesk', schema: 'archived', hideWhenZero: true },
			],
		})
		await flush()
		const blocks = wrapper.findAll('.stats-stub')
		expect(blocks.length).toBe(1)
		expect(blocks.at(0).attributes('data-title')).toBe('Active')
	})

	it('keeps a zero-count entry WITHOUT hideWhenZero visible', async () => {
		axios.get.mockResolvedValue({ data: { value: 0 } })
		const wrapper = mountWidget({
			entries: [{ title: 'Archived', register: 'docudesk', schema: 'archived' }],
		})
		await flush()
		expect(wrapper.findAll('.stats-stub').length).toBe(1)
		expect(wrapper.find('.stats-stub').attributes('data-count')).toBe('0')
	})

	it('applies the multi-entry layout modifier class', async () => {
		axios.get.mockResolvedValue({ data: { value: 1 } })
		const wrapper = mountWidget({
			entries: [{ register: 'r', schema: 's' }],
		})
		expect(wrapper.classes()).toContain('cn-stats-block-widget--multi')
		await flush()
	})
})

describe('CnStatsBlockWidget — single-source backward compatibility', () => {
	it('renders the single-dataSource KPI exactly as before (no entries)', async () => {
		axios.get.mockResolvedValue({ data: { value: 12 } })
		const wrapper = mountWidget({
			title: 'Minutes in review',
			countLabel: 'minutes',
			variant: 'warning',
			dataSource: { register: 'decidesk', schema: 'minutes', filter: { lifecycle: 'review' }, aggregate: 'count' },
		})
		await flush()
		const blocks = wrapper.findAll('.stats-stub')
		expect(blocks.length).toBe(1)
		expect(blocks.at(0).attributes('data-title')).toBe('Minutes in review')
		expect(blocks.at(0).attributes('data-count')).toBe('12')
		expect(blocks.at(0).attributes('data-variant')).toBe('warning')
		expect(wrapper.classes()).not.toContain('cn-stats-block-widget--multi')
		// Fetched over the same REST /value path with the filter[…] shape.
		const [url, config] = axios.get.mock.calls[0]
		expect(url).toContain('/apps/openregister/api/objects/aggregations/decidesk/minutes/value')
		expect(config.params['filter[lifecycle]']).toBe('review')
	})
})

describe('CnStatsBlockWidget — exactly one of dataSource / entries', () => {
	it('flags BOTH dataSource and entries with a console error', async () => {
		axios.get.mockResolvedValue({ data: { value: 1 } })
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		mountWidget({
			dataSource: { register: 'r', schema: 's' },
			entries: [{ register: 'r', schema: 's' }],
		})
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Exactly one of'))
		errorSpy.mockRestore()
		await flush()
	})

	it('flags NEITHER dataSource nor entries with a console error', () => {
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		mountWidget({})
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Exactly one of'))
		errorSpy.mockRestore()
	})

	it('does NOT flag a valid single-dataSource widget', async () => {
		axios.get.mockResolvedValue({ data: { value: 1 } })
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		mountWidget({ dataSource: { register: 'r', schema: 's' } })
		expect(errorSpy).not.toHaveBeenCalled()
		errorSpy.mockRestore()
		await flush()
	})
})
