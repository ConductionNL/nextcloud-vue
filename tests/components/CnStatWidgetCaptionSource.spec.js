/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stat tile's caption can carry its own count (`captionSource`): the tile
 * counts the open requests, the caption the ones waiting too long. `{count}`
 * is that count, `captionVariantWhen` tests it, and at zero the caption is
 * left out (or reads `zeroText`).
 *
 * @spec openspec/changes/screens-stat-caption-source/specs/stat-widget/spec.md#requirement-a-stat-tiles-caption-can-carry-its-own-count
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
	label: 'Open requests',
	source: { register: 'portaliq', schema: 'portalAccessRequest', filter: { state: 'pending' } },
	caption: '{count} waiting too long',
	captionSource: { filter: { state: 'pending', escalated: true } },
	captionVariantWhen: [{ op: 'gte', value: 1, variant: 'error' }],
}

async function mountTile(content, late) {
	axios.get.mockImplementation(async (url, { params }) => {
		if (late instanceof Error && params['filter[escalated]'] !== undefined) {
			throw late
		}
		return { data: { value: params['filter[escalated]'] !== undefined ? late : 3 } }
	})
	const wrapper = mount(CnStatWidget, { propsData: { content }, stubs, provide: { cnWorkspaceContext: {} } })
	await flush()
	await flush()
	await flush()
	return wrapper
}

describe('CnStatWidget: a caption with its own count', () => {
	beforeEach(() => jest.clearAllMocks())

	it('fills {count} from the caption source and colours the caption by it', async () => {
		const w = await mountTile(base, 1)
		expect(w.find('.cn-stat-widget__value').text()).toBe('3')
		expect(w.find(CAPTION).text()).toBe('1 waiting too long')
		expect(w.find(CAPTION).classes()).toContain('cn-kpi-card__label--error')
		const urls = axios.get.mock.calls.map((call) => call[0])
		expect(urls.every((url) => url.includes('/aggregations/portaliq/portalAccessRequest/value'))).toBe(true)
		expect(axios.get.mock.calls.filter((call) => call[1].params['filter[escalated]'] !== undefined)).toHaveLength(1)
	})

	it('leaves the caption out at zero, or reads zeroText', async () => {
		const none = await mountTile(base, 0)
		expect(none.find(CAPTION).exists()).toBe(false)
		const calm = await mountTile({ ...base, captionSource: { ...base.captionSource, zeroText: 'Nobody is waiting' } }, 0)
		expect(calm.find(CAPTION).text()).toBe('Nobody is waiting')
		expect(calm.find(CAPTION).classes()).not.toContain('cn-kpi-card__label--error')
	})

	it('leaves the caption out when its count cannot be read; the tile keeps its number', async () => {
		const w = await mountTile(base, new Error('boom'))
		expect(w.find('.cn-stat-widget__value').text()).toBe('3')
		expect(w.find(CAPTION).exists()).toBe(false)
	})

	it('without captionSource the caption is what it was', async () => {
		const w = await mountTile({ label: 'Open', source: base.source, caption: '{value} open', captionVariantWhen: [{ op: 'gte', value: 1, variant: 'error' }] }, 0)
		expect(w.find(CAPTION).text()).toBe('3 open')
		expect(w.find(CAPTION).classes()).toContain('cn-kpi-card__label--error')
		expect(axios.get).toHaveBeenCalledTimes(1)
	})
})
