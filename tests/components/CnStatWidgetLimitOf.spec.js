/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stat tile's limit can be a count of its own (`limitSource`), and
 * `limitStyle: "of"` draws value and limit as one headline (board PqWachtrij
 * "Binnen de termijn 9 van 12").
 *
 * @spec openspec/changes/stat-limit-of-a-count/specs/stat-widget/spec.md#requirement-a-stat-tile-can-read-its-limit-as-a-count-and-show-value-of-limit
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p, params = {}) => `/nc${p.replace(/\{(\w+)\}/g, (m, k) => params[k])}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } }

const base = {
	label: 'Within the deadline',
	source: { register: 'pipelinq', schema: 'ticket', filter: { status: 'new', urgent: false } },
	limitSource: { filter: { status: 'new' } },
}

async function mountTile(content, limit = 12) {
	axios.get.mockImplementation(async (url, { params }) => {
		if (params['filter[urgent]'] === undefined && limit instanceof Error) {
			throw limit
		}
		return { data: { value: params['filter[urgent]'] !== undefined ? 9 : limit } }
	})
	const wrapper = mount(CnStatWidget, { propsData: { content }, stubs, provide: { cnWorkspaceContext: {} } })
	await flush()
	await flush()
	await flush()
	return wrapper
}

describe('CnStatWidget: a limit read as a count', () => {
	beforeEach(() => jest.clearAllMocks())

	it('reads the limit from limitSource and draws "9 / 12"', async () => {
		const w = await mountTile(base)
		expect(w.find('.cn-stat-widget__value').text()).toBe('9')
		expect(w.find('[data-testid="cn-stat-widget-limit"]').text()).toBe('/ 12')
		expect(axios.get.mock.calls.every((call) => call[0].includes('/aggregations/pipelinq/ticket/value'))).toBe(true)
	})

	it('limitStyle "of" draws one headline and no capacity tint', async () => {
		const w = await mountTile({ ...base, limitStyle: 'of' }, 9)
		expect(w.find('.cn-stat-widget__value').text()).toBe('9 of 9')
		expect(w.find('[data-testid="cn-stat-widget-limit"]').exists()).toBe(false)
		expect(w.vm.atLimit).toBe(false)
	})

	it('leaves the limit out when its count cannot be read', async () => {
		const w = await mountTile({ ...base, limitStyle: 'of' }, new Error('boom'))
		expect(w.find('.cn-stat-widget__value').text()).toBe('9')
	})

	it('without limitSource a static limit is as before', async () => {
		const w = await mountTile({ label: 'Seats', source: base.source, limit: 20 })
		expect(w.find('[data-testid="cn-stat-widget-limit"]').text()).toBe('/ 20')
		expect(axios.get).toHaveBeenCalledTimes(1)
	})
})
