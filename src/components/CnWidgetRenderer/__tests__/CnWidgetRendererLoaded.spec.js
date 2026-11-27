import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-6
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnWidgetRenderer from '../CnWidgetRenderer.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const widget = (extra = {}) => ({ id: 'deck', title: 'Deck', itemApiVersions: [2], reloadInterval: 0, ...extra })

/**
 * A widget-items response.
 *
 * @param {Array} items The items.
 * @return {object} The axios response.
 */
const response = (items) => ({ data: { ocs: { data: { deck: { items, emptyContentMessage: '' } } } } })

beforeEach(() => {
	axios.get.mockReset()
	jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

describe('CnWidgetRenderer loaded', () => {
	it.each([
		['items', () => Promise.resolve(response([{ id: '1', title: 'Card' }]))],
		['none', () => Promise.resolve(response([]))],
		['an error', () => Promise.reject(new Error('500'))],
	])('emits loaded once when the first fetch settles with %s, drawing no spinner', async (_label, reply) => {
		let settle
		axios.get.mockImplementation(() => new Promise((resolve, reject) => {
			settle = () => reply().then(resolve, reject)
		}))
		const wrapper = mount(CnWidgetRenderer, { props: { widget: widget() } })
		await flushPromises()
		expect(wrapper.emitted('loaded')).toBeUndefined()
		expect(wrapper.find('.cn-widget-renderer__loading').exists()).toBe(false)
		expect(wrapper.html()).not.toMatch(/loading-icon/i)
		settle()
		await flushPromises()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})

	it('a refresh keeps the items and does not emit loaded again', async () => {
		jest.useFakeTimers()
		axios.get.mockResolvedValue(response([{ id: '1', title: 'Card' }]))
		const wrapper = mount(CnWidgetRenderer, { props: { widget: widget({ reloadInterval: 30 }) } })
		await flushPromises()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
		expect(wrapper.vm.items).toHaveLength(1)

		let settle
		axios.get.mockImplementation(() => new Promise((resolve) => {
			settle = () => resolve(response([{ id: '1', title: 'Card' }, { id: '2', title: 'Other' }]))
		}))
		jest.advanceTimersByTime(30000)
		await flushPromises()
		expect(wrapper.vm.items).toHaveLength(1)
		settle()
		await flushPromises()
		expect(wrapper.vm.items).toHaveLength(2)
		expect(wrapper.emitted('loaded')).toHaveLength(1)
		wrapper.unmount()
	})

	it('a widget with nothing to fetch is loaded with its first render', async () => {
		const wrapper = mount(CnWidgetRenderer, { props: { widget: widget({ itemApiVersions: [] }) } })
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})
})
