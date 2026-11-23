/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A Nextcloud dashboard widget with a `limit` shows at most that many items,
 * so it fits its dashboard cell (launchpad's activity widget drew a 411px list
 * in a 172px body), with a "Show all" link to the rest.
 *
 * @spec openspec/changes/screens-nc-widget-limit/specs/nc-widget/spec.md#requirement-a-nextcloud-widget-shows-at-most-its-limit
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnNcWidgetWidget from '@/components/CnNcWidgetWidget/CnNcWidgetWidget.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const ITEMS = [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), title: `Item ${n}`, link: `/x/${n}` }))

function answer() {
	axios.get.mockResolvedValue({ status: 200, data: { ocs: { data: { activity: { items: ITEMS } } } } })
}

describe('CnNcWidgetWidget limit', () => {
	afterEach(() => {
		delete global.window.OCA
		axios.get.mockReset()
	})

	it('shows at most `limit` items and asks the API for that many', async () => {
		answer()
		const w = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'activity', limit: 3 } } })
		await flushPromises()
		expect(w.findAll('.cn-nc-widget-widget__item').map((a) => a.text())).toEqual(['Item 1', 'Item 2', 'Item 3'])
		expect(axios.get.mock.calls[0][1].params.limit).toBe(3)
	})

	it('takes the API list before a native callback when a limit is set', async () => {
		answer()
		const callback = jest.fn()
		global.window.OCA = { Dashboard: { widgets: { activity: { title: 'Activity', url: '/apps/activity' } }, callbacks: { activity: callback } } }
		const w = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'activity', limit: 2 } } })
		await flushPromises()
		expect(callback).not.toHaveBeenCalled()
		expect(w.findAll('.cn-nc-widget-widget__item')).toHaveLength(2)
		const all = w.find('[data-testid="nc-widget-show-all"]')
		expect(all.attributes('href')).toBe('/apps/activity')
		expect(all.text()).toBe('Show all')
	})

	it('uses showAllUrl and showAllLabel, and draws no link without a limit or a target', async () => {
		answer()
		const own = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'activity', limit: 2, showAllUrl: '/apps/activity/?filter=all', showAllLabel: 'Alle activiteit' } } })
		await flushPromises()
		expect(own.find('[data-testid="nc-widget-show-all"]').attributes('href')).toBe('/apps/activity/?filter=all')
		expect(own.find('[data-testid="nc-widget-show-all"]').text()).toBe('Alle activiteit')
		const noTarget = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'activity', limit: 2 } } })
		await flushPromises()
		expect(noTarget.find('[data-testid="nc-widget-show-all"]').exists()).toBe(false)
		const noLimit = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'activity', showAllUrl: '/x' } } })
		await flushPromises()
		expect(noLimit.findAll('.cn-nc-widget-widget__item')).toHaveLength(6)
		expect(noLimit.find('[data-testid="nc-widget-show-all"]').exists()).toBe(false)
	})

	it('keeps the native fast path without a limit', async () => {
		const callback = jest.fn()
		global.window.OCA = { Dashboard: { widgets: { activity: { title: 'Activity' } }, callbacks: { activity: callback } } }
		mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'activity' } } })
		await flushPromises()
		expect(callback).toHaveBeenCalledTimes(1)
	})
})
