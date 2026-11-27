/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-5
 */
import { mount } from '@vue/test-utils'
import CnWidgetWrapper from '../CnWidgetWrapper.vue'

const fetched = jest.fn()
const FetchingRenderer = {
	name: 'FetchingRenderer',
	mounted() {
		fetched()
	},
	template: '<ul class="fetching-renderer"><li>Case 1</li></ul>',
}

/**
 * Mount a wrapper around the fetching renderer.
 *
 * @param {object} props The wrapper props.
 * @return {object} The test wrapper.
 */
function wrap(props = {}) {
	return mount(CnWidgetWrapper, {
		props: { title: 'My cases', showActions: false, ...props },
		slots: { default: FetchingRenderer },
	})
}

beforeEach(() => fetched.mockClear())

describe('CnWidgetWrapper loading', () => {
	it('a loading widget shows its title and its shape, not a spinner', () => {
		const wrapper = wrap({ loading: true, placeholder: 'rows' })
		expect(wrapper.find('.cn-widget-wrapper__title').text()).toBe('My cases')
		const placeholder = wrapper.find('.cn-widget-placeholder')
		expect(placeholder.exists()).toBe(true)
		expect(placeholder.attributes('data-shape')).toBe('rows')
		expect(placeholder.attributes('aria-hidden')).toBe('true')
		expect(wrapper.attributes('aria-busy')).toBe('true')
		expect(wrapper.find('[role="status"]').exists()).toBe(false)
		expect(wrapper.html()).not.toMatch(/loading-icon|NcLoadingIcon/i)
	})

	it('keeps the content mounted behind the placeholder, so it can fetch', () => {
		const wrapper = wrap({ loading: true })
		expect(fetched).toHaveBeenCalledTimes(1)
		expect(wrapper.find('.fetching-renderer').exists()).toBe(true)
		expect(wrapper.find('.cn-widget-wrapper__content').classes()).toContain('cn-widget-wrapper__content--loading')
	})

	it('replaces the placeholder in place when loading ends, without remounting the content', async () => {
		const wrapper = wrap({ loading: true, placeholder: { shape: 'lines', count: 4 } })
		expect(wrapper.find('.cn-widget-placeholder').attributes('data-shape')).toBe('lines')
		await wrapper.setProps({ loading: false })
		expect(wrapper.find('.cn-widget-placeholder').exists()).toBe(false)
		expect(wrapper.attributes('aria-busy')).toBeUndefined()
		expect(wrapper.find('.cn-widget-wrapper__content').classes()).not.toContain('cn-widget-wrapper__content--loading')
		expect(wrapper.find('.fetching-renderer').exists()).toBe(true)
		expect(fetched).toHaveBeenCalledTimes(1)
	})

	it('a refresh keeps the content and draws no placeholder', () => {
		const wrapper = wrap({ refreshing: true })
		expect(wrapper.find('.cn-widget-placeholder').exists()).toBe(false)
		expect(wrapper.find('.fetching-renderer').exists()).toBe(true)
		expect(wrapper.attributes('aria-busy')).toBeUndefined()
	})

	it('an invalid placeholder waits in rows', () => {
		const wrapper = wrap({ loading: true, placeholder: 'spinner' })
		expect(wrapper.find('.cn-widget-placeholder').attributes('data-shape')).toBe('rows')
	})

	it('a wrapper without loading renders as before', () => {
		const before = wrap().html()
		expect(before).not.toContain('cn-widget-wrapper__placeholder')
		expect(before).not.toContain('aria-busy')
		expect(before).not.toContain('cn-widget-wrapper__content--loading')
	})
})
