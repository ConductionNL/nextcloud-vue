/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stat tile's caption can say how long the oldest record has waited
 * (`captionSource.metric: "daysSinceEarliest"`): DqMijnWerk "Wacht op
 * inwoner" reads "langste: 9 dagen" over the days since each case entered
 * its status.
 *
 * @spec openspec/changes/stat-caption-days-since-earliest/specs/stat-caption-days-since-earliest/spec.md#requirement-a-stat-caption-can-count-the-days-since-the-earliest-date
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p, params = {}) => `/nc${p.replace(/\{(\w+)\}/g, (m, k) => params[k])}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } }
const CAPTION = '[data-testid="cn-stat-widget-caption"]'

const base = {
	label: 'Waiting on the applicant',
	source: { register: 'dossiq', schema: 'case', filter: { waitingOnApplicant: true } },
	caption: 'longest: {count} days',
	captionSource: { metric: 'daysSinceEarliest', field: 'currentStatusEnteredAt', filter: { waitingOnApplicant: true, isFinalStatus: false } },
}

/**
 * Mount the tile with the list read answering `oldest` as its first record.
 *
 * @param {object} content The tile content.
 * @param {*} oldest The first record, an Error to fail, or undefined for none.
 * @return {Promise<object>} The wrapper.
 */
async function mountTile(content, oldest) {
	axios.get.mockImplementation(async (url) => {
		if (url.includes('/aggregations/')) {
			return { data: { value: 4 } }
		}
		if (oldest instanceof Error) {
			throw oldest
		}
		return { data: { results: oldest === undefined ? [] : [oldest], total: oldest === undefined ? 0 : 4 } }
	})
	const wrapper = mount(CnStatWidget, { propsData: { content }, stubs, provide: { cnWorkspaceContext: {} } })
	await flush()
	await flush()
	await flush()
	return wrapper
}

describe('CnStatWidget: a caption over the days since the earliest date', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.useFakeTimers({ doNotFake: ['setTimeout', 'nextTick', 'setImmediate'] })
		jest.setSystemTime(new Date(2026, 9, 5, 14, 0))
	})

	afterEach(() => jest.useRealTimers())

	it('reads the oldest record of the list, ordered by the field, and counts whole days to today', async () => {
		const w = await mountTile(base, { id: 'a', currentStatusEnteredAt: '2026-09-26T16:30:00+02:00' })
		expect(w.find('.cn-stat-widget__value').text()).toBe('4')
		expect(w.find(CAPTION).text()).toBe('longest: 9 days')
		const list = axios.get.mock.calls.find((call) => !call[0].includes('/aggregations/'))
		expect(list[0]).toBe('/nc/apps/openregister/api/objects/dossiq/case')
		expect(list[1].params).toMatchObject({
			_limit: 1,
			'_order[currentStatusEnteredAt]': 'asc',
			'currentStatusEnteredAt[isnull]': 'false',
			waitingOnApplicant: true,
			isFinalStatus: false,
		})
	})

	it('reads the field from the envelope when the record has no own field', async () => {
		const w = await mountTile({ ...base, captionSource: { ...base.captionSource, field: 'created' } }, { '@self': { created: '2026-10-01T08:00:00+00:00' } })
		expect(w.find(CAPTION).text()).toBe('longest: 4 days')
	})

	it('reads zeroText when nothing waits or the oldest entered today', async () => {
		const zero = { ...base, captionSource: { ...base.captionSource, zeroText: 'nobody waits long' } }
		expect((await mountTile(zero, undefined)).find(CAPTION).text()).toBe('nobody waits long')
		expect((await mountTile(zero, { currentStatusEnteredAt: '2026-10-05T09:00:00+02:00' })).find(CAPTION).text()).toBe('nobody waits long')
	})

	it('leaves the caption out when the list cannot be read or the date is not a date', async () => {
		expect((await mountTile(base, new Error('boom'))).find(CAPTION).exists()).toBe(false)
		expect((await mountTile(base, { currentStatusEnteredAt: 'soon' })).find(CAPTION).exists()).toBe(false)
	})
})
