/**
 * CnStatWidget's legacy `source` path re-reads on the page's Refresh action
 * (`cn:page:refresh`) and hands the fetch to the payload's `waitUntil`, so the
 * Actions menu spins until the tile has its new value.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { mount } from '@vue/test-utils'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountWidget(content) {
	return mount(CnStatWidget, {
		propsData: { content },
		stubs: { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } },
		provide: { cnAppConfig: {}, cnWorkspaceContext: {} },
	})
}

describe('CnStatWidget — page refresh on the `source` path', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('re-reads the endpoint and reports the fetch through waitUntil', async () => {
		axios.get.mockResolvedValueOnce({ data: { total: 5 } }).mockResolvedValueOnce({ data: { total: 8 } })
		const wrapper = mountWidget({ source: { kind: 'endpoint', url: '/api/sla/attainment', path: 'total' } })
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)

		const work = []
		emit('cn:page:refresh', { waitUntil: (p) => work.push(p) })
		// The idle useEndpointSource answers too, with a no-op load.
		expect(work.length).toBeGreaterThan(0)
		await Promise.all(work)
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(wrapper.text()).toContain('8')
		wrapper.unmount()
	})

	it('sends one request for tiles that read the same endpoint, on load and on refresh', async () => {
		axios.get.mockResolvedValue({ data: { total: 4, met: 3, breached: 1, attainmentPercent: 75 } })
		const source = (path) => ({ source: { kind: 'endpoint', url: '/api/shared', path, params: { bucket: 'month' } } })
		const tiles = ['total', 'met', 'breached', 'attainmentPercent'].map((path) => mountWidget(source(path)))
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)

		const work = []
		emit('cn:page:refresh', { waitUntil: (p) => work.push(p) })
		await Promise.all(work)
		expect(axios.get).toHaveBeenCalledTimes(2)
		tiles.forEach((tile) => tile.unmount())
	})

	it('stops listening once unmounted', async () => {
		axios.get.mockResolvedValue({ data: { total: 1 } })
		const wrapper = mountWidget({ source: { kind: 'endpoint', url: '/api/x', path: 'total' } })
		await flush()
		wrapper.unmount()

		emit('cn:page:refresh', {})
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
	})
})
